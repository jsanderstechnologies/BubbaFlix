# BubbaFlix 📺 - Smart TV & Native Player Integration Guide

This guide provides technical specifications, API endpoints, web-compatible stream resolution logic, environment variable configuration for Docker/Portainer/CasaOS, and remote control KeyCode mappings for developers building or integrating native TV client applications (Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, VLC, ExoPlayer, MX Player, etc.) with the **BubbaFlix Backend Engine**.

---

## 📋 Table of Contents

1. [Backend Server Architecture](#-backend-server-architecture)
2. [Web-Compatible Stream Filtering](#-web-compatible-stream-filtering)
3. [Docker, Portainer, and CasaOS Environment Variables](#-docker-portainer-and-casaos-environment-variables)
4. [Resolving Torrent Magnets to Stream URLs](#-resolving-torrent-magnets-to-stream-urls)
5. [Centralized Server Settings API (`/api/settings`)](#-centralized-server-settings-api-apisettings)
6. [SIMKL Watch Status Synchronization API](#-simkl-watch-status-synchronization-api)
7. [Smart TV D-Pad Remote Control KeyCode Reference](#-smart-tv-d-pad-remote-control-keycode-reference)
8. [Native Video Player Code Examples](#-native-video-player-code-examples)

---

## 🏗️ Backend Server Architecture

The BubbaFlix backend server runs on Express.js (default port: `3000` or custom port via `TRANSCODER_PORT`). It serves two primary functions:

1. **Centralized Settings Storage**: Persists shared API keys and configuration across devices in `/app/server/settings.json`.
2. **SIMKL Sync Proxy**: Proxies watch history tracking calls to SIMKL API.

---

## 🍿 Web-Compatible Stream Filtering

BubbaFlix pre-filters all magnet stream results (`src/utils/bitsearch.js`) to return ONLY natively playable x264/H.264 MP4 streams with AAC audio, ensuring direct playback in HTML5 web players and Smart TV browsers without needing backend transcoding.

### Web Format Filtering Rules

| Format Type | Status | Action |
| :--- | :--- | :--- |
| **MP4 / x264 / H.264 / AAC** | Supported | Included in Available Streams |
| **MKV (`.mkv`) / AVI (`.avi`)** | Excluded | Filtered out from stream results |
| **x265 / HEVC / H.265 / AV1 / XviD** | Excluded | Filtered out from stream results |
| **DTS / AC3 / EAC3 / TrueHD / Atmos / 5.1 / 7.1** | Excluded | Filtered out from stream results |

---

## 🐳 Docker, Portainer, and CasaOS Environment Variables

Define API keys via environment variables in `docker-compose.yml`, Portainer Stacks, or CasaOS app settings:

| Variable Name | Purpose | Example |
| :--- | :--- | :--- |
| `SIMKL_CLIENT_ID` | SIMKL API Client ID | `abcdef123456` |
| `SIMKL_ACCESS_TOKEN` | SIMKL User Access Token | `token_xyz` |
| `PREMIUMIZE_API_KEY` | Premiumize.me API Key | `prem_key_123` |
| `GROQ_API_KEY` | Groq AI Stream Filter API Key | `gsk_...` |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 Read Access Token | `eyJhbGci...` |
| `BITSEARCH_API_KEY` | Bitsearch API Key | `bit_key_123` |

Settings persist across container restarts and redeployments using the Docker volume mapping: `bubbaflix-data:/app/server`.

---

## 🧲 Resolving Torrent Magnets to Stream URLs

Native TV applications use the Premiumize API to convert magnet links into direct HTTP stream URLs:

### Endpoint
- **HTTP Method**: `POST`
- **URL**: `https://www.premiumize.me/api/transfer/directdl`
- **Headers**: `Content-Type: application/x-www-form-urlencoded`
- **Body Parameters**:
  - `src`: `<MAGNET_LINK>`
  - `apikey`: `<PREMIUMIZE_API_KEY>`

---

## ⚙️ Centralized Server Settings API (`/api/settings`)

Native devices can read and write shared configuration settings directly to/from the BubbaFlix server.

### 1. Get Server Settings
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:3000/api/settings`

### 2. Update Server Settings
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:3000/api/settings`

### 3. Server Health Check
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:3000/api/transcode/health`

---

## 🎬 SIMKL Watch Status Synchronization API

To keep watch status in sync when a native player starts or finishes video playback:

### Mark Media as Watched
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:3000/api/simkl/sync/history` (or `https://api.simkl.com/sync/history`)
- **Headers**:
  - `simkl-api-key: <SIMKL_CLIENT_ID>`
  - `Authorization: Bearer <SIMKL_USER_ACCESS_TOKEN>`
  - `Content-Type: application/json`

---

## 🎮 Smart TV D-Pad Remote Control KeyCode Reference

Native Android TV, Google TV, Firestick, Apple TV, and Smart TV remote keycodes supported across BubbaFlix:

| Action / Button | Key Name | KeyCode | Description |
| :--- | :--- | :--- | :--- |
| **D-Pad Up** | `ArrowUp` | `19` / `38` | Spatial navigation up |
| **D-Pad Down** | `ArrowDown` | `20` / `40` | Spatial navigation down |
| **D-Pad Left** | `ArrowLeft` | `21` / `37` | Spatial navigation left / Seek -10s in player |
| **D-Pad Right** | `ArrowRight` | `22` / `39` | Spatial navigation right / Seek +10s in player |
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
