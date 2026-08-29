import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import Spinner from "../../components/spinner";
import VideoPlayerModal from "../../components/video-player-modal";
import {
  fetchDispatcharrRecordings,
  deleteDispatcharrRecording,
  stopDispatcharrRecording,
  getRecordingStreamUrl,
} from "../../utils/dispatcharr";
import {
  FiVideo,
  FiPlay,
  FiTrash2,
  FiSquare,
  FiRefreshCw,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import "./index.scss";

const RecordingsPage = () => {
  const navigate = useNavigate();
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Video player state
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    setLoading(true);
    const data = await fetchDispatcharrRecordings();
    setRecordings(data);
    setLoading(false);
  };

  const handleDelete = async (recId) => {
    if (!window.confirm("Are you sure you want to delete this recording?")) return;
    const res = await deleteDispatcharrRecording(recId);
    if (res.success) {
      loadRecordings();
    } else {
      alert(res.message || "Failed to delete recording.");
    }
  };

  const handleStop = async (recId) => {
    const res = await stopDispatcharrRecording(recId);
    if (res.success) {
      loadRecordings();
    } else {
      alert(res.message || "Failed to stop recording.");
    }
  };

  const handlePlayRecording = (rec) => {
    const streamUrl = getRecordingStreamUrl(rec);
    if (!streamUrl) {
      alert("Stream URL not available for this recording.");
      return;
    }
    setActiveVideoUrl(streamUrl);
    setActiveVideoTitle(rec.title || "DVR Recording");
    setShowPlayer(true);
  };

  const filteredRecordings = recordings.filter((r) => {
    if (activeTab === "completed") return r.status === "completed" || r.file_url;
    if (activeTab === "recording") return r.status === "recording" || r.status === "in_progress";
    if (activeTab === "scheduled") return r.status === "scheduled" || r.status === "pending";
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="recordingsPage">
      <TopNav />
      <ContentWrapper>
        <div className="pageHeader">
          <div className="titleBlock">
            <h1><FiVideo style={{ marginRight: 10 }} /> DVR Recordings</h1>
            <p>Manage and playback your recorded TV shows and movies stored on Dispatcharr.</p>
          </div>
          <button className="refreshBtn" onClick={loadRecordings} disabled={loading}>
            <FiRefreshCw className={loading ? "spin" : ""} /> Refresh Library
          </button>
        </div>

        {/* Tab Selection */}
        <div className="tabsRow">
          <button
            className={`tabBtn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Recordings ({recordings.length})
          </button>
          <button
            className={`tabBtn ${activeTab === "completed" ? "active" : ""}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed ({recordings.filter((r) => r.status === "completed" || r.file_url).length})
          </button>
          <button
            className={`tabBtn ${activeTab === "recording" ? "active" : ""}`}
            onClick={() => setActiveTab("recording")}
          >
            Recording Now ({recordings.filter((r) => r.status === "recording" || r.status === "in_progress").length})
          </button>
          <button
            className={`tabBtn ${activeTab === "scheduled" ? "active" : ""}`}
            onClick={() => setActiveTab("scheduled")}
          >
            Scheduled ({recordings.filter((r) => r.status === "scheduled" || r.status === "pending").length})
          </button>
        </div>

        {loading ? (
          <div className="loadingContainer">
            <Spinner />
          </div>
        ) : filteredRecordings.length === 0 ? (
          <div className="emptyNotice">
            <FiAlertCircle className="icon" />
            <h3>No DVR Recordings Found</h3>
            <p>You have no saved or scheduled DVR recordings on your Dispatcharr server.</p>
            <button
              className="refreshBtn"
              style={{ background: "var(--pink)", borderColor: "var(--pink)", marginTop: 15, padding: "10px 20px" }}
              onClick={() => navigate("/livetv")}
            >
              Go to Live TV Guide to Schedule Recording
            </button>
          </div>
        ) : (
          <div className="recordingsGrid">
            {filteredRecordings.map((rec) => {
              const isCompleted = rec.status === "completed" || rec.file_url;
              const isRecording = rec.status === "recording" || rec.status === "in_progress";

              return (
                <div key={rec.id} className="recordingCard">
                  <div className="cardThumbnail">
                    {rec.artwork || rec.thumbnail ? (
                      <img src={rec.artwork || rec.thumbnail} alt={rec.title} />
                    ) : (
                      <div className="thumbPlaceholder">
                        <FiVideo />
                      </div>
                    )}

                    {isCompleted && (
                      <button className="playOverlayBtn" onClick={() => handlePlayRecording(rec)}>
                        <FiPlay />
                      </button>
                    )}

                    <span className={`statusTag ${rec.status || "completed"}`}>
                      {isRecording ? "REC NOW" : rec.status || "Ready"}
                    </span>
                  </div>

                  <div className="cardContent">
                    <h3 className="recTitle" title={rec.title}>
                      {rec.title || "Untitled Recording"}
                    </h3>
                    <div className="recMeta">
                      <span className="channelName">{rec.channel_name || rec.channel || "TV Channel"}</span>
                      <span className="recTime">
                        <FiClock style={{ marginRight: 4 }} /> {formatDate(rec.start_time || rec.created_at)}
                      </span>
                    </div>

                    <div className="cardActions">
                      {(isCompleted || isRecording) && (
                        <button className="actionBtn play" onClick={() => handlePlayRecording(rec)}>
                          <FiPlay /> Play
                        </button>
                      )}

                      {isRecording && (
                        <button className="actionBtn stop" onClick={() => handleStop(rec.id)}>
                          <FiSquare /> Stop
                        </button>
                      )}

                      <button className="actionBtn delete" onClick={() => handleDelete(rec.id)}>
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Video Player Modal */}
        {showPlayer && (
          <VideoPlayerModal
            show={showPlayer}
            setShow={setShowPlayer}
            videoUrl={activeVideoUrl}
            rawUrl={activeVideoUrl}
            streamUrl={activeVideoUrl}
            title={activeVideoTitle}
            onClose={() => setShowPlayer(false)}
          />
        )}
      </ContentWrapper>
    </div>
  );
};

export default RecordingsPage;
