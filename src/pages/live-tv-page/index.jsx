import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import "./index.scss";

const LiveTvPage = () => {
  const navigate = useNavigate();
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

  return (
    <div className="liveTvPage">
      <TopNav />
      <ContentWrapper>
        <div className="pageHeader">
          <div className="titleBlock">
            <h1><FiTv style={{ marginRight: 10 }} /> Live TV & EPG Guide</h1>
            <p>Full TV Guide schedule, live stream playback, and Dispatcharr DVR recording management.</p>
          </div>
          <button className="refreshBtn" onClick={loadLiveTvData} disabled={loading}>
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh Guide
          </button>
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
          <div className="epgGridContainer">
            {/* Channel List & Program Guide */}
            <div className="channelList">
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
                  ? channelPrograms.slice(0, 8)
                  : [
                      {
                        id: `live-${ch.id || ch.name}`,
                        title: ch.name || "Live Channel Stream",
                        start_time: new Date(Date.now() - 3600000).toISOString(),
                        end_time: new Date(Date.now() + 3600000).toISOString(),
                        description: `Live TV stream for ${ch.name || "Channel"}. Click Watch Live to start streaming.`,
                        channel: ch.id,
                      },
                    ];

                const currentProg = displayedPrograms.find(isProgramCurrentlyAiring) || displayedPrograms[0];

                return (
                  <div key={ch.id || ch.name} className="channelCard">
                    <div className="channelMeta">
                      {ch.logo ? (
                        <img src={ch.logo} alt={ch.name} className="channelLogo" />
                      ) : (
                        <div className="channelNumber">{ch.number || ch.id || "TV"}</div>
                      )}
                      <div className="channelInfo">
                        <span className="channelName">{ch.name || ch.title}</span>
                        {currentProg && (
                          <span className="currentProgTitle">{currentProg.title}</span>
                        )}
                      </div>
                    </div>

                    <div className="channelActions">
                      <button
                        className="watchLiveBtn"
                        onClick={() => handleWatchLive(ch, currentProg)}
                      >
                        <FiPlay /> Watch Live
                      </button>
                    </div>

                    {/* Program Schedule Timeline */}
                    <div className="programRow">
                      {displayedPrograms.map((prog, idx) => {
                        const isAiring = isProgramCurrentlyAiring(prog);
                        const rec = getRecordingForProgram(prog);

                        return (
                          <div
                            key={prog.id || idx}
                            className={`programChip ${isAiring ? "airingNow" : ""} ${rec ? "isRecorded" : ""}`}
                            onClick={() => {
                              setSelectedProgram({ ...prog, channelObj: ch });
                              setActionStatus(null);
                            }}
                          >
                            {rec && <span className="recBadge" title="Recording Scheduled">REC</span>}
                            <span className="chipTitle">{prog.title}</span>
                            <span className="chipTime">{formatTime(prog.start_time)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Program Modal */}
        {selectedProgram && (
          <div className="modalOverlay" onClick={() => setSelectedProgram(null)}>
            <div className="programModal" onClick={(e) => e.stopPropagation()}>
              <div className="modalHeader">
                <div className="headerMeta">
                  <span className="channelBadge">{selectedProgram.channelObj?.name || "TV Channel"}</span>
                  <h2>{selectedProgram.title}</h2>
                </div>
                <button className="closeBtn" onClick={() => setSelectedProgram(null)}>
                  <FiX />
                </button>
              </div>

              <div className="modalBody">
                <div className="timeBar">
                  <FiClock style={{ marginRight: 6 }} />
                  <span>
                    {formatTime(selectedProgram.start_time)} - {formatTime(selectedProgram.end_time)}
                  </span>
                  {isProgramCurrentlyAiring(selectedProgram) && (
                    <span className="liveBadge">ON AIR NOW</span>
                  )}
                </div>

                <p className="description">
                  {selectedProgram.description || selectedProgram.summary || "No program details available for this broadcast."}
                </p>

                {actionStatus && (
                  <div className={`statusBanner ${actionStatus.type}`}>
                    {actionStatus.type === "success" ? <FiCheck /> : <FiX />}
                    <span>{actionStatus.text}</span>
                  </div>
                )}

                <div className="modalActions">
                  {isProgramCurrentlyAiring(selectedProgram) && (
                    <button
                      className="actionBtn play"
                      onClick={() => {
                        handleWatchLive(selectedProgram.channelObj, selectedProgram);
                        setSelectedProgram(null);
                      }}
                    >
                      <FiPlay /> Watch Live
                    </button>
                  )}

                  {(() => {
                    const existingRec = getRecordingForProgram(selectedProgram);
                    if (existingRec) {
                      return (
                        <button
                          className="actionBtn cancel"
                          onClick={() => handleCancelRecording(existingRec)}
                          disabled={actionLoading}
                        >
                          <FiX /> Cancel Recording
                        </button>
                      );
                    }

                    return (
                      <>
                        <button
                          className="actionBtn record"
                          onClick={() => handleScheduleOneTime(selectedProgram)}
                          disabled={actionLoading}
                        >
                          <FiCircle className="recDot" /> Record Program
                        </button>
                        <button
                          className="actionBtn series"
                          onClick={() => handleScheduleSeries(selectedProgram)}
                          disabled={actionLoading}
                        >
                          <FiVideo /> Record Series
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        {showPlayer && (
          <VideoPlayerModal
            videoUrl={activeStreamUrl}
            title={activeStreamTitle}
            onClose={() => setShowPlayer(false)}
          />
        )}
      </ContentWrapper>
    </div>
  );
};

export default LiveTvPage;
