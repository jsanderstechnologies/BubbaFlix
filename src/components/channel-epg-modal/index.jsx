import React, { useState, useEffect, useRef } from "react";
import {
  FiTv,
  FiX,
  FiSearch,
  FiCheck,
  FiSave,
  FiRefreshCw,
  FiRotateCcw,
  FiAlertCircle,
  FiCheckCircle,
  FiLayers,
} from "react-icons/fi";
import { fetchAvailableEpgChannels, assignChannelEpg } from "../../utils/iptv";
import "./index.scss";

const ChannelEpgModal = ({ channel, isOpen, onClose, onSave }) => {
  if (!isOpen || !channel) return null;

  const defaultEpg = channel.default_epg_id || channel.tvg_id || "";
  const currentAssigned = channel.epg_channel_id || defaultEpg || "";

  const [selectedEpgId, setSelectedEpgId] = useState(currentAssigned);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableChannels, setAvailableChannels] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const searchTimerRef = useRef(null);

  // Initial load of top EPG channels
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingAvailable(true);
      const list = await fetchAvailableEpgChannels(searchQuery);
      if (isMounted) {
        setAvailableChannels(list || []);
        setLoadingAvailable(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced search when query changes
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setLoadingAvailable(true);
      const list = await fetchAvailableEpgChannels(searchQuery);
      setAvailableChannels(list || []);
      setLoadingAvailable(false);
    }, 280);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // Handle Smart TV / Remote Back key or Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const code = e.keyCode;
      if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await assignChannelEpg(channel.stream_id, selectedEpgId.trim());
      setSaving(false);
      if (res.success) {
        setSaveStatus({ type: "success", text: "EPG assignment saved successfully!" });
        if (typeof onSave === "function") {
          onSave(channel.stream_id, selectedEpgId.trim());
        }
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        setSaveStatus({ type: "error", text: res.error || "Failed to save EPG assignment." });
      }
    } catch (err) {
      setSaving(false);
      setSaveStatus({ type: "error", text: err.message || "Failed to save EPG assignment." });
    }
  };

  const handleResetToDefault = () => {
    setSelectedEpgId(defaultEpg);
  };

  const handleClearEpg = () => {
    setSelectedEpgId("");
  };

  const isCustom = selectedEpgId && selectedEpgId !== defaultEpg;

  return (
    <div className="channelEpgModalOverlay" onClick={onClose}>
      <div className="channelEpgModalCard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modalHeader">
          <div className="headerTitles">
            <h2>
              <FiTv className="headerIcon" /> Assign Channel EPG Guide
            </h2>
            <p>Connect this channel to a guide schedule from your XMLTV guide or another channel</p>
          </div>
          <button type="button" tabIndex={0} className="closeBtn" onClick={onClose} title="Close (Back / Escape)">
            <FiX />
          </button>
        </div>

        {/* Current Channel Info Card */}
        <div className="channelContextCard">
          <div className="channelLogoCol">
            {channel.stream_icon ? (
              <img
                src={channel.stream_icon}
                alt=""
                className="channelLogoImg"
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <FiTv className="fallbackIcon" />
            )}
          </div>
          <div className="channelMetaCol">
            <div className="nameRow">
              <span className="chNumBadge">Ch. {channel.channel_number}</span>
              <span className="chName">{channel.name || channel.original_name}</span>
            </div>
            <div className="detailsRow">
              <span className="catBadge">
                <FiLayers style={{ marginRight: 4 }} /> {channel.category_name || "General"}
              </span>
              <span className="defaultEpgInfo">
                Provider Default: <code>{defaultEpg || "None"}</code>
              </span>
            </div>
          </div>
        </div>

        {/* Status Notice */}
        {saveStatus && (
          <div className={`saveNotice ${saveStatus.type}`}>
            {saveStatus.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
            <span>{saveStatus.text}</span>
          </div>
        )}

        {/* Active Assignment Input */}
        <div className="assignmentSection">
          <div className="sectionLabelRow">
            <label>Assigned EPG Channel ID (XMLTV ID or Stream ID):</label>
            <div className="quickActions">
              {defaultEpg && selectedEpgId !== defaultEpg && (
                <button
                  type="button"
                  tabIndex={0}
                  className="quickBtn resetBtn"
                  onClick={handleResetToDefault}
                  title="Revert back to the provider's default EPG ID"
                >
                  <FiRotateCcw /> Use Default ({defaultEpg})
                </button>
              )}
              {selectedEpgId && (
                <button
                  type="button"
                  tabIndex={0}
                  className="quickBtn clearBtn"
                  onClick={handleClearEpg}
                  title="Remove EPG assignment"
                >
                  <FiX /> Clear
                </button>
              )}
            </div>
          </div>

          <div className="epgInputWrapper">
            <input
              type="text"
              className="epgIdInput"
              placeholder="e.g. CNN.us, HBO.East, or numeric stream ID"
              value={selectedEpgId}
              onChange={(e) => setSelectedEpgId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.keyCode === 13) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
            {isCustom && <span className="customBadge">CUSTOM ASSIGNED</span>}
          </div>
        </div>

        {/* EPG Database Search & Picker */}
        <div className="databaseSearchSection">
          <div className="searchLabelRow">
            <label>Search EPG Database (XMLTV Guide & Channels):</label>
            <span className="countInfo">
              {availableChannels.length} available {searchQuery ? `matching "${searchQuery}"` : ""}
            </span>
          </div>

          <div className="searchBoxWrapper">
            <FiSearch className="searchIcon" />
            <input
              type="text"
              className="dbSearchInput"
              placeholder="Type to search guide (e.g. HBO, ESPN, Fox, News)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                tabIndex={0}
                className="clearSearchBtn"
                onClick={() => setSearchQuery("")}
                title="Clear Search"
              >
                <FiX />
              </button>
            )}
          </div>

          <div className="epgResultsList">
            {loadingAvailable ? (
              <div className="resultsLoading">
                <FiRefreshCw className="spinning" />
                <span>Searching EPG database...</span>
              </div>
            ) : availableChannels.length === 0 ? (
              <div className="resultsEmpty">
                <FiAlertCircle />
                <span>No matching EPG channels found. You can type any XMLTV ID manually above.</span>
              </div>
            ) : (
              availableChannels.map((item) => {
                const isSelected = selectedEpgId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`epgResultItem ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedEpgId(item.id)}
                  >
                    <div className="itemIconCol">
                      {item.icon ? (
                        <img
                          src={item.icon}
                          alt=""
                          className="itemIconImg"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <FiTv className="itemFallbackIcon" />
                      )}
                    </div>
                    <div className="itemTextCol">
                      <span className="itemDisplayName">{item.name}</span>
                      <span className="itemIdTag">{item.id}</span>
                    </div>
                    <div className="itemSourceCol">
                      <span className={`sourceBadge ${item.source === "XMLTV Guide" ? "xmltv" : "playlist"}`}>
                        {item.source}
                      </span>
                    </div>
                    <div className="itemActionCol">
                      <button
                        type="button"
                        tabIndex={0}
                        className={`selectBtn ${isSelected ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEpgId(item.id);
                        }}
                      >
                        {isSelected ? (
                          <>
                            <FiCheck /> Assigned
                          </>
                        ) : (
                          "Use EPG"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="modalFooter">
          <button type="button" tabIndex={0} className="cancelBtn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" tabIndex={0} className="saveBtn" onClick={handleSave} disabled={saving}>
            <FiSave /> {saving ? "Saving..." : "Save EPG Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelEpgModal;
