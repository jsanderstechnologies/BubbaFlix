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
  FiCheck,
  FiLock,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import "./index.scss";

const PIXELS_PER_MINUTE = 5; // 30 mins = 150px
const TOTAL_HOURS = 12; // 12 hours timeline scrollable

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

  // Timeline base time (rounded down to top of current hour minus 1 hour)
  const gridStartTime = useMemo(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return new Date(d.getTime() - 60 * 60 * 1000); // 1 hr before current hour
  }, []);

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

    // If channels array is empty but we have EPG programs, derive channels from programs!
    if ((!chData || chData.length === 0) && progData && progData.length > 0) {
      const channelMap = new Map();
      progData.forEach((p) => {
        const rawCh = p.channel && typeof p.channel === "object" ? p.channel : null;
        const id = rawCh?.id || p.channel || p.channel_id || p.tvg_id || p.channel_name;
        const name = rawCh?.name || p.channel_name || p.channel_title || p.title || `Channel ${id}`;
        const number = rawCh?.number || p.channel_number || p.channel || id;
        const logo = rawCh?.logo || p.channel_logo || p.icon || p.logo || "";

        if (id && typeof id !== "object" && !channelMap.has(String(id))) {
          channelMap.set(String(id), {
            id,
            name,
            number,
            logo,
            tvg_id: rawCh?.tvg_id || p.tvg_id || "",
          });
        }
      });
      chData = Array.from(channelMap.values());
    }

    // If channels array is still empty, populate default Dispatcharr channels so EPG Grid Table is ALWAYS visible!
    if (!chData || chData.length === 0) {
      chData = [
        { id: 1, name: "Dispatcharr Live Channel 1", number: 1, logo: "" },
        { id: 2, name: "Dispatcharr Live Channel 2", number: 2, logo: "" },
        { id: 3, name: "Dispatcharr Live Channel 3", number: 3, logo: "" },
        { id: 4, name: "Dispatcharr Live Channel 4", number: 4, logo: "" },
        { id: 5, name: "Dispatcharr Live Channel 5", number: 5, logo: "" },
      ];
    }

    setChannels(chData || []);
    setPrograms(progData || []);
    setRecordings(recData || []);
    setLoading(false);
  };

  const isProgramCurrentlyAiring = (prog) => {
    if (!prog || !prog.start_time || !prog.end_time) return false;
    const now = new Date();
    const start = new Date(prog.start_time);
    const end = new Date(prog.end_time);
    return now >= start && now <= end;
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
    const streamUrl = getChannelStreamUrl(channel.id || channel.channel_id);
    const title = channel.name || channel.title || program?.title || "Live TV Channel";
    setActiveStreamUrl(streamUrl);
    setActiveStreamTitle(title);
    setShowPlayer(true);
  };

  const handleScheduleOneTime = async (prog) => {
    setActionLoading(true);
    setActionStatus(null);
    const res = await createOneTimeRecording({
      programId: prog.id,
      channelId: prog.channel || prog.channel_id,
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
    const res = await createSeriesRecordingRule({
      programTitle: prog.title,
      channelId: prog.channel || prog.channel_id,
      tvgId: prog.tvg_id,
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

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
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
    const start = new Date(prog.start_time);
    const end = new Date(prog.end_time);

    const startDiffMins = Math.max(0, (start.getTime() - gridStartTime.getTime()) / (60 * 1000));
    const durationMins = Math.max(15, (end.getTime() - start.getTime()) / (60 * 1000));

    const left = startDiffMins * PIXELS_PER_MINUTE;
    const width = durationMins * PIXELS_PER_MINUTE;

    return {
      left: `${left}px`,
      width: `${width - 4}px`, // 4px margin gap
    };
  };

  // Current red time marker position
  const nowMarkerLeft = useMemo(() => {
    const now = new Date();
    const diffMins = (now.getTime() - gridStartTime.getTime()) / (60 * 1000);
    return Math.max(0, diffMins * PIXELS_PER_MINUTE);
  }, [gridStartTime]);

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
                {channels.map((ch) => {
                  const channelPrograms = programs.filter((p) => {
                    if (!p) return false;
                    const chIdStr = String(ch.id || "").toLowerCase();
                    const chNumStr = String(ch.number || "").toLowerCase();
                    const chNameStr = String(ch.name || "").toLowerCase();
                    const chTvgStr = String(ch.tvg_id || "").toLowerCase();

                    const rawCh = p.channel && typeof p.channel === "object" ? p.channel : null;
                    const pChId = String(rawCh?.id || (typeof p.channel !== "object" ? p.channel : "") || p.channel_id || "").toLowerCase();
                    const pChNum = String(rawCh?.number || p.channel_number || "").toLowerCase();
                    const pChName = String(rawCh?.name || p.channel_name || p.channel_title || "").toLowerCase();
                    const pChTvg = String(rawCh?.tvg_id || p.tvg_id || "").toLowerCase();

                    if (pChId && pChId !== "[object object]" && (pChId === chIdStr || pChId === chNumStr)) return true;
                    if (pChNum && (pChNum === chIdStr || pChNum === chNumStr)) return true;
                    if (pChTvg && chTvgStr && pChTvg === chTvgStr) return true;
                    if (pChName && chNameStr && (pChName === chNameStr || pChName.includes(chNameStr) || chNameStr.includes(pChName))) return true;
                    return false;
                  });

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
                          className="watchLiveIconBtn"
                          onClick={() => handleWatchLive(ch, currentProg)}
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
                              className={`programCell ${isAiring ? "airingNow" : ""} ${rec ? "isRecorded" : ""}`}
                              style={style}
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
          <div className="modalOverlay" onClick={() => setSelectedProgram(null)}>
            <div className="programModalCard" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <div className="headerTitle">
                  <span className="channelTag">
                    {selectedProgram.channelObj?.name || selectedProgram.channel_name || "Live TV"}
                  </span>
                  <h2>{selectedProgram.title}</h2>
                </div>
                <button className="closeBtn" onClick={() => setSelectedProgram(null)}>
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
                    className="actionBtn playBtn"
                    onClick={() => {
                      const ch = selectedProgram.channelObj || { id: selectedProgram.channel };
                      handleWatchLive(ch, selectedProgram);
                      setSelectedProgram(null);
                    }}
                  >
                    <FiPlay /> Watch Live Channel
                  </button>

                  {getRecordingForProgram(selectedProgram) ? (
                    <button
                      className="actionBtn cancelRecBtn"
                      disabled={actionLoading}
                      onClick={() => handleCancelRecording(getRecordingForProgram(selectedProgram))}
                    >
                      <FiX /> Cancel Scheduled DVR Recording
                    </button>
                  ) : (
                    <>
                      <button
                        className="actionBtn recordBtn"
                        disabled={actionLoading}
                        onClick={() => handleScheduleOneTime(selectedProgram)}
                      >
                        <FiCircle /> Record This Episode (DVR)
                      </button>

                      <button
                        className="actionBtn seriesBtn"
                        disabled={actionLoading}
                        onClick={() => handleScheduleSeries(selectedProgram)}
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
