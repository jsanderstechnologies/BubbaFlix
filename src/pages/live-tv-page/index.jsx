import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTv,
  FiPlay,
  FiVideo,
  FiRefreshCw,
  FiTrash2,
  FiClock,
  FiSettings,
  FiGrid,
  FiList,
  FiChevronLeft,
  FiChevronRight,
  FiSearch,
  FiFilter,
  FiInfo,
  FiX,
  FiCircle
} from "react-icons/fi";
import { fetchServerSettings } from "../../utils/serverSettings";
import {
  getDispatcharrConfigAsync,
  fetchDispatcharrChannels,
  fetchDispatcharrEpg,
  fetchDispatcharrRecordings,
  scheduleDispatcharrRecording,
  deleteDispatcharrRecording,
  getDispatcharrStreamUrl
} from "../../utils/dispatcharr";
import VideoPlayerModal from "../../components/video-player-modal";
import RecordingModal from "../../components/recording-modal";
import ProgramDetailModal from "../../components/program-detail-modal";
import RecordingDetailsModal from "../../components/recording-details-modal";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import "./index.scss";

// EPG Grid Config
const HOUR_WIDTH = 320; // 320px per 1 hour (160px per 30 min)
const TOTAL_HOURS = 8; // Display 8 hours of timeline

