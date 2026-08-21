/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { searchBitsearchMagnets } from "../../../utils/bitsearch";
import { getDirectStreamUrl } from "../../../utils/premiumize";
import { markAsWatchedOnSimkl } from "../../../utils/simkl";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import VideoPlayerModal from "../../../components/video-player-modal";
import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle, FiZap } from "react-icons/fi";
import "./index.scss";

const MagnetSection = ({ title, year, seasonNum, episodeNum, tmdbId, mediaType, compact = false }) => {
  const [magnets, setMagnets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Streaming state
  const [playingIndex, setPlayingIndex] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeRawUrl, setActiveRawUrl] = useState("");
  const [activeFilename, setActiveFilename] = useState("");

  useEffect(() => {
    if (title) {
      fetchMagnets();
    }
  }, [title, year, seasonNum, episodeNum]);

  const fetchMagnets = async () => {
    setLoading(true);
    const { results } = await searchBitsearchMagnets(title, year, seasonNum, episodeNum);
    setLoading(false);
    setMagnets(results || []);
  };

  const handlePlayStream = async (item, index) => {
    setPlayingIndex(index);
    setStreamError(null);

    const { streamUrl, rawUrl, filename, error } = await getDirectStreamUrl(item.magnet);

    setPlayingIndex(null);

    if (error) {
      setStreamError({ index, text: error });
      setTimeout(() => setStreamError(null), 6000);
      return;
    }

    const targetStreamUrl = streamUrl || rawUrl;

    if (targetStreamUrl) {
      setActiveVideoUrl(targetStreamUrl);
      setActiveRawUrl(targetStreamUrl);
      setActiveFilename(filename || item.title);
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
    }
  };

  if (!loading && magnets.length === 0) {
    return null;
  }

  const content = (
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
          {magnets.length > 0 && (
            <span className="countBadge">{magnets.length} Available</span>
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
          ) : (
            <div className="magnetList">
              {magnets.map((item, index) => (
                <div key={index} className={`magnetItem ${item.isCached ? "cachedItem" : ""}`}>
                  <div className="itemInfo">
                    <span className="itemTitle" title={item.title}>
                      {item.title}
                    </span>
                    <div className="itemMeta">
                      {item.isCached && (
                        <span
                          className="metaBadge cached"
                          style={{
                            background: "rgba(34, 197, 94, 0.2)",
                            color: "#4ade80",
                            border: "1px solid rgba(34, 197, 94, 0.4)",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <FiZap style={{ fill: "#4ade80" }} /> INSTANT CACHED
                        </span>
                      )}
                      <span className="metaBadge size">📦 {item.size}</span>
                      <span className="metaBadge seeds">🌱 {item.seeders} Seeds</span>
                      <span className="metaBadge leeches">🩸 {item.leechers} Leeches</span>
                    </div>
                    {streamError && streamError.index === index && (
                      <div className="streamErrorNotice">
                        <FiAlertCircle /> <span>{streamError.text}</span>
                      </div>
                    )}
                  </div>

                  <div className="itemActions">
                    <button
                      className={`actionBtn play ${playingIndex === index ? "loading" : ""} ${item.isCached ? "instantPlay" : ""}`}
                      onClick={() => handlePlayStream(item, index)}
                      onKeyDown={(e) => {
                        const code = e.keyCode;
                        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                          e.preventDefault();
                          handlePlayStream(item, index);
                        }
                      }}
                      disabled={playingIndex === index}
                      tabIndex="0"
                      title={item.isCached ? "Play Instant Cached Stream" : "Stream Video via Premiumize"}
                    >
                      <FiPlay />
                      <span>{playingIndex === index ? "Connecting..." : item.isCached ? "Instant Play" : "Play Stream"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Player Modal */}
      <VideoPlayerModal
        show={showPlayer}
        setShow={setShowPlayer}
        videoUrl={activeVideoUrl}
        rawUrl={activeRawUrl}
        title={title}
        filename={activeFilename}
      />
    </div>
  );

  if (compact) {
    return <div className="magnetSection compact">{content}</div>;
  }

  return (
    <div className="magnetSection">
      <ContentWrapper>{content}</ContentWrapper>
    </div>
  );
};

export default MagnetSection;
