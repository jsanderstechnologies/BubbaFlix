#!/bin/sh
echo "[BubbaFlix Startup] Launching Node.js Backend Settings Server..."

# Ensure /app/server directory exists for settings.json volume persistence
mkdir -p /app/server

run_backend() {
  while true; do
    echo "[Backend Settings Service] Starting node /app/server/transcoder.cjs on internal port 5000..."
    node /app/server/transcoder.cjs
    echo "[Backend Settings Service WARNING] Node process exited with code $?. Auto-restarting in 1s..."
    sleep 1
  done
}

run_backend &

sleep 1

echo "[BubbaFlix Startup] Launching Nginx Web Server..."
exec nginx -g "daemon off;"
