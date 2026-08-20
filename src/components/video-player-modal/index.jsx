/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { FiX, FiPlay, FiDownload, FiSettings, FiVolume2, FiAlertCircle } from "react-icons/fi";
import "./index.scss";

const VideoPlayerModal = ({ show, setShow, videoUrl, rawUrl, transcodeUrl, title, filename }) => {
  const videoRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState(videoUrl);
  const [streamMode, setStreamMode] = useState("transcode");
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    // Prefer web transcoded stream if available for 100% browser & audio compatibility
    if (transcodeUrl) {
      setCurrentUrl(transcodeUrl);
      setStreamMode("transcode");
    } else {
      setCurrentUrl(rawUrl || videoUrl);
      setStreamMode("raw");
    }
    setPlaybackError(false);
  }, [show, videoUrl, rawUrl, transcodeUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;

      // Close modal on Escape or TV Remote Back button
      if (e.key === "Escape" || e.keyCode === 27 || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        setShow(false);
      }

      // Space or Enter toggles play/pause if focused on video
      if ((e.key === " " || e.key === "Enter") && document.activeElement === videoRef.current) {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      }

      // Left arrow seeks back 10s, Right arrow seeks forward 10s
      if (e.key === "ArrowLeft" && document.activeElement === videoRef.current && videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      }
      if (e.key === "ArrowRight" && document.activeElement === videoRef.current && videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, setShow]);

  const handleModeChange = (newMode) => {
    setStreamMode(newMode);
    setPlaybackError(false);
    if (newMode === "transcode" && transcodeUrl) {
      setCurrentUrl(transcodeUrl);
    } else {
      setCurrentUrl(rawUrl || videoUrl);
    }
  };

  const handleVideoError = () => {
    console.warn("[Video Player] Native browser video decode error for current URL:", currentUrl);
    setPlaybackError(true);
    // If raw failed and transcode is available, switch automatically
    if (streamMode === "raw" && transcodeUrl) {
      console.log("[Video Player] Auto-switching to Web Transcoded AAC stream...");
      handleModeChange("transcode");
    }
  };

  const hidePopup = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={`videoPlayerModal ${show ? "visible" : ""}`}>
      <div className="backdrop" onClick={hidePopup}></div>
      <div className="playerWindow">
        <div className="windowHeader">
          <div className="headerInfo">
            <FiPlay className="playIcon" />
            <span className="streamTitle">{title || filename || "Live Video Stream"}</span>
          </div>

          <div className="headerActions">
            {/* Stream Mode Dropdown Selector */}
            {(rawUrl || transcodeUrl) && (
              <div className="modeSelector">
                <FiSettings className="selectorIcon" />
                <select
                  value={streamMode}
                  onChange={(e) => handleModeChange(e.target.value)}
                  className="modeSelect"
                  tabIndex="0"
                >
                  {transcodeUrl && (
                    <option value="transcode">
                      🎬 Web Transcoded (H.264 + AAC Audio)
                    </option>
                  )}
                  {rawUrl && (
                    <option value="raw">
                      ⚡ Original Raw Source
                    </option>
                  )}
                </select>
              </div>
            )}

            {currentUrl && (
              <a
                href={currentUrl}
                download
                className="downloadBtn"
                target="_blank"
                rel="noreferrer"
                title="Download Video File"
              >
                <FiDownload /> <span>Download</span>
              </a>
            )}
            <button className="closeBtn" onClick={hidePopup} tabIndex="0" title="Close Player">
              <FiX />
            </button>
          </div>
        </div>

        {/* Audio / Video Compatibility Notice Bar */}
        <div className="compatibilityBar">
          <FiVolume2 className="audioIcon" />
          <span>
            {streamMode === "transcode"
              ? "Playing Web Transcoded Stream with universal AAC stereo audio (compatible with all browsers & Smart TVs)."
              : "Playing Original Raw Stream. If you experience missing audio (AC3/DTS) or blank video (x265), switch to Web Transcoded mode above."}
          </span>
        </div>

        <div className="videoWrapper">
          {currentUrl && !playbackError ? (
            <video
              ref={videoRef}
              key={currentUrl}
              src={currentUrl}
              controls
              autoPlay
              tabIndex="0"
              className="videoElement"
              onError={handleVideoError}
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="noStreamNotice">
              <FiAlertCircle className="errorIcon" />
              <p>Your browser cannot natively decode this raw video or audio format (e.g. x265 / AC3 5.1).</p>
              {transcodeUrl && (
                <button
                  className="switchBtn"
                  onClick={() => handleModeChange("transcode")}
                >
                  Switch to Web Transcoded Stream (AAC Audio)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
