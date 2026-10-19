import { useState, useEffect } from "react";
import "./index.scss";
import { fetchTorrentStreams } from "../../../utils/torrentScraper";
import { getPremiumizeKey, resolveMagnetWithPremiumize } from "../../../utils/premiumize";
import { isTvDevice } from "../../../utils/zoom";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import VideoPlayerModal from "../../../components/video-player-modal";
import { 
  FiPlay, 
  FiChevronDown, 
  FiChevronUp, 
  FiAlertCircle, 
  FiExternalLink, 
  FiCloud, 
  FiFilm, 
  FiVolume2, 
  FiCpu, 
  FiSun, 
  FiZap, 
  FiHardDrive, 
  FiUsers, 
  FiLayers,
  FiShield,
  FiRefreshCw
} from "react-icons/fi";
import { isEnglishStreamTitle, isMatchingStreamTitle, is10BitOrHevcStream } from "../../../utils/filterUtils";
import { isFireTabletDevice, getDeviceModelName } from "../../../utils/deviceDetection";

const getHash = (url) => {
  if (!url) return null;
  const match = url.match(/urn:btih:([a-zA-Z0-9]+)/i);
  return match ? match[1].toLowerCase() : null;
};


const parseStreamDetails = (item) => {
  const titleText = item.title || "";
  const nameText = item.name || "";
  const metaText = item.metaText || "";
  const fullStr = `${titleText} ${nameText} ${metaText}`;

  let quality = item.quality || "HD";
  if (/\b(2160p|4k|uhd|remux)\b/i.test(fullStr)) quality = "4K 2160p";
  else if (/\b(1080p|fhd|fullhd)\b/i.test(fullStr)) quality = "1080p";
  else if (/\b(720p|hd)\b/i.test(fullStr)) quality = "720p";
  else if (/\b(480p|sd|360p)\b/i.test(fullStr)) quality = "480p";

  const isHevc = /\b(hevc|x265|h265|h\.265)\b/i.test(fullStr);
  const isHdr = /\b(hdr|hdr10|hdr10\+|dv|dolby\s*vision)\b/i.test(fullStr);
  const is10Bit = is10BitOrHevcStream(item);
  const isAtmos = /\b(atmos|truehd)\b/i.test(fullStr);

  let seeds = null;
  const seedMatch = fullStr.match(/(?:👤|👥|seeds?:?)\s*(\d+)/i) || fullStr.match(/(\d+)\s*(?:seeds?|seeders?)/i);
  if (seedMatch) seeds = seedMatch[1];

  let size = null;
  const sizeMatch = fullStr.match(/(?:💾|size:?)\s*([\d\.]+\s*(?:GB|MB))/i) || fullStr.match(/([\d\.]+\s*(?:GB|MB))/i);
  if (sizeMatch) size = sizeMatch[1];

  const cleanTitle = titleText.split("\n")[0] || titleText || "Torrent Stream";
  let provider = nameText.split("\n")[0] || "Torrent";
  provider = provider.replace(/\[.*?\]/g, "").trim() || "Torrent Stream";

  return {
    cleanTitle,
    quality,
    isHevc,
    isHdr,
    is10Bit,
    isAtmos,
    seeds,
    size,
    provider,
  };
};

