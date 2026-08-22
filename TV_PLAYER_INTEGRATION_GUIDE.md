# BubbaFlix 📺 - Smart TV & Web Player Integration Guide

This guide provides technical specifications, API endpoints, device-aware stream resolution logic, environment variable configuration for Docker/Portainer/CasaOS, and remote control KeyCode mappings for developers running **BubbaFlix** across Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, desktop browsers, and mobile devices.

All devices exclusively use the unified **BubbaFlix Web Video Player** (`VideoPlayerModal`) built directly into the web application. External native player apps (VLC, MX Player, ExoPlayer intents) are completely bypassed in favor of the seamless, full-screen Web Player.

---

## 📋 Table of Contents

1. [Backend Server Architecture](#-backend-server-architecture)
2. [AIOStreams Integration (ElfHosted + Premiumize)](#-aiostreams-integration-elfhosted--premiumize)
3. [Docker, Portainer, and CasaOS Environment Variables](#-docker-portainer-and-casaos-environment-variables)
4. [Centralized Server Settings API (`/api/settings`)](#-centralized-server-settings-api-apisettings)
5. [SIMKL Watch Status Synchronization API](#-simkl-watch-status-synchronization-api)
6. [Smart TV D-Pad Remote Control KeyCode Reference](#-smart-tv-d-pad-remote-control-keycode-reference)
7. [Universal Web Video Player Architecture](#-universal-web-video-player-architecture)

---

## 🏗️ Backend Server Architecture

The BubbaFlix backend server runs on Node.js (internal port: `5000`, external mapped port: `5150`). It serves two primary functions:

1. **Centralized Settings Storage**: Persists shared API keys, AIOStreams URL, and configuration across devices in `/app/server/settings.json`.
2. **SIMKL Sync Proxy**: Proxies watch history tracking calls to SIMKL API.

---

## ⚡ AIOStreams Integration (ElfHosted + Premiumize)

BubbaFlix integrates with AIOStreams (ElfHosted + Premiumize) to fetch torrent streams and resolve direct playback URLs:

### Endpoints
- **Movie Streams**: `GET <AIO_MANIFEST_URL>/stream/movie/<IMDB_ID_OR_TMDB_ID>.json`
- **TV Series Streams**: `GET <AIO_MANIFEST_URL>/stream/series/<IMDB_ID_OR_TMDB_ID>:<SEASON>:<EPISODE>.json`

---

## 🐳 Docker, Portainer, and CasaOS Environment Variables

Define configuration variables in `docker-compose.yml`, Portainer Stacks, or CasaOS app settings:

| Variable Name | Purpose | Example |
| :--- | :--- | :--- |
| `AIOSTREAMS_URL` | AIOStreams Addon Manifest URL | `https://aiostreams.elfhosted.com/` |
| `SIMKL_CLIENT_ID` | SIMKL API Client ID | `abcdef123456` |
| `GROQ_API_KEY` | Groq AI Stream Filter API Key | `gsk_...` |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 Read Access Token | `eyJhbGci...` |

Settings persist across container restarts and redeployments using the Docker volume mapping: `bubbaflix-data:/app/server`. Default external container port is **5150**.

---

## ⚙️ Centralized Server Settings API (`/api/settings`)

Native devices can read and write shared configuration settings directly to/from the BubbaFlix server.

### 1. Get Server Settings
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:5150/api/settings`

### 2. Update Server Settings
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:5150/api/settings`

### 3. Server Health Check
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:5150/api/transcode/health`

---

## 🎬 SIMKL Watch Status Synchronization API

To keep watch status in sync when a player starts or finishes video playback:

### Mark Media as Watched
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:5150/api/simkl/sync/history?client_id=<SIMKL_CLIENT_ID>&app-name=BubbaFlix&app-version=1.0`
- **Headers**:
  - `simkl-api-key: <SIMKL_CLIENT_ID>`
  - `User-Agent: BubbaFlix/1.0 (Smart TV Media App)`
  - `Content-Type: application/json`

---

## 🎮 Smart TV D-Pad Remote Control KeyCode Reference

Native Android TV, Google TV, Firestick, Apple TV, and Smart TV remote keycodes supported across BubbaFlix:

| Action / Button | Key Name | KeyCode | Description |
| :--- | :--- | :--- | :--- |
| **D-Pad Up** | `ArrowUp` | `19` / `38` | Spatial navigation up |
| **D-Pad Down** | `ArrowDown` | `20` / `40` | Spatial navigation down |
| **D-Pad Left** | `ArrowLeft` | `21` / `37` | Spatial navigation left |
| **D-Pad Right** | `ArrowRight` | `22` / `39` | Spatial navigation right |
| **Center / OK / Select** | `Enter` / `Select` | `13` / `23` / `66` | Launch poster, play stream, toggle play/pause |
| **Back Button** | `Escape` / `Back` | `4` / `27` / `10009` / `461` | Close video player or return to previous page |

---

## 📺 Universal Web Video Player Architecture

All devices (Android TV, Firestick, Smart TVs, desktop, mobile) use the integrated **BubbaFlix Web Video Player** (`VideoPlayerModal`).

Features:
- **Full-Screen Auto Launch**: Automatically triggers browser full-screen mode upon stream start.
- **TMDB Title Logo**: Displays transparent title logo overlay in top-left control header.
- **OpenSubtitles Integration**: Search and load `.vtt` subtitles on the fly.
- **D-Pad Remote Spatial Controls**: Complete spatial navigation across all transport buttons (`-30s`, `-10s`, `Play/Pause`, `+10s`, `+30s`), timeline scrubber, and subtitle options.

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
