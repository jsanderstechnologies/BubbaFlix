import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import {
  fetchIptvChannels,
  fetchIptvGroups,
  fetchIptvEpg,
  fetchIptvEpgBatch,
  getIptvStreamUrl,
} from "../../utils/iptv";
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
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./index.scss";

// Robust Unix timestamp parser from varied date formats (seconds, ms, ISO, XMLTV)
const parseDateToUnixSec = (val) => {
  if (!val) return 0;
  if (typeof val === "number" && val > 0) {
    return val > 10000000000 ? Math.floor(val / 1000) : val;
  }
  const str = String(val).trim();
  const num = parseInt(str, 10);
  if (!isNaN(num) && num > 1000000000 && String(num) === str) {
    return num;
  }
  const d = new Date(str.replace(" ", "T"));
  if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (m) {
    const d2 = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);
    if (!isNaN(d2.getTime())) return Math.floor(d2.getTime() / 1000);
  }
  return 0;
};

// Format a timestamp as a readable time string (e.g., "8:30 AM")
const formatSlotTime = (date) => {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

// Format start and end timestamps into "8:00 AM – 9:30 AM"
const formatTimeRange = (startTs, stopTs) => {
  if (!startTs || !stopTs) return "Live Broadcast";
  const startD = new Date(startTs * 1000);
  const stopD = new Date(stopTs * 1000);
  const sStr = startD.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const eStr = stopD.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${sStr} – ${eStr}`;
};

// Compute contiguous, gap-free program tiles along the timeline
const getProgramsForChannel = (channel, listings, timelineStartTs, timelineEndTs) => {
  const result = [];
  const validListings = (listings || [])
    .map((l) => {
      const startTs = l.start_timestamp ? parseDateToUnixSec(l.start_timestamp) : parseDateToUnixSec(l.start);
      const stopTs = l.stop_timestamp ? parseDateToUnixSec(l.stop_timestamp) : parseDateToUnixSec(l.end);
      return {
        ...l,
        start_timestamp: startTs,
        stop_timestamp: stopTs,
      };
    })
    .filter(
      (l) =>
        l.start_timestamp > 0 &&
        l.stop_timestamp > l.start_timestamp &&
        l.stop_timestamp > timelineStartTs &&
        l.start_timestamp < timelineEndTs
    )
    .sort((a, b) => a.start_timestamp - b.start_timestamp);

  let cursor = timelineStartTs;

  for (const prog of validListings) {
    // Fill gap before program if any
    if (prog.start_timestamp > cursor + 60) {
      result.push({
        id: `gap_${channel.stream_id}_${cursor}`,
        title: "Live Broadcast",
        description: `Regular programming on ${channel.name}`,
        start_timestamp: cursor,
        stop_timestamp: prog.start_timestamp,
        raw_start: cursor,
        raw_stop: prog.start_timestamp,
        isPlaceholder: true,
      });
    }

    result.push({
      id: prog.id || `prog_${channel.stream_id}_${prog.start_timestamp}`,
      title: prog.title || "Live Broadcast",
      description: prog.description || "",
      start_timestamp: Math.max(prog.start_timestamp, timelineStartTs),
      stop_timestamp: Math.min(prog.stop_timestamp, timelineEndTs),
      raw_start: prog.start_timestamp,
      raw_stop: prog.stop_timestamp,
      isPlaceholder: false,
    });

    cursor = Math.max(cursor, prog.stop_timestamp);
    if (cursor >= timelineEndTs) break;
  }

  // Fill remaining time until end of timeline
  if (cursor < timelineEndTs - 60) {
    result.push({
      id: `end_${channel.stream_id}_${cursor}`,
      title: validListings.length === 0 ? "Live Broadcast" : "Regular Programming",
      description: `Live broadcast on ${channel.name}`,
      start_timestamp: cursor,
      stop_timestamp: timelineEndTs,
      raw_start: cursor,
      raw_stop: timelineEndTs,
      isPlaceholder: validListings.length === 0,
    });
  }

  return result;
};

const LiveTvPage = () => {
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentChannel, setCurrentChannel] = useState(null);
  const [epgData, setEpgData] = useState({}); // streamId -> listings array
  const [focusedItem, setFocusedItem] = useState(null); // { program, channel }

  // Timeline offset (-120m, 0, +120m, etc.)
  const [timelineOffsetMinutes, setTimelineOffsetMinutes] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Physical remote direct numeric tuning (0-9)
  const [numberBuffer, setNumberBuffer] = useState("");
  const numberBufferTimerRef = useRef(null);

  // Scroll synchronization refs
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const [visibleLimit, setVisibleLimit] = useState(50);

  // Update current time tick every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Initial channels and categories load
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const [chs, grps] = await Promise.all([
          fetchIptvChannels(false), // enabled only
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

  // Filter channels based on category and search query
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (selectedCategory !== "all") {
        const matchId = String(ch.category_id) === String(selectedCategory);
        const matchName = ch.category_name && String(ch.category_name) === String(selectedCategory);
        if (!matchId && !matchName) return false;
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

  // Reset pagination limit on filter change
  useEffect(() => {
    setVisibleLimit(50);
  }, [selectedCategory, searchQuery]);

  const displayedChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleLimit);
  }, [filteredChannels, visibleLimit]);

  // Batch EPG fetching for displayed channels
  useEffect(() => {
    if (displayedChannels.length === 0) return;
    let isMounted = true;

    // Channels in current view needing EPG
    const uncached = displayedChannels.filter((c) => !epgData[String(c.stream_id)]);
    if (uncached.length === 0) return;

    const timer = setTimeout(async () => {
      try {
        const batch = await fetchIptvEpgBatch(uncached.slice(0, 35));
        if (isMounted && batch && Object.keys(batch).length > 0) {
          setEpgData((prev) => ({ ...prev, ...batch }));
        }
      } catch (err) {
        console.error("Batch EPG fetch error:", err);
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [displayedChannels, epgData]);

  // Dedicated single-channel EPG refresher on channel tune
  useEffect(() => {
    if (!currentChannel) return;
    const sid = String(currentChannel.stream_id);
    if (epgData[sid] && epgData[sid].length > 0) return;

    (async () => {
      const tvgId = currentChannel.epg_channel_id || currentChannel.tvg_id || "";
      const chName = currentChannel.name || currentChannel.original_name || "";
      const listings = await fetchIptvEpg(sid, tvgId, chName);
      if (listings && listings.length > 0) {
        setEpgData((prev) => ({ ...prev, [sid]: listings }));
      }
    })();
  }, [currentChannel]);

  // Handle direct numeric tuning from physical remote control
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) {
        return;
      }
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
            const targetEl = document.querySelector(`[data-stream-id="${matched.stream_id}"]`);
            if (targetEl && typeof targetEl.focus === "function") {
              targetEl.focus();
            }
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

  const handleTuneChannel = useCallback((channel) => {
    if (!channel) return;
    setCurrentChannel(channel);
    const directUrl = channel.stream_url || getIptvStreamUrl(channel.stream_id);

    if (isAndroidTvClient() && window.AndroidPlayer?.playStream) {
      window.AndroidPlayer.playStream(
        directUrl,
        `Ch. ${channel.channel_number} | ${channel.name}`,
        channel.stream_icon || "",
        String(channel.stream_id),
        "live"
      );
    }
  }, []);

  // Timeline geometry calculations
  const slotMinutes = 30;
  const slotCount = 8; // 4 hours window (8 x 30m slots)
  const slotWidth = 220; // 220px per 30 minutes
  const totalGridWidth = slotCount * slotWidth; // 1760px

  const { timelineStartTs, timelineEndTs, timeSlots, nowSec, nowLeftPx, isNowInView } = useMemo(() => {
    const now = currentTime;
    const currentM = now.getMinutes();
    const roundedM = Math.floor(currentM / 30) * 30;

    const baseDate = new Date(now);
    baseDate.setMinutes(roundedM - 30 + timelineOffsetMinutes, 0, 0);

    const slots = [];
    for (let i = 0; i < slotCount; i++) {
      slots.push(new Date(baseDate.getTime() + i * slotMinutes * 60 * 1000));
    }

    const startTs = Math.floor(baseDate.getTime() / 1000);
    const endTs = startTs + slotCount * slotMinutes * 60;
    const nSec = Math.floor(now.getTime() / 1000);

    const inView = nSec >= startTs && nSec <= endTs;
    const percent = ((nSec - startTs) / (endTs - startTs)) * 100;
    const nLeft = inView ? (percent / 100) * totalGridWidth : -1;

    return {
      timelineStartTs: startTs,
      timelineEndTs: endTs,
      timeSlots: slots,
      nowSec: nSec,
      nowLeftPx: nLeft,
      isNowInView: inView,
    };
  }, [currentTime, timelineOffsetMinutes, slotCount, slotMinutes, slotWidth, totalGridWidth]);

  // Jump to Now button
  const handleJumpToNow = () => {
    setTimelineOffsetMinutes(0);
    if (bodyScrollRef.current) {
      const scrollPos = Math.max(0, nowLeftPx - 300);
      bodyScrollRef.current.scrollTo({ left: scrollPos, behavior: "smooth" });
    }
  };

  // Synchronize timeline header with grid body horizontal scroll
  const handleBodyScroll = (e) => {
    if (headerScrollRef.current && e.target === bodyScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 300) {
      if (visibleLimit < filteredChannels.length) {
        setVisibleLimit((prev) => Math.min(prev + 40, filteredChannels.length));
      }
    }
  };

  // Fullscreen toggle handler
  const handleToggleFullscreen = () => {
    const video = document.getElementById("livePlayerVideo");
    if (video) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (video.requestFullscreen) {
        video.requestFullscreen().catch(() => {});
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      }
    }
    if (isAndroidTvClient() && currentChannel && window.AndroidPlayer?.playStream) {
      const directUrl = currentChannel.stream_url || getIptvStreamUrl(currentChannel.stream_id);
      window.AndroidPlayer.playStream(
        directUrl,
        `Ch. ${currentChannel.channel_number} | ${currentChannel.name}`,
        currentChannel.stream_icon || "",
        String(currentChannel.stream_id),
        "live"
      );
    }
  };

  // Active item in detail banner (hovered / remote focused, or tuned channel's now playing)
  const activeDisplayChannel = focusedItem?.channel || currentChannel;

  const currentChannelProgs = useMemo(() => {
    if (!activeDisplayChannel) return [];
    return getProgramsForChannel(
      activeDisplayChannel,
      epgData[String(activeDisplayChannel.stream_id)],
      timelineStartTs,
      timelineEndTs
    );
  }, [activeDisplayChannel, epgData, timelineStartTs, timelineEndTs]);

  const activeDisplayProgram = useMemo(() => {
    if (focusedItem?.program) return focusedItem.program;
    const nowP = currentChannelProgs.find(
      (p) => (p.raw_start || p.start_timestamp) <= nowSec && (p.raw_stop || p.stop_timestamp) >= nowSec
    );
    return nowP || currentChannelProgs[0] || null;
  }, [focusedItem, currentChannelProgs, nowSec]);

  const isActiveProgramAiring = useMemo(() => {
    if (!activeDisplayProgram) return false;
    const start = activeDisplayProgram.raw_start || activeDisplayProgram.start_timestamp;
    const stop = activeDisplayProgram.raw_stop || activeDisplayProgram.stop_timestamp;
    return start <= nowSec && stop >= nowSec;
  }, [activeDisplayProgram, nowSec]);

  const activeProgressPercent = useMemo(() => {
    if (!isActiveProgramAiring || !activeDisplayProgram) return 0;
    const start = activeDisplayProgram.raw_start || activeDisplayProgram.start_timestamp;
    const stop = activeDisplayProgram.raw_stop || activeDisplayProgram.stop_timestamp;
    if (stop <= start) return 0;
    return Math.min(100, Math.max(0, ((nowSec - start) / (stop - start)) * 100));
  }, [isActiveProgramAiring, activeDisplayProgram, nowSec]);

  const elapsedMins = useMemo(() => {
    if (!isActiveProgramAiring || !activeDisplayProgram) return 0;
    const start = activeDisplayProgram.raw_start || activeDisplayProgram.start_timestamp;
    return Math.max(0, Math.floor((nowSec - start) / 60));
  }, [isActiveProgramAiring, activeDisplayProgram, nowSec]);

  return (
    <div className="liveTvPage">
      <TopNav />
      <ContentWrapper>
        {/* Remote Numeric Direct Tuning Overlay */}
        {numberBuffer && (
          <div className="remoteTuningBanner">
            <span className="tuningLabel">Tuning Channel:</span>
            <span className="tuningNumber">{numberBuffer}</span>
          </div>
        )}

        {/* Top Header Bar */}
        <div className="liveTvHeader">
          <div className="headerLeft">
            <h1 className="title">
              <FiTv className="icon" /> Live TV
            </h1>
            <span className="channelCountBadge">{channels.length} Channels Available</span>
          </div>
          <div className="headerRight">
            <button
              type="button"
              tabIndex={0}
              className="setupShortcutBtn"
              onClick={() => navigate("/settings/iptv")}
            >
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

        {/* Main Live TV Content */}
        {channels.length > 0 && (
          <div className="liveTvMain">
            {/* Top Preview Section: Video Player & Rich Program Detail Banner */}
            <div className="liveTvTopSection">
              {/* Player Window */}
              <div className="playerBox">
                {currentChannel ? (
                  <div className="videoWrapper">
                    <video
                      id="livePlayerVideo"
                      controls
                      autoPlay
                      src={currentChannel.stream_url || getIptvStreamUrl(currentChannel.stream_id)}
                      onError={(e) => {
                        const fallback = getIptvStreamUrl(currentChannel.stream_id);
                        if (e.target.src !== fallback) {
                          e.target.src = fallback;
                          e.target.play().catch(() => {});
                        }
                      }}
                      className="liveVideoElement"
                    />
                    <div className="playerOverlay">
                      <div className="overlayLeft">
                        <span className="chNum">Ch. {currentChannel.channel_number}</span>
                        <span className="chName">{currentChannel.name}</span>
                      </div>
                      <div className="overlayRight">
                        <span className="liveIndicator">● LIVE</span>
                        <button
                          type="button"
                          className="fsBtn"
                          onClick={handleToggleFullscreen}
                          title="Fullscreen"
                        >
                          <FiMaximize />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="noPlayerPlaceholder">
                    <FiTv />
                    <span>Select any channel in the EPG grid below to watch</span>
                  </div>
                )}
              </div>

              {/* Rich Program Detail Banner */}
              <div className="epgDetailBanner">
                {activeDisplayProgram && activeDisplayChannel ? (
                  <div className="detailContent">
                    <div className="detailHeader">
                      <div className="channelIdentity">
                        {activeDisplayChannel.stream_icon ? (
                          <img
                            src={activeDisplayChannel.stream_icon}
                            alt=""
                            className="detailLogo"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <FiTv className="fallbackDetailIcon" />
                        )}
                        <div className="idText">
                          <div className="channelNumName">
                            <span className="chNumTag">Ch. {activeDisplayChannel.channel_number}</span>
                            <span className="chNameTag">{activeDisplayChannel.name}</span>
                          </div>
                          <span className="categoryTag">{activeDisplayChannel.category_name}</span>
                        </div>
                      </div>
                      <div className="actionButtons">
                        <button
                          type="button"
                          tabIndex={0}
                          className="tuneActionBtn"
                          onClick={() => handleTuneChannel(activeDisplayChannel)}
                        >
                          <FiPlay />{" "}
                          {currentChannel?.stream_id === activeDisplayChannel.stream_id
                            ? "Watching Live"
                            : "Tune Channel"}
                        </button>
                      </div>
                    </div>

                    <div className="programMainInfo">
                      <h2 className="detailTitle">{activeDisplayProgram.title}</h2>
                      <div className="detailMetaRow">
                        <span className="detailTime">
                          <FiClock />{" "}
                          {formatTimeRange(
                            activeDisplayProgram.raw_start || activeDisplayProgram.start_timestamp,
                            activeDisplayProgram.raw_stop || activeDisplayProgram.stop_timestamp
                          )}
                        </span>
                        {isActiveProgramAiring && (
                          <span className="airingBadge">
                            Airing Now {elapsedMins > 0 ? `(${elapsedMins}m in)` : ""}
                          </span>
                        )}
                      </div>
                      {isActiveProgramAiring && (
                        <div className="detailProgress">
                          <div
                            className="detailProgressFill"
                            style={{ width: `${activeProgressPercent}%` }}
                          />
                        </div>
                      )}
                      <p className="detailDesc">
                        {activeDisplayProgram.description ||
                          `Live broadcast on ${activeDisplayChannel.name}. Use your TV remote D-Pad to explore upcoming programs.`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="emptyDetailNotice">
                    <FiAlertCircle />
                    <span>Navigate or hover over any program in the EPG grid below to view details</span>
                  </div>
                )}
              </div>
            </div>

            {/* EPG Toolbar: Category Filter Pills, Search, & Time Navigation */}
            <div className="epgToolbar">
              <div className="categoryFilterRow">
                <button
                  type="button"
                  tabIndex={0}
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
                      type="button"
                      tabIndex={0}
                      className={`categoryPill ${String(selectedCategory) === String(grp.category_id) ? "active" : ""}`}
                      onClick={() => setSelectedCategory(String(grp.category_id))}
                    >
                      {grp.category_name} ({grp.channel_count})
                    </button>
                  ))}
              </div>

              <div className="toolbarControls">
                <div className="guideSearchBox">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search channel or Ch. #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="timeNavGroup">
                  <button
                    type="button"
                    tabIndex={0}
                    className="timelineNavBtn"
                    onClick={() => setTimelineOffsetMinutes((prev) => prev - 120)}
                    title="Previous 2 Hours"
                  >
                    <FiChevronLeft /> -2h
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    className="jumpNowBtn"
                    onClick={handleJumpToNow}
                    title="Jump to current time"
                  >
                    <FiClock /> Now
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    className="timelineNavBtn"
                    onClick={() => setTimelineOffsetMinutes((prev) => prev + 120)}
                    title="Next 2 Hours"
                  >
                    +2h <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>

            {/* FULL EPG TIMELINE GRID */}
            <div className="epgGridContainer">
              {/* Synchronized Timeline Header Row */}
              <div className="timelineHeaderRow">
                <div className="timelineCorner">
                  <span>Channels ({displayedChannels.length})</span>
                </div>
                <div className="timelineHeaderScroll" ref={headerScrollRef}>
                  <div className="timeSlotsTrack" style={{ width: `${totalGridWidth}px` }}>
                    {timeSlots.map((slot, idx) => (
                      <div key={idx} className="timeSlotHeader" style={{ width: `${slotWidth}px` }}>
                        <span>{formatSlotTime(slot)}</span>
                      </div>
                    ))}
                    {isNowInView && (
                      <div className="nowMarkerPill" style={{ left: `${nowLeftPx}px` }}>
                        <span>NOW</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable EPG Body (Channels + Programs Grid) */}
              <div className="epgBodyScroll" ref={bodyScrollRef} onScroll={handleBodyScroll}>
                {displayedChannels.map((ch) => {
                  const isCurrent = currentChannel && String(currentChannel.stream_id) === String(ch.stream_id);
                  const channelListings = epgData[String(ch.stream_id)] || [];
                  const programs = getProgramsForChannel(
                    ch,
                    channelListings,
                    timelineStartTs,
                    timelineEndTs
                  );

                  return (
                    <div
                      key={ch.stream_id}
                      data-stream-id={ch.stream_id}
                      className={`epgRow ${isCurrent ? "isCurrentChannel" : ""}`}
                    >
                      {/* Sticky Channel Identification Cell */}
                      <button
                        type="button"
                        tabIndex={0}
                        className={`epgChannelCell ${isCurrent ? "tuned" : ""}`}
                        onClick={() => handleTuneChannel(ch)}
                        onFocus={() => {
                          const activeProg =
                            programs.find((p) => (p.raw_start || p.start_timestamp) <= nowSec && (p.raw_stop || p.stop_timestamp) >= nowSec) ||
                            programs[0];
                          setFocusedItem({ program: activeProg, channel: ch });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " " || e.key === "Select" || e.keyCode === 23) {
                            e.preventDefault();
                            handleTuneChannel(ch);
                          }
                        }}
                        title={`Tune Ch. ${ch.channel_number} - ${ch.name}`}
                      >
                        <div className="chNumBadge">{ch.channel_number}</div>
                        <div className="chLogoWrapper">
                          {ch.stream_icon ? (
                            <img
                              src={ch.stream_icon}
                              alt=""
                              loading="lazy"
                              className="chLogoImg"
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            <FiTv className="chFallbackIcon" />
                          )}
                        </div>
                        <div className="chNameCol">
                          <span className="chTitle">{ch.name}</span>
                          <span className="chCategory">{ch.category_name}</span>
                        </div>
                        {isCurrent && (
                          <span className="tunedIndicator">
                            <FiVolume2 /> LIVE
                          </span>
                        )}
                      </button>

                      {/* Programs Timeline Track */}
                      <div className="epgProgramsTrack" style={{ width: `${totalGridWidth}px` }}>
                        {isNowInView && (
                          <div className="epgNowVerticalLine" style={{ left: `${nowLeftPx}px` }} />
                        )}
                        {programs.map((prog) => {
                          const isAiringNow =
                            (prog.raw_start || prog.start_timestamp) <= nowSec &&
                            (prog.raw_stop || prog.stop_timestamp) >= nowSec;
                          const isFocused =
                            focusedItem?.program?.id === prog.id &&
                            String(focusedItem?.channel?.stream_id) === String(ch.stream_id);
                          const durationSec = Math.max(60, prog.stop_timestamp - prog.start_timestamp);
                          const widthPx = Math.max(120, (durationSec / 1800) * slotWidth);

                          let progressPercent = 0;
                          if (isAiringNow && prog.raw_stop > prog.raw_start) {
                            progressPercent = Math.min(
                              100,
                              Math.max(0, ((nowSec - prog.raw_start) / (prog.raw_stop - prog.raw_start)) * 100)
                            );
                          }

                          return (
                            <button
                              key={prog.id}
                              type="button"
                              tabIndex={0}
                              className={`epgProgramBlock ${isAiringNow ? "airingNow" : ""} ${isCurrent ? "onTunedChannel" : ""} ${isFocused ? "focusedBlock" : ""}`}
                              style={{ width: `${widthPx}px` }}
                              onClick={() => handleTuneChannel(ch)}
                              onFocus={() => setFocusedItem({ program: prog, channel: ch })}
                              onMouseEnter={() => setFocusedItem({ program: prog, channel: ch })}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" ||
                                  e.key === " " ||
                                  e.key === "Select" ||
                                  e.keyCode === 23
                                ) {
                                  e.preventDefault();
                                  handleTuneChannel(ch);
                                }
                              }}
                            >
                              <div className="progTop">
                                <span className="progTitle">{prog.title}</span>
                                {isAiringNow && <span className="liveBadge">NOW</span>}
                              </div>
                              <div className="progTime">
                                {formatTimeRange(
                                  prog.raw_start || prog.start_timestamp,
                                  prog.raw_stop || prog.stop_timestamp
                                )}
                              </div>
                              {isAiringNow && (
                                <div className="progressBarContainer">
                                  <div
                                    className="progressBarFill"
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Load More Pagination */}
                {visibleLimit < filteredChannels.length && (
                  <div className="loadMoreRow">
                    <button
                      type="button"
                      tabIndex={0}
                      className="loadMoreBtn"
                      onClick={() => setVisibleLimit((prev) => Math.min(prev + 40, filteredChannels.length))}
                    >
                      Load More Channels ({displayedChannels.length} of {filteredChannels.length} displayed)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </ContentWrapper>
    </div>
  );
};

export default LiveTvPage;
