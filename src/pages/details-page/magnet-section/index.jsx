/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { fetchTorrentStreams } from "../../../utils/torrentScraper";
import { markAsWatchedOnSimkl } from "../../../utils/simkl";
import { getPremiumizeKey, resolveMagnetWithPremiumize } from "../../../utils/premiumize";
import { isTvDevice } from "../../../utils/zoom";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import VideoPlayerModal from "../../../components/video-player-modal";
import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle, FiExternalLink } from "react-icons/fi";
import "./index.scss";

const isHevcOrX265Stream = (item) => {
  if (!item) return false;
  const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""} ${item.url || ""}`;
  return /\b(hevc|x265|h265|h\.265)\b/i.test(fullStr);
};

const MagnetSection = ({ title, year, seasonNum, episodeNum, tmdbId, mediaType, compact = false }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Closed by default
  const [unconfigured, setUnconfigured] = useState(false);

  // Streaming state
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeFilename, setActiveFilename] = useState("");

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

    const allowedResolutions = serverSettings?.stream_resolutions || (
      localStorage.getItem("stream_resolutions")
        ? JSON.parse(localStorage.getItem("stream_resolutions"))
        : ["2160p", "1080p", "720p", "480p"]
    );

    const excludeLowQuality = serverSettings?.stream_exclude_low_quality !== undefined
      ? serverSettings.stream_exclude_low_quality
      : (localStorage.getItem("stream_exclude_low_quality") !== null
        ? JSON.parse(localStorage.getItem("stream_exclude_low_quality"))
        : true);

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
      return /\b(hdcam|camrip|cam|telesync|tele-sync|hd-ts|hdts|workprint|screener|dvdscr)\b/i.test(fullStr);
    };

    // Note: HEVC / x265 codec streams are allowed so the user can test transcoding.
    // The player's automatic fallback triggers backend transcode if direct playback fails.

    // Apply Resolution & Quality Filtering
    finalStreams = finalStreams.filter((item) => {
      if (excludeLowQuality && isLowQualityCamRelease(item)) {
        return false;
      }
      const itemRes = parseStreamResolution(item);
      return allowedResolutions.includes(itemRes);
    });

    setStreams(finalStreams);
  };

  const handlePlayStream = async (item, transcodeMode = false) => {
    if (!item || !item.url) return;

    let targetUrl = item.url;

    // Auto-resolve magnet link via Premiumize Cloud API (adds to 7-day cloud retention)
    if (targetUrl.startsWith("magnet:")) {
      console.log("[MagnetSection] Resolving magnet via Premiumize Cloud API...");
      const premRes = await resolveMagnetWithPremiumize(targetUrl);
      if (premRes.success && premRes.streamUrl) {
        targetUrl = premRes.streamUrl;
        console.log("[MagnetSection] Successfully resolved Premiumize HTTP CDN stream URL:", targetUrl);
      } else if (premRes.message) {
        console.warn("[MagnetSection Premiumize Notice]:", premRes.message);
      }
    }

    if (transcodeMode && targetUrl.startsWith("magnet:")) {
      alert(
        "Magnet P2P streams require a Debrid account (Real-Debrid, Premiumize, TorBox) for server transcoding.\n\nPlease save your Premiumize API Key in Settings or select a direct HTTP stream."
      );
      return;
    }

    const streamUrl = transcodeMode
      ? `/api/transcode?url=${encodeURIComponent(targetUrl)}`
      : targetUrl;

    setActiveVideoUrl(streamUrl);
    setActiveFilename(item.title || title);
    setShowPlayer(true);

    // Auto-sync SIMKL watch history
    if (tmdbId || title) {
      markAsWatchedOnSimkl({
        tmdbId,
        title,
        mediaType: mediaType || (seasonNum !== undefined ? "tv" : "movie"),
        seasonNum,
        episodeNum,
      });
    }
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
            <span className="sectionTitle">Available Streams</span>
            {streams.length > 0 && (
              <span className="countBadge">{streams.length} Available</span>
            )}
            {unconfigured && (
              <span className="countBadge warning">Setup Required</span>
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
                {streams.map((item, index) => (
                  <div key={index} className="magnetItem">
                    <div className="itemInfo">
                      <span className="itemTitle" title={item.title}>
                        {item.title}
                      </span>
                      <div className="itemMeta">
                        <span className="metaBadge provider">⚡ {item.name}</span>
                        {item.metaText && (
                          <span className="metaBadge info">{item.metaText}</span>
                        )}
                      </div>
                    </div>

                    <div className="itemActions">
                      <button
                        className="actionBtn play"
                        onClick={() => handlePlayStream(item, false)}
                      >
                        <FiPlay /> Play
                      </button>
                    </div>
                  </div>
                ))}
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
