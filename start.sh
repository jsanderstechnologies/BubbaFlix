#!/bin/sh
echo "[BubbaFlix Startup] Launching Node.js FFmpeg Transcoder Engine on port 5000..."
node /app/server/transcoder.cjs &

sleep 1

echo "[BubbaFlix Startup] Launching Nginx Web Server on port 80..."
exec nginx -g "daemon off;"
