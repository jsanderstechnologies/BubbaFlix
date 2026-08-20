/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { searchBitsearchMagnets } from "../../../utils/bitsearch";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import { FiCopy, FiCheck, FiChevronDown, FiChevronUp, FiExternalLink } from "react-icons/fi";
import "./index.scss";

const MagnetSection = ({ title, year }) => {
  const [magnets, setMagnets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    if (title) {
      fetchMagnets();
    }
  }, [title, year]);

  const fetchMagnets = async () => {
    setLoading(true);
    const { results } = await searchBitsearchMagnets(title, year);
    setLoading(false);
    setMagnets(results || []);
  };

  const handleCopyMagnet = (magnet, index) => {
    navigator.clipboard.writeText(magnet);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  if (!loading && magnets.length === 0) {
    return null;
  }

  return (
    <div className="magnetSection">
      <ContentWrapper>
        <div className="sectionCard">
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
                      </div>
                      <div className="itemActions">
                        <button
                          className={`actionBtn copy ${copiedIndex === index ? "copied" : ""}`}
                          onClick={() => handleCopyMagnet(item.magnet, index)}
                          title="Copy Magnet Link"
                        >
                          {copiedIndex === index ? <FiCheck /> : <FiCopy />}
                          <span>{copiedIndex === index ? "Copied!" : "Copy"}</span>
                        </button>
                        <a
                          href={item.magnet}
                          className="actionBtn open"
                          title="Open in Torrent Client"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FiExternalLink />
                          <span>Open</span>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ContentWrapper>
    </div>
  );
};

export default MagnetSection;
