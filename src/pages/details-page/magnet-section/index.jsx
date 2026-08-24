/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { fetchAioStreams } from "../../../utils/aiostreams";
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

    const res = await fetchAioStreams({
      tmdbId,
      mediaType: mediaType || (seasonNum !== undefined ? "tv" : "movie"),
      seasonNum,
      episodeNum,
    });

    setLoading(false);

    if (res.unconfigured) {
      setUnconfigured(true);
      setStreams([]);
      return;
    }

    let finalStreams = res.streams || [];

    // Filter HEVC / x265 codec streams in web player mode only
    const isWebBrowserOnly = typeof window !== "undefined" && !isTvDevice() && !(window.AndroidPlayer && typeof window.AndroidPlayer.playStream === "function");
    if (isWebBrowserOnly) {
      console.log("[MagnetSection] Web Player mode: Filtering out HEVC / x265 streams for web browser compatibility.");
      finalStreams = finalStreams.filter((item) => !isHevcOrX265Stream(item));
    }

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
            ) : unconfigured ? (
              <div className="unconfiguredNotice">
                <FiAlertCircle className="icon" />
                <div className="noticeText">
                  <h4>AIOStreams Configuration Required</h4>
                  <p>
                    Configure your AIOStreams addon with your Premiumize account and torrent providers, then save your AIOStreams manifest URL in Settings.
                  </p>
                  <a
                    href="https://aiostreams.elfhosted.com/stremio/configure"
                    target="_blank"
                    rel="noreferrer"
                    className="configBtn"
                  >
                    <FiExternalLink /> Configure AIOStreams Addon
                  </a>
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
