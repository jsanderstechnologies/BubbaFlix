import { useState, useEffect } from "react";
import {
  FiTv,
  FiPlay,
  FiCalendar,
  FiVideo,
  FiSettings,
  FiTrash2,
  FiRefreshCw,
  FiCheck,
  FiClock
} from "react-icons/fi";
import {
  getDispatcharrConfig,
  setDispatcharrConfig,
  fetchDispatcharrChannels,
  fetchDispatcharrEpg,
  fetchDispatcharrRecordings,
  scheduleDispatcharrRecording,
  deleteDispatcharrRecording
} from "../../utils/dispatcharr";
import VideoPlayerModal from "../../components/video-player-modal";
import ContentWrapper from "../../components/content-wrapper";
import "./index.scss";

const LiveTvPage = () => {
  const [activeTab, setActiveTab] = useState("channels"); // "channels", "schedule", "recordings", "settings"

  // Config State
  const [serverUrl, setServerUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Data State
  const [channels, setChannels] = useState([]);
  const [epgData, setEpgData] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Player Modal State
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerStreamUrl, setPlayerStreamUrl] = useState("");
  const [playerTitle, setPlayerTitle] = useState("");

  useEffect(() => {
    const cfg = getDispatcharrConfig();
    setServerUrl(cfg.url);
    setApiKey(cfg.apiKey);
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [chData, epgList, recList] = await Promise.all([
        fetchDispatcharrChannels(),
        fetchDispatcharrEpg(),
        fetchDispatcharrRecordings()
      ]);
      setChannels(chData);
      setEpgData(epgList);
      setRecordings(recList);
    } catch (err) {
      console.error("[Live TV Load Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setDispatcharrConfig(serverUrl, apiKey);
    setSaveStatus("Saved successfully!");
    setTimeout(() => setSaveStatus(""), 3000);
    loadAllData();
  };

  const handlePlayChannel = (channel) => {
    const streamUrl = channel.stream_url || channel.url || `${serverUrl}/stream/${channel.id || channel.channel_id}`;
    setPlayerStreamUrl(streamUrl);
    setPlayerTitle(channel.name || `Channel ${channel.number || ""}`);
    setShowPlayer(true);
  };

  const handlePlayRecording = (rec) => {
    const streamUrl = rec.stream_url || rec.url || `${serverUrl}/recordings/${rec.id}/stream`;
    setPlayerStreamUrl(streamUrl);
    setPlayerTitle(rec.title || "DVR Recording");
    setShowPlayer(true);
  };

  const handleScheduleRecording = async (program) => {
    const success = await scheduleDispatcharrRecording(program);
    if (success) {
      alert(`Scheduled recording for: ${program.title}`);
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

  return (
    <div className="liveTvPage">
      <ContentWrapper>
        <div className="pageHeader">
          <div className="pageTitle">
            <FiTv className="titleIcon" />
            <h1>Dispatcharr Live TV & DVR</h1>
          </div>
          <div className="tabSelector">
            <button
              className={`tabItem ${activeTab === "channels" ? "active" : ""}`}
              onClick={() => setActiveTab("channels")}
              tabIndex="0"
            >
              <FiTv /> Live Guide
            </button>
            <button
              className={`tabItem ${activeTab === "recordings" ? "active" : ""}`}
              onClick={() => setActiveTab("recordings")}
              tabIndex="0"
            >
              <FiVideo /> Recordings ({recordings.length})
            </button>
            <button
              className={`tabItem ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => setActiveTab("settings")}
              tabIndex="0"
            >
              <FiSettings /> Dispatcharr Config
            </button>
          </div>
        </div>

        {/* Channels & EPG Guide Tab */}
        {activeTab === "channels" && (
          <div className="tabContent">
            <div className="sectionActionHeader">
              <h2>Channels & Electronic Program Guide</h2>
              <button className="refreshBtn" onClick={loadAllData} tabIndex="0">
                <FiRefreshCw /> Refresh EPG
              </button>
            </div>

            {loading ? (
              <div className="loadingNotice">Loading Dispatcharr Channels...</div>
            ) : channels.length === 0 ? (
              <div className="emptyState">
                <FiTv style={{ fontSize: "48px", marginBottom: "16px", color: "var(--pink)" }} />
                <h3>No Dispatcharr Channels Found</h3>
                <p>Connect your Dispatcharr server address below to stream Live TV and manage DVR recordings.</p>
                <button className="setupBtn" onClick={() => setActiveTab("settings")} tabIndex="0">
                  Configure Dispatcharr Server
                </button>
              </div>
            ) : (
              <div className="channelsGrid">
                {channels.map((ch, idx) => (
                  <div key={ch.id || idx} className="channelCard" tabIndex="0">
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
                      <span className="nowPlayingLabel">NOW PLAYING</span>
                      <h4 className="programTitle">{ch.current_program?.title || ch.now_playing || "Live Broadcast"}</h4>
                      <p className="programDesc">{ch.current_program?.description || "No guide detail available"}</p>
                    </div>

                    <div className="cardActions">
                      <button className="playBtn" onClick={() => handlePlayChannel(ch)} tabIndex="0">
                        <FiPlay /> Watch Live
                      </button>
                      {ch.current_program && (
                        <button
                          className="recordBtn"
                          onClick={() => handleScheduleRecording(ch.current_program)}
                          tabIndex="0"
                          title="Record Program"
                        >
                          <FiVideo /> Record
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DVR Recordings Tab */}
        {activeTab === "recordings" && (
          <div className="tabContent">
            <div className="sectionActionHeader">
              <h2>Recorded Shows & Movies</h2>
              <button className="refreshBtn" onClick={loadAllData} tabIndex="0">
                <FiRefreshCw /> Refresh Recordings
              </button>
            </div>

            {loading ? (
              <div className="loadingNotice">Loading DVR Recordings...</div>
            ) : recordings.length === 0 ? (
              <div className="emptyState">
                <FiVideo style={{ fontSize: "48px", marginBottom: "16px", color: "var(--pink)" }} />
                <h3>No DVR Recordings Found</h3>
                <p>Recordings scheduled via Dispatcharr will appear here for 1-click playback.</p>
              </div>
            ) : (
              <div className="recordingsGrid">
                {recordings.map((rec, idx) => (
                  <div key={rec.id || idx} className="recordingCard" tabIndex="0">
                    <div className="recThumbnailBlock">
                      {rec.thumbnail ? (
                        <img src={rec.thumbnail} alt={rec.title} className="recThumbnail" />
                      ) : (
                        <div className="recPlaceholder"><FiVideo /></div>
                      )}
                      <button className="playOverlayBtn" onClick={() => handlePlayRecording(rec)} tabIndex="0">
                        <FiPlay />
                      </button>
                    </div>

                    <div className="recDetails">
                      <h3 className="recTitle">{rec.title}</h3>
                      <div className="recMeta">
                        <span className="recTime"><FiClock /> {rec.duration || "Recorded"}</span>
                        {rec.channel_name && <span className="recChannel">{rec.channel_name}</span>}
                      </div>
                      <p className="recDesc">{rec.description}</p>
                    </div>

                    <button
                      className="deleteRecBtn"
                      onClick={() => handleDeleteRecording(rec.id)}
                      tabIndex="0"
                      title="Delete Recording"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Server Config Tab */}
        {activeTab === "settings" && (
          <div className="tabContent">
            <div className="configCard">
              <h2>Dispatcharr Live TV & DVR Connection</h2>
              <p className="configDesc">
                Connect your local Dispatcharr server IP and API key to enable Live TV channel guide streaming, EPG scheduling, and DVR recording playback.
              </p>

              <form onSubmit={handleSaveSettings} className="configForm">
                <div className="inputGroup">
                  <label>Dispatcharr Server URL (One Row):</label>
                  <input
                    type="url"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://192.168.1.100:9191"
                    required
                    tabIndex="0"
                  />
                </div>

                <div className="inputGroup">
                  <label>API Key (Optional):</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Optional API key"
                    tabIndex="0"
                  />
                </div>

                <div className="formFooter">
                  <button type="submit" className="saveBtn" tabIndex="0">
                    <FiCheck /> Save Dispatcharr Config
                  </button>
                  {saveStatus && <span className="saveStatus">{saveStatus}</span>}
                </div>
              </form>
            </div>
          </div>
        )}
      </ContentWrapper>

      {/* Video Player Modal for Channel / Recording Playback */}
      <VideoPlayerModal
        show={showPlayer}
        setShow={setShowPlayer}
        videoUrl={playerStreamUrl}
        title={playerTitle}
      />
    </div>
  );
};

export default LiveTvPage;