const LiveTvPage = ({ defaultTab = "guide" }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(defaultTab); // "guide" (EPG Grid), "channels" (Card Grid), "recordings"
  const [viewMode, setViewMode] = useState("epgGrid"); // "epgGrid", "cards"

  // Config State
  const [serverUrl, setServerUrl] = useState("");

  // Data State
  const [channels, setChannels] = useState([]);
  const [epgData, setEpgData] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State (Dispatcharr Style)
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("all");

  // EPG Timeline State
  const [timeSlots, setTimeSlots] = useState([]);
  const [timelineStart, setTimelineStart] = useState(new Date());
  const gridScrollRef = useRef(null);

  // Player Modal State
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerStreamUrl, setPlayerStreamUrl] = useState("");
  const [playerTitle, setPlayerTitle] = useState("");
  const [playerChannelLogo, setPlayerChannelLogo] = useState("");

  // DVR Recording Modal State
  const [showRecModal, setShowRecModal] = useState(false);
  const [recTargetProgram, setRecTargetProgram] = useState(null);
  const [recTargetChannel, setRecTargetChannel] = useState(null);

  // Program Detail Modal State (Dispatcharr Style)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProgram, setDetailProgram] = useState(null);
  const [detailChannel, setDetailChannel] = useState(null);

  // Recording Details Modal State (Dispatcharr Style)
  const [showRecDetailsModal, setShowRecDetailsModal] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);

  const handleOpenRecDetailsModal = (rec) => {
    setSelectedRecording(rec);
    setShowRecDetailsModal(true);
  };

  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    reportClientLog(`[Live TV Fetch Initiated] Mode: ${isSilent ? "Background Auto-Refresh" : "Page/Tab Navigation"}`);
    try {
      const [chRes, epgRes, recRes] = await Promise.allSettled([
        fetchDispatcharrChannels(),
        fetchDispatcharrEpg(),
        fetchDispatcharrRecordings()
      ]);
      const chData = chRes.status === "fulfilled" && Array.isArray(chRes.value) ? chRes.value : [];
      const epgList = epgRes.status === "fulfilled" && Array.isArray(epgRes.value) ? epgRes.value : [];
      const recList = recRes.status === "fulfilled" && Array.isArray(recRes.value) ? recRes.value : [];

      setChannels(chData);
      setEpgData(epgList);
      setRecordings(recList);
      reportClientLog(`[Live TV Fetch Completed Successfully] Channels: ${chData.length}, EPG Programs: ${epgList.length}, DVR Recordings: ${recList.length}`);
    } catch (err) {
      console.error("[Live TV Load Error]:", err);
      reportClientLog(`[Live TV Fetch Error] ${err.message}`, "ERROR");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const generateTimeline = useCallback((baseDate = new Date()) => {
    const start = new Date(baseDate);
    start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
    start.setHours(start.getHours() - 1);
    setTimelineStart(start);

    const slots = [];
    const numSlots = TOTAL_HOURS * 2; // 30-min increments
    for (let i = 0; i < numSlots; i++) {
      const slotTime = new Date(start.getTime() + i * 30 * 60 * 1000);
      const hours = slotTime.getHours();
      const minutes = slotTime.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

      slots.push({
        time: slotTime,
        label: `${formattedHours}:${formattedMinutes} ${ampm}`,
        timestamp: slotTime.getTime()
      });
    }
    setTimeSlots(slots);
  }, []);

  useEffect(() => {
    window.refreshEpgAndRecordings = () => loadAllData(true);
    const initConfig = async () => {
      await fetchServerSettings();
      const cfg = await getDispatcharrConfigAsync();
      setServerUrl(cfg.url);
      loadAllData();
    };
    initConfig();
    generateTimeline();

    // Auto-update and auto-populate EPG and DVR recordings every 5 minutes (300,000 ms)
    const interval = setInterval(() => {
      loadAllData(true);
    }, 5 * 60 * 1000);

    return () => {
      delete window.refreshEpgAndRecordings;
      clearInterval(interval);
    };
  }, [loadAllData, generateTimeline]);

  useEffect(() => {
    // Refresh channels, EPG, and DVR recordings whenever switching tabs (Grid, EPG, Recordings)
    loadAllData(true);
  }, [activeTab, loadAllData]);

  // Compute unique channel groups for filter dropdown
  const channelGroups = useMemo(() => {
    const groups = new Set();
    channels.forEach((ch) => {
      const grp = ch.group || ch.channel_group || ch.category;
      if (grp) groups.add(grp);
    });
    return Array.from(groups).sort();
  }, [channels]);

  // Filter and sort channels (Lowest channel number first)
  const filteredChannels = useMemo(() => {
    const list = channels.filter((ch) => {
      const chName = (ch.name || "").toLowerCase();
      const chNum = String(ch.number || ch.channel_number || ch.ch_number || ch.id || "");
      const chGrp = (ch.group || ch.channel_group || ch.category || "").toLowerCase();

      const matchesSearch = !searchQuery || chName.includes(searchQuery.toLowerCase()) || chNum.includes(searchQuery);
      const matchesGroup = selectedGroup === "all" || chGrp === selectedGroup.toLowerCase();

      return matchesSearch && matchesGroup;
    });

    return list.sort((a, b) => {
      const getNum = (ch) => {
        const val = ch.number || ch.channel_number || ch.ch_number || ch.id;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 999999 : parsed;
      };
      const numA = getNum(a);
      const numB = getNum(b);
      if (numA !== numB) return numA - numB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [channels, searchQuery, selectedGroup]);

  const handlePlayChannel = (channel) => {
    const streamUrl = getDispatcharrStreamUrl(channel);
    setPlayerStreamUrl(streamUrl);
    setPlayerTitle(channel.name || `Channel ${channel.number || ""}`);
    setPlayerChannelLogo(channel.logo || channel.icon || channel.tvg_logo || "");
    setShowPlayer(true);
  };

  const handlePlayRecording = (rec) => {
    const streamUrl = rec.stream_url || getDispatcharrStreamUrl(rec);
    setPlayerStreamUrl(streamUrl);
    setPlayerTitle(rec.title || "DVR Recording");
    setPlayerChannelLogo(rec.logo || rec.channel_logo || rec.channel_icon || "");
    setShowPlayer(true);
  };

  const getRecordingStatusForProgram = (program, channel) => {
    if (!recordings || recordings.length === 0 || !program) return null;

    const progTitle = (program.title || program.name || "").trim().toLowerCase();
    const progId = String(program.id || program.event_id || program.epg_id || "");
    const chId = String(channel?.id || channel?.channel_id || channel?.number || program.channel || program.channel_id || "");
    const chName = (channel?.name || channel?.title || program.channel_name || "").trim().toLowerCase();

    const rawStart = program.start_time || program.start || program.start_at || program.start_timestamp || program.time_start || program.startTime;
    const rawEnd = program.end_time || program.end || program.end_at || program.end_timestamp || program.time_end || program.endTime;

    const progStartMs = rawStart ? new Date(rawStart).getTime() : null;
    const progEndMs = rawEnd ? new Date(rawEnd).getTime() : (progStartMs ? progStartMs + 60 * 60 * 1000 : null);
    const nowMs = Date.now();

    for (const rec of recordings) {
      const recId = String(rec.program_id || rec.epg_event_id || rec.event_id || rec.custom_properties?.program_id || "");
      const recTitle = (rec.title || rec.name || rec.program_name || "").trim().toLowerCase();
      const recChId = String(rec.channel || rec.channel_id || rec.channel_number || "");
      const recChName = (rec.channel_display || rec.channel_name || "").trim().toLowerCase();

      // Direct ID match
      const isIdMatch = progId && recId && progId === recId;

      // Title match
      const isTitleMatch = progTitle && recTitle && (
        progTitle === recTitle ||
        progTitle.includes(recTitle) ||
        recTitle.includes(progTitle)
      );

      // Channel match
      const isChannelMatch = !chId || !recChId || chId === recChId || (chName && recChName && (chName.includes(recChName) || recChName.includes(chName)));

      // Time match check
      let isTimeMatch = true;
      if (progStartMs && rec.start_time) {
        const recStartMs = new Date(rec.start_time).getTime();
        if (!isNaN(recStartMs)) {
          isTimeMatch = Math.abs(progStartMs - recStartMs) < 15 * 60 * 1000;
        }
      }

      if (isIdMatch || (isTitleMatch && isChannelMatch && (isTimeMatch || rec.is_recurring))) {
        const recStatus = (rec.status || rec.custom_properties?.status || "").toLowerCase();
        const isCurrentlyRecording = recStatus === "recording" || recStatus === "in_progress" || (progStartMs && progEndMs && nowMs >= progStartMs && nowMs <= progEndMs);

        return {
          recording: rec,
          status: isCurrentlyRecording ? "recording" : "scheduled"
        };
      }
    }

    return null;
  };

  const isNewEpisode = (prog) => {
    if (!prog) return false;
    if (prog.is_new === true || prog.new === true || prog.isNew === true || prog.new_episode === true) return true;
    if (typeof prog.flags === "string" && prog.flags.toLowerCase().includes("new")) return true;
    if (Array.isArray(prog.flags) && prog.flags.some((f) => String(f).toLowerCase().includes("new"))) return true;
    if (typeof prog.categories === "string" && prog.categories.toLowerCase().includes("new")) return true;
    if (Array.isArray(prog.categories) && prog.categories.some((c) => String(c).toLowerCase().includes("new"))) return true;
    if (prog.previously_shown === false || prog.previously_shown === "false") return true;
    if (prog.new_release === true) return true;
    return false;
  };

  const getCurrentProgramForChannel = (channel) => {
    if (!channel) return null;
    const chId = String(channel.id || channel.channel_id || channel.uuid || "").trim().toLowerCase();
    const chNum = String(channel.number || channel.channel_number || "").trim();
    const chName = (channel.name || channel.title || channel.callsign || "").trim().toLowerCase();
    const now = new Date();

    if (epgData && epgData.length > 0) {
      const channelPrograms = epgData.filter((p) => {
        const pChId = String(p.channel_id || p.channel || "").trim().toLowerCase();
        const pChNum = String(p.channel_number || "").trim();
        const pChName = String(p.channel_name || p.channel_title || "").trim().toLowerCase();

        return (
          (chId && pChId && (chId === pChId || chId.endsWith(pChId) || pChId.endsWith(chId))) ||
          (chNum && pChNum && chNum === pChNum) ||
          (chName && pChName && (chName === pChName || chName.includes(pChName) || pChName.includes(chName)))
        );
      });

      const currentProg = channelPrograms.find((prog) => {
        const rawStart = prog.start_time || prog.start || prog.start_at || prog.start_timestamp || prog.time_start || prog.startTime;
        const rawEnd = prog.end_time || prog.end || prog.end_at || prog.end_timestamp || prog.time_end || prog.endTime;
        if (!rawStart) return false;
        const start = new Date(rawStart);
        const end = rawEnd ? new Date(rawEnd) : new Date(start.getTime() + 60 * 60 * 1000);
        return now >= start && now <= end;
      });

      if (currentProg) return currentProg;
      if (channelPrograms.length > 0) return channelPrograms[0];
    }

    if (channel.current_program) return channel.current_program;
    if (channel.now_playing || channel.program_description) {
      return {
        title: channel.now_playing || channel.name || "Live Broadcast",
        description: channel.program_description || channel.now_playing_desc || channel.description || "No guide detail available"
      };
    }

    return {
      title: channel.name || "Live Broadcast",
      description: "No guide detail available"
    };
  };

  const handleOpenRecModal = (program, channel) => {
    setRecTargetProgram(program);
    setRecTargetChannel(channel);
    setShowRecModal(true);
  };

  const handleOpenDetailModal = (program, channel) => {
    setDetailProgram(program);
    setDetailChannel(channel);
    setShowDetailModal(true);
  };

  const handleConfirmSchedule = async (payload) => {
    const success = await scheduleDispatcharrRecording(payload);
    if (success) {
      alert(`Successfully scheduled ${payload.type === "one_time" ? "one-time recording" : "recurring recording rule"} for: ${payload.title}`);
      loadAllData();
    } else {
      alert("Failed to schedule recording with Dispatcharr server.");
    }
  };

  const handleDeleteRecording = async (recId) => {
    if (window.confirm("Are you sure you want to delete this recording?")) {
      const success = await deleteDispatcharrRecording(recId);
      if (success) {
        setRecordings(recordings.filter((r) => r.id !== recId));
      } else {
        alert("Failed to delete recording.");
      }
    }
  };

  const handleShiftTimeline = (hours) => {
    const newStart = new Date(timelineStart.getTime() + hours * 60 * 60 * 1000);
    setTimelineStart(newStart);

    const slots = [];
    const numSlots = TOTAL_HOURS * 2;
    for (let i = 0; i < numSlots; i++) {
      const slotTime = new Date(newStart.getTime() + i * 30 * 60 * 1000);
      const h = slotTime.getHours();
      const m = slotTime.getMinutes();
      const ampm = h >= 12 ? "PM" : "AM";
      const formattedHours = h % 12 || 12;
      const formattedMinutes = m < 10 ? `0${m}` : m;

      slots.push({
        time: slotTime,
        label: `${formattedHours}:${formattedMinutes} ${ampm}`,
        timestamp: slotTime.getTime()
      });
    }
    setTimeSlots(slots);
  };

  const handleJumpToNow = () => {
    generateTimeline(new Date());
    if (gridScrollRef.current) {
      gridScrollRef.current.scrollLeft = 0;
    }
  };

  const handleScrollGrid = (direction) => {
    if (gridScrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      gridScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const getChannelPrograms = (channel) => {
    if (!channel) return [];
    const channelId = String(channel.id ?? "");
    const channelTvgId = String(channel.tvg_id || "").toLowerCase().trim();
    const channelEpgDataId = String(channel.epg_data_id || "").toLowerCase().trim();
    const channelNum = String(channel.number || channel.channel_number || channel.ch_number || "").toLowerCase().trim();
    const channelName = (channel.name || "").toLowerCase().trim();

    let programs = epgData.filter((epg) => {
      if (!epg) return false;

      let epgChId = "";
      let epgTvgId = String(epg.tvg_id || "").toLowerCase().trim();
      let epgEpgDataId = String(epg.epg_data_id || "").toLowerCase().trim();
      let epgChNum = "";
      let epgChName = "";

      if (typeof epg.channel === "object" && epg.channel !== null) {
        epgChId = String(epg.channel.id ?? "");
        epgTvgId = epgTvgId || String(epg.channel.tvg_id || "").toLowerCase().trim();
        epgChNum = String(epg.channel.number || epg.channel.channel_number || "").toLowerCase().trim();
        epgChName = (epg.channel.name || "").toLowerCase().trim();
      } else {
        epgChId = String(epg.channel_id ?? epg.channel ?? "");
        epgChNum = String(epg.channel_number || epg.number || epg.ch_number || "").toLowerCase().trim();
        epgChName = (epg.channel_name || epg.display_name || "").toLowerCase().trim();
      }

      const matchTvgId = channelTvgId && epgTvgId && channelTvgId === epgTvgId;
      const matchEpgDataId = channelEpgDataId && epgEpgDataId && channelEpgDataId === epgEpgDataId;
      const matchId = channelId && epgChId && channelId === epgChId;
      const matchNum = channelNum && epgChNum && channelNum === epgChNum;
      const matchName = channelName && epgChName && (epgChName === channelName || epgChName.includes(channelName) || channelName.includes(epgChName));

      return matchTvgId || matchEpgDataId || matchId || matchNum || matchName;
    });

    if (programs.length === 0 && channel.current_program) {
      programs = [channel.current_program];
    }

    return programs;
  };

  const parseEpgTime = (val, fallback) => {
    if (!val) return fallback;
    if (typeof val === "number") {
      return new Date(val > 1e11 ? val : val * 1000);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d;
  };

  const now = new Date();
  const timelineEnd = new Date(timelineStart.getTime() + TOTAL_HOURS * 60 * 60 * 1000);
  const isNowInWindow = now >= timelineStart && now <= timelineEnd;
  const nowOffsetPx = isNowInWindow
    ? ((now.getTime() - timelineStart.getTime()) / (1000 * 60 * 60)) * HOUR_WIDTH
    : -1;

  return (
    <div className="liveTvPage">
      <TopNav />
      <ContentWrapper>
        <div className="pageHeader">
          <div className="pageTitle">
            <FiTv className="titleIcon" />
            <h1>Dispatcharr Live TV & EPG Guide</h1>
          </div>
          <div className="tabSelector">
            <button
              className={`tabItem ${activeTab === "guide" ? "active" : ""}`}
              onClick={() => setActiveTab("guide")}
              tabIndex="0"
            >
              <FiGrid /> TV Guide
            </button>
            <button
              className={`tabItem ${activeTab === "recordings" ? "active" : ""}`}
              onClick={() => setActiveTab("recordings")}
              tabIndex="0"
            >
              <FiVideo /> DVR Recordings ({recordings.length})
            </button>
          </div>
        </div>

        {/* EPG TV Guide & Channels Tab */}
        {activeTab === "guide" && (
          <div className="tabContent">
            {/* Dispatcharr Filter & Control Bar */}
            <div className="dispatcharrFilterBar">
              <div className="searchBox">
                <FiSearch className="searchIcon" />
                <input
                  type="text"
                  placeholder="Search channel name or number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="searchInput"
                />
                {searchQuery && (
                  <button className="clearSearchBtn" onClick={() => setSearchQuery("")}>
                    <FiX />
                  </button>
                )}
              </div>

              {channelGroups.length > 0 && (
                <div className="groupSelectBox">
                  <FiFilter className="filterIcon" />
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="groupSelect"
                  >
                    <option value="all">All Groups ({channels.length} channels)</option>
                    {channelGroups.map((grp, gIdx) => (
                      <option key={gIdx} value={grp}>{grp}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="viewToggleBtns">
                <button
                  className={`toggleBtn ${viewMode === "epgGrid" ? "active" : ""}`}
                  onClick={() => setViewMode("epgGrid")}
                  title="EPG Timeline Grid"
                  tabIndex="0"
                >
                  <FiGrid /> Grid View
                </button>
                <button
                  className={`toggleBtn ${viewMode === "cards" ? "active" : ""}`}
                  onClick={() => setViewMode("cards")}
                  title="Channel Cards"
                  tabIndex="0"
                >
                  <FiList /> Card View
                </button>
              </div>

              <div className="timelineActions">
                {viewMode === "epgGrid" && (
                  <>
                    <button className="navGridBtn" onClick={() => handleShiftTimeline(-6)} tabIndex="0" title="Go Back 6 Hours">
                      <FiChevronLeft /> -6h
                    </button>
                    <button className="nowBtn" onClick={handleJumpToNow} tabIndex="0">
                      <FiClock /> Jump to Now
                    </button>
                    <button className="navGridBtn" onClick={() => handleShiftTimeline(6)} tabIndex="0" title="Go Forward 6 Hours">
                      +6h <FiChevronRight />
                    </button>
                  </>
                )}
                <button className="refreshBtn" onClick={loadAllData} tabIndex="0">
                  <FiRefreshCw /> Refresh
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loadingNotice">Loading Dispatcharr EPG Guide...</div>
            ) : filteredChannels.length === 0 ? (
              <div className="emptyState">
                <FiTv style={{ fontSize: "48px", marginBottom: "16px", color: "var(--pink)" }} />
                <h3>No Matching Channels Found</h3>
                <p>{searchQuery || selectedGroup !== "all" ? "Try clearing your search query or group filter." : "No active channels were returned from your central Dispatcharr server."}</p>
                {searchQuery || selectedGroup !== "all" ? (
                  <button className="setupBtn" onClick={() => { setSearchQuery(""); setSelectedGroup("all"); }} tabIndex="0">
                    Reset Filters
                  </button>
                ) : (
                  <button className="setupBtn" onClick={loadAllData} tabIndex="0">
                    <FiRefreshCw style={{ marginRight: "6px" }} /> Refresh Channels
                  </button>
                )}
              </div>
            ) : viewMode === "epgGrid" ? (
              /* --- FULL DISPATCHARR INTERACTIVE EPG GRID TIMELINE --- */
              <div className="epgGridContainer">
                <div className="epgGridScrollWrapper" ref={gridScrollRef}>
                  <div className="epgGridTable" style={{ width: `${220 + TOTAL_HOURS * HOUR_WIDTH}px` }}>
                    {/* Timeline Header Row */}
                    <div className="epgHeaderRow">
                      <div className="channelColumnHeader">Channels ({filteredChannels.length})</div>
                      <div className="timelineSlotsHeader" style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}>
                        {timeSlots.map((slot, sIdx) => (
                          <div key={sIdx} className="timeSlotCell" style={{ width: `${HOUR_WIDTH / 2}px` }}>
                            {slot.label}
                          </div>
                        ))}
                        {/* Red NOW line */}
                        {nowOffsetPx >= 0 && (
                          <div className="nowLineIndicator" style={{ left: `${nowOffsetPx}px` }}>
                            <span className="nowBadge">NOW</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Channel Rows */}
                    <div className="epgRowsContainer">
                      {filteredChannels.map((ch, idx) => {
                        const channelProgs = getChannelPrograms(ch);
                        return (
                          <div key={ch.id || idx} className="epgChannelRow">
                            {/* Sticky Left Channel Info */}
                            <div className="channelCell" onClick={() => handlePlayChannel(ch)} tabIndex="0" title={`Watch ${ch.name}`}>
                              <span className="chNum">{ch.number || idx + 1}</span>
                              {ch.logo ? (
                                <img src={ch.logo} alt={ch.name} className="chLogo" />
                              ) : (
                                <div className="chLogoPlaceholder">{ch.name?.substring(0, 3)}</div>
                              )}
                              <div className="chMeta">
                                <span className="chName">{ch.name}</span>
                              </div>
                              <button className="chPlayIcon" onClick={(e) => { e.stopPropagation(); handlePlayChannel(ch); }} tabIndex="0">
                                <FiPlay />
                              </button>
                            </div>

                            {/* Timeline Programs Bar */}
                            <div className="programsTimelineCell" style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}>
                              {nowOffsetPx >= 0 && <div className="nowLineRow" style={{ left: `${nowOffsetPx}px` }} />}

                              {(() => {
                                const visiblePrograms = channelProgs.filter((prog) => {
                                  const rawStart = prog.start_time || prog.start || prog.start_at || prog.start_timestamp || prog.time_start || prog.startTime;
                                  const rawEnd = prog.end_time || prog.end || prog.end_at || prog.end_timestamp || prog.time_end || prog.endTime;
                                  const progStart = parseEpgTime(rawStart, timelineStart);
                                  const progEnd = parseEpgTime(rawEnd, new Date(progStart.getTime() + 60 * 60 * 1000));
                                  return progStart < timelineEnd && progEnd > timelineStart;
                                });

                                if (visiblePrograms.length === 0) {
                                  return (
                                    <div className="programBlock emptyProgram" style={{ left: "0px", width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}>
                                      <div className="progHeader">
                                        <span className="progTitle">No EPG detail for this timeframe</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return visiblePrograms.map((prog, pIdx) => {
                                  const rawStart = prog.start_time || prog.start || prog.start_at || prog.start_timestamp || prog.time_start || prog.startTime;
                                  const rawEnd = prog.end_time || prog.end || prog.end_at || prog.end_timestamp || prog.time_end || prog.endTime;

                                  const progStart = parseEpgTime(rawStart, timelineStart);
                                  const progEnd = parseEpgTime(rawEnd, new Date(progStart.getTime() + 60 * 60 * 1000));

                                  const startDiffHours = (progStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60);
                                  const endDiffHours = (progEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60);

                                  const effectiveStartHours = Math.max(0, startDiffHours);
                                  const effectiveEndHours = Math.min(TOTAL_HOURS, endDiffHours);
                                  const durationHours = Math.max(0.25, effectiveEndHours - effectiveStartHours);

                                  const leftPx = effectiveStartHours * HOUR_WIDTH;
                                  const widthPx = Math.max(70, durationHours * HOUR_WIDTH);
                                  const isCurrentlyLive = now >= progStart && now <= progEnd;

                                  const recStatusObj = getRecordingStatusForProgram(prog, ch);
                                  const isRecordingActive = recStatusObj?.status === "recording";
                                  const isRecordingScheduled = recStatusObj?.status === "scheduled";

                                  // Dispatcharr Live Progress Percentage
                                  const totalDurationMs = progEnd.getTime() - progStart.getTime();
                                  const elapsedMs = now.getTime() - progStart.getTime();
                                  const progressPct = isCurrentlyLive && totalDurationMs > 0
                                    ? Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100))
                                    : 0;

                                  const seasonEpStr = prog.season && prog.episode
                                    ? `S${String(prog.season).padStart(2, '0')} E${String(prog.episode).padStart(2, '0')}`
                                    : null;

                                  return (
                                    <div
                                      key={prog.id || pIdx}
                                      className={`programBlock ${isRecordingActive ? "isRecording" : isRecordingScheduled ? "isScheduled" : isCurrentlyLive ? "isLive" : ""}`}
                                      style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                                      onClick={() => handleOpenDetailModal(prog, ch)}
                                      tabIndex="0"
                                    >
                                      <div className="progHeader">
                                        <span className="progTitle">{prog.title || prog.name || ch.now_playing || "Live Program"}</span>
                                        {seasonEpStr && <span className="seasonEpBadge">{seasonEpStr}</span>}
                                        {isNewEpisode(prog) && <span className="newBadge">NEW</span>}
                                        {isRecordingActive ? (
                                          <span className="recBadge active"><FiCircle className="pulseDot" /> REC</span>
                                        ) : isRecordingScheduled ? (
                                          <span className="recBadge scheduled"><FiCheck /> SCHEDULED</span>
                                        ) : isCurrentlyLive ? (
                                          <span className="liveBadge">LIVE</span>
                                        ) : null}
                                      </div>
                                      <div className="progTime">
                                        {progStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {progEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {prog.description && <div className="progDesc">{prog.description}</div>}

                                      {/* Dispatcharr Animated Live Progress Bar */}
                                      {isCurrentlyLive && (
                                        <div className="liveProgressBarTrack">
                                          <div className="liveProgressBarInner" style={{ width: `${progressPct}%` }} />
                                        </div>
                                      )}

                                      <div className="progActions">
                                        <button
                                          className={`progActionBtn record ${isRecordingActive ? "isRecording" : isRecordingScheduled ? "isScheduled" : ""}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenRecModal(prog, ch);
                                          }}
                                          title={isRecordingActive ? "Recording Active" : isRecordingScheduled ? "Recording Scheduled" : "Record with Dispatcharr DVR"}
                                          tabIndex="0"
                                        >
                                          <FiCircle style={{ fontSize: "10px", color: isRecordingActive ? "#ff2a6d" : isRecordingScheduled ? "#ffb74d" : "#ff5252" }} />{" "}
                                          {isRecordingActive ? "RECORDING" : isRecordingScheduled ? "SCHEDULED" : "Record"}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* --- CHANNELS CARDS GRID VIEW --- */
              <div className="channelsGrid">
                {filteredChannels.map((ch, idx) => {
                  const currentProg = getCurrentProgramForChannel(ch);
                  const recStatusObj = getRecordingStatusForProgram(currentProg, ch);
                  const isNew = isNewEpisode(currentProg);
                  const isRecActive = recStatusObj?.status === "recording";
                  const isRecScheduled = recStatusObj?.status === "scheduled";

                  const progTitle = currentProg?.title || currentProg?.name || ch.now_playing || "Live Broadcast";
                  const progDesc = currentProg?.description || currentProg?.summary || ch.now_playing_desc || "No guide detail available";
                  const seasonEpStr = currentProg?.season && currentProg?.episode
                    ? `S${String(currentProg.season).padStart(2, '0')} E${String(currentProg.episode).padStart(2, '0')}`
                    : (currentProg?.sub_title || null);

                  return (
                    <div
                      key={ch.id || idx}
                      className={`channelCard ${isRecActive ? "isRecording" : isRecScheduled ? "isScheduled" : ""}`}
                      tabIndex="0"
                      onClick={() => handleOpenDetailModal(currentProg, ch)}
                    >
                      <div className="channelHeader">
                        <span className="channelNumber">{ch.number || idx + 1}</span>
                        {ch.logo ? (
                          <img src={ch.logo} alt={ch.name} className="channelLogo" />
                        ) : (
                          <div className="channelLogoPlaceholder">{ch.name?.substring(0, 3)}</div>
                        )}
                        <h3 className="channelName">{ch.name}</h3>
                      </div>

                      <div className="programInfo">
                        <div className="programInfoHeader">
                          <span className="nowPlayingLabel">NOW PLAYING</span>
                          {isNew && <span className="newBadge">NEW</span>}
                          {isRecActive ? (
                            <span className="recBadge active"><FiCircle className="pulseDot" /> REC</span>
                          ) : isRecScheduled ? (
                            <span className="recBadge scheduled"><FiCheck /> SCHEDULED</span>
                          ) : null}
                        </div>
                        <h4 className="programTitle">
                          {progTitle} {seasonEpStr && <span className="seasonEpInline">({seasonEpStr})</span>}
                        </h4>
                        <p className="programDesc">{progDesc}</p>
                      </div>

                      <div className="cardActions" onClick={(e) => e.stopPropagation()}>
                        <button className="playBtn" onClick={() => handlePlayChannel(ch)} tabIndex="0">
                          <FiPlay /> Watch Live
                        </button>
                        <button
                          className={`recordBtn ${isRecActive ? "isRecording" : isRecScheduled ? "isScheduled" : ""}`}
                          onClick={() => handleOpenRecModal(currentProg, ch)}
                          tabIndex="0"
                          title="Record Options"
                        >
                          <FiVideo /> {isRecActive ? "RECORDING" : isRecScheduled ? "SCHEDULED" : "Record Options"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DVR Recordings Tab */}
        {activeTab === "recordings" && (
          <div className="tabContent">
            <div className="sectionActionHeader">
              <h2>Recorded Shows, Movies & Rules</h2>
              <button className="refreshBtn" onClick={loadAllData} tabIndex="0">
                <FiRefreshCw /> Refresh Recordings
              </button>
            </div>

            {loading ? (
              <div className="loadingNotice">Loading DVR Recordings & Rules...</div>
            ) : recordings.length === 0 ? (
              <div className="emptyState">
                <FiVideo style={{ fontSize: "48px", marginBottom: "16px", color: "var(--pink)" }} />
                <h3>No DVR Recordings Found</h3>
                <p>One-time recordings and recurring rules scheduled via Dispatcharr will appear here for 1-click playback.</p>
              </div>
            ) : (
              <div className="recordingsGrid">
                {recordings.map((rec, idx) => (
                  <div
                    key={rec.id || idx}
                    className="recordingCard"
                    onClick={() => handleOpenRecDetailsModal(rec)}
                    tabIndex="0"
                  >
                    <div className="recThumbnailBlock">
                      {rec.thumbnail ? (
                        <img src={rec.thumbnail} alt={rec.title} className="recThumbnail" />
                      ) : (
                        <div className="recPlaceholder"><FiVideo /></div>
                      )}
                      <button
                        className="playOverlayBtn"
                        onClick={(e) => { e.stopPropagation(); handlePlayRecording(rec); }}
                        tabIndex="0"
                        title="Play Recording"
                      >
                        <FiPlay />
                      </button>
                    </div>

                    <div className="recDetails">
                      <div className="recTitleHeader">
                        <h3 className="recTitle">{rec.title}</h3>
                        {rec.rule_badge && <span className={`ruleBadge ${rec.is_recurring ? "recurring" : "oneTime"}`}>{rec.rule_badge}</span>}
                      </div>

                      <div className="recMeta">
                        <span className="recTime"><FiClock /> {rec.formatted_date}</span>
                        {rec.channel_display && <span className="recChannel"><FiTv /> {rec.channel_display}</span>}
                      </div>

                      {rec.description && <p className="recDesc">{rec.description}</p>}
                    </div>

                    <button
                      className="deleteRecBtn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteRecording(rec.id); }}
                      tabIndex="0"
                      title="Delete Recording / Rule"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </ContentWrapper>

      {/* Integrated Web Video Player / Android TV Player Modal */}
      <VideoPlayerModal
        show={showPlayer}
        setShow={setShowPlayer}
        videoUrl={playerStreamUrl}
        rawUrl={playerStreamUrl}
        title={playerTitle}
        channelLogo={playerChannelLogo}
        mediaType="tv"
      />

      {/* DVR Recording Setup Modal (One-Time, Recurring Slot, Series Rules) */}
      <RecordingModal
        show={showRecModal}
        onClose={() => setShowRecModal(false)}
        program={recTargetProgram}
        channel={recTargetChannel}
        onConfirm={handleConfirmSchedule}
      />

      {/* Program Detail Modal (Dispatcharr EPG Style) */}
      <ProgramDetailModal
        show={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        program={detailProgram}
        channel={detailChannel}
        recStatus={getRecordingStatusForProgram(detailProgram, detailChannel)}
        onPlay={handlePlayChannel}
        onRecord={handleOpenRecModal}
      />

      {/* Recording Details Modal (Dispatcharr Style Full Metadata) */}
      <RecordingDetailsModal
        show={showRecDetailsModal}
        onClose={() => setShowRecDetailsModal(false)}
        recording={selectedRecording}
        onPlay={handlePlayRecording}
        onDelete={handleDeleteRecording}
      />
    </div>
  );
};

export default LiveTvPage;
