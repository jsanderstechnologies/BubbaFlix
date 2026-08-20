#!/bin/sh
echo "[BubbaFlix Startup] Launching Node.js FFmpeg Transcoder Supervisor..."

# Auto-restart loop function for Node transcoder service
run_transcoder() {
  while true; do
    echo "[Transcoder Service] Starting node /app/server/transcoder.cjs..."
    node /app/server/transcoder.cjs
    echo "[Transcoder Service WARNING] Node transcoder process exited with code $?. Auto-restarting in 1s..."
    sleep 1
  done
}

run_transcoder &

sleep 1

echo "[BubbaFlix Startup] Launching Nginx Web Server on port 80..."
exec nginx -g "daemon off;"
