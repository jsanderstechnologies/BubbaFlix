import re

with open('f:/Cyberflix/src/components/video-player-modal/CustomTranscodePlayer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_line = 'const url = ${serverBase}/api/transcode/subtitle?url=&index=&ss=;'
good_line = 'const url = `${serverBase}/api/transcode/subtitle?url=${encodeURIComponent(rawUrl)}&index=${selectedSubtitleIndex}&ss=${seekOffset}`;'
content = content.replace(bad_line, good_line)

with open('f:/Cyberflix/src/components/video-player-modal/CustomTranscodePlayer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed syntax error for real')
