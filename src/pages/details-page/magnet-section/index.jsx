import { useState, useEffect } from "react";
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
  FiLayers 
} from "react-icons/fi";
import { isEnglishStreamTitle, isMatchingStreamTitle } from "../../../utils/filterUtils";

const isHevcOrX265Stream = (item) => {
  if (!item) return false;
  const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""} ${item.url || ""}`;
  return / (hevc|x265|h265|h\.265) /i.test(fullStr);
};

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
    isAtmos,
    seeds,
    size,
    provider,
  };
};

const MagnetSection = ({ title, year, seasonNum, episodeNum, tmdbId, mediaType, compact = false, posterPath = "" }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true); // Open by default so streams drop list is visible
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

  const loadStreams = async () => {
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

    setStreams(finalStreams);
  };

  const handlePlayStream = async (item, transcodeMode = false) => {
    if (!item || !item.url) return;

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

  if (!loading && streams.length === 0 && !unconfigured) {
    return null;
  }

  const content = (
    <div className="magnetSection">
      <div className={`sectionCard ${compact ? "compact" : ""}`}>
        <div
          className="sectionHeader"
          tabIndex="0"
          role="button"
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
            {streams.length > 0 && (
              <span className="countBadge">
                <FiLayers className="badgeIcon" /> {streams.length} Available
              </span>
            )}
            {unconfigured && (
              <span className="countBadge warning">
                <FiAlertCircle className="badgeIcon" /> Setup Required
              </span>
            )}
          </div>
          <button className="toggleBtn" tabIndex="-1">
            {isOpen ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>

        {isOpen && (
          <div className="sectionBody">
            {loading ? (
              <div className="loadingContainer">
                <Spinner />
              </div>
            ) : streams.length === 0 ? (
              <div className="unconfiguredNotice">
                <FiAlertCircle className="icon" />
                <div className="noticeText">
                  <h4>No Torrent Streams Found</h4>
                  <p>
                    {unconfigured
                      ? "Please enter your Premiumize API Key in Settings to resolve magnet torrent streams."
                      : "No torrent streams found for this title. You can try refreshing streams or check your search criteria."}
                  </p>
                  <button className="configBtn" onClick={loadStreams} style={{ cursor: "pointer" }}>
                    Refresh Streams
                  </button>
                </div>
              </div>
            ) : (
              <div className="magnetList">
                {streams.map((item, index) => {
                  const details = parseStreamDetails(item);
                  const h = getHash(item.url);
                  const stat = h ? streamStatuses[h] : null;

                  return (
                    <div
                      key={index}
                      className="magnetItem"
                      tabIndex="0"
                      role="button"
                      onClick={() => handlePlayStream(item, false)}
                      onKeyDown={(e) => {
                        const code = e.keyCode;
                        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                          e.preventDefault();
                          handlePlayStream(item, false);
                        }
                      }}
                    >
                      {/* Quality Emblem Graphic Tile */}
                      <div className={`qualityEmblem ${details.quality.includes("4K") ? "q4k" : "qhd"}`}>
                        <FiFilm className="emblemIcon" />
                        <span className="emblemText">{details.quality.includes("4K") ? "4K" : "HD"}</span>
                      </div>

                      <div className="itemInfo">
                        <span className="itemTitle" title={details.cleanTitle}>
                          {details.cleanTitle}
                        </span>
                        <div className="itemMeta">
                          <span className={`metaBadge qualityBadge ${details.quality.includes('4K') ? 'q4k' : 'qhd'}`}>
                            <FiFilm className="badgeIcon" /> {details.quality}
                          </span>

                          {details.isHdr && (
                            <span className="metaBadge hdrBadge">
                              <FiSun className="badgeIcon" /> HDR
                            </span>
                          )}
                          {details.isHevc && (
                            <span className="metaBadge codecBadge">
                              <FiCpu className="badgeIcon" /> HEVC x265
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
                        </div>
                      </div>

                      <div className="itemActions">
                        <button
                          className="actionBtn play"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayStream(item, false);
                          }}
                          tabIndex="-1"
                        >
                          <FiPlay className="playIcon" /> Play Stream
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
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
