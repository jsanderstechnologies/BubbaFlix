import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { getServerUrl } from "../../utils/serverSettings";
import { getWatchProgress } from "../../utils/watchProgress";
import { fetchDataFromAPI } from "../../utils/api";

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
  const [bufferedAmount, setBufferedAmount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [seekOffset, setSeekOffset] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [actualStreamUrl, setActualStreamUrl] = useState("");
  const controlsTimeoutRef = useRef(null);

  const [audioTracks, setAudioTracks] = useState([]);
  const [subtitleTracks, setSubtitleTracks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState(null);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(null);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [mediaLogo, setMediaLogo] = useState(null);

  useEffect(() => {
    if (!tmdbId) return;
    const fetchLogo = async () => {
      try {
        const res = await fetchDataFromAPI(`/${mediaType || 'movie'}/${tmdbId}/images`, { include_image_language: "en,null" });
        if (res && res.logos && res.logos.length > 0) {
          setMediaLogo(`https://image.tmdb.org/t/p/w500${res.logos[0].file_path}`);
        }
      } catch (err) {
        console.warn("[CustomTranscodePlayer] Failed to fetch TMDB logo", err);
      }
    };
    fetchLogo();
  }, [tmdbId, mediaType]);

  useEffect(() => {
    const saved = getWatchProgress(tmdbId, mediaType, seasonNum, episodeNum);
    let startOffset = 0;
    if (saved && saved.currentTime > 15 && (saved.duration - saved.currentTime) > 60) {
      startOffset = saved.currentTime;
    }
    setSeekOffset(startOffset);
    setCurrentTime(startOffset);
    
    let targetUrl = streamUrl;
    if (startOffset > 0) {
      targetUrl = targetUrl.includes("?") ? `${targetUrl}&ss=${startOffset}` : `${targetUrl}?ss=${startOffset}`;
    }
    setActualStreamUrl(targetUrl);
  }, [streamUrl, tmdbId, mediaType, seasonNum, episodeNum]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const serverBase = getServerUrl();
        const res = await axios.get(`${serverBase}/api/transcode/metadata?url=${encodeURIComponent(rawUrl)}`, { timeout: 10000 });
        if (res.data) {
          if (res.data.duration) setDuration(res.data.duration);
          if (res.data.subtitleTracks) setSubtitleTracks(res.data.subtitleTracks);
          if (res.data.chapters) setChapters(res.data.chapters);
          
          if (res.data.audioTracks && res.data.audioTracks.length > 0) {
            setAudioTracks(res.data.audioTracks);
            // Default to English if not manually selected
            if (selectedAudioIndex === null) {
              const engTrack = res.data.audioTracks.find(t => t.language === 'eng' || t.language === 'en' || (t.title && t.title.toLowerCase().includes('english')));
              if (engTrack && res.data.audioTracks[0] && engTrack.index !== res.data.audioTracks[0].index) {
                const currentRealTime = seekOffset + (videoRef.current ? videoRef.current.currentTime : 0);
                setSelectedAudioIndex(engTrack.index);
                setSeekOffset(currentRealTime);
                setCurrentTime(currentRealTime);
                let targetUrl = streamUrl;
                if (currentRealTime > 0) targetUrl += (targetUrl.includes("?") ? "&" : "?") + `ss=${currentRealTime}`;
                targetUrl += (targetUrl.includes("?") ? "&" : "?") + `audio_index=${engTrack.index}`;
                setActualStreamUrl(targetUrl);
                if (videoRef.current) {
                  videoRef.current.src = targetUrl;
                  videoRef.current.play();
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("[CustomTranscodePlayer] Failed to probe metadata:", err.message);
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
        onTimeUpdate({ currentTime: realTime, duration });
      }
    }
  };

  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedAmount(seekOffset + bufferedEnd);
    }
  };

  const executeSeek = (targetTime, audioIndex = selectedAudioIndex) => {
    setSeekOffset(targetTime);
    setCurrentTime(targetTime);
    
    let targetUrl = streamUrl;
    if (targetTime > 0) targetUrl += (targetUrl.includes("?") ? "&" : "?") + `ss=${targetTime}`;
    if (audioIndex !== null) targetUrl += (targetUrl.includes("?") ? "&" : "?") + `audio_index=${audioIndex}`;
    
    if (videoRef.current) {
      videoRef.current.src = targetUrl;
      videoRef.current.play();
    }
  };

  const handleSeek = (e) => {
    if (duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * duration;
    executeSeek(targetTime);
  };

  const handleRelativeSeek = (seconds) => {
    if (duration <= 0) return;
    let targetTime = currentTime + seconds;
    if (targetTime < 0) targetTime = 0;
    if (targetTime > duration) targetTime = duration;
    executeSeek(targetTime);
  };

  const handleAudioTrackChange = (index) => {
    setSelectedAudioIndex(index);
    setShowAudioMenu(false);
    executeSeek(currentTime, index);
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
          onProgress={handleProgress}
          onEnded={onEnded}
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          style={{ width: '100%', height: '100%', outline: 'none' }}
          crossOrigin="anonymous"
        >
          {selectedSubtitleIndex !== null && (
            <track 
              kind="subtitles" 
              src={`${getServerUrl()}/api/transcode/subtitle?url=${encodeURIComponent(rawUrl)}&index=${selectedSubtitleIndex}`} 
              srcLang="en" 
              label="Subtitle" 
              default 
            />
          )}
        </video>
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
        <div style={{ paddingBottom: '10px', fontSize: '18px', fontWeight: 'bold', textShadow: '1px 1px 2px black', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {mediaLogo ? (
            <img src={mediaLogo} alt={title} style={{ height: '45px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }} />
          ) : (
            <span>{title}</span>
          )}
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
            {chapters.map(chap => (
              <div 
                key={chap.id}
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${duration ? (chap.start_time / duration) * 100 : 0}%`,
                  width: '2px', background: 'rgba(255,255,255,0.8)', zIndex: 3
                }}
                title={chap.title}
              />
            ))}
            <div className="buffered-filled" style={{
              position: 'absolute', top: 0, left: 0,
              width: `${duration ? (bufferedAmount / duration) * 100 : 0}%`,
              height: '100%', background: 'rgba(255,255,255,0.4)', borderRadius: '4px',
              transition: 'width 0.2s linear', zIndex: 1
            }} />
            <div className="progress-filled" style={{
              position: 'absolute', top: 0, left: 0,
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              height: '100%', background: '#E50914', borderRadius: '4px',
              transition: 'width 0.1s linear', zIndex: 2
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

          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            
            <div style={{ position: 'relative' }}>
              {showInfoModal && (
                <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '15px', borderRadius: '8px', minWidth: '250px', zIndex: 100, border: '1px solid #444' }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>Media Info</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Title:</strong> {title}</div>
                  {mediaType === 'tv' && (
                    <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Episode:</strong> S{seasonNum} E{episodeNum}</div>
                  )}
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Duration:</strong> {formatTime(duration)}</div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginBottom: '5px' }}><strong>Transcoder:</strong> Active (FFmpeg Pipe)</div>
                </div>
              )}
              <button onClick={() => { setShowInfoModal(!showInfoModal); setShowChapterMenu(false); setShowAudioMenu(false); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                ℹ️ Info
              </button>
            </div>

            {chapters.length > 0 && (
              <div style={{ position: 'relative' }}>
                {showChapterMenu && (
                  <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '10px', borderRadius: '8px', minWidth: '200px', maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 100 }}>
                    <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '5px', borderBottom: '1px solid #444', marginBottom: '5px' }}>Chapters</div>
                    {chapters.map(chap => (
                      <button key={chap.id} onClick={() => { executeSeek(chap.start_time); setShowChapterMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                        {formatTime(chap.start_time)} - {chap.title}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowChapterMenu(!showChapterMenu); setShowInfoModal(false); setShowAudioMenu(false); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                  📑 Chapters
                </button>
              </div>
            )}

            {audioTracks.length > 0 && (
              <div style={{ position: 'relative' }}>
                {showAudioMenu && (
                  <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '10px', borderRadius: '8px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 100 }}>
                    <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '5px', borderBottom: '1px solid #444', marginBottom: '5px' }}>Audio Tracks</div>
                    <button onClick={() => handleAudioTrackChange(null)} style={{ background: 'none', border: 'none', color: selectedAudioIndex === null ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                      Default Track
                    </button>
                    {audioTracks.map(t => (
                      <button key={t.index} onClick={() => handleAudioTrackChange(t.index)} style={{ background: 'none', border: 'none', color: selectedAudioIndex === t.index ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                        {t.title} {t.language && t.language !== 'und' ? `(${t.language})` : ''}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowAudioMenu(!showAudioMenu); setShowInfoModal(false); setShowSubtitleMenu(false); setShowChapterMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}>
                  🔊 Audio
                </button>
              </div>
            )}
            
            {subtitleTracks.length > 0 && (
              <div style={{ position: 'relative' }}>
                {showSubtitleMenu && (
                  <div style={{ position: 'absolute', bottom: '35px', right: '-10px', background: 'rgba(20,20,20,0.95)', padding: '10px', borderRadius: '8px', minWidth: '150px', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 100 }}>
                    <div style={{ fontSize: '12px', color: '#aaa', paddingBottom: '5px', borderBottom: '1px solid #444', marginBottom: '5px' }}>Subtitles (CC)</div>
                    <button onClick={() => { setSelectedSubtitleIndex(null); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: selectedSubtitleIndex === null ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                      Off
                    </button>
                    {subtitleTracks.map(t => (
                      <button key={t.index} onClick={() => { setSelectedSubtitleIndex(t.index); setShowSubtitleMenu(false); }} style={{ background: 'none', border: 'none', color: selectedSubtitleIndex === t.index ? '#E50914' : 'white', cursor: 'pointer', textAlign: 'left', fontSize: '14px', padding: '5px' }}>
                        {t.title} {t.language && t.language !== 'und' ? `(${t.language})` : ''}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => { setShowSubtitleMenu(!showSubtitleMenu); setShowInfoModal(false); setShowAudioMenu(false); setShowChapterMenu(false); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
                  CC
                </button>
              </div>
            )}

            <button onClick={handleToggleFullscreen} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '20px' }}>
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomTranscodePlayer;
