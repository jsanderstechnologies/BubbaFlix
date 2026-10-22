import React, { useState, useEffect, useRef, useMemo } from "react";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import { fetchIptvChannels, fetchIptvGroups, fetchIptvEpg, getIptvStreamUrl } from "../../utils/iptv";
import { isAndroidTvClient } from "../../utils/serverSettings";
import {
  FiTv,
  FiSearch,
  FiPlay,
  FiSliders,
  FiRefreshCw,
  FiClock,
  FiAlertCircle,
  FiMaximize,
  FiVolume2,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./index.scss";

const LiveTvPage = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentChannel, setCurrentChannel] = useState(null);
  const [epgData, setEpgData] = useState({}); // streamId -> listings array

  // Remote Direct Number Tuning (0-9 keys)
  const [numberBuffer, setNumberBuffer] = useState("");
  const numberBufferTimerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const [chs, grps] = await Promise.all([
          fetchIptvChannels(false), // only enabled channels
          fetchIptvGroups(false),
        ]);
        if (isMounted) {
          setChannels(chs);
          setGroups(grps);
          if (chs.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const targetStreamId = params.get("stream_id");
            let initial = chs[0];
            if (targetStreamId) {
              const matched = chs.find((c) => String(c.stream_id) === String(targetStreamId));
              if (matched) initial = matched;
            }
            setCurrentChannel(initial);
          }
        }
      } catch (err) {
        console.error("Failed to load IPTV channels:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch short EPG for current channel when selected
  useEffect(() => {
    if (!currentChannel) return;
    const sid = String(currentChannel.stream_id);
    if (epgData[sid]) return;

    (async () => {
      const tvgId = currentChannel.epg_channel_id || currentChannel.tvg_id || "";
      const chName = currentChannel.name || currentChannel.original_name || "";
      const listings = await fetchIptvEpg(sid, tvgId, chName);
      setEpgData((prev) => ({ ...prev, [sid]: listings }));
    })();
  }, [currentChannel]);

  // Handle direct numeric tuning from physical remote control
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for numeric keys 0-9
      if (e.key >= "0" && e.key <= "9") {
        const newBuf = numberBuffer + e.key;
        setNumberBuffer(newBuf);

        if (numberBufferTimerRef.current) {
          clearTimeout(numberBufferTimerRef.current);
        }

        numberBufferTimerRef.current = setTimeout(() => {
          const targetNum = parseInt(newBuf, 10);
          const matched = channels.find((c) => c.channel_number === targetNum);
          if (matched) {
            handleTuneChannel(matched);
          }
          setNumberBuffer("");
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (numberBufferTimerRef.current) clearTimeout(numberBufferTimerRef.current);
    };
  }, [numberBuffer, channels]);

  const handleTuneChannel = (channel) => {
    setCurrentChannel(channel);
    const streamUrl = getIptvStreamUrl(channel.stream_id);

    // If on Android TV, launch native hardware-accelerated ExoPlayer directly
    if (isAndroidTvClient() && window.AndroidPlayer?.playStream) {
      window.AndroidPlayer.playStream(
        streamUrl,
        `Ch. ${channel.channel_number} | ${channel.name}`,
        channel.stream_icon || "",
        String(channel.stream_id),
        "live"
      );
    }
  };

  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (selectedCategory !== "all" && String(ch.category_id) !== String(selectedCategory)) {
        return false;
      }
      if (
        searchQuery &&
        !ch.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !String(ch.channel_number).includes(searchQuery)
      ) {
        return false;
      }
      return true;
    });
  }, [channels, selectedCategory, searchQuery]);

  const currentEpg = currentChannel ? epgData[String(currentChannel.stream_id)] || [] : [];
  const nowPlaying = currentEpg.length > 0 ? currentEpg[0] : null;
  const nextPlaying = currentEpg.length > 1 ? currentEpg[1] : null;

  return (
    <div className="liveTvPage">
      <TopNav />
      <ContentWrapper>
        {/* Remote Numeric Tuning Banner Overlay */}
        {numberBuffer && (
          <div className="remoteTuningBanner">
            <span className="tuningLabel">Tuning Channel:</span>
            <span className="tuningNumber">{numberBuffer}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="liveTvHeader">
          <div className="headerLeft">
            <h1 className="title">
              <FiTv className="icon" /> Live TV
            </h1>
            <span className="channelCountBadge">{channels.length} Channels Available</span>
          </div>
          <div className="headerRight">
            <button className="setupShortcutBtn" onClick={() => navigate("/settings/iptv")}>
              <FiSliders /> Channel Setup & Numbering
            </button>
          </div>
        </div>

        {/* Empty State */}
        {!loading && channels.length === 0 && (
          <div className="emptyIptvCard">
            <FiTv className="emptyIcon" />
            <h2>No IPTV Channels Configured</h2>
            <p>
              Connect your Xtream Codes subscription to enable live channels and customize your channel numbers.
            </p>
            <button className="setupBtn" onClick={() => navigate("/settings/iptv")}>
              <FiSliders /> Configure IPTV Setup
            </button>
          </div>
        )}

        {/* Main Live TV Split Interface */}
        {channels.length > 0 && (
          <div className="liveTvLayout">
            {/* Left / Top: Active Player & EPG Bar */}
            <div className="playerSection">
              <div className="playerWindow">
                {currentChannel ? (
                  <div className="playerContainer">
                    <video
                      id="livePlayerVideo"
                      controls
                      autoPlay
                      src={getIptvStreamUrl(currentChannel.stream_id)}
                      className="liveVideoElement"
                    />
                    <div className="channelOverlayHeader">
                      <div className="overlayBadge">
                        <span className="chNum">Ch. {currentChannel.channel_number}</span>
                        <span className="chName">{currentChannel.name}</span>
                      </div>
                      <span className="livePill">LIVE</span>
                    </div>
                  </div>
                ) : (
                  <div className="noChannelPlaceholder">
                    <FiTv />
                    <span>Select a channel below to begin watching</span>
                  </div>
                )}
              </div>

              {/* Now Airing & EPG Detail Card */}
              {currentChannel && (
                <div className="epgDetailCard">
                  <div className="epgHeader">
                    <div className="channelLogoWrapper">
                      {currentChannel.stream_icon ? (
                        <img
                          src={currentChannel.stream_icon}
                          alt=""
                          className="logoImg"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <FiTv className="fallbackLogo" />
                      )}
                    </div>
                    <div className="channelMeta">
                      <div className="numNameRow">
                        <span className="num">Channel {currentChannel.channel_number}</span>
                        <h2 className="name">{currentChannel.name}</h2>
                        <span className="category">{currentChannel.category_name}</span>
                      </div>
                      <div className="nowPlayingTitle">
                        {nowPlaying ? nowPlaying.title : "Live Broadcast"}
                      </div>
                    </div>
                  </div>

                  {nowPlaying && nowPlaying.description && (
                    <p className="nowPlayingDesc">{nowPlaying.description}</p>
                  )}

                  {nextPlaying && (
                    <div className="nextRow">
                      <span className="nextLabel">UP NEXT:</span>
                      <span className="nextTitle">{nextPlaying.title}</span>
                      {nextPlaying.start && <span className="nextTime">({nextPlaying.start})</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right / Bottom: Category Tabs, Search, & Channel Guide */}
            <div className="guideSection">
              {/* Category Pills */}
              <div className="categoryFilterRow">
                <button
                  className={`categoryPill ${selectedCategory === "all" ? "active" : ""}`}
                  onClick={() => setSelectedCategory("all")}
                >
                  All ({channels.length})
                </button>
                {groups
                  .filter((g) => g.enabled)
                  .map((grp) => (
                    <button
                      key={grp.category_id}
                      className={`categoryPill ${String(selectedCategory) === String(grp.category_id) ? "active" : ""}`}
                      onClick={() => setSelectedCategory(String(grp.category_id))}
                    >
                      {grp.category_name} ({grp.channel_count})
                    </button>
                  ))}
              </div>

              {/* Search Box */}
              <div className="guideSearchBox">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search channel name or enter channel #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Scrollable Channel List */}
              <div className="channelList">
                {filteredChannels.map((ch) => {
                  const isCurrent = currentChannel && currentChannel.stream_id === ch.stream_id;
                  const epgItems = epgData[String(ch.stream_id)] || [];
                  const activeTitle = epgItems.length > 0 ? epgItems[0].title : null;

                  return (
                    <div
                      key={ch.stream_id}
                      className={`channelRow ${isCurrent ? "active" : ""}`}
                      onClick={() => handleTuneChannel(ch)}
                    >
                      <div className="channelNumberBadge">{ch.channel_number}</div>
                      <div className="channelLogo">
                        {ch.stream_icon ? (
                          <img
                            src={ch.stream_icon}
                            alt=""
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <FiTv />
                        )}
                      </div>
                      <div className="channelInfo">
                        <div className="topLine">
                          <span className="name">{ch.name}</span>
                          <span className="categoryBadge">{ch.category_name}</span>
                        </div>
                        <div className="nowAiringLine">
                          {activeTitle || "Live Broadcast"}
                        </div>
                      </div>
                      <div className="playAction">
                        <FiPlay />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </ContentWrapper>
    </div>
  );
};

export default LiveTvPage;
