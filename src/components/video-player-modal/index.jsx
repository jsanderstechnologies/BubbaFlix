/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Hls from "hls.js";
import {
  FiArrowLeft,
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiRotateCw,
  FiMaximize,
  FiMinimize,
  FiMessageSquare,
  FiVolume2,
  FiCheck,
  FiAlertTriangle,
  FiTv,
  FiRadio
} from "react-icons/fi";
import { fetchDataFromAPI } from "../../utils/api";
import { fetchOpenSubtitles, downloadAndConvertSubtitle } from "../../utils/subtitles";
import { getWatchProgress, saveWatchProgress, clearWatchProgress, formatTimeDisplay } from "../../utils/watchProgress";
import { getTranscodedStreamUrl } from "../../utils/serverSettings";
import "./index.scss";

const cleanMediaTitle = (rawTitle) => {
  if (!rawTitle) return "";
  let clean = rawTitle;
  clean = clean.replace(/\.(mkv|mp4|avi|mov|m4v|wmv|flv|webm)$/i, "");
  clean = clean.replace(/[\._\+]/g, " ");
  clean = clean.replace(/\b(1080p|720p|2160p|4k|hdr|web-dl|webrip|h264|x264|h265|hevc|repack|proper|aac|dts|xvid|ethel|eztv|eztvx|rarbg|yts)\b/gi, "");
  clean = clean.replace(/\[[^\]]*\]/g, "").replace(/\([^)]*\)/g, "");
  clean = clean.replace(/\s+/g, " ").trim();
  return clean || rawTitle;
};

