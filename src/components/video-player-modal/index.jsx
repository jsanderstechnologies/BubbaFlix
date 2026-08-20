/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import { FiX, FiPlay, FiDownload } from "react-icons/fi";
import "./index.scss";

const VideoPlayerModal = ({ show, setShow, videoUrl, title, filename }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!show) return;

      // Close modal on Escape or TV Remote Back button
      if (e.key === "Escape" || e.keyCode === 27 || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        setShow(false);
      }

      // Space or Enter toggles play/pause if not focused on control buttons
      if ((e.key === " " || e.key === "Enter") && document.activeElement === videoRef.current) {
        e.preventDefault();
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }

      // Left arrow seeks back 10s, Right arrow seeks forward 10s
      if (e.key === "ArrowLeft" && document.activeElement === videoRef.current) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      }
      if (e.key === "ArrowRight" && document.activeElement === videoRef.current) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [show, setShow]);

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
            {videoUrl && (
              <a
                href={videoUrl}
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

        <div className="videoWrapper">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
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
