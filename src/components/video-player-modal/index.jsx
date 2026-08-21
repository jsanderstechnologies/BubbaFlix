/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import {
  FiArrowLeft,
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiRotateCw,
  FiMaximize,
  FiMinimize,
  FiMessageSquare,
  FiCheck
} from "react-icons/fi";
import { fetchDataFromAPI } from "../../utils/api";
import { fetchOpenSubtitles, downloadAndConvertSubtitle } from "../../utils/subtitles";
import "./index.scss";

const VideoPlayerModal = ({ show, setShow, videoUrl, rawUrl, title, tmdbId, mediaType = "movie", seasonNum, episodeNum }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const backBtnRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);

  // Player State
  const [currentUrl, setCurrentUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // TMDB Logo State
  const [mediaLogoUrl, setMediaLogoUrl] = useState(null);

  // Subtitles State
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [activeSubId, setActiveSubId] = useState("off");
  const [activeVttUrl, setActiveVttUrl] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    if (show) {
      const targetUrl = rawUrl || videoUrl || "";
      setCurrentUrl(targetUrl);
      setIsPlaying(true);
      setControlsVisible(true);
      resetControlsTimeout();

      // Attempt immediate play & focus
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.focus();
          videoRef.current.play().catch(() => {});
        } else if (backBtnRef.current) {
          backBtnRef.current.focus();
        }
      }, 150);

      // Load TMDB Logo
      if (tmdbId) {
        loadTmdbLogo();
      }

      // Load Subtitles
      loadSubtitles();
    } else {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (activeVttUrl) {
        URL.revokeObjectURL(activeVttUrl);
        setActiveVttUrl(null);
      }
    }
  }, [show, videoUrl, rawUrl, tmdbId]);

  const loadTmdbLogo = async () => {
    try {
      const endpoint = mediaType === "tv" || mediaType === "series" ? `/tv/${tmdbId}/images` : `/movie/${tmdbId}/images`;
      const res = await fetchDataFromAPI(`${endpoint}?include_image_language=en,null`);
      if (res && res.logos && res.logos.length > 0) {
        const logoPath = res.logos[0].file_path;
        setMediaLogoUrl(`https://image.tmdb.org/t500${logoPath}`);
      }
    } catch (e) {
      console.warn("[Player TMDB Logo Error]:", e.message);
    }
  };

  const loadSubtitles = async () => {
    setSubLoading(true);
    const subList = await fetchOpenSubtitles({
      tmdbId,
      mediaType,
      seasonNum,
      episodeNum,
    });
    setSubLoading(false);
    setSubtitles(subList || []);
  };

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSubMenu(false);
    }, 3500);
  };

  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  const togglePlayPause = () => {
    resetControlsTimeout();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const seekRelative = (seconds) => {
    resetControlsTimeout();
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      videoRef.current.duration || 0
    );
  };

  const handleSeekChange = (e) => {
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

  const handleSelectSubtitle = async (sub) => {
    resetControlsTimeout();
    if (!sub || sub.id === "off") {
      setActiveSubId("off");
      if (activeVttUrl) {
        URL.revokeObjectURL(activeVttUrl);
        setActiveVttUrl(null);
      }
      setShowSubMenu(false);
      return;
    }

    setSubLoading(true);
    const vttUrl = await downloadAndConvertSubtitle(sub.downloadLink);
    setSubLoading(false);

    if (vttUrl) {
      if (activeVttUrl) URL.revokeObjectURL(activeVttUrl);
      setActiveVttUrl(vttUrl);
      setActiveSubId(sub.id);

      // Force track display
      setTimeout(() => {
        if (videoRef.current && videoRef.current.textTracks && videoRef.current.textTracks[0]) {
          videoRef.current.textTracks[0].mode = "showing";
        }
      }, 200);
    }
    setShowSubMenu(false);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;
      resetControlsTimeout();

      const code = e.keyCode;

      // Close player modal on Escape or Android TV Remote Back button (KeyCodes: 27, 4, 10009, 461)
      if (e.key === "Escape" || e.key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
        e.preventDefault();
        e.stopPropagation();
        setShow(false);
        return;
      }

      // Space or Enter / OK (KeyCodes: 13, 23, 66) toggles play/pause when video element is active
      if (
        e.key === " " ||
        e.key === "Enter" ||
        code === 13 ||
        code === 23 ||
        code === 66
      ) {
        if (document.activeElement === videoRef.current || document.activeElement === containerRef.current) {
          e.preventDefault();
          togglePlayPause();
        }
      }

      // Left arrow seeks back 10s, Right arrow seeks forward 10s
      if (e.key === "ArrowLeft" || code === 37 || code === 21) {
        seekRelative(-10);
      }
      if (e.key === "ArrowRight" || code === 39 || code === 22) {
        seekRelative(10);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, isPlaying]);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return "00:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const mPad = String(m).padStart(2, "0");
    const sPad = String(s).padStart(2, "0");

    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${mPad}:${sPad}`;
    }
    return `${mPad}:${sPad}`;
  };

  const hidePopup = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      ref={containerRef}
      className={`videoPlayerModal ${show ? "visible" : ""}`}
      onMouseMove={handleMouseMove}
      tabIndex="-1"
    >
      <div className="playerWindow">
        {/* Video Element */}
        <div className="videoWrapper" onClick={togglePlayPause}>
          {currentUrl ? (
            <video
              ref={videoRef}
              key={currentUrl}
              src={currentUrl}
              autoPlay
              playsInline
              className="videoElement"
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              {activeVttUrl && (
                <track
                  kind="subtitles"
                  src={activeVttUrl}
                  srcLang="en"
                  label="Subtitles"
                  default
                />
              )}
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="noStreamNotice">
              <p>Unable to load video stream URL.</p>
            </div>
          )}
        </div>

        {/* Player Overlay Controls */}
        <div className={`controlsOverlay ${controlsVisible ? "visible" : "hidden"}`}>
          {/* Top Bar Header with Back Button & TMDB Media Title Logo */}
          <div className="playerHeader">
            <div className="headerLeftGroup">
              <button
                ref={backBtnRef}
                className="backBtn"
                onClick={hidePopup}
                tabIndex="0"
                title="Exit Player"
              >
                <FiArrowLeft className="backIcon" />
                <span className="backText">Back</span>
              </button>

              {mediaLogoUrl ? (
                <img
                  src={mediaLogoUrl}
                  alt={title || "Media Title"}
                  className="mediaLogo"
                />
              ) : (
                <span className="playerTitle">{title || "BubbaFlix Stream"}</span>
              )}
            </div>
          </div>

          {/* Center Transport Controls (-30s, -10s, Play/Pause, +10s, +30s) */}
          <div className="centerTransportControls">
            <button
              className="transportBtn seek"
              onClick={() => seekRelative(-30)}
              title="Rewind 30 seconds"
              tabIndex="0"
            >
              <FiRotateCcw />
              <span className="btnBadge">30</span>
            </button>

            <button
              className="transportBtn seek"
              onClick={() => seekRelative(-10)}
              title="Rewind 10 seconds"
              tabIndex="0"
            >
              <FiRotateCcw />
              <span className="btnBadge">10</span>
            </button>

            <button
              className="transportBtn mainPlay"
              onClick={togglePlayPause}
              title={isPlaying ? "Pause" : "Play"}
              tabIndex="0"
            >
              {isPlaying ? <FiPause /> : <FiPlay className="playIcon" />}
            </button>

            <button
              className="transportBtn seek"
              onClick={() => seekRelative(10)}
              title="Fast Forward 10 seconds"
              tabIndex="0"
            >
              <FiRotateCw />
              <span className="btnBadge">10</span>
            </button>

            <button
              className="transportBtn seek"
              onClick={() => seekRelative(30)}
              title="Fast Forward 30 seconds"
              tabIndex="0"
            >
              <FiRotateCw />
              <span className="btnBadge">30</span>
            </button>
          </div>

          {/* Bottom Bar: Timeline Scrubber, Time Display, Subtitles, Fullscreen */}
          <div className="playerFooter">
            <div className="scrubberRow">
              <span className="timeDisplay">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeekChange}
                className="timelineScrubber"
              />
              <span className="timeDisplay">{formatTime(duration)}</span>
            </div>

            <div className="footerControlsRight">
              {/* Subtitles Button & Popup Menu */}
              <div className="subtitlesContainer">
                <button
                  className={`footerControlBtn ${activeSubId !== "off" ? "active" : ""}`}
                  onClick={() => {
                    resetControlsTimeout();
                    setShowSubMenu(!showSubMenu);
                  }}
                  title="Subtitles (OpenSubtitles)"
                  tabIndex="0"
                >
                  <FiMessageSquare />
                  <span className="btnText">Subtitles</span>
                </button>

                {showSubMenu && (
                  <div className="subtitlesMenu">
                    <div className="menuHeader">
                      <span>OpenSubtitles</span>
                    </div>
                    <div className="menuList">
                      <div
                        className={`subOption ${activeSubId === "off" ? "selected" : ""}`}
                        onClick={() => handleSelectSubtitle({ id: "off" })}
                      >
                        {activeSubId === "off" && <FiCheck className="checkIcon" />}
                        <span>Off</span>
                      </div>

                      {subLoading ? (
                        <div className="subLoadingNotice">Searching OpenSubtitles...</div>
                      ) : subtitles.length === 0 ? (
                        <div className="subLoadingNotice">No OpenSubtitles found</div>
                      ) : (
                        subtitles.map((sub) => (
                          <div
                            key={sub.id}
                            className={`subOption ${activeSubId === sub.id ? "selected" : ""}`}
                            onClick={() => handleSelectSubtitle(sub)}
                          >
                            {activeSubId === sub.id && <FiCheck className="checkIcon" />}
                            <span className="langLabel">[{sub.language}]</span>
                            <span className="fileName" title={sub.fileName}>
                              {sub.fileName}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                className="footerControlBtn"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                tabIndex="0"
              >
                {isFullscreen ? <FiMinimize /> : <FiMaximize />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
