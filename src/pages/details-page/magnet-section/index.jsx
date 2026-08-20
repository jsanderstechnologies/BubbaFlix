/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { searchBitsearchMagnets, getBitsearchApiKey } from "../../../utils/bitsearch";
import ContentWrapper from "../../../components/content-wrapper";
import Spinner from "../../../components/spinner";
import { FiDownload, FiCopy, FiCheck, FiChevronDown, FiChevronUp, FiAlertCircle, FiSettings, FiExternalLink } from "react-icons/fi";
import "./index.scss";

const MagnetSection = ({ title, year }) => {
  const [magnets, setMagnets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const key = getBitsearchApiKey();
    setHasApiKey(!!key);

    if (title) {
      fetchMagnets();
    }
  }, [title, year]);

  const fetchMagnets = async () => {
    setLoading(true);
    setError(null);
    const { results, error: apiErr } = await searchBitsearchMagnets(title, year);
    setLoading(false);
    if (apiErr) {
      setError(apiErr);
    } else {
      setMagnets(results);
    }
  };

  const handleCopyMagnet = (magnet, index) => {
    navigator.clipboard.writeText(magnet);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div className="magnetSection">
      <ContentWrapper>
        <div className="sectionCard">
          <div className="sectionHeader" onClick={() => setIsOpen(!isOpen)}>
            <div className="headerLeft">
              <span className="icon">🧲</span>
              <span className="sectionTitle">Torrent Magnet Links (Bitsearch)</span>
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
              {!hasApiKey && (
                <div className="apiKeyNotice">
                  <FiAlertCircle className="noticeIcon" />
                  <span>
                    No Bitsearch API Key configured. Results use public search. For higher rate limits, add your key in{" "}
                    <Link to="/settings" className="settingsLink">
                      <FiSettings /> Settings
                    </Link>.
                  </span>
                </div>
              )}

              {loading && (
                <div className="loadingContainer">
                  <Spinner />
                  <p>Searching Bitsearch for &quot;{title} {year || ""}&quot;...</p>
                </div>
              )}

              {error && (
                <div className="errorContainer">
                  <FiAlertCircle />
                  <span>{error}</span>
                  <button onClick={fetchMagnets} className="retryBtn">Retry</button>
                </div>
              )}

              {!loading && !error && magnets.length === 0 && (
                <div className="emptyContainer">
                  <p>No torrent magnet links found for &quot;{title}&quot;.</p>
                </div>
              )}

              {!loading && !error && magnets.length > 0 && (
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
