import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getServerUrl } from "../../utils/serverSettings";
import { getWatchProgress } from "../../utils/watchProgress";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CustomTranscodePlayer = ({ streamUrl, rawUrl, title, tmdbId, mediaType, seasonNum, episodeNum, onTimeUpdate, onEnded }) => {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [seekOffset, setSeekOffset] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [actualStreamUrl, setActualStreamUrl] = useState("");
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    // Check for saved resume progress
    const saved = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
    if (saved && saved.currentTime > 15 && (saved.duration - saved.currentTime) > 60) {
      setSeekOffset(saved.currentTime);
      setCurrentTime(saved.currentTime);
      const urlWithSeek = streamUrl.includes("?") ? `${streamUrl}&ss=${saved.currentTime}` : `${streamUrl}?ss=${saved.currentTime}`;
      setActualStreamUrl(urlWithSeek);
    } else {
      setActualStreamUrl(streamUrl);
    }
  }, [streamUrl, tmdbId, mediaType, seasonNum, episodeNum]);

  useEffect(() => {
    // Fetch precise video duration from the transcoder metadata API
    const fetchMetadata = async () => {
      try {
        const serverBase = getServerUrl();
        const res = await axios.get(`${serverBase}/api/transcode/metadata?url=${encodeURIComponent(rawUrl)}`, { timeout: 10000 });
        if (res.data?.duration) {
          setDuration(res.data.duration);
        }
      } catch (err) {
        console.warn("[CustomTranscodePlayer] Failed to probe video duration:", err.message);
      }
    };
    fetchMetadata();
  }, [rawUrl]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const realTime = seekOffset + videoRef.current.currentTime;
      setCurrentTime(realTime);
      if (onTimeUpdate) {
        // Pass a mock video object to the parent so it saves the correct seeked progress
        onTimeUpdate({ currentTime: realTime, duration });
      }
    }
  };

  const handleSeek = (e) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * duration;
    
    setSeekOffset(targetTime);
    setCurrentTime(targetTime);
    
    // The only way to seek a live FFmpeg pipe is to restart it with -ss
    const seekUrl = streamUrl.includes("?") 
      ? `${streamUrl}&ss=${targetTime}` 
      : `${streamUrl}?ss=${targetTime}`;
      
    videoRef.current.src = seekUrl;
    videoRef.current.play();
  };

  const handleRelativeSeek = (seconds) => {
    if (duration <= 0) return;
    let targetTime = currentTime + seconds;
    if (targetTime < 0) targetTime = 0;
    if (targetTime > duration) targetTime = duration;

    setSeekOffset(targetTime);
    setCurrentTime(targetTime);
    
    // Restart FFmpeg pipe at new offset
    const seekUrl = streamUrl.includes("?") 
      ? `${streamUrl}&ss=${targetTime}` 
      : `${streamUrl}?ss=${targetTime}`;
      
    videoRef.current.src = seekUrl;
    videoRef.current.play();
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="custom-transcode-player" style={{ position: 'relative', width: '100%', height: '100%', background: 'black', overflow: 'hidden' }}>
      {actualStreamUrl && (
        <video
          ref={videoRef}
          autoPlay
          src={actualStreamUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={onEnded}
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ width: '100%', height: '100%', outline: 'none' }}
        />
      )}
      
      <div 
        className="custom-controls" 
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
          padding: '30px 20px 20px 20px', display: 'flex', flexDirection: 'column', gap: '10px',
          color: 'white', transition: 'opacity 0.3s ease',
          opacity: showControls ? 1 : 0, pointerEvents: showControls ? 'auto' : 'none'
        }}
      >
        <div style={{ paddingBottom: '10px', fontSize: '18px', fontWeight: 'bold', textShadow: '1px 1px 2px black' }}>
          {title}
        </div>
        
        <div className="progress-bar-container" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{formatTime(currentTime)}</span>
          <div 
            className="progress-bar" 
            onClick={handleSeek} 
            style={{
              flex: 1, height: '8px', background: 'rgba(255,255,255,0.25)', 
              cursor: 'pointer', borderRadius: '4px', position: 'relative'
            }}
          >
            <div className="progress-filled" style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              height: '100%', background: '#E50914', borderRadius: '4px',
              transition: 'width 0.1s linear'
            }} />
          </div>
          <span style={{ fontSize: '14px', fontFamily: 'monospace' }}>{formatTime(duration)}</span>
        </div>
        
        <div className="controls-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <button onClick={() => handleRelativeSeek(-30)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⏪ 30s
            </button>
            <button onClick={() => handleRelativeSeek(-10)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              ⏪ 10s
            </button>
            <button onClick={togglePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '24px' }}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => handleRelativeSeek(10)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              10s ⏩
            </button>
            <button onClick={() => handleRelativeSeek(30)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              30s ⏩
            </button>
          </div>
          <button onClick={handleToggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>
            ⛶
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomTranscodePlayer;
