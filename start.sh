#!/bin/sh
echo "[BubbaFlix Startup] Launching Node.js FFmpeg Transcoder Engine on port 5000..."
node /app/server/transcoder.cjs &
PID=$!

sleep 2

if kill -0 $PID 2>/dev/null; then
  echo "[BubbaFlix Startup] Node Transcoder successfully running on PID $PID"
else
  echo "[BubbaFlix Startup CRITICAL ERROR] Node Transcoder failed to start or crashed on PID $PID!"
fi

echo "[BubbaFlix Startup] Launching Nginx Web Server on port 80..."
exec nginx -g "daemon off;"
