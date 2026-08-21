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
  const hideControlsTimeoutRef = useRef(null);

  // Element Refs for D-Pad Spatial Navigation
  const backBtnRef = useRef(null);
  const rewind30BtnRef = useRef(null);
  const rewind10BtnRef = useRef(null);
  const mainPlayBtnRef = useRef(null);
  const ff10BtnRef = useRef(null);
  const ff30BtnRef = useRef(null);
  const scrubberRef = useRef(null);
  const subtitlesBtnRef = useRef(null);
  const fullscreenBtnRef = useRef(null);
  const subOptionRefs = useRef([]);

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
  const [focusedSubIdx, setFocusedSubIdx] = useState(0);

  useEffect(() => {
    if (show) {
      const targetUrl = rawUrl || videoUrl || "";
      setCurrentUrl(targetUrl);
      setIsPlaying(true);
      setControlsVisible(true);
      resetControlsTimeout();

      // Initial focus on Main Play button for Smart TV remote control
      setTimeout(() => {
        if (mainPlayBtnRef.current) {
          mainPlayBtnRef.current.focus();
        } else if (backBtnRef.current) {
          backBtnRef.current.focus();
        }
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
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

  // Smart TV Remote D-Pad Navigation Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;
      resetControlsTimeout();

      const code = e.keyCode;
      const activeEl = document.activeElement;

      // 1. Back Button / Escape (KeyCodes: 27, 4, 10009, 461)
      if (e.key === "Escape" || e.key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
        e.preventDefault();
        e.stopPropagation();
        if (showSubMenu) {
          setShowSubMenu(false);
          if (subtitlesBtnRef.current) subtitlesBtnRef.current.focus();
        } else {
          setShow(false);
        }
        return;
      }

      // 2. Subtitles Menu Navigation
      if (showSubMenu) {
        const totalOptions = subtitles.length + 1; // "Off" option + subtitles
        if (e.key === "ArrowDown" || code === 40 || code === 20) {
          e.preventDefault();
          const nextIdx = (focusedSubIdx + 1) % totalOptions;
          setFocusedSubIdx(nextIdx);
          if (subOptionRefs.current[nextIdx]) subOptionRefs.current[nextIdx].focus();
          return;
        }
        if (e.key === "ArrowUp" || code === 38 || code === 19) {
          e.preventDefault();
          const prevIdx = (focusedSubIdx - 1 + totalOptions) % totalOptions;
          setFocusedSubIdx(prevIdx);
          if (subOptionRefs.current[prevIdx]) subOptionRefs.current[prevIdx].focus();
          return;
        }
        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
          e.preventDefault();
          if (focusedSubIdx === 0) {
            handleSelectSubtitle({ id: "off" });
          } else {
            const targetSub = subtitles[focusedSubIdx - 1];
            if (targetSub) handleSelectSubtitle(targetSub);
          }
          return;
        }
      }

      // 3. Transport Row Horizontal Navigation (Rewind 30s <-> Rewind 10s <-> Play/Pause <-> FF 10s <-> FF 30s)
      const transportOrder = [
        rewind30BtnRef.current,
        rewind10BtnRef.current,
        mainPlayBtnRef.current,
        ff10BtnRef.current,
        ff30BtnRef.current,
      ];

      const transportIdx = transportOrder.indexOf(activeEl);

      if (transportIdx !== -1) {
        if (e.key === "ArrowRight" || code === 39 || code === 22) {
          e.preventDefault();
          const nextBtn = transportOrder[Math.min(transportOrder.length - 1, transportIdx + 1)];
          if (nextBtn) nextBtn.focus();
          return;
        }
        if (e.key === "ArrowLeft" || code === 37 || code === 21) {
          e.preventDefault();
          const prevBtn = transportOrder[Math.max(0, transportIdx - 1)];
          if (prevBtn) prevBtn.focus();
          return;
        }
        if (e.key === "ArrowDown" || code === 40 || code === 20) {
          e.preventDefault();
          if (scrubberRef.current) scrubberRef.current.focus();
          return;
        }
        if (e.key === "ArrowUp" || code === 38 || code === 19) {
          e.preventDefault();
          if (backBtnRef.current) backBtnRef.current.focus();
          return;
        }
      }

      // 4. Header Navigation (Back button)
      if (activeEl === backBtnRef.current) {
        if (e.key === "ArrowDown" || code === 40 || code === 20) {
          e.preventDefault();
          if (mainPlayBtnRef.current) mainPlayBtnRef.current.focus();
          return;
        }
      }

      // 5. Scrubber Navigation
      if (activeEl === scrubberRef.current) {
        if (e.key === "ArrowUp" || code === 38 || code === 19) {
          e.preventDefault();
          if (mainPlayBtnRef.current) mainPlayBtnRef.current.focus();
          return;
        }
        if (e.key === "ArrowDown" || code === 40 || code === 20) {
          e.preventDefault();
          if (subtitlesBtnRef.current) subtitlesBtnRef.current.focus();
          return;
        }
        if (e.key === "ArrowLeft" || code === 37 || code === 21) {
          e.preventDefault();
          seekRelative(-10);
          return;
        }
        if (e.key === "ArrowRight" || code === 39 || code === 22) {
          e.preventDefault();
          seekRelative(10);
          return;
        }
      }

      // 6. Footer Buttons Navigation (Subtitles <-> Fullscreen)
      if (activeEl === subtitlesBtnRef.current || activeEl === fullscreenBtnRef.current) {
        if (e.key === "ArrowUp" || code === 38 || code === 19) {
          e.preventDefault();
          if (scrubberRef.current) scrubberRef.current.focus();
          return;
        }
        if (e.key === "ArrowLeft" || code === 37 || code === 21) {
          if (activeEl === fullscreenBtnRef.current) {
            e.preventDefault();
            if (subtitlesBtnRef.current) subtitlesBtnRef.current.focus();
          }
          return;
        }
        if (e.key === "ArrowRight" || code === 39 || code === 22) {
          if (activeEl === subtitlesBtnRef.current) {
            e.preventDefault();
            if (fullscreenBtnRef.current) fullscreenBtnRef.current.focus();
          }
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, isPlaying, showSubMenu, focusedSubIdx, subtitles]);

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
                onKeyDown={(e) => {
                  const code = e.keyCode;
                  if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                    e.preventDefault();
                    hidePopup();
                  }
                }}
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
              ref={rewind30BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(-30)}
              title="Rewind 30 seconds"
              tabIndex="0"
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  seekRelative(-30);
                }
              }}
            >
              <FiRotateCcw />
              <span className="btnBadge">30</span>
            </button>

            <button
              ref={rewind10BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(-10)}
              title="Rewind 10 seconds"
              tabIndex="0"
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  seekRelative(-10);
                }
              }}
            >
              <FiRotateCcw />
              <span className="btnBadge">10</span>
            </button>

            <button
              ref={mainPlayBtnRef}
              className="transportBtn mainPlay"
              onClick={togglePlayPause}
              title={isPlaying ? "Pause" : "Play"}
              tabIndex="0"
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  togglePlayPause();
                }
              }}
            >
              {isPlaying ? <FiPause /> : <FiPlay className="playIcon" />}
            </button>

            <button
              ref={ff10BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(10)}
              title="Fast Forward 10 seconds"
              tabIndex="0"
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  seekRelative(10);
                }
              }}
            >
              <FiRotateCw />
              <span className="btnBadge">10</span>
            </button>

            <button
              ref={ff30BtnRef}
              className="transportBtn seek"
              onClick={() => seekRelative(30)}
              title="Fast Forward 30 seconds"
              tabIndex="0"
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  seekRelative(30);
                }
              }}
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
                ref={scrubberRef}
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeekChange}
                className="timelineScrubber"
                tabIndex="0"
              />
              <span className="timeDisplay">{formatTime(duration)}</span>
            </div>

            <div className="footerControlsRight">
              {/* Subtitles Button & Popup Menu */}
              <div className="subtitlesContainer">
                <button
                  ref={subtitlesBtnRef}
                  className={`footerControlBtn ${activeSubId !== "off" ? "active" : ""}`}
                  onClick={() => {
                    resetControlsTimeout();
                    setShowSubMenu(!showSubMenu);
                    setFocusedSubIdx(0);
                  }}
                  title="Subtitles (OpenSubtitles)"
                  tabIndex="0"
                  onKeyDown={(e) => {
                    const code = e.keyCode;
                    if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                      e.preventDefault();
                      resetControlsTimeout();
                      setShowSubMenu(!showSubMenu);
                      setFocusedSubIdx(0);
                    }
                  }}
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
                        ref={(el) => (subOptionRefs.current[0] = el)}
                        className={`subOption ${activeSubId === "off" ? "selected" : ""} ${focusedSubIdx === 0 ? "focused" : ""}`}
                        onClick={() => handleSelectSubtitle({ id: "off" })}
                        tabIndex="0"
                      >
                        {activeSubId === "off" && <FiCheck className="checkIcon" />}
                        <span>Off</span>
                      </div>

                      {subLoading ? (
                        <div className="subLoadingNotice">Searching OpenSubtitles...</div>
                      ) : subtitles.length === 0 ? (
                        <div className="subLoadingNotice">No OpenSubtitles found</div>
                      ) : (
                        subtitles.map((sub, idx) => (
                          <div
                            key={sub.id}
                            ref={(el) => (subOptionRefs.current[idx + 1] = el)}
                            className={`subOption ${activeSubId === sub.id ? "selected" : ""} ${focusedSubIdx === idx + 1 ? "focused" : ""}`}
                            onClick={() => handleSelectSubtitle(sub)}
                            tabIndex="0"
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
                ref={fullscreenBtnRef}
                className="footerControlBtn"
                onClick={toggleFullscreen}
                title="Toggle Fullscreen"
                tabIndex="0"
                onKeyDown={(e) => {
                  const code = e.keyCode;
                  if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                    e.preventDefault();
                    toggleFullscreen();
                  }
                }}
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
