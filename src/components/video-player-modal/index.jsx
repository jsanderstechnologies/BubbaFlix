/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { FiArrowLeft } from "react-icons/fi";
import "./index.scss";

const VideoPlayerModal = ({ show, setShow, videoUrl, rawUrl }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const backBtnRef = useRef(null);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (show) {
      const targetUrl = rawUrl || videoUrl || "";
      setCurrentUrl(targetUrl);

      // Immediately focus video element or container for TV remote control
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.focus();
          videoRef.current.play().catch(() => {});
        } else if (backBtnRef.current) {
          backBtnRef.current.focus();
        }
      }, 100);

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
  }, [show, videoUrl, rawUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;

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
          if (videoRef.current) {
            if (videoRef.current.paused) {
              videoRef.current.play();
            } else {
              videoRef.current.pause();
            }
          }
        }
      }

      // Left arrow seeks back 10s, Right arrow seeks forward 10s
      if ((e.key === "ArrowLeft" || code === 37 || code === 21) && videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      }
      if ((e.key === "ArrowRight" || code === 39 || code === 22) && videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [show, setShow]);

  const hidePopup = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div ref={containerRef} className={`videoPlayerModal ${show ? "visible" : ""}`} tabIndex="-1">
      <div className="playerWindow">
        {/* Upper Left Back Arrow Button */}
        <button
          ref={backBtnRef}
          className="backBtn"
          onClick={hidePopup}
          onKeyDown={(e) => {
            const code = e.keyCode;
            if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
              e.preventDefault();
              hidePopup();
            }
          }}
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
