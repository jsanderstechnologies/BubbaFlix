import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import {
  fetchIptvChannels,
  fetchIptvGroups,
  fetchIptvEpg,
  fetchIptvEpgBatch,
  getIptvStreamUrl,
} from "../../utils/iptv";
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
  FiArrowLeft,
  FiLayers,
  FiHash,
  FiX,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Hls from "hls.js";
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

  const appendChunkedGaps = (start, end, isPlaceholder) => {
    let t = start;
    const intervalSec = 30 * 60; // 30 minutes per time slot
    while (t < end - 30) {
      const nextBoundary = (Math.floor(t / intervalSec) + 1) * intervalSec;
      const chunkEnd = Math.min(end, nextBoundary);
      result.push({
        id: `chunk_${channel.stream_id}_${t}_${chunkEnd}`,
        title: isPlaceholder ? "Live Broadcast" : "Regular Programming",
        description: `Live broadcast on ${channel.name}`,
        start_timestamp: t,
        stop_timestamp: chunkEnd,
        raw_start: t,
        raw_stop: chunkEnd,
        isPlaceholder: isPlaceholder,
      });
      t = chunkEnd;
    }
  };

  let cursor = timelineStartTs;

  for (const prog of validListings) {
    if (prog.start_timestamp > cursor + 60) {
      appendChunkedGaps(cursor, prog.start_timestamp, true);
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

  if (cursor < timelineEndTs - 60) {
    appendChunkedGaps(cursor, timelineEndTs, validListings.length === 0);
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

  // Live Player & Channel Control States
  const [isPlayingLive, setIsPlayingLive] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [keypadInput, setKeypadInput] = useState("");
  const [keypadError, setKeypadError] = useState("");
  const [showControls, setShowControls] = useState(true);
  const [channelOsd, setChannelOsd] = useState(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasVideoFrame, setHasVideoFrame] = useState(false);

  const controlsTimeoutRef = useRef(null);
  const channelOsdTimeoutRef = useRef(null);
  const liveVideoRef = useRef(null);
  const hlsRef = useRef(null);

  // Timeline geometry
  const [timelineOffsetMinutes, setTimelineOffsetMinutes] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Physical remote direct numeric tuning (0-9)
  const [numberBuffer, setNumberBuffer] = useState("");
  const numberBufferTimerRef = useRef(null);

  // Scroll synchronization refs
  const headerScrollRef = useRef(null);
  const bodyScrollRef = useRef(null);
  const [visibleLimit, setVisibleLimit] = useState(60);

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
            const shouldPlay = params.get("play") === "true";
            let initial = chs[0];
            if (targetStreamId) {
              const matched = chs.find((c) => String(c.stream_id) === String(targetStreamId));
              if (matched) initial = matched;
            }
            setCurrentChannel(initial);
            if (shouldPlay) {
              setIsPlayingLive(true);
            }
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
    setVisibleLimit(60);
  }, [selectedCategory, searchQuery]);

  const displayedChannels = useMemo(() => {
    return filteredChannels.slice(0, visibleLimit);
  }, [filteredChannels, visibleLimit]);

  // Batch EPG fetching for displayed channels
  useEffect(() => {
    if (displayedChannels.length === 0) return;
    let isMounted = true;

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

  // Single-channel EPG refresher on channel tune
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

  // Reset controls timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!isKeypadOpen) {
        setShowControls(false);
      }
    }, 4500);
  }, [isKeypadOpen]);

  // Trigger on-screen channel OSD banner
  const triggerChannelOsd = useCallback((channel) => {
    setChannelOsd(channel);
    if (channelOsdTimeoutRef.current) clearTimeout(channelOsdTimeoutRef.current);
    channelOsdTimeoutRef.current = setTimeout(() => {
      setChannelOsd(null);
    }, 3800);
  }, []);

  // Tune to a channel
  const handleTuneChannel = useCallback((channel, startPlaying = true) => {
    if (!channel) return;
    setCurrentChannel(channel);
    triggerChannelOsd(channel);
    if (startPlaying) {
      setHasVideoFrame(false);
      setIsBuffering(true);
      setIsPlayingLive(true);
      setShowControls(true);
      resetControlsTimeout();
      try {
        if (typeof document !== "undefined" && !document.fullscreenElement && document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {
        // Ignore fullscreen restriction if gesture disallowed
      }
    }
  }, [triggerChannelOsd, resetControlsTimeout]);

  // Channel Up (Next channel)
  const handleNextChannel = useCallback(() => {
    if (channels.length === 0 || !currentChannel) return;
    const currIdx = channels.findIndex((c) => String(c.stream_id) === String(currentChannel.stream_id));
    const nextIdx = (currIdx + 1) % channels.length;
    setHasVideoFrame(false);
    setIsBuffering(true);
    handleTuneChannel(channels[nextIdx], true);
  }, [channels, currentChannel, handleTuneChannel]);

  // Channel Down (Previous channel)
  const handlePrevChannel = useCallback(() => {
    if (channels.length === 0 || !currentChannel) return;
    const currIdx = channels.findIndex((c) => String(c.stream_id) === String(currentChannel.stream_id));
    const prevIdx = (currIdx - 1 + channels.length) % channels.length;
    setHasVideoFrame(false);
    setIsBuffering(true);
    handleTuneChannel(channels[prevIdx], true);
  }, [channels, currentChannel, handleTuneChannel]);

  // Direct Number Tune
  const handleDirectNumberTune = useCallback((numStr) => {
    const targetNum = parseInt(numStr, 10);
    if (isNaN(targetNum)) return false;
    const matched = channels.find((c) => c.channel_number === targetNum);
    if (matched) {
      handleTuneChannel(matched, true);
      return true;
    }
    return false;
  }, [channels, handleTuneChannel]);

  // Keypad submit
  const handleKeypadSubmit = useCallback(() => {
    const num = parseInt(keypadInput, 10);
    if (isNaN(num)) {
      setKeypadError("Please enter a valid channel number");
      return;
    }
    const matched = channels.find((c) => c.channel_number === num);
    if (matched) {
      setIsKeypadOpen(false);
      setKeypadInput("");
      setKeypadError("");
      handleTuneChannel(matched, true);
    } else {
      setKeypadError(`Channel ${num} not found`);
    }
  }, [keypadInput, channels, handleTuneChannel]);

  // Manage body class for player
  useEffect(() => {
    if (isPlayingLive) {
      document.body.classList.add("livePlayerActive");
    } else {
      document.body.classList.remove("livePlayerActive");
    }
    return () => {
      document.body.classList.remove("livePlayerActive");
    };
  }, [isPlayingLive]);

  // Stream Video Player Management with Hls.js
  useEffect(() => {
    if (!isPlayingLive || !currentChannel) return;
    const video = liveVideoRef.current;
    if (!video) return;

    setIsBuffering(true);
    const streamUrl = currentChannel.stream_url || getIptvStreamUrl(currentChannel.stream_id);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported() && (streamUrl.includes(".m3u8") || !video.canPlayType("application/vnd.apple.mpegurl"))) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              video.src = streamUrl;
              video.play().catch(() => {});
              break;
          }
        }
      });
    } else {
      video.src = streamUrl;
      video.play().catch(() => {});
    }

    video.onplaying = () => {
      setIsBuffering(false);
      setHasVideoFrame(true);
    };
    video.onloadeddata = () => {
      setHasVideoFrame(true);
    };
    video.onwaiting = () => setIsBuffering(true);
    video.onerror = () => setIsBuffering(false);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isPlayingLive, currentChannel]);

  // Global Remote Control Handler: Channel Up, Channel Down, Numeric Tuning, Back
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key;
      const code = e.keyCode;

      // 1. When Keypad Modal is open:
      if (isKeypadOpen) {
        if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009) {
          e.preventDefault();
          e.stopPropagation();
          setIsKeypadOpen(false);
          setKeypadInput("");
          setKeypadError("");
          return;
        }
        if (key >= "0" && key <= "9") {
          e.preventDefault();
          setKeypadInput((prev) => (prev.length < 5 ? prev + key : prev));
          setKeypadError("");
          return;
        }
        if (key === "Backspace") {
          e.preventDefault();
          setKeypadInput((prev) => prev.slice(0, -1));
          return;
        }
        if (key === "Enter" || code === 13 || code === 23 || code === 66) {
          if (e.target && e.target.tagName !== "BUTTON" && keypadInput.length > 0) {
            e.preventDefault();
            handleKeypadSubmit();
            return;
          }
        }
        return;
      }

      // 2. While Live Player is active:
      if (isPlayingLive) {
        resetControlsTimeout();

        // Remote Channel Up (ChannelUp, PageUp, code 166, code 427, code 33)
        if (key === "ChannelUp" || code === 166 || code === 427 || key === "PageUp" || code === 33) {
          e.preventDefault();
          e.stopPropagation();
          handleNextChannel();
          return;
        }

        // Remote Channel Down (ChannelDown, PageDown, code 167, code 428, code 34)
        if (key === "ChannelDown" || code === 167 || code === 428 || key === "PageDown" || code === 34) {
          e.preventDefault();
          e.stopPropagation();
          handlePrevChannel();
          return;
        }

        // When controls are hidden, D-Pad Up / Down tunes Next / Prev channel
        if (!showControls) {
          if (key === "ArrowUp" || code === 38 || code === 19) {
            e.preventDefault();
            e.stopPropagation();
            handleNextChannel();
            return;
          }
          if (key === "ArrowDown" || code === 40 || code === 20) {
            e.preventDefault();
            e.stopPropagation();
            handlePrevChannel();
            return;
          }
        }

        // Direct numeric keys (0-9) while watching
        if (key >= "0" && key <= "9") {
          e.preventDefault();
          const newBuf = numberBuffer + key;
          setNumberBuffer(newBuf);
          if (numberBufferTimerRef.current) clearTimeout(numberBufferTimerRef.current);
          numberBufferTimerRef.current = setTimeout(() => {
            handleDirectNumberTune(newBuf);
            setNumberBuffer("");
          }, 1200);
          return;
        }

        // Remote Back / Escape returns to EPG Guide
        if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
          e.preventDefault();
          e.stopPropagation();
          setIsPlayingLive(false);
          setShowControls(false);
          setHasVideoFrame(false);
          try {
            if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
            }
          } catch (err) {
            // Ignore
          }
          setTimeout(() => {
            const target = document.querySelector(".epgRow.isCurrentChannel .epgChannelCell, .epgChannelCell");
            if (target && typeof target.focus === "function") {
              target.focus({ preventScroll: true });
            }
          }, 100);
          return;
        }
        return;
      }

      // 3. While on EPG Guide:
      if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
        e.preventDefault();
        e.stopPropagation();
        navigate("/", { replace: true });
        return;
      }

      // Direct numeric keys (0-9) on Guide jumps to channel
      if (key >= "0" && key <= "9") {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
        const newBuf = numberBuffer + key;
        setNumberBuffer(newBuf);
        if (numberBufferTimerRef.current) clearTimeout(numberBufferTimerRef.current);
        numberBufferTimerRef.current = setTimeout(() => {
          const targetNum = parseInt(newBuf, 10);
          const matched = channels.find((c) => c.channel_number === targetNum);
          if (matched) {
            handleTuneChannel(matched, true);
          }
          setNumberBuffer("");
        }, 1200);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      if (numberBufferTimerRef.current) clearTimeout(numberBufferTimerRef.current);
    };
  }, [
    isPlayingLive,
    isKeypadOpen,
    keypadInput,
    showControls,
    numberBuffer,
    channels,
    handleNextChannel,
    handlePrevChannel,
    handleDirectNumberTune,
    handleTuneChannel,
    handleKeypadSubmit,
    resetControlsTimeout,
    navigate,
  ]);

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

  // Active program on current channel for player display
  const currentChannelProgs = useMemo(() => {
    if (!currentChannel) return [];
    return getProgramsForChannel(
      currentChannel,
      epgData[String(currentChannel.stream_id)],
      timelineStartTs,
      timelineEndTs
    );
  }, [currentChannel, epgData, timelineStartTs, timelineEndTs]);

  const activeDisplayProgram = useMemo(() => {
    const nowP = currentChannelProgs.find(
      (p) => (p.raw_start || p.start_timestamp) <= nowSec && (p.raw_stop || p.stop_timestamp) >= nowSec
    );
    return nowP || currentChannelProgs[0] || null;
  }, [currentChannelProgs, nowSec]);

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

  // Focus tuned channel or first program cell on guide load
  useEffect(() => {
    if (channels.length > 0 && !loading && !isPlayingLive) {
      const focusTimer = setTimeout(() => {
        const activeEl = document.activeElement;
        if (!activeEl || activeEl === document.body || activeEl.classList.contains("navBtn")) {
          const target = document.querySelector(
            ".epgRow.isCurrentChannel .epgChannelCell, .epgChannelCell, .epgProgramBlock"
          );
          if (target && typeof target.focus === "function") {
            target.focus({ preventScroll: true });
          }
        }
      }, 250);
      return () => clearTimeout(focusTimer);
    }
  }, [channels.length, loading, isPlayingLive]);

  return (
    <div className={`liveTvPage ${isPlayingLive ? "inPlayerMode" : ""}`}>
      {!isPlayingLive && <TopNav />}

      {!isPlayingLive && (
        <ContentWrapper>
          {/* Remote Numeric Direct Tuning Overlay */}
          {numberBuffer && (
            <div className="remoteTuningBanner">
              <span className="tuningLabel">Tuning Channel:</span>
              <span className="tuningNumber">{numberBuffer}</span>
            </div>
          )}

          {/* GUIDE MODE: Compact Header & Full EPG Timeline Grid */}
            {/* Header & Controls Bar */}
            <div className="liveTvHeader">
              <div className="headerLeft">
                <button
                  type="button"
                  tabIndex={0}
                  className="liveTvBackBtn"
                  onClick={() => navigate("/")}
                  title="Return to BubbaFlix Home"
                >
                  <FiArrowLeft /> Home
                </button>
                <h1 className="title">
                  <FiTv className="icon" /> Live TV
                </h1>
                <span className="channelCountBadge">{channels.length} Channels</span>
              </div>

              {/* Category Filter Pills & Time Navigation */}
              <div className="headerCenter">
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
              </div>

              <div className="headerRight">
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

                <button
                  type="button"
                  tabIndex={0}
                  className="setupShortcutBtn"
                  onClick={() => navigate("/settings/iptv?tab=groups")}
                  title="Configure which channel categories and groups are visible"
                >
                  <FiLayers /> Manage Groups
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
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                  <button className="setupBtn" onClick={() => navigate("/settings/iptv?tab=groups")}>
                    <FiLayers /> Manage Groups
                  </button>
                  <button className="setupBtn" onClick={() => navigate("/settings/iptv?tab=credentials")}>
                    <FiSliders /> Configure IPTV Setup
                  </button>
                </div>
              </div>
            )}

            {/* FULL EPG TIMELINE GRID ONLY */}
            {channels.length > 0 && (
              <div className="epgGridContainer fullGridMode">
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
                        {/* Channel Cell (Click or Enter tunes and opens player) */}
                        <button
                          type="button"
                          tabIndex={0}
                          className={`epgChannelCell ${isCurrent ? "tuned" : ""}`}
                          onClick={() => handleTuneChannel(ch, true)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" ||
                              e.key === " " ||
                              e.key === "Select" ||
                              e.keyCode === 23 ||
                              e.keyCode === 66 ||
                              e.keyCode === 13
                            ) {
                              e.preventDefault();
                              handleTuneChannel(ch, true);
                            }
                          }}
                          title={`Select Ch. ${ch.channel_number} - ${ch.name} to watch live`}
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
                                className={`epgProgramBlock ${isAiringNow ? "airingNow" : ""} ${isCurrent ? "onTunedChannel" : ""}`}
                                style={{ width: `${widthPx}px` }}
                                onClick={() => handleTuneChannel(ch, true)}
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" ||
                                    e.key === " " ||
                                    e.key === "Select" ||
                                    e.keyCode === 23 ||
                                    e.keyCode === 66 ||
                                    e.keyCode === 13
                                  ) {
                                    e.preventDefault();
                                    handleTuneChannel(ch, true);
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
            )}
        </ContentWrapper>
      )}

      {/* FULLSCREEN LIVE PLAYER MODE: Mount directly to document.body */}
      {isPlayingLive &&
        currentChannel &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="livePlayerFullscreen">
            {/* Centered BubbaFlix Logo Background */}
            <div
              className={`livePlayerLogoBackground ${
                hasVideoFrame && !isBuffering ? "videoActive" : "videoLoading"
              }`}
            >
              <img
                src="/logo.png"
                alt="BubbaFlix"
                className="livePlayerCenteredLogo"
              />
            </div>

            <video
              ref={liveVideoRef}
              id="livePlayerVideo"
              className={`liveVideoElement ${hasVideoFrame ? "hasFrame" : "loadingFrame"}`}
              autoPlay
              playsInline
              onClick={resetControlsTimeout}
              onMouseMove={resetControlsTimeout}
            />

            {/* Buffering Indicator positioned directly beneath centered BubbaFlix logo */}
            {isBuffering && (
              <div className="liveBufferingSpinner">
                <FiRefreshCw className="spinning" />
                <span>Loading live channel...</span>
              </div>
            )}

            {/* Remote Numeric Direct Tuning Overlay in Player */}
            {numberBuffer && (
              <div className="remoteTuningBanner inPlayer">
                <span className="tuningLabel">Tuning Channel:</span>
                <span className="tuningNumber">{numberBuffer}</span>
              </div>
            )}

            {/* On-Screen Channel OSD Banner (Pops up on Channel Up/Down/Change) */}
            {channelOsd && (
              <div className="liveChannelOsd">
                <div className="osdLeft">
                  <span className="osdChNum">Ch. {channelOsd.channel_number}</span>
                  {channelOsd.stream_icon && (
                    <img
                      src={channelOsd.stream_icon}
                      alt=""
                      className="osdLogo"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <div className="osdTitles">
                    <span className="osdChName">{channelOsd.name}</span>
                    <span className="osdProgTitle">
                      {activeDisplayProgram?.title || channelOsd.category_name || "Live Broadcast"}
                    </span>
                  </div>
                </div>
                <div className="osdRight">
                  <span className="liveBadge">● LIVE</span>
                </div>
              </div>
            )}

            {/* Player Controls Overlay */}
            <div
              className={`livePlayerOverlay ${showControls ? "visible" : "hidden"}`}
              onClick={resetControlsTimeout}
            >
              {/* Top Controls Bar */}
              <div className="playerTopBar">
                <div className="barLeft">
                  <button
                    type="button"
                    tabIndex={0}
                    className="livePlayerBtn guideBtn"
                    onClick={() => {
                      setIsPlayingLive(false);
                      setShowControls(false);
                      setHasVideoFrame(false);
                      try {
                        if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
                          document.exitFullscreen().catch(() => {});
                        }
                      } catch (err) {}
                      setTimeout(() => {
                        const target = document.querySelector(".epgRow.isCurrentChannel .epgChannelCell, .epgChannelCell");
                        if (target && typeof target.focus === "function") {
                          target.focus({ preventScroll: true });
                        }
                      }, 100);
                    }}
                    title="Return to EPG Guide (Remote Back)"
                  >
                    <FiArrowLeft /> Guide
                  </button>
                  <div className="currentChannelBadge">
                    <span className="chNum">Ch. {currentChannel.channel_number}</span>
                    <span className="chName">{currentChannel.name}</span>
                    <span className="liveTag">● LIVE</span>
                  </div>
                </div>

                {/* On-Screen Button to Enter Channel Number */}
                <div className="barRight">
                  <button
                    type="button"
                    tabIndex={0}
                    className="livePlayerBtn enterChannelBtn"
                    onClick={() => {
                      setIsKeypadOpen(true);
                      setKeypadInput("");
                      setKeypadError("");
                    }}
                    title="Enter Channel Number to jump directly to channel"
                  >
                    <FiHash /> Enter Channel #
                  </button>
                </div>
              </div>

              {/* Bottom Controls Bar */}
              <div className="playerBottomBar">
                <div className="programInfoCol">
                  <h3 className="progTitle">{activeDisplayProgram?.title || currentChannel.name}</h3>
                  <div className="progTimeRow">
                    {activeDisplayProgram && (
                      <span className="timeText">
                        <FiClock />{" "}
                        {formatTimeRange(
                          activeDisplayProgram.raw_start || activeDisplayProgram.start_timestamp,
                          activeDisplayProgram.raw_stop || activeDisplayProgram.stop_timestamp
                        )}
                      </span>
                    )}
                    <span className="catTag">{currentChannel.category_name}</span>
                  </div>
                  {activeDisplayProgram?.description && (
                    <p className="progDesc">{activeDisplayProgram.description}</p>
                  )}
                </div>

                {/* Quick Channel Up / Down buttons on screen */}
                <div className="channelNavRow">
                  <button
                    type="button"
                    tabIndex={0}
                    className="livePlayerBtn channelNavBtn"
                    onClick={handlePrevChannel}
                    title="Previous Channel (Remote Channel Down / Page Down)"
                  >
                    <FiChevronLeft /> Prev Channel
                  </button>
                  <button
                    type="button"
                    tabIndex={0}
                    className="livePlayerBtn channelNavBtn"
                    onClick={handleNextChannel}
                    title="Next Channel (Remote Channel Up / Page Up)"
                  >
                    Next Channel <FiChevronRight />
                  </button>
                </div>
              </div>
            </div>

            {/* Direct Channel Number Entry Keypad Modal */}
            {isKeypadOpen && (
              <div
                className="liveChannelKeypadOverlay"
                onClick={() => setIsKeypadOpen(false)}
              >
                <div className="keypadCard" onClick={(e) => e.stopPropagation()}>
                  <div className="keypadHeader">
                    <h2>Go to Channel Number</h2>
                    <p>Enter channel number or press remote 0-9</p>
                  </div>

                  <div className="keypadDisplayBox">
                    <span className="keypadDigits">{keypadInput || "---"}</span>
                    {keypadError && <span className="keypadError">{keypadError}</span>}
                  </div>

                  <div className="keypadGrid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <button
                        key={n}
                        type="button"
                        tabIndex={0}
                        className="keypadBtn"
                        onClick={() => {
                          setKeypadInput((prev) => (prev.length < 5 ? prev + String(n) : prev));
                          setKeypadError("");
                        }}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      type="button"
                      tabIndex={0}
                      className="keypadBtn keypadClearBtn"
                      onClick={() => {
                        setKeypadInput((prev) => prev.slice(0, -1));
                        setKeypadError("");
                      }}
                      title="Backspace"
                    >
                      ⌫
                    </button>
                    <button
                      type="button"
                      tabIndex={0}
                      className="keypadBtn"
                      onClick={() => {
                        setKeypadInput((prev) => (prev.length < 5 ? prev + "0" : prev));
                        setKeypadError("");
                      }}
                    >
                      0
                    </button>
                    <button
                      type="button"
                      tabIndex={0}
                      className="keypadBtn keypadGoBtn"
                      onClick={handleKeypadSubmit}
                    >
                      GO
                    </button>
                  </div>

                  <div className="keypadFooter">
                    <button
                      type="button"
                      tabIndex={0}
                      className="keypadActionBtn cancelBtn"
                      onClick={() => {
                        setIsKeypadOpen(false);
                        setKeypadInput("");
                        setKeypadError("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

export default LiveTvPage;
