import re

with open('f:/Cyberflix/src/components/video-player-modal/CustomTranscodePlayer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the old track useEffect
old_use_effect = '''  useEffect(() => {
    if (videoRef.current && selectedSubtitleIndex !== null) {
      const timer = setTimeout(() => {
        if (videoRef.current && videoRef.current.textTracks) {
          for (let i = 0; i < videoRef.current.textTracks.length; i++) {
            videoRef.current.textTracks[i].mode = 'showing';
          }
        }
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [selectedSubtitleIndex, actualStreamUrl]);'''

new_use_effect = '''  useEffect(() => {
    let abortController = new AbortController();
    let track = null;
    
    if (selectedSubtitleIndex !== null && videoRef.current) {
      if (videoRef.current.textTracks) {
        for (let i = 0; i < videoRef.current.textTracks.length; i++) {
          videoRef.current.textTracks[i].mode = 'hidden';
        }
      }
      
      track = videoRef.current.addTextTrack("subtitles", "Subtitle", "en");
      track.mode = "showing";
      
      const loadSubs = async () => {
         try {
            const serverBase = getServerUrl();
            const url = ${serverBase}/api/transcode/subtitle?url=&index=&ss=;
            const response = await fetch(url, { signal: abortController.signal });
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";
            
            const parseTime = (timeStr) => {
              const p = timeStr.trim().split(':');
              let s = parseFloat(p.pop() || 0);
              let m = parseInt(p.pop() || 0);
              let h = parseInt(p.pop() || 0);
              return h * 3600 + m * 60 + s;
            };

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              let parts = buffer.split(/\\n\\r?\\n/);
              buffer = parts.pop();
              
              for (let part of parts) {
                 if (part.includes('-->')) {
                     const lines = part.split(/\\r?\\n/);
                     let timeLineIdx = lines.findIndex(l => l.includes('-->'));
                     if (timeLineIdx === -1) continue;
                     
                     let text = lines.slice(timeLineIdx + 1).join('\\n').trim();
                     let [startStr, endStr] = lines[timeLineIdx].split('-->');
                     let start = parseTime(startStr);
                     let end = parseTime(endStr);
                     
                     start = Math.max(0, start - seekOffset);
                     end = Math.max(0, end - seekOffset);
                     
                     if (end > 0 && window.VTTCue) {
                       track.addCue(new VTTCue(start, end, text));
                     }
                 }
              }
            }
         } catch (e) {
            console.error("Subtitle load error:", e);
         }
      };
      loadSubs();
    }
    
    return () => {
       abortController.abort();
       if (track && track.cues) {
          Array.from(track.cues).forEach(c => track.removeCue(c));
       }
    };
  }, [selectedSubtitleIndex, actualStreamUrl, seekOffset]);'''

content = content.replace(old_use_effect, new_use_effect)

# Remove the <track> component in JSX
jsx_track = '''            {selectedSubtitleIndex !== null && (
              <track 
                key={${selectedSubtitleIndex}-}
                kind="subtitles" 
                src={${getServerUrl()}/api/transcode/subtitle?url=&index=&ss=} 
                srcLang="en" 
                label="Subtitle" 
                default 
              />
            )}'''
content = content.replace(jsx_track, '')

with open('f:/Cyberflix/src/components/video-player-modal/CustomTranscodePlayer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Patched successfully!')
