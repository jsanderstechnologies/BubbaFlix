# BubbaFlix 📺 - Smart TV & Native Player Integration Guide

This guide provides technical specifications, API endpoints, device-aware stream resolution logic, environment variable configuration for Docker/Portainer/CasaOS, and remote control KeyCode mappings for developers building or integrating native TV client applications (Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, VLC, ExoPlayer, MX Player, etc.) with the **BubbaFlix Backend Engine**.

---

## 📋 Table of Contents

1. [Backend Server Architecture](#-backend-server-architecture)
2. [AIOStreams Integration (ElfHosted + Premiumize)](#-aiostreams-integration-elfhosted--premiumize)
3. [Docker, Portainer, and CasaOS Environment Variables](#-docker-portainer-and-casaos-environment-variables)
4. [Centralized Server Settings API (`/api/settings`)](#-centralized-server-settings-api-apisettings)
5. [SIMKL Watch Status Synchronization API](#-simkl-watch-status-synchronization-api)
6. [Smart TV D-Pad Remote Control KeyCode Reference & Boundary Lock](#-smart-tv-d-pad-remote-control-keycode-reference--boundary-lock)
7. [Native Video Player Code Examples](#-native-video-player-code-examples)

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

To keep watch status in sync when a native player starts or finishes video playback:

### Mark Media as Watched
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:5150/api/simkl/sync/history?client_id=<SIMKL_CLIENT_ID>&app-name=BubbaFlix&app-version=1.0`
- **Headers**:
  - `simkl-api-key: <SIMKL_CLIENT_ID>`
  - `User-Agent: BubbaFlix/1.0 (Smart TV Media App)`
  - `Content-Type: application/json`

---

## 🎮 Smart TV D-Pad Remote Control KeyCode Reference & Boundary Lock

Native Android TV, Google TV, Firestick, Apple TV, and Smart TV remote keycodes supported across BubbaFlix:

| Action / Button | Key Name | KeyCode | Description |
| :--- | :--- | :--- | :--- |
| **D-Pad Up** | `ArrowUp` | `19` / `38` | Spatial navigation up (Transitions between rows, Hero section, and Header) |
| **D-Pad Down** | `ArrowDown` | `20` / `40` | Spatial navigation down (Transitions to lower rows) |
| **D-Pad Left** | `ArrowLeft` | `21` / `37` | Spatial navigation left (Locked to same-row items, `vertical diff <= 80px`) |
| **D-Pad Right** | `ArrowRight` | `22` / `39` | Spatial navigation right (Locked to same-row items, `vertical diff <= 80px`) |
| **Center / OK / Select** | `Enter` / `Select` | `13` / `23` / `66` | Launch poster, play stream, toggle play/pause |
| **Back Button** | `Escape` / `Back` | `4` / `27` / `10009` / `461` | Close video player or return to previous page |

---

## 📱 Native Video Player Code Examples

### 1. Android ExoPlayer (Kotlin)
```kotlin
import com.google.android.exoplayer2.ExoPlayer
import com.google.android.exoplayer2.MediaItem

fun playBubbaFlixStream(context: Context, streamUrl: String) {
    val player = ExoPlayer.Builder(context).build()
    val mediaItem = MediaItem.fromUri(streamUrl)
    player.setMediaItem(mediaItem)
    player.prepare()
    player.play()
}
```

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
