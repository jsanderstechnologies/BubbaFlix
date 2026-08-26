#!/bin/sh
echo "[BubbaFlix Startup] Launching Node.js Backend Settings Server..."

# Ensure /app/data directory exists for settings.json and bubbaflix.log volume persistence
mkdir -p /app/data /app/server

# Log container startup event to persistent volume log file
echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] [Container Startup] Starting BubbaFlix Media Center Stack..." >> /app/data/bubbaflix.log

run_backend() {
  while true; do
    echo "[Backend Settings Service] Starting node /app/server/transcoder.cjs on internal port 5000..." | tee -a /app/data/bubbaflix.log
    node /app/server/transcoder.cjs 2>&1 | tee -a /app/data/bubbaflix.log
    echo "[Backend Settings Service WARNING] Node process exited with code $?. Auto-restarting in 1s..." | tee -a /app/data/bubbaflix.log
    sleep 1
  done
}

run_backend &

sleep 1

echo "[BubbaFlix Startup] Launching Nginx Web Server..." | tee -a /app/data/bubbaflix.log
exec nginx -g "daemon off;"
