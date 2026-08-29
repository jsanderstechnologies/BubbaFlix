import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import "./index.scss";

const LiveTvPage = () => {
  const [channels, setChannels] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const [chData, progData, recData] = await Promise.all([
      fetchDispatcharrChannels(),
      fetchDispatcharrEpgPrograms(),
      fetchDispatcharrRecordings(),
    ]);

    setChannels(chData);
    setPrograms(progData);
    setRecordings(recData);
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
                const channelPrograms = programs.filter(
                  (p) => p.channel === ch.id || p.channel_id === ch.id || p.channel_name === ch.name
                );
                const currentProg = channelPrograms.find(isProgramCurrentlyAiring) || channelPrograms[0];

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
                      {channelPrograms.slice(0, 6).map((prog, idx) => {
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
