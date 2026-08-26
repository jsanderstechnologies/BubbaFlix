import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiTv,
  FiPlay,
  FiVideo,
  FiTrash2,
  FiRefreshCw,
  FiClock,
  FiSettings,
  FiGrid,
  FiList,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import {
  getDispatcharrConfigAsync,
  fetchDispatcharrChannels,
  fetchDispatcharrEpg,
  fetchDispatcharrRecordings,
  scheduleDispatcharrRecording,
  deleteDispatcharrRecording
} from "../../utils/dispatcharr";
import VideoPlayerModal from "../../components/video-player-modal";
import RecordingModal from "../../components/recording-modal";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import "./index.scss";

// EPG Grid Config
const HOUR_WIDTH = 360; // 360px per 1 hour (180px per 30 min)
const TOTAL_HOURS = 8; // Display 8 hours of timeline

const LiveTvPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("guide"); // "guide" (EPG Grid), "channels" (Card Grid), "recordings"
  const [viewMode, setViewMode] = useState("epgGrid"); // "epgGrid", "cards"

  // Config State
  const [serverUrl, setServerUrl] = useState("");

  // Data State
  const [channels, setChannels] = useState([]);
  const [epgData, setEpgData] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  // EPG Timeline State
  const [timeSlots, setTimeSlots] = useState([]);
  const [timelineStart, setTimelineStart] = useState(new Date());
  const gridScrollRef = useRef(null);

  // Player Modal State
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerStreamUrl, setPlayerStreamUrl] = useState("");
  const [playerTitle, setPlayerTitle] = useState("");

  // DVR Recording Modal State
  const [showRecModal, setShowRecModal] = useState(false);
  const [recTargetProgram, setRecTargetProgram] = useState(null);
  const [recTargetChannel, setRecTargetChannel] = useState(null);

  useEffect(() => {
    const initConfig = async () => {
      const cfg = await getDispatcharrConfigAsync();
      setServerUrl(cfg.url);
      loadAllData();
    };
    initConfig();
    generateTimeline();
  }, []);

  const generateTimeline = (baseDate = new Date()) => {
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
  };

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

  const handlePlayChannel = (channel) => {
    const streamUrl = channel.stream_url || channel.url || `${serverUrl}/proxy/ts/stream/${channel.id || channel.channel_id}`;
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

  const handleOpenRecModal = (program, channel) => {
    setRecTargetProgram(program);
    setRecTargetChannel(channel);
    setShowRecModal(true);
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
    const channelId = String(channel.id || channel.channel_id || channel.uuid || "");
    const channelNum = String(channel.number || "");

    let programs = epgData.filter((epg) => {
      const epgChId = String(epg.channel_id || epg.channel || epg.tvg_id || "");
      const epgChNum = String(epg.channel_number || epg.number || "");
      return (channelId && epgChId === channelId) || (channelNum && epgChNum === channelNum);
    });

    if (programs.length === 0 && channel.current_program) {
      programs = [channel.current_program];
    }

    return programs;
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

        {activeTab === "guide" && (
          <div className="tabContent">
            <div className="sectionActionHeader">
              <div className="leftActions">
                <h2>Electronic Program Guide</h2>
                <div className="viewToggleBtns">
                  <button
                    className={`toggleBtn ${viewMode === "epgGrid" ? "active" : ""}`}
                    onClick={() => setViewMode("epgGrid")}
                    title="EPG Timeline Grid"
                    tabIndex="0"
                  >
                    <FiGrid /> EPG Grid
                  </button>
                  <button
                    className={`toggleBtn ${viewMode === "cards" ? "active" : ""}`}
                    onClick={() => setViewMode("cards")}
                    title="Channel Cards"
                    tabIndex="0"
                  >
                    <FiList /> Channel Cards
                  </button>
                </div>
              </div>

              <div className="rightActions">
                {viewMode === "epgGrid" && (
                  <>
                    <button className="navGridBtn" onClick={() => handleScrollGrid("left")} tabIndex="0" title="Scroll Left">
                      <FiChevronLeft />
                    </button>
                    <button className="nowBtn" onClick={handleJumpToNow} tabIndex="0">
                      <FiClock /> Jump to Now
                    </button>
                    <button className="navGridBtn" onClick={() => handleScrollGrid("right")} tabIndex="0" title="Scroll Right">
                      <FiChevronRight />
                    </button>
                  </>
                )}
                <button className="refreshBtn" onClick={loadAllData} tabIndex="0">
                  <FiRefreshCw /> Refresh Guide
                </button>
              </div>
            </div>

            {loading ? (
              <div className="loadingNotice">Loading Dispatcharr EPG Guide...</div>
            ) : channels.length === 0 ? (
              <div className="emptyState">
                <FiTv style={{ fontSize: "48px", marginBottom: "16px", color: "var(--pink)" }} />
                <h3>No Dispatcharr Channels Found</h3>
                <p>Configure your Dispatcharr server address and API key in the main Settings page to stream Live TV and manage DVR recordings.</p>
                <button className="setupBtn" onClick={() => navigate("/settings")} tabIndex="0">
                  <FiSettings style={{ marginRight: "6px" }} /> Configure in Settings Page
                </button>
              </div>
            ) : viewMode === "epgGrid" ? (
              <div className="epgGridContainer">
                <div className="epgGridScrollWrapper" ref={gridScrollRef}>
                  <div className="epgGridTable" style={{ width: `${220 + TOTAL_HOURS * HOUR_WIDTH}px` }}>
                    <div className="epgHeaderRow">
                      <div className="channelColumnHeader">Channels ({channels.length})</div>
                      <div className="timelineSlotsHeader" style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}>
                        {timeSlots.map((slot, sIdx) => (
                          <div key={sIdx} className="timeSlotCell" style={{ width: `${HOUR_WIDTH / 2}px` }}>
                            {slot.label}
                          </div>
                        ))}
                        {nowOffsetPx >= 0 && (
                          <div className="nowLineIndicator" style={{ left: `${nowOffsetPx}px` }}>
                            <span className="nowBadge">NOW</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="epgRowsContainer">
                      {channels.map((ch, idx) => {
                        const channelProgs = getChannelPrograms(ch);
                        return (
                          <div key={ch.id || idx} className="epgChannelRow">
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

                            <div className="programsTimelineCell" style={{ width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}>
                              {nowOffsetPx >= 0 && <div className="nowLineRow" style={{ left: `${nowOffsetPx}px` }} />}

                              {channelProgs.length > 0 ? (
                                channelProgs.map((prog, pIdx) => {
                                  const progStart = prog.start_time ? new Date(prog.start_time) : timelineStart;
                                  const progEnd = prog.end_time ? new Date(prog.end_time) : new Date(timelineStart.getTime() + 2 * 60 * 60 * 1000);

                                  const startDiffHours = (progStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60);
                                  const durationHours = (progEnd.getTime() - progStart.getTime()) / (1000 * 60 * 60);

                                  const leftPx = Math.max(0, startDiffHours * HOUR_WIDTH);
                                  const widthPx = Math.max(80, durationHours * HOUR_WIDTH);
                                  const isCurrentlyLive = now >= progStart && now <= progEnd;

                                  return (
                                    <div
                                      key={prog.id || pIdx}
                                      className={`programBlock ${isCurrentlyLive ? "isLive" : ""}`}
                                      style={{ left: `${leftPx}px`, width: `${widthPx}px` }}
                                      onClick={() => handlePlayChannel(ch)}
                                      tabIndex="0"
                                    >
                                      <div className="progHeader">
                                        <span className="progTitle">{prog.title || prog.name || ch.now_playing || "Live Program"}</span>
                                        {isCurrentlyLive && <span className="liveBadge">LIVE</span>}
                                      </div>
                                      <div className="progTime">
                                        {progStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {progEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      {prog.description && <div className="progDesc">{prog.description}</div>}
                                      <div className="progActions">
                                        <button className="quickPlayBtn" onClick={(e) => { e.stopPropagation(); handlePlayChannel(ch); }} tabIndex="0">
                                          <FiPlay /> Watch Live
                                        </button>
                                        <button className="quickRecBtn" onClick={(e) => { e.stopPropagation(); handleOpenRecModal(prog, ch); }} tabIndex="0" title="Record Program">
                                          <FiVideo /> Record
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div
                                  className="programBlock isLive fallbackBlock"
                                  style={{ left: "0px", width: `${TOTAL_HOURS * HOUR_WIDTH}px` }}
                                  onClick={() => handlePlayChannel(ch)}
                                  tabIndex="0"
                                >
                                  <div className="progHeader">
                                    <span className="progTitle">{ch.now_playing || ch.current_program?.title || "Live Stream Broadcast"}</span>
                                    <span className="liveBadge">LIVE NOW</span>
                                  </div>
                                  <div className="progTime">Click to play channel stream live</div>
                                  <button className="quickPlayBtn" onClick={(e) => { e.stopPropagation(); handlePlayChannel(ch); }} tabIndex="0">
                                    <FiPlay /> Watch Live Channel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
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
                      <button
                        className="recordBtn"
                        onClick={() => handleOpenRecModal(ch.current_program, ch)}
                        tabIndex="0"
                        title="Record Options"
                      >
                        <FiVideo /> Record Options
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
                  <div key={rec.id || idx} className="recordingCard" tabIndex="0">
                    <div className="recThumbnailBlock">
                      {rec.thumbnail ? (
                        <img src={rec.thumbnail} alt={rec.title} className="recThumbnail" />
                      ) : (
                        <div className="recPlaceholder"><FiVideo /></div>
                      )}
                      <button className="playOverlayBtn" onClick={() => handlePlayRecording(rec)} tabIndex="0" title="Play Recording">
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
                      onClick={() => handleDeleteRecording(rec.id)}
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

      <VideoPlayerModal
        show={showPlayer}
        setShow={setShowPlayer}
        videoUrl={playerStreamUrl}
        title={playerTitle}
      />

      <RecordingModal
        show={showRecModal}
        onClose={() => setShowRecModal(false)}
        program={recTargetProgram}
        channel={recTargetChannel}
        onConfirm={handleConfirmSchedule}
      />
    </div>
  );
};

export default LiveTvPage;
