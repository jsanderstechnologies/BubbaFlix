import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import Spinner from "../../components/spinner";
import VideoPlayerModal from "../../components/video-player-modal";
import {
  fetchDispatcharrChannels,
  fetchDispatcharrEpgPrograms,
  fetchDispatcharrRecordings,
  createOneTimeRecording,
  createSeriesRecordingRule,
  deleteDispatcharrRecording,
  getChannelStreamUrl,
  getRecordingStreamUrl,
} from "../../utils/dispatcharr";
import {
  FiPlay,
  FiCircle,
  FiCheckCircle,
  FiCalendar,
  FiClock,
  FiTv,
  FiX,
  FiRefreshCw,
  FiVideo,
  FiSliders,
  FiCheck,
  FiLock,
  FiChevronLeft,
  FiChevronRight,
  FiStar,
} from "react-icons/fi";
import { isFavoriteChannel, toggleFavoriteChannel } from "../../utils/favorites";
import "./index.scss";

const PIXELS_PER_MINUTE = 5; // 30 mins = 150px
const TOTAL_HOURS = 6; // 6 hours chunked timeline

const LiveTvPage = () => {
  const navigate = useNavigate();
  const timelineRef = useRef(null);

  const [channels, setChannels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);

  // Selected program modal state
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);

  // Video player modal state
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState("");
  const [activeStreamTitle, setActiveStreamTitle] = useState("");
  const [favUpdate, setFavUpdate] = useState(0);

  // Focus management refs for TV Remote control
  const modalPlayBtnRef = useRef(null);
  const lastFocusedCellRef = useRef(null);

  useEffect(() => {
    if (selectedProgram) {
      if (document.activeElement && typeof document.activeElement.focus === "function") {
        lastFocusedCellRef.current = document.activeElement;
      }
      const timer = setTimeout(() => {
        if (modalPlayBtnRef.current) {
          modalPlayBtnRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else if (lastFocusedCellRef.current) {
      lastFocusedCellRef.current.focus();
    }
  }, [selectedProgram]);

  const sortedChannels = useMemo(() => {
    if (!channels || channels.length === 0) return [];
    return [...channels].sort((a, b) => {
      const isFavA = isFavoriteChannel(a.id || a.name);
      const isFavB = isFavoriteChannel(b.id || b.name);
      if (isFavA && !isFavB) return -1;
      if (!isFavA && isFavB) return 1;
      return 0;
    });
  }, [channels, favUpdate]);

  // Timeline base time (rounded down to top of current hour)
  const gridStartTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0); // Current hour
    return d;
  }, []);

  const gridEndTime = useMemo(() => {
    return new Date(gridStartTime.getTime() + TOTAL_HOURS * 60 * 60 * 1000);
  }, [gridStartTime]);

  // Generate 30-min time slots for top header
  const timeSlots = useMemo(() => {
    const slots = [];
    const numSlots = TOTAL_HOURS * 2; // 30 min slots
    for (let i = 0; i < numSlots; i++) {
      const slotTime = new Date(gridStartTime.getTime() + i * 30 * 60 * 1000);
      slots.push({
        time: slotTime,
        label: slotTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      });
    }
    return slots;
  }, [gridStartTime]);

  // Current red time marker position
  const nowMarkerLeft = useMemo(() => {
    const now = new Date();
    const diffMins = (now.getTime() - gridStartTime.getTime()) / (60 * 1000);
    return Math.max(0, diffMins * PIXELS_PER_MINUTE);
  }, [gridStartTime]);

  // Auto-scroll timeline to current live time on load
  useEffect(() => {
    if (!loading && timelineRef.current) {
      setTimeout(() => {
        if (timelineRef.current) {
          const scrollTo = Math.max(0, nowMarkerLeft - 150);
          timelineRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
        }
      }, 300);
    }
  }, [loading, nowMarkerLeft]);

  useEffect(() => {
    loadLiveTvData();
  }, []);

  const loadLiveTvData = async () => {
    setLoading(true);
    let [chData, progData, recData] = await Promise.all([
      fetchDispatcharrChannels(),
      fetchDispatcharrEpgPrograms(),
      fetchDispatcharrRecordings(),
    ]);

    if (chData.errorStatus === 401 || progData.errorStatus === 401 || recData.errorStatus === 401) {
      setAuthError(true);
    } else {
      setAuthError(false);
    }

    const formatLogoUrl = (rawLogo) => {
      if (!rawLogo) return "";
      if (rawLogo.startsWith("http")) return rawLogo;
      const baseUrl = getProxyBaseUrl();
      return `${baseUrl}${rawLogo.startsWith("/") ? "" : "/"}${rawLogo}`;
    };

    // Build unified channel map from EPG schedule (progData) first to prioritize channels with EPG data
    const channelMap = new Map();

    if (Array.isArray(progData)) {
      progData.forEach((p) => {
        if (!p) return;
        const rawCh = p.channel && typeof p.channel === "object" ? p.channel : null;
        const id = rawCh?.id || (typeof p.channel !== "object" ? p.channel : null) || p.channel_id || p.tvg_id;
        if (!id || typeof id === "object") return;
        const key = String(id);
        const rawLogo = rawCh?.logo || p.channel_logo || p.icon || p.thumbnail || "";
        if (!channelMap.has(key)) {
          channelMap.set(key, {
            id,
            name: rawCh?.name || p.channel_name || p.channel_title || `Channel ${id}`,
            number: rawCh?.number || p.channel_number || id,
            logo: formatLogoUrl(rawLogo),
            tvg_id: rawCh?.tvg_id || p.tvg_id || "",
            epg_data_id: rawCh?.epg_data_id || p.epg_data_id || "",
            hasEpg: true,
          });
        }
      });
    }

    if (Array.isArray(chData)) {
      chData.forEach((ch) => {
        if (!ch) return;
        const numericId = ch.id;
        const tvgId = ch.tvg_id || ch.effective_tvg_id;
        const chName = ch.name || ch.effective_name;

        let existingKey = null;
        if (numericId && channelMap.has(String(numericId))) existingKey = String(numericId);
        else if (tvgId && channelMap.has(String(tvgId))) existingKey = String(tvgId);
        else if (chName && channelMap.has(String(chName))) existingKey = String(chName);

        const formattedLogo = formatLogoUrl(ch.logo || ch.logo_url || ch.icon || ch.thumbnail || "");

        if (existingKey) {
          const existing = channelMap.get(existingKey);
          channelMap.delete(existingKey);
          const finalId = numericId || existing.id;
          channelMap.set(String(finalId), {
            ...existing,
            ...ch,
            id: finalId,
            name: chName || existing.name,
            number: ch.number || ch.channel_number || existing.number,
            logo: formattedLogo || existing.logo,
            tvg_id: tvgId || existing.tvg_id,
            hasEpg: true,
          });
        } else {
          const finalId = numericId || tvgId || chName;
          channelMap.set(String(finalId), {
            ...ch,
            id: finalId,
            name: chName || `Channel ${finalId}`,
            number: ch.number || ch.channel_number || finalId,
            logo: formattedLogo,
            tvg_id: tvgId || "",
            hasEpg: false,
          });
        }
      });
    }

    const finalChannels = Array.from(channelMap.values()).sort((a, b) => {
      if (a.hasEpg !== b.hasEpg) return a.hasEpg ? -1 : 1;
      const numA = parseFloat(a.number) || 9999;
      const numB = parseFloat(b.number) || 9999;
      return numA - numB;
    });

    setChannels(finalChannels.length > 0 ? finalChannels : [
      { id: 1, name: "Dispatcharr Live Channel 1", number: 1, logo: "" },
      { id: 2, name: "Dispatcharr Live Channel 2", number: 2, logo: "" },
      { id: 3, name: "Dispatcharr Live Channel 3", number: 3, logo: "" },
      { id: 4, name: "Dispatcharr Live Channel 4", number: 4, logo: "" },
      { id: 5, name: "Dispatcharr Live Channel 5", number: 5, logo: "" },
    ]);
    setPrograms(progData || []);
    setRecordings(recData || []);
    setLoading(false);
  };

  const isProgramCurrentlyAiring = (prog) => {
    if (!prog || !prog.start_time || !prog.end_time) return false;
    const now = new Date();
    const start = parseApiDate(prog.start_time);
    const end = parseApiDate(prog.end_time);
    return start && end && now >= start && now <= end;
  };

  const getRecordingForProgram = (prog) => {
    if (!prog || !recordings.length) return null;
    return recordings.find(
      (r) =>
        r.program_id === prog.id ||
        (r.title && prog.title && r.title.toLowerCase() === prog.title.toLowerCase())
    );
  };

  const handleWatchLive = (channel, program = null) => {
    const streamUrl = getChannelStreamUrl(channel);
    const title = channel.name || channel.title || program?.title || "Live TV Channel";
    setActiveStreamUrl(streamUrl);
    setActiveStreamTitle(title);
    setShowPlayer(true);
  };

  const handleScheduleOneTime = async (prog) => {
    setActionLoading(true);
    setActionStatus(null);
    const rawCh = prog.channel || prog.channel_id || prog.channelObj?.id || prog.channelObj?.number;
    const channelId = typeof rawCh === "object" ? rawCh.id || rawCh.number : rawCh;
    const res = await createOneTimeRecording({
      programId: prog.id || prog.program_id,
      channelId,
      title: prog.title,
      startTime: prog.start_time,
      endTime: prog.end_time,
    });
    setActionLoading(false);

    if (res.success) {
      setActionStatus({ type: "success", text: "Recording successfully scheduled!" });
      loadLiveTvData();
    } else {
      setActionStatus({ type: "error", text: res.message || "Failed to schedule recording." });
    }
  };

  const handleScheduleSeries = async (prog) => {
    setActionLoading(true);
    setActionStatus(null);
    const rawCh = prog.channel || prog.channel_id || prog.channelObj?.id || prog.channelObj?.number;
    const channelId = typeof rawCh === "object" ? rawCh.id || rawCh.number : rawCh;
    const res = await createSeriesRecordingRule({
      programTitle: prog.title,
      channelId,
      tvgId: prog.tvg_id || prog.channelObj?.tvg_id,
    });
    setActionLoading(false);

    if (res.success) {
      setActionStatus({ type: "success", text: `Series rule set for "${prog.title}"!` });
      loadLiveTvData();
    } else {
      setActionStatus({ type: "error", text: res.message || "Failed to schedule series rule." });
    }
  };

  const handleCancelRecording = async (recording) => {
    if (!recording) return;
    setActionLoading(true);
    setActionStatus(null);
    const res = await deleteDispatcharrRecording(recording.id);
    setActionLoading(false);

    if (res.success) {
      setActionStatus({ type: "success", text: "Recording cancelled." });
      loadLiveTvData();
    } else {
      setActionStatus({ type: "error", text: res.message || "Failed to cancel recording." });
    }
  };

  const parseApiDate = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === "number") {
      const ms = val < 10000000000 ? val * 1000 : val;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (!isNaN(trimmed) && trimmed.length >= 9) {
        const num = Number(trimmed);
        const ms = num < 10000000000 ? num * 1000 : num;
        const d = new Date(ms);
        return isNaN(d.getTime()) ? null : d;
      }
      let formatted = trimmed.replace(" ", "T");
      const d = new Date(formatted);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const formatTime = (dateStr) => {
    const date = parseApiDate(dateStr);
    if (!date) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  // Scroll timeline left or right
  const scrollTimeline = (direction) => {
    if (!timelineRef.current) return;
    const amount = direction === "left" ? -400 : 400;
    timelineRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  // Calculate position and width of a program chip on timeline
  const calculateChipStyle = (prog) => {
    const rawStart = parseApiDate(prog.start_time) || gridStartTime;
    const end = parseApiDate(prog.end_time) || new Date(rawStart.getTime() + 60 * 60 * 1000);

    // If program started before gridStartTime, clamp visual start to gridStartTime so it aligns at left edge
    const start = rawStart < gridStartTime ? gridStartTime : rawStart;

    const startDiffMins = (start.getTime() - gridStartTime.getTime()) / (60 * 1000);
    const durationMins = Math.max(15, (end.getTime() - start.getTime()) / (60 * 1000));

    const left = Math.max(0, startDiffMins * PIXELS_PER_MINUTE);
    const width = durationMins * PIXELS_PER_MINUTE;

    return {
      left: `${left}px`,
      width: `${Math.max(30, width - 4)}px`,
    };
  };

  // Pre-parse programs ONCE when programs state updates for instant D-pad navigation
  const parsedPrograms = useMemo(() => {
    if (!programs || programs.length === 0) return [];
    return programs
      .map((p) => {
        if (!p || !p.start_time || !p.end_time) return null;
        const start = parseApiDate(p.start_time);
        const end = parseApiDate(p.end_time);
        if (!start || !end) return null;

        const rawCh = p.channel && typeof p.channel === "object" ? p.channel : null;
        return {
          ...p,
          _start: start,
          _end: end,
          _pChId: String(rawCh?.id || (typeof p.channel !== "object" ? p.channel : "") || p.channel_id || "").toLowerCase(),
          _pChNum: String(rawCh?.number || p.channel_number || "").toLowerCase(),
          _pChName: String(rawCh?.name || p.channel_name || p.channel_title || "").toLowerCase(),
          _pChTvg: String(rawCh?.tvg_id || p.tvg_id || "").toLowerCase(),
          _pChEpgId: String(rawCh?.epg_data_id || p.epg_data_id || "").toLowerCase(),
        };
      })
      .filter(Boolean);
  }, [programs]);

  // Pre-group programs by channel for instant O(1) row lookup during render
  const channelProgramsMap = useMemo(() => {
    const map = new Map();
    if (!channels.length || !parsedPrograms.length) return map;
    const now = new Date();

    channels.forEach((ch) => {
      const chIdStr = String(ch.id || "").toLowerCase();
      const chNumStr = String(ch.number || ch.channel_number || ch.effective_channel_number || "").toLowerCase();
      const chNameStr = String(ch.name || ch.effective_name || "").toLowerCase();
      const chTvgStr = String(ch.tvg_id || ch.effective_tvg_id || "").toLowerCase();
      const chEpgIdStr = String(ch.epg_data_id || ch.effective_epg_data_id || "").toLowerCase();
      const chUuidStr = String(ch.uuid || "").toLowerCase();

      const matched = parsedPrograms.filter((p) => {
        // Exclude past expired programs that ended before current time!
        if (p._end <= now) return false;
        // Exclude future programs beyond 6-hour window!
        if (p._start >= gridEndTime) return false;

        if (p._pChId && p._pChId !== "[object object]" && (p._pChId === chIdStr || p._pChId === chNumStr || (chTvgStr && p._pChId === chTvgStr))) return true;
        if (p._pChNum && (p._pChNum === chIdStr || p._pChNum === chNumStr)) return true;
        if (p._pChTvg && (p._pChTvg === chTvgStr || (chUuidStr && p._pChTvg === chUuidStr) || (chIdStr && p._pChTvg === chIdStr) || (chTvgStr && p._pChTvg.includes(chTvgStr)) || (chTvgStr && chTvgStr.includes(p._pChTvg)))) return true;
        if (p._pChTvg && chEpgIdStr && chEpgIdStr.length > 2 && p._pChTvg.includes(chEpgIdStr)) return true;
        if (chTvgStr && p._pChEpgId && p._pChEpgId.length > 2 && chTvgStr.includes(p._pChEpgId)) return true;
        if (p._pChEpgId && chEpgIdStr && p._pChEpgId === chEpgIdStr) return true;
        if (p._pChName && chNameStr && (p._pChName === chNameStr || p._pChName.includes(chNameStr) || chNameStr.includes(p._pChName))) return true;
        return false;
      });

      map.set(ch.id || ch.name, matched);
    });

    return map;
  }, [channels, parsedPrograms, gridEndTime]);

  return (
    <div className="liveTvPage">
      <TopNav />
      <ContentWrapper>
        <div className="pageHeader">
          <div className="titleBlock">
            <h1><FiTv style={{ marginRight: 10 }} /> Live TV & EPG Guide</h1>
            <p>Full interactive TV Guide grid schedule, live stream playback, and Dispatcharr DVR recording.</p>
          </div>
          <div className="headerActions">
            <button className="scrollBtn" onClick={() => scrollTimeline("left")} title="Scroll Left">
              <FiChevronLeft />
            </button>
            <button className="scrollBtn" onClick={() => scrollTimeline("right")} title="Scroll Right">
              <FiChevronRight />
            </button>
            <button className="refreshBtn" onClick={loadLiveTvData} disabled={loading}>
              <FiRefreshCw className={loading ? "spin" : ""} /> Refresh Guide
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loadingContainer">
            <Spinner />
          </div>
        ) : authError ? (
          <div className="emptyNotice">
            <FiLock className="icon" style={{ color: "#f44336" }} />
            <h3 style={{ color: "#f44336" }}>Dispatcharr Server Authentication Required (401 Unauthorized)</h3>
            <p style={{ maxWidth: 520, margin: "10px auto 20px", lineHeight: "1.6", color: "rgba(255,255,255,0.8)" }}>
              Your Dispatcharr server requires an API Key or Bearer token. Please configure your <code>DISPATCHARR_API_KEY</code> in Settings to access channels and EPG schedules.
            </p>
            <button
              className="refreshBtn"
              style={{ background: "var(--pink)", borderColor: "var(--pink)", padding: "12px 24px", margin: "0 auto" }}
              onClick={() => navigate("/settings")}
            >
              Go to Settings
            </button>
          </div>
        ) : channels.length === 0 ? (
          <div className="emptyNotice">
            <FiTv className="icon" />
            <h3>No Live TV Channels Found</h3>
            <p>Please check your Dispatcharr server configuration in Settings to verify channel lineups.</p>
          </div>
        ) : (
          <div className="epgGridWrapper">
            <div className="epgScrollContainer" ref={timelineRef}>
              {/* EPG Grid Header */}
              <div className="epgHeaderRow">
                <div className="channelColumnHeader">
                  <span>CHANNELS / GUIDE</span>
                </div>
                <div className="timeTimelineHeader" style={{ width: `${TOTAL_HOURS * 60 * PIXELS_PER_MINUTE}px` }}>
                  {timeSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="timeSlot"
                      style={{ width: `${30 * PIXELS_PER_MINUTE}px` }}
                    >
                      {slot.label}
                    </div>
                  ))}
                  {/* Current Live Time Marker Line */}
                  <div className="nowMarker" style={{ left: `${nowMarkerLeft}px` }}>
                    <div className="nowLabel">LIVE</div>
                  </div>
                </div>
              </div>

              {/* EPG Channel Grid Rows */}
              <div className="epgBody">
                {sortedChannels.map((ch) => {
                  const channelPrograms = channelProgramsMap.get(ch.id || ch.name) || [];

                  const displayedPrograms = channelPrograms.length > 0
                    ? channelPrograms
                    : [
                        {
                          id: `live-${ch.id || ch.name}`,
                          title: ch.name || "Live Channel Stream",
                          start_time: gridStartTime.toISOString(),
                          end_time: new Date(gridStartTime.getTime() + 12 * 60 * 60 * 1000).toISOString(),
                          description: `Live TV stream for ${ch.name || "Channel"}. Click Watch Live to start streaming.`,
                          channel: ch.id,
                        },
                      ];

                  const currentProg = displayedPrograms.find(isProgramCurrentlyAiring) || displayedPrograms[0];
                  const isFav = isFavoriteChannel(ch.id || ch.name);

                  return (
                    <div key={ch.id || ch.name} className="epgRow">
                      {/* Sticky Channel Column */}
                      <div className="channelColumn">
                        <div className="channelBadge">
                          {ch.logo ? (
                            <img src={ch.logo} alt={ch.name} className="channelLogo" />
                          ) : (
                            <div className="channelNumber">{ch.number || ch.id || "TV"}</div>
                          )}
                        </div>
                        <div className="channelDetails">
                          <span className="channelName">{ch.name || ch.title || `Channel ${ch.number || ch.id}`}</span>
                        </div>
                        <button
                          className={`favStarBtn ${isFav ? "active" : ""}`}
                          tabIndex={0}
                          onClick={() => {
                            toggleFavoriteChannel(ch.id || ch.name);
                            setFavUpdate((prev) => prev + 1);
                          }}
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <FiStar style={{ fill: isFav ? "#ffc107" : "none", color: isFav ? "#ffc107" : "rgba(255,255,255,0.4)" }} />
                        </button>
                        <button
                          className="watchLiveIconBtn"
                          tabIndex={0}
                          onClick={() => handleWatchLive(ch, currentProg)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleWatchLive(ch, currentProg);
                            }
                          }}
                          title="Watch Channel Live"
                        >
                          <FiPlay />
                        </button>
                      </div>

                      {/* Program Timeline Grid Area */}
                      <div
                        className="programTimeline"
                        style={{ width: `${TOTAL_HOURS * 60 * PIXELS_PER_MINUTE}px` }}
                      >
                        {displayedPrograms.map((prog, idx) => {
                          const isAiring = isProgramCurrentlyAiring(prog);
                          const rec = getRecordingForProgram(prog);
                          const style = calculateChipStyle(prog);

                          return (
                            <div
                              key={prog.id || idx}
                              tabIndex={0}
                              role="button"
                              aria-label={`${prog.title}, ${formatTime(prog.start_time)}`}
                              className={`programCell ${isAiring ? "airingNow" : ""} ${rec ? "isRecorded" : ""}`}
                              style={style}
                              onFocus={(e) => {
                                if (timelineRef.current && e.target) {
                                  const cellLeft = e.target.offsetLeft;
                                  const cellWidth = e.target.offsetWidth;
                                  const containerScroll = timelineRef.current.scrollLeft;
                                  const containerWidth = timelineRef.current.clientWidth - 300;

                                  if (cellLeft < containerScroll) {
                                    timelineRef.current.scrollTo({ left: Math.max(0, cellLeft - 40), behavior: "smooth" });
                                  } else if (cellLeft + cellWidth > containerScroll + containerWidth) {
                                    timelineRef.current.scrollTo({ left: cellLeft + cellWidth - containerWidth + 60, behavior: "smooth" });
                                  }
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedProgram({ ...prog, channelObj: ch });
                                  setActionStatus(null);
                                }
                              }}
                              onClick={() => {
                                setSelectedProgram({ ...prog, channelObj: ch });
                                setActionStatus(null);
                              }}
                            >
                              <div className="cellHeader">
                                {rec && <span className="recTag">REC</span>}
                                {isAiring && <span className="liveTag">LIVE</span>}
                                <span className="cellTime">{formatTime(prog.start_time)}</span>
                              </div>
                              <div className="cellTitle" title={prog.title}>
                                {prog.title}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Selected Program Details & Recording Modal */}
        {selectedProgram && (
          <div
            className="modalOverlay"
            tabIndex={-1}
            onClick={() => setSelectedProgram(null)}
            onKeyDown={(e) => {
              const code = e.keyCode || e.which;
              // Back / ESC / Return key closes modal on Android TV Remote
              if (e.key === "Escape" || e.key === "GoBack" || code === 27 || code === 4 || code === 10009 || code === 461) {
                e.preventDefault();
                setSelectedProgram(null);
              }
            }}
          >
            <div className="programModalCard" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <div className="headerTitle">
                  <span className="channelTag">
                    {selectedProgram.channelObj?.name || selectedProgram.channel_name || "Live TV"}
                  </span>
                  <h2>{selectedProgram.title}</h2>
                </div>
                <button
                  className="closeBtn"
                  tabIndex={0}
                  onClick={() => setSelectedProgram(null)}
                  onKeyDown={(e) => {
                    const code = e.keyCode || e.which;
                    if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                      e.preventDefault();
                      setSelectedProgram(null);
                    }
                  }}
                >
                  <FiX />
                </button>
              </div>

              <div className="modalBody">
                <div className="metaRow">
                  <span className="timeBadge">
                    <FiClock style={{ marginRight: 6 }} />
                    {formatTime(selectedProgram.start_time)} - {formatTime(selectedProgram.end_time)}
                  </span>
                  {isProgramCurrentlyAiring(selectedProgram) && (
                    <span className="airingBadge">
                      <FiVideo style={{ marginRight: 6 }} /> Airing Now
                    </span>
                  )}
                </div>

                <p className="programDescription">
                  {selectedProgram.description ||
                    selectedProgram.sub_title ||
                    "No detailed description available for this program."}
                </p>

                {actionStatus && (
                  <div className={`statusNotice ${actionStatus.type}`}>
                    {actionStatus.type === "success" ? <FiCheckCircle /> : <FiX />}
                    <span>{actionStatus.text}</span>
                  </div>
                )}

                {/* DVR & Playback Actions */}
                <div className="modalActions">
                  <button
                    ref={modalPlayBtnRef}
                    className="actionBtn playBtn"
                    tabIndex={0}
                    onClick={() => {
                      const ch = selectedProgram.channelObj || { id: selectedProgram.channel };
                      handleWatchLive(ch, selectedProgram);
                      setSelectedProgram(null);
                    }}
                    onKeyDown={(e) => {
                      const code = e.keyCode || e.which;
                      if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                        e.preventDefault();
                        const ch = selectedProgram.channelObj || { id: selectedProgram.channel };
                        handleWatchLive(ch, selectedProgram);
                        setSelectedProgram(null);
                      }
                    }}
                  >
                    <FiPlay /> Watch Live Channel
                  </button>

                  {getRecordingForProgram(selectedProgram) && (
                    <button
                      className="actionBtn playBtn"
                      style={{ background: "#4caf50", color: "white" }}
                      tabIndex={0}
                      onClick={() => {
                        const rec = getRecordingForProgram(selectedProgram);
                        const streamUrl = getRecordingStreamUrl(rec);
                        if (streamUrl) {
                          setActiveStreamUrl(streamUrl);
                          setActiveStreamTitle(rec.title || selectedProgram.title);
                          setShowPlayer(true);
                          setSelectedProgram(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        const code = e.keyCode || e.which;
                        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                          e.preventDefault();
                          const rec = getRecordingForProgram(selectedProgram);
                          const streamUrl = getRecordingStreamUrl(rec);
                          if (streamUrl) {
                            setActiveStreamUrl(streamUrl);
                            setActiveStreamTitle(rec.title || selectedProgram.title);
                            setShowPlayer(true);
                            setSelectedProgram(null);
                          }
                        }
                      }}
                    >
                      <FiPlay /> Play Recorded Program
                    </button>
                  )}

                  {getRecordingForProgram(selectedProgram) ? (
                    <button
                      className="actionBtn cancelRecBtn"
                      tabIndex={0}
                      disabled={actionLoading}
                      onClick={() => handleCancelRecording(getRecordingForProgram(selectedProgram))}
                      onKeyDown={(e) => {
                        const code = e.keyCode || e.which;
                        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                          e.preventDefault();
                          handleCancelRecording(getRecordingForProgram(selectedProgram));
                        }
                      }}
                    >
                      <FiX /> Cancel Scheduled DVR Recording
                    </button>
                  ) : (
                    <>
                      <button
                        className="actionBtn recordBtn"
                        tabIndex={0}
                        disabled={actionLoading}
                        onClick={() => handleScheduleOneTime(selectedProgram)}
                        onKeyDown={(e) => {
                          const code = e.keyCode || e.which;
                          if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                            e.preventDefault();
                            handleScheduleOneTime(selectedProgram);
                          }
                        }}
                      >
                        <FiCircle /> Record This Episode (DVR)
                      </button>

                      <button
                        className="actionBtn seriesBtn"
                        tabIndex={0}
                        disabled={actionLoading}
                        onClick={() => handleScheduleSeries(selectedProgram)}
                        onKeyDown={(e) => {
                          const code = e.keyCode || e.which;
                          if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                            e.preventDefault();
                            handleScheduleSeries(selectedProgram);
                          }
                        }}
                      >
                        <FiCalendar /> Record Full Series
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        {showPlayer && (
          <VideoPlayerModal
            show={showPlayer}
            setShow={setShowPlayer}
            videoUrl={activeStreamUrl}
            rawUrl={activeStreamUrl}
            streamUrl={activeStreamUrl}
            title={activeStreamTitle}
            onClose={() => setShowPlayer(false)}
          />
        )}
      </ContentWrapper>
    </div>
  );
};

export default LiveTvPage;
