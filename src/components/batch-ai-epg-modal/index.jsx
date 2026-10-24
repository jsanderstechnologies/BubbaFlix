import React, { useState, useEffect, useRef } from "react";
import {
  FiZap,
  FiX,
  FiCheck,
  FiCheckCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiFilter,
  FiSliders,
  FiLayers,
  FiTv,
  FiKey,
  FiSave,
} from "react-icons/fi";
import {
  cleanChannelTitle,
  batchMatchChannelsWithGroq,
  getGroqApiKey,
  saveGroqApiKey,
} from "../../utils/groqFilter";
import { fetchAllAvailableEpgChannels } from "../../utils/iptv";
import { fetchServerSettings } from "../../utils/serverSettings";
import "./index.scss";

const BatchAiEpgModal = ({
  isOpen,
  onClose,
  channels = [],
  channelsConfig = {},
  onApplyMatches,
}) => {
  if (!isOpen) return null;

  // Filter channels missing an EPG assignment
  const missingEpgChannels = channels.filter((ch) => {
    const sid = String(ch.stream_id);
    const cfg = channelsConfig[sid];
    const customEpg = cfg?.epgChannelId !== undefined ? cfg.epgChannelId : cfg?.epg_channel_id;
    const defaultEpg = ch.default_epg_id || ch.tvg_id || "";
    const currentEpg = (customEpg != null && customEpg !== "") ? customEpg : (ch.epg_channel_id || defaultEpg || "");
    return !currentEpg || currentEpg.trim() === "";
  });

  const [phase, setPhase] = useState("configure"); // configure | matching | review | applying
  const [matchScope, setMatchScope] = useState(missingEpgChannels.length > 0 ? "missing" : "all");
  const [minConfidence, setMinConfidence] = useState(65);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0, matchesSoFar: 0 });
  const [matches, setMatches] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterTab, setFilterTab] = useState("matched");
  const [errorNotice, setErrorNotice] = useState(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [keyInput, setKeyInput] = useState("");

  const abortControllerRef = useRef(null);

  // Target channels based on scope
  const targetChannels = matchScope === "missing" ? missingEpgChannels : channels;

  // Smart TV Remote Back key / Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const code = e.keyCode;
      if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
        if (phase === "matching") {
          handleCancelMatching();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [phase, onClose]);

  const handleStartMatching = async () => {
    setErrorNotice(null);

    let key = getGroqApiKey();
    if (!key) {
      const settings = await fetchServerSettings();
      if (settings?.groqKey) {
        key = settings.groqKey;
        localStorage.setItem("groq_api_key", key);
      }
    }

    if (!key) {
      setShowKeyPrompt(true);
      return;
    }

    if (targetChannels.length === 0) {
      setErrorNotice("No channels found for the selected matching scope.");
      return;
    }

    setPhase("matching");
    setProgress({ current: 0, total: targetChannels.length, percentage: 0, matchesSoFar: 0 });

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      // 1. Fetch entire EPG channel database
      const allEpgChannels = await fetchAllAvailableEpgChannels(5000);

      // 2. Run batch AI matching in chunks
      const results = await batchMatchChannelsWithGroq(targetChannels, allEpgChannels, {
        batchSize: 6,
        signal: abortCtrl.signal,
        onProgress: (p) => {
          setProgress(p);
        },
      });

      if (!abortCtrl.signal.aborted) {
        setMatches(results);

        // Pre-select confident matches
        const initialSelected = new Set();
        for (const item of results) {
          if (item.matched_epg_id && (item.confidence >= minConfidence || item.confidence === 0)) {
            initialSelected.add(item.stream_id);
          }
        }
        setSelectedIds(initialSelected);
        setPhase("review");
      }
    } catch (err) {
      if (!abortCtrl.signal.aborted) {
        setErrorNotice(`Batch AI matching failed: ${err.message}`);
        setPhase("configure");
      }
    }
  };

  const handleCancelMatching = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setPhase("configure");
  };

  const handleSaveKeyAndStart = async () => {
    if (!keyInput.trim()) return;
    await saveGroqApiKey(keyInput.trim());
    setShowKeyPrompt(false);
    handleStartMatching();
  };

  const toggleSelectId = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAllMatched = () => {
    const next = new Set();
    for (const m of matches) {
      if (m.matched_epg_id) next.add(m.stream_id);
    }
    setSelectedIds(next);
  };

  const handleSelectHighConfidence = () => {
    const next = new Set();
    for (const m of matches) {
      if (m.matched_epg_id && m.confidence >= 80) next.add(m.stream_id);
    }
    setSelectedIds(next);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApplyMatches = async () => {
    if (selectedIds.size === 0) {
      setErrorNotice("Please select at least one matched channel to apply.");
      return;
    }

    setPhase("applying");
    try {
      const matchMap = {};
      for (const m of matches) {
        if (selectedIds.has(m.stream_id) && m.matched_epg_id) {
          matchMap[m.stream_id] = m.matched_epg_id;
        }
      }

      if (typeof onApplyMatches === "function") {
        await onApplyMatches(matchMap);
      }
      onClose();
    } catch (err) {
      setErrorNotice(`Failed to apply EPG matches: ${err.message}`);
      setPhase("review");
    }
  };

  // Filtered review list
  const matchedList = matches.filter((m) => m.matched_epg_id);
  const highConfList = matches.filter((m) => m.matched_epg_id && m.confidence >= 80);
  const unmatchedList = matches.filter((m) => !m.matched_epg_id);

  let displayedMatches = matches;
  if (filterTab === "matched") displayedMatches = matchedList;
  else if (filterTab === "high_confidence") displayedMatches = highConfList;
  else if (filterTab === "unmatched") displayedMatches = unmatchedList;

  return (
    <div className="batchAiModalOverlay" onClick={phase === "matching" ? null : onClose}>
      <div className="batchAiModalCard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="batchAiHeader">
          <div className="headerTitles">
            <h2>
              <FiZap className="headerIcon" /> Groq AI EPG Auto-Matcher
            </h2>
            <p>Automatically match channel names to your XMLTV EPG guide using Groq LLaMA 3.3 AI</p>
          </div>
          <button
            type="button"
            tabIndex={0}
            className="closeBtn"
            onClick={phase === "matching" ? handleCancelMatching : onClose}
            title="Close (Escape / Back)"
          >
            <FiX />
          </button>
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div className="batchNotice error">
            <FiAlertCircle />
            <span>{errorNotice}</span>
          </div>
        )}

        {/* Missing Groq Key Prompt */}
        {showKeyPrompt && (
          <div className="keyPromptBox">
            <div className="promptHead">
              <FiKey className="promptKeyIcon" />
              <span>Groq API Key Required for AI Matching</span>
            </div>
            <p>
              Enter your free Groq API key (from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>) to start ultra-fast AI matching.
            </p>
            <div className="promptInputRow">
              <input
                type="password"
                placeholder="gsk_..."
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveKeyAndStart();
                }}
              />
              <button type="button" tabIndex={0} className="saveKeyBtn" onClick={handleSaveKeyAndStart}>
                Save & Continue
              </button>
            </div>
          </div>
        )}

        {/* PHASE 1: Configure Scope */}
        {phase === "configure" && (
          <div className="batchConfigBody">
            <div className="scopeSection">
              <label className="sectionTitle">Select Channels to Auto-Match:</label>
              <div className="scopeOptionsGrid">
                <div
                  className={`scopeOptionCard ${matchScope === "missing" ? "selected" : ""}`}
                  onClick={() => setMatchScope("missing")}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setMatchScope("missing");
                  }}
                >
                  <div className="scopeRadio">
                    <div className="innerCircle" />
                  </div>
                  <div className="scopeText">
                    <span className="scopeTitle">Channels Missing EPG (Recommended)</span>
                    <span className="scopeDesc">
                      Scan only channels that currently have no guide schedule assigned ({missingEpgChannels.length} channels).
                    </span>
                  </div>
                  <span className="scopeBadge">{missingEpgChannels.length} Channels</span>
                </div>

                <div
                  className={`scopeOptionCard ${matchScope === "all" ? "selected" : ""}`}
                  onClick={() => setMatchScope("all")}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setMatchScope("all");
                  }}
                >
                  <div className="scopeRadio">
                    <div className="innerCircle" />
                  </div>
                  <div className="scopeText">
                    <span className="scopeTitle">All Currently Filtered Channels</span>
                    <span className="scopeDesc">
                      Re-evaluate and find the best EPG match for all showing channels ({channels.length} channels).
                    </span>
                  </div>
                  <span className="scopeBadge">{channels.length} Channels</span>
                </div>
              </div>
            </div>

            <div className="settingsRow">
              <div className="settingItem">
                <label>
                  <FiSliders /> Auto-Select Threshold:
                </label>
                <div className="confidenceSelectWrapper">
                  <select
                    value={minConfidence}
                    onChange={(e) => setMinConfidence(Number(e.target.value))}
                  >
                    <option value={80}>High Confidence (80%+)</option>
                    <option value={65}>Medium Confidence (65%+ - Default)</option>
                    <option value={50}>Broad Matches (50%+)</option>
                  </select>
                </div>
              </div>
              <div className="engineInfo">
                <span className="groqPill">
                  <FiZap /> Powered by Groq LLaMA 3.3 70B
                </span>
                <span className="speedNote">~500 tokens/sec ultra-fast inference</span>
              </div>
            </div>

            <div className="modalFooter">
              <button type="button" tabIndex={0} className="cancelBtn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                tabIndex={0}
                className="startMatchBtn"
                onClick={handleStartMatching}
                disabled={targetChannels.length === 0}
              >
                <FiZap /> Start AI Matching ({targetChannels.length} Channels)
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: Matching In Progress */}
        {phase === "matching" && (
          <div className="batchMatchingBody">
            <div className="matchingAnimation">
              <FiZap className="pulsingZap" />
              <FiRefreshCw className="spinningGear" />
            </div>
            <h3>Groq AI Analyzing Live TV Channels...</h3>
            <p className="matchingSubtitle">
              Extracting network call signs, stripping stream noise, and searching XMLTV guide schedules.
            </p>

            <div className="progressBarContainer">
              <div
                className="progressBarFill"
                style={{ width: `${progress.percentage || 5}%` }}
              />
            </div>

            <div className="progressMeta">
              <span>
                Processed <strong>{progress.current}</strong> of <strong>{progress.total}</strong> channels ({progress.percentage}%)
              </span>
              <span className="matchesFoundBadge">
                ✨ {progress.matchesSoFar} Matches Found
              </span>
            </div>

            <div className="matchingFooter">
              <button type="button" tabIndex={0} className="cancelMatchBtn" onClick={handleCancelMatching}>
                Stop / Cancel
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: Review & Approval */}
        {phase === "review" && (
          <div className="batchReviewBody">
            <div className="reviewSummaryBar">
              <div className="summaryItem">
                <span className="num">{matches.length}</span>
                <span className="lbl">Total Processed</span>
              </div>
              <div className="summaryItem matched">
                <span className="num">{matchedList.length}</span>
                <span className="lbl">Matches Found</span>
              </div>
              <div className="summaryItem high">
                <span className="num">{highConfList.length}</span>
                <span className="lbl">High Confidence (80%+)</span>
              </div>
              <div className="summaryItem selected">
                <span className="num">{selectedIds.size}</span>
                <span className="lbl">Selected to Apply</span>
              </div>
            </div>

            {/* Filter Tabs & Bulk Actions */}
            <div className="reviewToolbar">
              <div className="filterTabs">
                <button
                  type="button"
                  tabIndex={0}
                  className={`tabBtn ${filterTab === "matched" ? "active" : ""}`}
                  onClick={() => setFilterTab("matched")}
                >
                  Matched ({matchedList.length})
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  className={`tabBtn ${filterTab === "high_confidence" ? "active" : ""}`}
                  onClick={() => setFilterTab("high_confidence")}
                >
                  High Confidence ({highConfList.length})
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  className={`tabBtn ${filterTab === "all" ? "active" : ""}`}
                  onClick={() => setFilterTab("all")}
                >
                  All ({matches.length})
                </button>
                {unmatchedList.length > 0 && (
                  <button
                    type="button"
                    tabIndex={0}
                    className={`tabBtn ${filterTab === "unmatched" ? "active" : ""}`}
                    onClick={() => setFilterTab("unmatched")}
                  >
                    Unmatched ({unmatchedList.length})
                  </button>
                )}
              </div>

              <div className="bulkSelectionActions">
                <button
                  type="button"
                  tabIndex={0}
                  className="quickSelectBtn"
                  onClick={handleSelectHighConfidence}
                  title="Select only matches with 80%+ confidence"
                >
                  <FiCheck /> Select 80%+
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  className="quickSelectBtn"
                  onClick={handleSelectAllMatched}
                >
                  Select All
                </button>
                <button
                  type="button"
                  tabIndex={0}
                  className="quickSelectBtn"
                  onClick={handleDeselectAll}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Results Review Table */}
            <div className="reviewTableContainer">
              <table className="reviewTable">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input
                        type="checkbox"
                        checked={displayedMatches.length > 0 && displayedMatches.every((m) => !m.matched_epg_id || selectedIds.has(m.stream_id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const next = new Set(selectedIds);
                            for (const m of displayedMatches) {
                              if (m.matched_epg_id) next.add(m.stream_id);
                            }
                            setSelectedIds(next);
                          } else {
                            const next = new Set(selectedIds);
                            for (const m of displayedMatches) next.delete(m.stream_id);
                            setSelectedIds(next);
                          }
                        }}
                      />
                    </th>
                    <th style={{ width: 70 }}>Ch. #</th>
                    <th>Target Channel</th>
                    <th>Category</th>
                    <th>Matched EPG Guide</th>
                    <th style={{ width: 110 }}>Confidence</th>
                    <th>AI Reasoning</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedMatches.map((item) => {
                    const isSelected = selectedIds.has(item.stream_id);
                    const isMatched = Boolean(item.matched_epg_id);

                    return (
                      <tr
                        key={item.stream_id}
                        className={`reviewRow ${isSelected ? "selected" : ""} ${!isMatched ? "unmatched" : ""}`}
                        onClick={() => {
                          if (isMatched) toggleSelectId(item.stream_id);
                        }}
                      >
                        <td>
                          {isMatched ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleSelectId(item.stream_id);
                              }}
                            />
                          ) : (
                            <span className="unmatchedDash">-</span>
                          )}
                        </td>
                        <td className="chNumCell">{item.channel_number || "-"}</td>
                        <td className="channelNameCell">
                          <div className="nameWrapper">
                            <span className="rawName">{item.name}</span>
                            {item.clean_name && item.clean_name !== item.name && (
                              <span className="cleanName">Cleaned: {item.clean_name}</span>
                            )}
                          </div>
                        </td>
                        <td className="catCell">{item.category_name}</td>
                        <td className="matchedEpgCell">
                          {isMatched ? (
                            <div className="epgResultWrapper">
                              <span className="epgName">{item.matched_name || item.matched_epg_id}</span>
                              <code className="epgIdTag">{item.matched_epg_id}</code>
                            </div>
                          ) : (
                            <span className="noMatchText">No confident match</span>
                          )}
                        </td>
                        <td>
                          {isMatched ? (
                            <span
                              className={`confidenceBadge ${
                                item.confidence >= 80 ? "high" : item.confidence >= 60 ? "medium" : "low"
                              }`}
                            >
                              {item.confidence}%
                            </span>
                          ) : (
                            <span className="confidenceBadge zero">0%</span>
                          )}
                        </td>
                        <td className="reasonCell">{item.reason || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Actions Footer */}
            <div className="modalFooter">
              <button
                type="button"
                tabIndex={0}
                className="cancelBtn"
                onClick={() => setPhase("configure")}
              >
                Back to Settings
              </button>
              <button
                type="button"
                tabIndex={0}
                className="applyBtn"
                onClick={handleApplyMatches}
                disabled={selectedIds.size === 0}
              >
                <FiSave /> Apply & Save ({selectedIds.size}) EPG Matches
              </button>
            </div>
          </div>
        )}

        {/* PHASE 4: Applying Matches */}
        {phase === "applying" && (
          <div className="batchApplyingBody">
            <FiRefreshCw className="spinner" />
            <h3>Applying & Saving EPG Assignments...</h3>
            <p>Updating channel configuration and syncing with server.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchAiEpgModal;
