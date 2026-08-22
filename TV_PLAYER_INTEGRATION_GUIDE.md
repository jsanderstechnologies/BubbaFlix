# BubbaFlix 📺 - Smart TV & API Integration Guide

This guide provides complete technical specifications, API endpoints, device-aware stream resolution logic, environment variable configuration for Docker/Portainer/CasaOS, remote control KeyCode mappings, and architecture details for **BubbaFlix**.

All devices (Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, desktop, and mobile) exclusively use the unified **BubbaFlix Web Video Player** (`VideoPlayerModal`) built directly into the web application. External native player apps (VLC, MX Player, ExoPlayer intents) are completely bypassed in favor of the seamless, full-screen Web Player.

---

## 📋 Table of Contents

1. [Backend Server Architecture](#-backend-server-architecture)
2. [Centralized Server Settings API (`/api/settings`)](#-centralized-server-settings-api-apisettings)
3. [AIOStreams Integration (ElfHosted + Premiumize)](#-aiostreams-integration-elfhosted--premiumize)
4. [Groq AI Stream Filtering API (`/api/groq/`)](#-groq-ai-stream-filtering-api-apigroq)
5. [SIMKL Watch Status Synchronization API (`/api/simkl/`)](#-simkl-watch-status-synchronization-api-apisimkl)
6. [Smart TV D-Pad Remote Control KeyCode Reference](#-smart-tv-d-pad-remote-control-keycode-reference)
7. [Docker, Portainer, and CasaOS Environment Variables](#-docker-portainer-and-casaos-environment-variables)
8. [Comprehensive Logging Pipeline](#-comprehensive-logging-pipeline)

---

## 🏗️ Backend Server Architecture

The BubbaFlix backend server runs on Node.js (internal port: `5000`, external mapped port: `5150`). It serves four primary functions:

1. **Centralized Settings Storage**: Persists shared API keys, AIOStreams URL, theme, zoom level, and stream filters in `/app/server/settings.json`.
2. **Nginx Reverse Proxy**: Proxies SIMKL, Groq AI, and backend API calls, resolving CORS and logging network traffic.
3. **Environment Overrides**: Automatically guarantees container environment variables (`GROQ_API_KEY`, `SIMKL_CLIENT_ID`, `AIOSTREAMS_URL`, `TMDB_READ_ACCESS_TOKEN`) override empty disk settings.
4. **Persistent Logging**: Writes ISO 8601 formatted logs to stdout and persistent volume file `/app/server/bubbaflix.log`.

---

## ⚙️ Centralized Server Settings API (`/api/settings`)

Native devices and clients can read and write shared configuration settings directly to/from the BubbaFlix server.

### 1. Get Server Settings
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:5150/api/settings`
- **Response**:
```json
{
  "status": "success",
  "settings": {
    "theme": "dark-red",
    "aiostreams_url": "https://aiostreams.elfhosted.com/...",
    "simklClientId": "abcdef123456",
    "groqKey": "gsk_...",
    "tmdbToken": "eyJhbGci...",
    "stream_resolutions": ["2160p", "1080p", "720p", "480p"],
    "stream_exclude_low_quality": true
  }
}
```

### 2. Update Server Settings
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:5150/api/settings`
- **Headers**: `Content-Type: application/json`

### 3. Server Health Check
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:5150/api/transcode/health`

---

## ⚡ AIOStreams Integration (ElfHosted + Premiumize)

BubbaFlix integrates with AIOStreams (ElfHosted + Premiumize) to fetch torrent streams and resolve direct playback URLs:

### Endpoints
- **Movie Streams**: `GET <AIO_MANIFEST_URL>/stream/movie/<IMDB_ID_OR_TMDB_ID>.json`
- **TV Series Streams**: `GET <AIO_MANIFEST_URL>/stream/series/<IMDB_ID_OR_TMDB_ID>:<SEASON>:<EPISODE>.json`

---

## 🤖 Groq AI Stream Filtering API (`/api/groq/`)

Proxied through Nginx to `https://api.groq.com/openai/v1/chat/completions` using model `llama3-8b-8192`.

Features:
- **Intelligent Stream Classification**: Analyzes torrent title strings for a given media title.
- **Strict Quality & Category Exclusion**: Filters out adult content (XXX), standalone MP3/FLAC audio albums, software/games, and unrelated movie spin-offs.

---

## 🎬 SIMKL Watch Status Synchronization API (`/api/simkl/`)

Proxied through Nginx to `https://api.simkl.com/`.

### Mark Media as Watched
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:5150/api/simkl/sync/history?client_id=<SIMKL_CLIENT_ID>&app-name=BubbaFlix&app-version=1.0`
- **Headers**:
  - `simkl-api-key: <SIMKL_CLIENT_ID>`
  - `User-Agent: BubbaFlix/1.0 (Smart TV Media App)`
  - `Content-Type: application/json`

---

## 🎮 Smart TV D-Pad Remote Control KeyCode Reference

Native Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, and Smart TV remote keycodes supported across BubbaFlix:

| Action / Button | Key Name | KeyCode | Description |
| :--- | :--- | :--- | :--- |
| **D-Pad Up** | `ArrowUp` | `19` / `38` | Spatial navigation up (2D sector rules) |
| **D-Pad Down** | `ArrowDown` | `20` / `40` | Spatial navigation down (2D sector rules) |
| **D-Pad Left** | `ArrowLeft` | `21` / `37` | Spatial navigation left (Same row / carousel traversal) |
| **D-Pad Right** | `ArrowRight` | `22` / `39` | Spatial navigation right (Same row / carousel traversal) |
| **Center / OK / Select** | `Enter` / `Select` | `13` / `23` / `66` | Launch poster, play stream, toggle play/pause |
| **Back Button** | `Escape` / `Back` | `4` / `27` / `10009` / `461` | Close video player or return to previous page |

---

## 🐳 Docker, Portainer, and CasaOS Environment Variables

Define configuration variables in `docker-compose.yml`, Portainer Stacks, or CasaOS app settings:

| Variable Name | Purpose | Example |
| :--- | :--- | :--- |
| `AIOSTREAMS_URL` | AIOStreams Addon Manifest URL | `https://aiostreams.elfhosted.com/` |
| `SIMKL_CLIENT_ID` | SIMKL API Client ID | `abcdef123456` |
| `GROQ_API_KEY` | Groq AI Stream Filter API Key | `gsk_...` |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 Read Access Token | `eyJhbGci...` |

Settings persist across container restarts using the Docker volume mapping: `bubbaflix-data:/app/server`.

---

## 📝 Comprehensive Logging Pipeline

BubbaFlix implements dual console and file volume logging:
- **`stdout` / `stderr`**: Captures real-time output for `docker logs bubbaflix` and Portainer.
- **`/app/server/bubbaflix.log`**: Persists formatted ISO 8601 logs to disk volume storage.

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
