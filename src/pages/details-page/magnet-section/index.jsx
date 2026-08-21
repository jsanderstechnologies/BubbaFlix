/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { fetchAioStreams } from "../../../utils/aiostreams";
import { markAsWatchedOnSimkl } from "../../../utils/simkl";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import VideoPlayerModal from "../../../components/video-player-modal";
import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle, FiExternalLink } from "react-icons/fi";
import "./index.scss";

const MagnetSection = ({ title, year, seasonNum, episodeNum, tmdbId, mediaType, compact = false }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
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

    setStreams(res.streams || []);
    if (res.streams && res.streams.length > 0) {
      setIsOpen(true);
    }
  };

  const handlePlayStream = (item) => {
    if (!item || !item.url) return;

    setActiveVideoUrl(item.url);
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
                        onClick={() => handlePlayStream(item)}
                      >
                        <FiPlay /> Play Stream
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
