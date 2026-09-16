import os, subprocess
# create SRT
with open('test.srt', 'w') as f:
    f.write('1\n00:00:10,000 --> 00:00:15,000\nHello\n')
# create MKV
subprocess.run(['ffmpeg', '-f', 'lavfi', '-i', 'color=c=black:d=20', '-i', 'test.srt', '-c:v', 'libx264', '-c:s', 'srt', 'test.mkv', '-y'])
# extract with -ss
res = subprocess.run(['ffmpeg', '-ss', '5', '-i', 'test.mkv', '-map', '0:s:0', '-f', 'webvtt', 'pipe:1'], capture_output=True, text=True)
print(res.stdout)