const MagnetSection = ({ title, year, seasonNum, episodeNum, tmdbId, mediaType, compact = false, posterPath = "" }) => {
  const [streams, setStreams] = useState([]);
  const [hiddenStreams, setHiddenStreams] = useState([]);
  const [showHiddenStreams, setShowHiddenStreams] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Start out closed by default
  const [unconfigured, setUnconfigured] = useState(false);
  const [streamStatuses, setStreamStatuses] = useState({});

  // Streaming state

  const [showPlayer, setShowPlayer] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeFilename, setActiveFilename] = useState("");

  useEffect(() => {
    let interval;
    if (isOpen && streams.length > 0) {
      const updateStatuses = async () => {
        try {
          const hashes = streams.map(s => getHash(s.url)).filter(Boolean);
          if (hashes.length === 0) return;

          const [{ checkPremiumizeCache, getPremiumizeTransfers }] = await Promise.all([
             import("../../../utils/premiumize")
          ]);

          const [cacheRes, transfersRes] = await Promise.all([
            checkPremiumizeCache(hashes),
            getPremiumizeTransfers()
          ]);

          const newStatuses = {};
          hashes.forEach((hash, idx) => {
            const isCached = cacheRes[idx];
            let transferStatus = null;
            
            if (Array.isArray(transfersRes)) {
              const activeTransfer = transfersRes.find(t => 
                (t.src && t.src.toLowerCase().includes(hash)) || 
                (t.hash && t.hash.toLowerCase() === hash) ||
                (t.id && t.id.toLowerCase() === hash)
              );

              if (activeTransfer) {
                transferStatus = {
                  progress: activeTransfer.progress,
                  status: activeTransfer.status,
                  message: activeTransfer.message
                };
              }
            }

            newStatuses[hash] = { isCached, transferStatus };
          });

          setStreamStatuses(newStatuses);
        } catch (err) {
          console.error("[MagnetSection] Status check failed", err);
        }
      };

      updateStatuses();
      interval = setInterval(updateStatuses, 10000); // Poll every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isOpen, streams]);
  
  useEffect(() => {
    if (title || tmdbId) {
      loadStreams();
    }
  }, [title, tmdbId, year, seasonNum, episodeNum]);

  const headerId =
    seasonNum !== undefined && episodeNum !== undefined
      ? `streams-header-${tmdbId}-s${seasonNum}-e${episodeNum}`
      : `streams-header-${tmdbId}`;

  const refreshBtnId =
    seasonNum !== undefined && episodeNum !== undefined
      ? `streams-refresh-${tmdbId}-s${seasonNum}-e${episodeNum}`
      : `streams-refresh-${tmdbId}`;

  const loadStreams = async () => {
    const savedScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const restoreTargetId = (activeEl && activeEl.id) || refreshBtnId || headerId;

    setLoading(true);
    setUnconfigured(false);

    const hasPremKey = !!getPremiumizeKey();
    if (!hasPremKey) {
      // Check if server settings have Premiumize key
      const { fetchServerSettings } = await import("../../../utils/serverSettings");
      const serverSettings = await fetchServerSettings();
      if (!serverSettings?.premiumizeKey) {
        setUnconfigured(true);
      }
    }

    const res = await fetchTorrentStreams({
      tmdbId,
      mediaType: mediaType || (seasonNum !== undefined ? "tv" : "movie"),
      seasonNum,
      episodeNum,
      title,
      year,
    });

    setLoading(false);

    let finalStreams = res.streams || [];

    // Fetch Server Settings for stream resolutions and low-quality filter preferences
    const { fetchServerSettings } = await import("../../../utils/serverSettings");
    const serverSettings = await fetchServerSettings();

    const allowedResolutions = (
      localStorage.getItem("stream_resolutions")
        ? JSON.parse(localStorage.getItem("stream_resolutions"))
        : null
    ) || serverSettings?.stream_resolutions || ["2160p", "1080p", "720p", "480p"];

    const excludeLowQuality = (
      localStorage.getItem("stream_exclude_low_quality") !== null
        ? JSON.parse(localStorage.getItem("stream_exclude_low_quality"))
        : null
    ) ?? serverSettings?.stream_exclude_low_quality ?? true;

    // Parse stream resolution
    const parseStreamResolution = (item) => {
      const fullStr = `${item.quality || ""} ${item.title || ""} ${item.name || ""} ${item.metaText || ""}`;
      if (/\b(4k|2160p|uhd|remux)\b/i.test(fullStr)) return "2160p";
      if (/\b(1080p|fhd|fullhd)\b/i.test(fullStr)) return "1080p";
      if (/\b(720p|hd)\b/i.test(fullStr)) return "720p";
      if (/\b(480p|sd|360p|240p)\b/i.test(fullStr)) return "480p";
      return "1080p";
    };

    const isLowQualityCamRelease = (item) => {
      const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""}`;
      return /\b(hdcam|camrip|cam|telesync|tele-sync|hd-ts|hdts|telecine|tc|workprint|screener|dvdscr|dvd-scr|r6|line)\b/i.test(fullStr);
    };

    // Note: HEVC / x265 codec streams are allowed so the user can test transcoding.
    // The player's automatic fallback triggers backend transcode if direct playback fails.

    // Apply Resolution, English Language & Title Matching Filtering
    finalStreams = finalStreams.filter((item) => {
      if (excludeLowQuality && isLowQualityCamRelease(item)) {
        return false;
      }
      if (!isEnglishStreamTitle(item)) {
        return false;
      }
      if (!isMatchingStreamTitle(item, title, mediaType || (seasonNum !== undefined ? "tv" : "movie"), seasonNum, episodeNum)) {
        return false;
      }
      const itemRes = parseStreamResolution(item);
      return allowedResolutions.includes(itemRes);
    });

    // Apply Groq AI Stream Classifier Filter
    if (excludeLowQuality && finalStreams.length > 0 && title) {
      try {
        const { filterWithGroqAI } = await import("../../../utils/groqFilter");
        finalStreams = await filterWithGroqAI(finalStreams, title);
      } catch (e) {
        console.warn("[MagnetSection] Groq AI stream filter error:", e);
      }
    }

    // 10-Bit HEVC Filter for Fire Tablets and older hardware decoders
    const isFireTablet = isFireTabletDevice();
    const exclude10BitHevc = (
      localStorage.getItem("stream_exclude_10bit_hevc") !== null
        ? JSON.parse(localStorage.getItem("stream_exclude_10bit_hevc"))
        : (serverSettings?.stream_exclude_10bit_hevc ?? isFireTablet)
    );

    let keptStreams = [];
    let excluded10Bit = [];

    if (exclude10BitHevc) {
      finalStreams.forEach((item) => {
        if (is10BitOrHevcStream(item)) {
          excluded10Bit.push(item);
        } else {
          keptStreams.push(item);
        }
      });
    } else {
      keptStreams = finalStreams;
    }

    setHiddenStreams(excluded10Bit);
    setStreams(keptStreams);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: savedScrollY, behavior: "instant" });
      setTimeout(() => {
        window.scrollTo({ top: savedScrollY, behavior: "instant" });
        const target =
          document.getElementById(restoreTargetId) ||
          document.getElementById(refreshBtnId) ||
          document.getElementById(headerId);
        if (target && typeof target.focus === "function") {
          target.focus({ preventScroll: true });
        }
      }, 80);
    }
  };

  const handlePlayStream = async (item, transcodeMode = false) => {
    if (!item || !item.url) return;

    // Fire Tablet hardware crash guard: If stream is 10-bit HEVC, force transcode mode
    if (isFireTabletDevice() && is10BitOrHevcStream(item)) {
      console.warn("[MagnetSection] Fire tablet detected playing 10-bit HEVC. Enforcing server transcode mode to protect hardware decoder.");
      transcodeMode = true;
    }

    let targetUrl = item.url;

    // Auto-resolve magnet link via Premiumize Cloud API (adds to 7-day cloud retention)
      let premErrorMsg = "Magnet streams require a Premiumize API key to instantly resolve to HTTP.\n\nPlease save your Premiumize API Key in Settings to play this stream.";
      if (targetUrl.startsWith("magnet:")) {
        console.log("[MagnetSection] Resolving magnet via Premiumize Cloud API...");
        const premRes = await resolveMagnetWithPremiumize(targetUrl, null, seasonNum, episodeNum);
        if (premRes.success && premRes.streamUrl) {
          targetUrl = premRes.streamUrl;
          console.log("[MagnetSection] Successfully resolved Premiumize HTTP CDN stream URL:", targetUrl);
        } else if (premRes.message) {
          console.warn("[MagnetSection Premiumize Notice]:", premRes.message);
          premErrorMsg = premRes.message;
        }
      }

      if (targetUrl.startsWith("magnet:")) {
        alert(premErrorMsg);
        return;
      }

    const streamUrl = transcodeMode
      ? `/api/transcode?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    setActiveVideoUrl(streamUrl);
    setActiveFilename(item.title || title);
    setShowPlayer(true);
  };

  const displayedStreams = showHiddenStreams
    ? [...streams, ...hiddenStreams]
    : streams;

  const content = (
    <div className="magnetSection">
      <div className={`sectionCard ${compact ? "compact" : ""}`}>
        <div
          id={headerId}
          className={`sectionHeader ${isOpen ? "open" : ""}`}
          tabIndex="0"
          role="button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            const code = e.keyCode;
            if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
        >
          <div className="headerLeft">
            <FiFilm className="headerIcon" />
            <span className="sectionTitle">Available Streams</span>
            {loading ? (
              <span className="countBadge loading">
                Searching...
              </span>
            ) : (streams.length > 0 || hiddenStreams.length > 0) ? (
              <span className="countBadge">
                <FiLayers className="badgeIcon" /> {displayedStreams.length} Stream{displayedStreams.length !== 1 ? "s" : ""}
                {hiddenStreams.length > 0 && !showHiddenStreams && (
                  <span className="hiddenCountTag"> ({hiddenStreams.length} 10-bit hidden)</span>
                )}
              </span>
            ) : unconfigured ? (
              <span className="countBadge warning">
                <FiAlertCircle className="badgeIcon" /> Setup Required
              </span>
            ) : (
              <span className="countBadge none">
                0 Streams Found
              </span>
            )}
          </div>
          <div className="headerRightActions">
            <button
              id={refreshBtnId}
              type="button"
              className="refreshStreamsBtn"
              title="Refresh Links"
              aria-label="Refresh episode links"
              tabIndex="0"
              onClick={(e) => {
                e.stopPropagation();
                if (!isOpen) setIsOpen(true);
                loadStreams();
              }}
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isOpen) setIsOpen(true);
                  loadStreams();
                }
              }}
            >
              <FiRefreshCw className={loading ? "spin" : ""} />
            </button>
            <button className="toggleBtn" tabIndex="-1" aria-label="Toggle streams dropdown">
              {isOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="sectionBody">
            {loading ? (
              <div className="loadingContainer">
                <Spinner />
              </div>
            ) : (streams.length === 0 && hiddenStreams.length === 0) ? (
              <div className="unconfiguredNotice">
                <FiAlertCircle className="icon" />
                <div className="noticeText">
                  <h4>No Torrent Streams Found</h4>
                  <p>
                    {unconfigured
                      ? "Please enter your Premiumize API Key in Settings to resolve magnet torrent streams."
                      : "No torrent streams found for this title. You can try refreshing streams or check your search criteria."}
                  </p>
                  <button id={refreshBtnId + "-empty"} className="configBtn" onClick={loadStreams} style={{ cursor: "pointer" }}>
                    Refresh Streams
                  </button>
                </div>
              </div>
            ) : (
              <>
                {hiddenStreams.length > 0 && (
                  <div className={`fireTabletNotice ${showHiddenStreams ? "openWarning" : ""}`}>
                    <div className="noticeLeft">
                      <FiShield className="noticeShieldIcon" />
                      <div className="noticeTextGroup">
                        <span className="noticeTitle">
                          {isFireTabletDevice() ? `${getDeviceModelName()} Protection Active` : "10-Bit HEVC Filter Active"}
                        </span>
                        <span className="noticeDesc">
                          {showHiddenStreams
                            ? `Showing all ${displayedStreams.length} streams. Warning: 10-bit HEVC may crash your Fire Tablet hardware decoder unless auto-transcoded.`
                            : `Filtered out ${hiddenStreams.length} incompatible 10-bit HEVC / HDR stream(s) to protect against Fire Tablet hardware decoder crashes.`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="noticeToggleBtn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHiddenStreams(!showHiddenStreams);
                      }}
                    >
                      {showHiddenStreams ? "Re-hide 10-bit" : `Show ${hiddenStreams.length} Hidden`}
                    </button>
                  </div>
                )}

                {displayedStreams.length === 0 ? (
                  <div className="unconfiguredNotice">
                    <FiShield className="icon" style={{ color: "var(--pink)" }} />
                    <div className="noticeText">
                      <h4>10-Bit HEVC Streams Filtered</h4>
                      <p>
                        All {hiddenStreams.length} stream(s) found for this title are 10-bit HEVC / HDR, which crash Amazon Fire tablet hardware decoders. Click below to reveal and stream them via server transcoding.
                      </p>
                      <button
                        className="configBtn"
                        onClick={() => setShowHiddenStreams(true)}
                        style={{ cursor: "pointer" }}
                      >
                        Show and Transcode 10-Bit Streams
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="magnetList">
                    {displayedStreams.map((item, index) => {
                  const details = parseStreamDetails(item);
                  const h = getHash(item.url);
                  const stat = h ? streamStatuses[h] : null;

                  return (
                    <div
                      key={index}
                      className="magnetItemContainer"
                      onClick={() => handlePlayStream(item, false)}
                    >
                      <div className="itemCardHeader">
                        <div className="itemTitleGroup">
                          <div className={`qualityEmblem ${details.quality.includes("4K") ? "q4k" : "qhd"}`}>
                            <FiFilm className="emblemIcon" />
                            <span className="emblemText">{details.quality.includes("4K") ? "4K" : "HD"}</span>
                          </div>

                          <span className="itemTitle" title={details.cleanTitle}>
                            {details.cleanTitle}
                          </span>
                        </div>
                      </div>

                      <div className="itemMetaGrid">
                        <span className={`metaBadge qualityBadge ${details.quality.includes('4K') ? 'q4k' : 'qhd'}`}>
                          <FiFilm className="badgeIcon" /> {details.quality}
                        </span>

                        {details.isHdr && (
                          <span className="metaBadge hdrBadge">
                            <FiSun className="badgeIcon" /> HDR
                          </span>
                        )}
                        {details.isHevc && (
                          <span className={`metaBadge codecBadge ${details.is10Bit ? "badge10bit" : ""}`}>
                            <FiCpu className="badgeIcon" /> {details.is10Bit ? "HEVC 10-bit" : "HEVC x265"}
                          </span>
                        )}
                        {!details.isHevc && details.is10Bit && (
                          <span className="metaBadge codecBadge badge10bit">
                            10-bit
                          </span>
                        )}
                        {details.isAtmos && (
                          <span className="metaBadge audioBadge">
                            <FiVolume2 className="badgeIcon" /> Dolby Atmos
                          </span>
                        )}

                        <span className="metaBadge providerBadge">
                          <FiZap className="badgeIcon" /> {details.provider}
                        </span>

                        {details.size && (
                          <span className="metaBadge sizeBadge">
                            <FiHardDrive className="badgeIcon" /> {details.size}
                          </span>
                        )}
                        {details.seeds && (
                          <span className="metaBadge seedsBadge">
                            <FiUsers className="badgeIcon" /> {details.seeds} Seeds
                          </span>
                        )}

                        {stat && stat.isCached && (
                          <span className="metaBadge cachedBadge">
                            <FiCloud className="badgeIcon" /> Cached (Instant)
                          </span>
                        )}
                        {stat && stat.transferStatus?.status === "downloading" && (
                          <span className="metaBadge dlBadge">
                            Downloading {Math.round((stat.transferStatus.progress || 0) * 100)}%
                          </span>
                        )}
                        {stat && stat.transferStatus?.status === "finished" && (
                          <span className="metaBadge cachedBadge">
                            <FiCloud className="badgeIcon" /> Finished / Cached
                          </span>
                        )}
                        {stat && stat.transferStatus?.status === "error" && (
                          <span className="metaBadge errorBadge">
                            Transfer Error
                          </span>
                        )}

                        <button
                          className="actionBtn play"
                          tabIndex="0"
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayStream(item, false);
                          }}
                          onKeyDown={(e) => {
                            const code = e.keyCode;
                            if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                              e.preventDefault();
                              e.stopPropagation();
                              handlePlayStream(item, false);
                            }
                          }}
                        >
                          <FiPlay className="playIcon" /> Play Stream
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}
          </div>
        )}

        <VideoPlayerModal
          show={showPlayer}
          setShow={setShowPlayer}
          videoUrl={activeVideoUrl}
          rawUrl={activeVideoUrl}
          title={activeFilename}
          tmdbId={tmdbId}
          mediaType={mediaType || (seasonNum !== undefined ? "tv" : "movie")}
          seasonNum={seasonNum}
          episodeNum={episodeNum}
          posterPath={posterPath}
        />
      </div>
    </div>
  );

  if (compact) {
    return content;
  }

  return <ContentWrapper>{content}</ContentWrapper>;
};

export default MagnetSection;
