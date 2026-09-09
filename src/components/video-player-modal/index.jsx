/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "movi-player";

import { FiArrowLeft } from "react-icons/fi";
import { getWatchProgress, saveWatchProgress, clearWatchProgress } from "../../utils/watchProgress";
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
  
  const [currentUrl, setCurrentUrl] = useState("");
  const displayTitle = cleanMediaTitle(title || "");

  const handleClose = () => {
    // Save progress before closing
    if (videoRef.current) {
      const v = videoRef.current;
      if (v.currentTime > 15 && v.duration > 0) {
         saveWatchProgress({
            tmdbId,
            mediaType,
            seasonNum,
            episodeNum,
            currentTime: v.currentTime,
            duration: v.duration,
            title: displayTitle
         });
      }
    }
    if (typeof setShow === "function") setShow(false);
    if (typeof onClose === "function") onClose();
  };

  useEffect(() => {
    if (show) {
      let targetUrl = getTranscodedStreamUrl(rawUrl || videoUrl || streamUrl || "");

      // Android TV native playback bridge
      if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.playStream === "function") {
        window.AndroidPlayer.playStream(targetUrl, displayTitle, channelLogo || "", tmdbId || "", mediaType || "movie");
        handleClose();
        return;
      }

      document.body.classList.add("videoPlayerActive");
      document.documentElement.classList.add("videoPlayerActive");
      setCurrentUrl(targetUrl);

      // Keyboard handler for closing
      const handlePlayerKeyDown = (e) => {
        const key = e.key;
        const code = e.keyCode;
        if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
          e.preventDefault();
          e.stopPropagation();
          handleClose();
        }
      };

      window.addEventListener("keydown", handlePlayerKeyDown, true);

      return () => {
        window.removeEventListener("keydown", handlePlayerKeyDown, true);
        document.body.classList.remove("videoPlayerActive");
        document.documentElement.classList.remove("videoPlayerActive");
      };
    } else {
      document.body.classList.remove("videoPlayerActive");
      document.documentElement.classList.remove("videoPlayerActive");
    }
  }, [show, videoUrl, rawUrl, tmdbId, mediaType]);

  // Handle restoring watch progress once the video is ready
  useEffect(() => {
    if (!show || !currentUrl || !videoRef.current) return;
    const videoNode = videoRef.current;

    const handleLoadedData = () => {
       const saved = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
       if (saved && saved.currentTime > 15 && (saved.duration - saved.currentTime) > 60) {
           // Auto-resume logic
           videoNode.currentTime = saved.currentTime;
       }
    };

    videoNode.addEventListener("loadeddata", handleLoadedData);
    
    // MoviPlayer natively handles HLS streams via its internal wrapper!
    videoNode.src = currentUrl;
    console.log("[VideoPlayerModal] MoviPlayer source set:", currentUrl);

    return () => {
      videoNode.removeEventListener("loadeddata", handleLoadedData);
    };
  }, [show, currentUrl, tmdbId, mediaType, seasonNum, episodeNum]);

  const handleTimeUpdate = () => {
     if (videoRef.current && videoRef.current.currentTime > 15 && videoRef.current.duration > 0) {
         saveWatchProgress({
            tmdbId,
            mediaType,
            seasonNum,
            episodeNum,
            currentTime: videoRef.current.currentTime,
            duration: videoRef.current.duration,
            title: displayTitle
         });
     }
  };

  if (!show) return null;
  if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.playStream === "function") return null;

  return createPortal(
    <div ref={containerRef} className={`videoPlayerModal ${show ? "visible" : ""}`}>
      <div className="playerWindow">
        {/* Simple back button overlapping top-left so user can close modal manually */}
        <button 
           className="backBtn minimalistBackBtn" 
           onClick={handleClose}
           style={{ position: 'absolute', top: '15px', left: '15px', zIndex: 9999, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}
        >
          <FiArrowLeft size={20} /> Back
        </button>

        <div className="videoWrapper" style={{ width: '100%', height: '100vh', background: 'black' }}>
          <movi-player
            ref={videoRef}
            class="videoElement"
            controls="true"
            autoplay="true"
            theme="dark"
            title={displayTitle}
            showtitle="true"
            thumb="true"
            ontimeupdate={handleTimeUpdate}
            onended={handleClose}
            src={currentUrl}
            style={{ width: '100%', height: '100%', outline: 'none' }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VideoPlayerModal;
