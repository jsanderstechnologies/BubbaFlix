/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { searchBitsearchMagnets } from "../../../utils/bitsearch";
import { getDirectStreamUrl } from "../../../utils/premiumize";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import VideoPlayerModal from "../../../components/video-player-modal";
import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle } from "react-icons/fi";
import "./index.scss";

const MagnetSection = ({ title, year, seasonNum, episodeNum, compact = false }) => {
  const [magnets, setMagnets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Streaming state
  const [playingIndex, setPlayingIndex] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
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

    const { streamUrl, filename, error } = await getDirectStreamUrl(item.magnet);

    setPlayingIndex(null);

    if (error) {
      setStreamError({ index, text: error });
      setTimeout(() => setStreamError(null), 6000);
      return;
    }

    if (streamUrl) {
      setActiveVideoUrl(streamUrl);
      setActiveFilename(filename || item.title);
      setShowPlayer(true);
    }
  };

  if (!loading && magnets.length === 0) {
    return null;
  }

  const content = (
    <div className={`sectionCard ${compact ? "compact" : ""}`}>
      <div className="sectionHeader" onClick={() => setIsOpen(!isOpen)}>
        <div className="headerLeft">
          <span className="sectionTitle">Available Streams</span>
          {magnets.length > 0 && (
            <span className="countBadge">{magnets.length} Available</span>
          )}
        </div>
        <button className="toggleBtn">
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
                <div key={index} className="magnetItem">
                  <div className="itemInfo">
                    <span className="itemTitle" title={item.title}>
                      {item.title}
                    </span>
                    <div className="itemMeta">
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
                      className={`actionBtn play ${playingIndex === index ? "loading" : ""}`}
                      onClick={() => handlePlayStream(item, index)}
                      disabled={playingIndex === index}
                      tabIndex="0"
                      title="Stream Video via Premiumize"
                    >
                      <FiPlay />
                      <span>{playingIndex === index ? "Connecting..." : "Play Stream"}</span>
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
