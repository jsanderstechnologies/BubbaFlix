/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./index.scss";

const VideoPlayerModal = ({ show, setShow, videoUrl, rawUrl, transcodeUrl, title, filename }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState("");

  const getAutoStreamUrl = () => {
    // 1. If cloud transcode is ready, use cloud H.264+AAC web stream
    if (transcodeUrl) {
      return transcodeUrl;
    }

    const source = rawUrl || videoUrl;
    if (!source) return "";

    const name = (filename || title || source).toLowerCase();
    // 2. Automatically detect if file requires FFmpeg backend transcoding
    const needsFmpeg =
      name.endsWith(".mkv") ||
      name.endsWith(".avi") ||
      name.includes("x265") ||
      name.includes("hevc") ||
      name.includes("h265") ||
      name.includes("dts") ||
      name.includes("ac3") ||
      name.includes("eac3") ||
      name.includes("5.1") ||
      name.includes("7.1");

    if (needsFmpeg) {
      console.log("[Video Player] Auto-enabling FFmpeg Realtime Transcoder for incompatible format:", name);
      return `/api/transcode?url=${encodeURIComponent(source)}`;
    }

    return source;
  };

  useEffect(() => {
    if (show) {
      const targetUrl = getAutoStreamUrl();
      setCurrentUrl(targetUrl);

      // Attempt native browser fullscreen if supported
      try {
        if (containerRef.current && containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen().catch(() => {});
        }
      } catch (e) {
        // Ignore browser fullscreen restriction policies
      }
    } else {
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch (e) {
          // Ignore exit fullscreen errors
        }
      }
    }
  }, [show, videoUrl, rawUrl, transcodeUrl, filename, title]);

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

  const handleVideoError = () => {
    const source = rawUrl || videoUrl;
    if (source && !currentUrl.includes("/api/transcode")) {
      console.warn("[Video Player] Native browser decode failed. Automatically switching to FFmpeg Transcoder...");
      setCurrentUrl(`/api/transcode?url=${encodeURIComponent(source)}`);
    }
  };

  const hidePopup = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div ref={containerRef} className={`videoPlayerModal ${show ? "visible" : ""}`}>
      <div className="playerWindow">
        {/* Upper Left Back Arrow Button */}
        <button
          className="backBtn"
          onClick={hidePopup}
          tabIndex="0"
          title="Exit Player"
        >
          <FiArrowLeft className="backIcon" />
          <span className="backText">Back</span>
        </button>

        <div className="videoWrapper">
          {currentUrl ? (
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
              <p>Unable to load video stream URL.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