const VideoPlayerModal = ({ show = true, setShow, onClose, videoUrl, rawUrl, streamUrl, title, tmdbId, mediaType = "movie", seasonNum, episodeNum, channelLogo }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const hlsRef = useRef(null);

  // Element Refs for D-Pad Spatial Navigation
  const backBtnRef = useRef(null);
  const rewind30BtnRef = useRef(null);
  const rewind10BtnRef = useRef(null);
  const mainPlayBtnRef = useRef(null);
  const ff10BtnRef = useRef(null);
  const ff30BtnRef = useRef(null);
  const scrubberRef = useRef(null);
  const audioBtnRef = useRef(null);
  const subtitlesBtnRef = useRef(null);
  const fullscreenBtnRef = useRef(null);

  // Player State
  const [currentUrl, setCurrentUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [customDuration, setCustomDuration] = useState(0);
  const [tmdbRuntime, setTmdbRuntime] = useState(0);
  const [maxBufferedTime, setMaxBufferedTime] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // TMDB Logo State
  const [mediaLogoUrl, setMediaLogoUrl] = useState(null);

  const displayTitle = cleanMediaTitle(title || "");

  // Audio Track State
  const [audioTracks, setAudioTracks] = useState([]);
  const [activeAudioIdx, setActiveAudioIdx] = useState(0);
  const [showAudioMenu, setShowAudioMenu] = useState(false);

  // Subtitles State
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [activeSubId, setActiveSubId] = useState("off");
  const [activeVttUrl, setActiveVttUrl] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  // Resume State
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeItem, setResumeItem] = useState(null);

  useEffect(() => {
    if (show) {
      let targetUrl = rawUrl || videoUrl || streamUrl || "";

      // Pre-fetch TMDB logo then handle native player or web player setup
      loadTmdbLogo().then((fetchedLogo) => {
        const finalLogo = channelLogo || fetchedLogo || "";
        if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.playStream === "function") {
          console.log("[Launching Native Universal Player Activity]:", targetUrl, "Logo:", finalLogo);
          window.AndroidPlayer.playStream(targetUrl, displayTitle, finalLogo, tmdbId || "", mediaType || "movie");
          if (typeof setShow === "function") setShow(false);
          if (typeof onClose === "function") onClose();
          return;
        }
      });

      document.body.classList.add("videoPlayerActive");
      document.documentElement.classList.add("videoPlayerActive");
      setCurrentUrl(targetUrl);
      setIsPlaying(true);
      setControlsVisible(true);
      setHasError(false);
      setErrorMessage("");
      resetControlsTimeout();

      // Fetch probed media duration from ffprobe metadata endpoint if not Live TV
      if (mediaType !== "tv" && targetUrl) {
        let probeUrl = targetUrl;
        if (targetUrl.includes("/api/transcode")) {
          try {
            const urlParams = new URLSearchParams(targetUrl.substring(targetUrl.indexOf("?")));
            probeUrl = urlParams.get("url") || targetUrl;
          } catch (e) {
            probeUrl = targetUrl;
          }
        }
        fetch(`/api/transcode/metadata?url=${encodeURIComponent(probeUrl)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data) {
              if (data.duration > 0) {
                console.log("[VideoPlayerModal] Probed media duration using ffprobe:", data.duration);
                setCustomDuration(data.duration);
              }
              if (Array.isArray(data.audioTracks) && data.audioTracks.length > 0) {
                const formattedAudio = data.audioTracks.map((t) => ({
                  id: t.index,
                  name: t.title || t.language || `Audio Track #${t.index}`,
                  lang: t.language || "eng"
                }));
                setAudioTracks(formattedAudio);
              }
              if (Array.isArray(data.subtitleTracks) && data.subtitleTracks.length > 0) {
                const formattedSubs = data.subtitleTracks.map((t) => ({
                  id: t.index,
                  name: `${t.title || t.language || "Subtitle"} (${t.codec})`,
                  lang: t.language || "eng",
                  embedded: true
                }));
                setSubtitles((prev) => {
                  const externals = prev.filter((s) => !s.embedded);
                  return [...formattedSubs, ...externals];
                });
              }
            }
          })
          .catch((err) => {
            console.warn("[VideoPlayerModal] ffprobe duration resolve failed:", err.message);
          });
      } else {
        setCustomDuration(0);
      }

      // Fetch TMDB runtime as a fallback
      if (mediaType !== "tv" && tmdbId) {
        const fetchTmdbRuntime = async () => {
          try {
            if (mediaType === "movie") {
              const res = await fetchDataFromAPI(`/movie/${tmdbId}`);
              if (res && res.runtime) {
                console.log("[VideoPlayerModal] Fetched TMDB movie runtime (minutes):", res.runtime);
                setTmdbRuntime(res.runtime * 60);
              }
            } else if (seasonNum !== undefined && episodeNum !== undefined) {
              const res = await fetchDataFromAPI(`/tv/${tmdbId}/season/${seasonNum}/episode/${episodeNum}`);
              if (res && res.runtime) {
                console.log("[VideoPlayerModal] Fetched TMDB episode runtime (minutes):", res.runtime);
                setTmdbRuntime(res.runtime * 60);
              } else {
                const showRes = await fetchDataFromAPI(`/tv/${tmdbId}`);
                if (showRes && Array.isArray(showRes.episode_run_time) && showRes.episode_run_time.length > 0) {
                  setTmdbRuntime(showRes.episode_run_time[0] * 60);
                }
              }
            }
          } catch (e) {
            console.warn("[VideoPlayerModal] Failed to fetch TMDB runtime fallback:", e.message);
          }
        };
        fetchTmdbRuntime();
      } else {
        setTmdbRuntime(0);
      }

      // Check for saved watch progress to prompt resume
      const saved = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
      if (saved && saved.currentTime > 15 && (saved.duration - saved.currentTime) > 60) {
        setResumeItem(saved);
        setShowResumeModal(true);
      } else {
        setShowResumeModal(false);
        setResumeItem(null);
      }

      // Focus main play button for remote D-Pad controls
      setTimeout(() => {
        if (mainPlayBtnRef.current) {
          mainPlayBtnRef.current.focus();
        }
      }, 100);

      // Load Subtitles
      loadSubtitles();

      // Remote & Keyboard D-Pad Event Handler
      const handlePlayerKeyDown = (e) => {
        const key = e.key;
        const code = e.keyCode;

        // Remote Back / ESC Key -> Exit Player immediately
        if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
          e.preventDefault();
          e.stopPropagation();
          setShow(false);
          if (typeof onClose === "function") onClose();
          return;
        }

        // Media Play/Pause
        if (key === "MediaPlayPause" || key === "MediaPlay" || key === "MediaPause") {
          e.preventDefault();
          togglePlayPause();
          resetControlsTimeout();
          return;
        }
      };

      window.addEventListener("keydown", handlePlayerKeyDown, true);

      return () => {
        window.removeEventListener("keydown", handlePlayerKeyDown, true);
      };
    } else {
      document.body.classList.remove("videoPlayerActive");
      document.documentElement.classList.remove("videoPlayerActive");

      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (activeVttUrl) {
        URL.revokeObjectURL(activeVttUrl);
        setActiveVttUrl(null);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }

    return () => {
      document.body.classList.remove("videoPlayerActive");
      document.documentElement.classList.remove("videoPlayerActive");
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [show, videoUrl, rawUrl, tmdbId, mediaType]);

  // HLS.js & Native Video Element Media Binding
  // HLS.js & Native Video Element Media Binding
  useEffect(() => {
    if (!show || !currentUrl || !videoRef.current) return;

    const videoNode = videoRef.current;
    setHasError(false);
    setIsBuffering(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Set preload="auto" to force the browser to buffer as much as possible
    videoNode.setAttribute("preload", "auto");

    let hasStartedPlayback = false;

    const checkBufferAndPlay = () => {
      if (hasStartedPlayback) return;
      if (videoNode.buffered && videoNode.buffered.length > 0) {
        let maxBufferedEnd = 0;
        for (let i = 0; i < videoNode.buffered.length; i++) {
          if (videoNode.buffered.start(i) <= videoNode.currentTime && videoNode.currentTime <= videoNode.buffered.end(i)) {
            maxBufferedEnd = videoNode.buffered.end(i);
            break;
          }
        }
        const bufferedDuration = maxBufferedEnd - videoNode.currentTime;
        // Require at least 5.0 seconds of buffered content before starting to play
        if (bufferedDuration >= 5.0 || (videoNode.duration > 0 && maxBufferedEnd >= videoNode.duration - 0.5)) {
          console.log("[VideoPlayerModal] Buffer threshold reached:", bufferedDuration, "seconds. Starting playback...");
          hasStartedPlayback = true;
          setIsBuffering(false);
          videoNode.play().catch((err) => {
            console.warn("[Player Playback Start Error]:", err.message);
          });
        }
      }
    };

    const handleProgress = () => {
      checkBufferAndPlay();
    };

    const handleCanPlay = () => {
      checkBufferAndPlay();
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
    };

    const handleError = () => {
      setIsBuffering(false);
    };

    videoNode.addEventListener("progress", handleProgress);
    videoNode.addEventListener("canplay", handleCanPlay);
    videoNode.addEventListener("waiting", handleWaiting);
    videoNode.addEventListener("playing", handlePlaying);
    videoNode.addEventListener("error", handleError);

    const isHls = currentUrl.includes(".m3u8") || currentUrl.includes("/hls/") || currentUrl.includes("m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 3600,
        liveBackBufferLength: 3600,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        maxBufferLength: 120, // Keep up to 2 minutes of video buffered
        maxMaxBufferLength: 300, // Limit maximum buffer length to 5 minutes
        maxBufferSize: 250 * 1024 * 1024, // Allow up to 250 MB buffer size
      });
      hlsRef.current = hls;

      hls.loadSource(currentUrl);
      hls.attachMedia(videoNode);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("[VideoPlayerModal] HLS Manifest parsed. Pre-buffering...");
      });

      // HLS Audio Track Updates & Default to English
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (event, data) => {
        if (Array.isArray(data.audioTracks) && data.audioTracks.length > 0) {
          setAudioTracks(data.audioTracks);

          const engIndex = data.audioTracks.findIndex(
            (t) => t.lang && (t.lang.toLowerCase() === "en" || t.lang.toLowerCase() === "eng" || (t.name && t.name.toLowerCase().includes("english")))
          );
          if (engIndex !== -1) {
            hls.audioTrack = engIndex;
            setActiveAudioIdx(engIndex);
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn("[Player HLS Fatal Error]:", data);
          if (currentUrl && !currentUrl.includes("/api/transcode")) {
            console.log("[VideoPlayerModal] Direct HLS stream failed. Attempting backend transcoder fallback...");
            setCurrentUrl(`/api/transcode?url=${encodeURIComponent(currentUrl)}`);
          } else {
            setHasError(true);
            setErrorMessage("Failed to decode video stream. Please select another stream.");
          }
        }
      });
    } else {
      videoNode.src = currentUrl;
      videoNode.load(); // Explicitly start loading direct stream
      console.log("[VideoPlayerModal] Native media source set. Pre-buffering...");

      // Check for native HTML5 audio tracks if supported by browser
      if (videoNode.audioTracks) {
        const trks = Array.from(videoNode.audioTracks).map((t, i) => ({
          id: i,
          name: t.label || t.language || `Audio Track #${i + 1}`,
          lang: t.language || "en"
        }));
        setAudioTracks(trks);

        for (let i = 0; i < videoNode.audioTracks.length; i++) {
          const trk = videoNode.audioTracks[i];
          if (trk.language && (trk.language.toLowerCase() === "en" || trk.language.toLowerCase() === "eng" || (trk.label && trk.label.toLowerCase().includes("english")))) {
            trk.enabled = true;
            setActiveAudioIdx(i);
          } else {
            trk.enabled = false;
          }
        }
      }
    }

    return () => {
      videoNode.removeEventListener("progress", handleProgress);
      videoNode.removeEventListener("canplay", handleCanPlay);
      videoNode.removeEventListener("waiting", handleWaiting);
      videoNode.removeEventListener("playing", handlePlaying);
      videoNode.removeEventListener("error", handleError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [show, currentUrl]);

  const loadTmdbLogo = async () => {
    try {
      setMediaLogoUrl(null);
      let targetTmdbId = tmdbId;
      let targetType = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";

      if (!targetTmdbId && title) {
        const cleanTitle = cleanMediaTitle(title);
        const searchRes = await fetchDataFromAPI(`/search/multi`, { query: cleanTitle });
        if (searchRes && Array.isArray(searchRes.results) && searchRes.results.length > 0) {
          const match = searchRes.results.find((r) => r.media_type === "movie" || r.media_type === "tv") || searchRes.results[0];
          if (match) {
            targetTmdbId = match.id;
            targetType = match.media_type || "movie";
          }
        }
      }

      if (!targetTmdbId) return null;

      const endpoint = `/${targetType}/${targetTmdbId}/images`;
      const res = await fetchDataFromAPI(endpoint, { include_image_language: "en,null" });

      if (res && Array.isArray(res.logos) && res.logos.length > 0) {
        const engLogo = res.logos.find((l) => l.iso_639_1 === "en") || res.logos[0];
        if (engLogo && engLogo.file_path) {
          const logoFullUrl = `https://image.tmdb.org/t/p/w500${engLogo.file_path}`;
          setMediaLogoUrl(logoFullUrl);
          return logoFullUrl;
        }
      }
    } catch (err) {
      console.warn("[VideoPlayerModal] Error fetching TMDB logo:", err.message);
    }
    return null;
  };

  const loadSubtitles = async () => {
    try {
      setSubLoading(true);
      const list = await fetchOpenSubtitles({
        tmdbId,
        mediaType,
        seasonNum,
        episodeNum,
      });
      setSubtitles(list);
    } catch (err) {
      console.warn("[VideoPlayerModal] Subtitles load error:", err.message);
    } finally {
      setSubLoading(false);
    }
  };

  const selectAudioTrack = (index) => {
    resetControlsTimeout();
    setActiveAudioIdx(index);
    setShowAudioMenu(false);

    if (currentUrl.includes("/api/transcode")) {
      let baseUrl = currentUrl;
      if (currentUrl.includes("audio_index=")) {
        baseUrl = currentUrl.replace(/audio_index=\d+/, `audio_index=${index}`);
      } else {
        const sep = currentUrl.includes("?") ? "&" : "?";
        baseUrl = `${currentUrl}${sep}audio_index=${index}`;
      }
      
      const resumeTime = videoRef.current ? videoRef.current.currentTime : 0;
      setCurrentUrl(baseUrl);
      
      if (videoRef.current) {
        const onLoaded = () => {
          videoRef.current.currentTime = resumeTime;
          videoRef.current.play().catch(() => {});
          videoRef.current.removeEventListener("loadedmetadata", onLoaded);
        };
        videoRef.current.addEventListener("loadedmetadata", onLoaded);
      }
    } else if (hlsRef.current) {
      hlsRef.current.audioTrack = index;
    } else if (videoRef.current && videoRef.current.audioTracks) {
      for (let i = 0; i < videoRef.current.audioTracks.length; i++) {
        videoRef.current.audioTracks[i].enabled = i === index;
      }
    }
  };

  const selectSubtitleTrack = async (subTrack) => {
    resetControlsTimeout();
    if (!subTrack || subTrack === "off") {
      setActiveSubId("off");
      if (activeVttUrl) {
        URL.revokeObjectURL(activeVttUrl);
        setActiveVttUrl(null);
      }
      setShowSubMenu(false);
      return;
    }

    try {
      setActiveSubId(subTrack.id);
      setShowSubMenu(false);

      if (subTrack.embedded) {
        let sourceUrl = rawUrl || videoUrl || streamUrl || "";
        if (sourceUrl.includes("/api/transcode")) {
          try {
            const urlParams = new URLSearchParams(sourceUrl.substring(sourceUrl.indexOf("?")));
            sourceUrl = urlParams.get("url") || sourceUrl;
          } catch (e) {
            // fallback
          }
        }
        const vttStreamUrl = `/api/transcode/subtitle?url=${encodeURIComponent(sourceUrl)}&index=${subTrack.id}`;
        setActiveVttUrl(vttStreamUrl);
        return;
      }

      if (subTrack.downloadLink.endsWith(".vtt") || subTrack.format === "vtt") {
        setActiveVttUrl(subTrack.downloadLink);
        return;
      }

      const vttUrl = await downloadAndConvertSubtitle(subTrack.downloadLink);
      if (vttUrl) {
        if (activeVttUrl) URL.revokeObjectURL(activeVttUrl);
        setActiveVttUrl(vttUrl);
      }
    } catch (err) {
      console.warn("[Select Subtitle Track Error]:", err.message);
    }
  };

  const isTranscoded = currentUrl && currentUrl.includes("/api/transcode");
  const actualDuration = isTranscoded
    ? (customDuration > 0 ? customDuration : (tmdbRuntime > 0 ? tmdbRuntime : 0))
    : ((duration > 0 && duration !== Infinity && !isNaN(duration)) ? duration : (customDuration > 0 ? customDuration : (tmdbRuntime > 0 ? tmdbRuntime : 0)));
  const isLiveStream = mediaType === "tv" || (actualDuration === 0 && (duration === Infinity || isNaN(duration)));

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const v = videoRef.current;
      setCurrentTime(v.currentTime);
      const rawDur = v.duration || 0;
      setDuration(rawDur);

      const displayDur = isTranscoded
        ? (customDuration > 0 ? customDuration : (tmdbRuntime > 0 ? tmdbRuntime : 0))
        : ((rawDur > 0 && rawDur !== Infinity && !isNaN(rawDur)) ? rawDur : (customDuration > 0 ? customDuration : (tmdbRuntime > 0 ? tmdbRuntime : 0)));

      let maxBuf = v.currentTime;
      if (v.buffered && v.buffered.length > 0) {
        let maxBufferedEnd = 0;
        for (let i = 0; i < v.buffered.length; i++) {
          if (v.buffered.start(i) <= v.currentTime && v.currentTime <= v.buffered.end(i)) {
            maxBufferedEnd = v.buffered.end(i);
            break;
          }
        }
        if (maxBufferedEnd === 0 && v.buffered.length > 0) {
          maxBufferedEnd = v.buffered.end(v.buffered.length - 1);
        }
        maxBuf = Math.max(v.currentTime, maxBufferedEnd);
        const totalLength = isLiveStream ? maxBuf : displayDur;
        const pct = totalLength > 0 ? Math.min(100, (maxBufferedEnd / totalLength) * 100) : 0;
        setBufferedPercent(pct);
      }
      setMaxBufferedTime(maxBuf);

      // Save watch progress to localStorage if not Live TV
      if (!isLiveStream && displayDur > 0 && v.currentTime >= 10 && tmdbId) {
        saveWatchProgress({
          tmdbId,
          mediaType,
          seasonNum,
          episodeNum,
          currentTime: v.currentTime,
          duration: displayDur,
          title
        });
      }
    }
  };

  const togglePlayPause = () => {
    resetControlsTimeout();
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekRelative = (seconds) => {
    resetControlsTimeout();
    if (!videoRef.current) return;
    const v = videoRef.current;
    const maxSeek = isLiveStream ? Math.max(v.currentTime, maxBufferedTime) : (actualDuration || 0);
    const target = Math.min(Math.max(0, v.currentTime + seconds), maxSeek);
    v.currentTime = target;
  };

  const jumpToLive = () => {
    resetControlsTimeout();
    if (!videoRef.current) return;
    const target = Math.max(0, maxBufferedTime - 0.5);
    videoRef.current.currentTime = target;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleScrubberChange = (e) => {
    resetControlsTimeout();
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    resetControlsTimeout();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSubMenu(false);
      setShowAudioMenu(false);
    }, 5000);
  };

  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hrs = Math.floor(timeInSeconds / 3600);
    const mins = Math.floor((timeInSeconds % 3600) / 60);
    const secs = Math.floor(timeInSeconds % 60);

    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!show) return null;

  return createPortal(
    <div
      ref={containerRef}
      className={`videoPlayerModal ${show ? "visible" : ""}`}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onTouchEnd={resetControlsTimeout}
      onClick={resetControlsTimeout}
    >
      <div className="playerWindow">
        <div className="videoWrapper">
          <video
            ref={videoRef}
            className="videoElement"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => {
              setIsPlaying(false);
              if (typeof onClose === "function") onClose();
              else if (typeof setShow === "function") setShow(false);
            }}
            onTouchStart={resetControlsTimeout}
            onClick={resetControlsTimeout}
            playsInline
          >
            {activeVttUrl && (
              <track
                kind="subtitles"
                src={activeVttUrl}
                srcLang="en"
                label="Selected Subtitles"
                default
              />
            )}
          </video>
        </div>

        {hasError && (
          <div className="errorNotice">
            <FiAlertTriangle className="errorIcon" />
            <p>{errorMessage}</p>
          </div>
        )}

        {isBuffering && (
          <div className="bufferingOverlay">
            <div className="bufferingSpinner" />
            <p>Buffering stream... please wait</p>
          </div>
        )}

        {/* Player Controls Overlay */}
        <div className={`controlsOverlay ${controlsVisible ? "visible" : ""}`}>
          {/* Upper Left Header Bar: Back Button & TMDB Title Logo */}
          <div className="playerHeader">
            <div className="headerLeftGroup">
              <button
                ref={backBtnRef}
                className="backBtn"
                onClick={() => setShow(false)}
                tabIndex="0"
              >
                <FiArrowLeft className="backIcon" /> Back
              </button>

              {channelLogo ? (
                <div className="playerChannelLogoHeader">
                  <img src={channelLogo} alt={displayTitle || "Channel Logo"} className="playerChannelLogo" />
                  <h2 className="playerTitle">{displayTitle}</h2>
                </div>
              ) : mediaLogoUrl ? (
                <img src={mediaLogoUrl} alt={displayTitle} className="mediaLogo" />
              ) : (
                <h2 className="playerTitle">{displayTitle}</h2>
              )}
            </div>
          </div>

          {/* Center Transport Controls */}
          <div className="centerTransportControls">
            <button
              ref={rewind30BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(-30)}
              tabIndex="0"
              title="Rewind 30 Seconds"
            >
              <FiRotateCcw />
              <span className="btnBadge">30s</span>
            </button>
            <button
              ref={rewind10BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(-10)}
              tabIndex="0"
              title="Rewind 10 Seconds"
            >
              <FiRotateCcw />
              <span className="btnBadge">10s</span>
            </button>
            <button
              ref={mainPlayBtnRef}
              className="transportBtn mainPlay"
              onClick={togglePlayPause}
              tabIndex="0"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <FiPause className="playIcon" /> : <FiPlay className="playIcon" />}
            </button>
            <button
              ref={ff10BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(10)}
              tabIndex="0"
              title="Forward 10 Seconds"
            >
              <FiRotateCw />
              <span className="btnBadge">10s</span>
            </button>
            <button
              ref={ff30BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(30)}
              tabIndex="0"
              title="Forward 30 Seconds"
            >
              <FiRotateCw />
              <span className="btnBadge">30s</span>
            </button>
          </div>

          {/* Player Bottom Control Bar */}
          <div className="playerFooter">
            <div className="scrubberRow">
              <span className="timeDisplay">{formatTime(currentTime)}</span>
              <div className="scrubberWrapper">
                <div className="trackBackground" />
                <div
                  className="bufferedTrack"
                  style={{ width: `${bufferedPercent}%` }}
                />
                <div
                  className="playedTrack"
                  style={{
                    width: `${
                      (isLiveStream ? maxBufferedTime : actualDuration) > 0
                        ? (currentTime / (isLiveStream ? maxBufferedTime : actualDuration)) * 100
                        : 0
                    }%`
                  }}
                />
                <input
                  ref={scrubberRef}
                  type="range"
                  min={0}
                  max={isLiveStream ? Math.max(10, maxBufferedTime) : (actualDuration || 100)}
                  value={currentTime}
                  onChange={handleScrubberChange}
                  className="timelineScrubber"
                  tabIndex="0"
                />
              </div>
              {isLiveStream ? (() => {
                const behindLiveSecs = Math.max(0, maxBufferedTime - currentTime);
                return behindLiveSecs > 4 ? (
                  <button
                    className="liveBadgeBtn behind"
                    onClick={jumpToLive}
                    title="Jump back to Live broadcast"
                    tabIndex="0"
                  >
                    <span className="pulseDot" /> GO TO LIVE (-{formatTime(behindLiveSecs)})
                  </button>
                ) : (
                  <button
                    className="liveBadgeBtn live"
                    onClick={jumpToLive}
                    title="Watching Live Broadcast"
                    tabIndex="0"
                  >
                    <span className="pulseDot live" /> ● LIVE
                  </button>
                );
              })() : (
                <span className="timeDisplay">{formatTime(actualDuration)}</span>
              )}
            </div>

            <div className="footerControlsRight">
              {/* Audio Track Selector */}
              {audioTracks.length > 0 && (
                <div className="subtitlesContainer">
                  <button
                    ref={audioBtnRef}
                    className={`footerControlBtn ${showAudioMenu ? "active" : ""}`}
                    onClick={() => {
                      resetControlsTimeout();
                      setShowAudioMenu(!showAudioMenu);
                      setShowSubMenu(false);
                    }}
                    tabIndex="0"
                    title="Select Audio Track"
                  >
                    <FiVolume2 />
                    <span className="btnText">Audio</span>
                  </button>

                  {showAudioMenu && (
                    <div className="subtitlesMenu">
                      <div className="menuHeader">Audio Tracks</div>
                      <div className="menuList">
                        {audioTracks.map((trk, idx) => (
                          <button
                            key={idx}
                            className={`subOption ${activeAudioIdx === idx ? "selected" : ""}`}
                            onClick={() => selectAudioTrack(idx)}
                            tabIndex="0"
                          >
                            {activeAudioIdx === idx && <FiCheck className="checkIcon" />}
                            <span>{trk.name || trk.lang || `Track ${idx + 1}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subtitles Track Selector */}
              <div className="subtitlesContainer">
                <button
                  ref={subtitlesBtnRef}
                  className={`footerControlBtn ${activeSubId !== "off" ? "active" : ""}`}
                  onClick={() => {
                    resetControlsTimeout();
                    setShowSubMenu(!showSubMenu);
                    setShowAudioMenu(false);
                  }}
                  tabIndex="0"
                  title="Subtitles"
                >
                  <FiMessageSquare />
                  <span className="btnText">Subtitles</span>
                </button>

                {showSubMenu && (
                  <div className="subtitlesMenu">
                    <div className="menuHeader">Subtitles</div>
                    {subLoading ? (
                      <div className="subLoadingNotice">Searching subtitles...</div>
                    ) : (
                      <div className="menuList">
                        <button
                          className={`subOption ${activeSubId === "off" ? "selected" : ""}`}
                          onClick={() => selectSubtitleTrack("off")}
                          tabIndex="0"
                        >
                          {activeSubId === "off" && <FiCheck className="checkIcon" />}
                          <span>Off</span>
                        </button>
                        {subtitles.map((sub) => (
                          <button
                            key={sub.id}
                            className={`subOption ${activeSubId === sub.id ? "selected" : ""}`}
                            onClick={() => selectSubtitleTrack(sub)}
                            tabIndex="0"
                          >
                            {activeSubId === sub.id && <FiCheck className="checkIcon" />}
                            <span>{sub.language} - {sub.fileName}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                ref={fullscreenBtnRef}
                className="footerControlBtn"
                onClick={toggleFullscreen}
                tabIndex="0"
                title="Fullscreen"
              >
                {isFullscreen ? <FiMinimize /> : <FiMaximize />}
                <span className="btnText">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {showResumeModal && resumeItem && (
        <div className="resumeModalOverlay">
          <div className="resumeCard">
            <h3>Resume Playback</h3>
            <p>
              You were watching <strong>{resumeItem.title || title}</strong> at{" "}
              <strong>{formatTimeDisplay(resumeItem.currentTime)}</strong>. Would you like to resume?
            </p>
            <div className="resumeActions">
              <button
                className="resumeBtnPrimary"
                autoFocus
                tabIndex="0"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = resumeItem.currentTime;
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                  setShowResumeModal(false);
                }}
              >
                Resume ({formatTimeDisplay(resumeItem.currentTime)})
              </button>
              <button
                className="resumeBtnSecondary"
                tabIndex="0"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                  setShowResumeModal(false);
                }}
              >
                Start from Beginning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default VideoPlayerModal;
