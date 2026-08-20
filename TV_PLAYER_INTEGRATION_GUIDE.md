# BubbaFlix 📺 - Smart TV & Native Player Integration Guide

This guide provides technical specifications, API endpoints, stream resolution logic, and remote control KeyCode mappings for developers building or integrating native TV client applications (Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, VLC, ExoPlayer, MX Player, etc.) with the **BubbaFlix Backend Engine**.

---

## 📋 Table of Contents

1. [Backend Server Architecture](#-backend-server-architecture)
2. [Real-Time Stream Transcoding API (`/api/transcode`)](#-real-time-stream-transcoding-api-apitranscode)
3. [Resolving Torrent Magnets to Stream URLs](#-resolving-torrent-magnets-to-stream-urls)
4. [Centralized Server Settings API (`/api/settings`)](#-centralized-server-settings-api-apisettings)
5. [SIMKL Watch Status Synchronization API](#-simkl-watch-status-synchronization-api)
6. [Smart TV D-Pad Remote Control KeyCode Reference](#-smart-tv-d-pad-remote-control-keycode-reference)
7. [Native Video Player Code Examples](#-native-video-player-code-examples)

---

## 🏗️ Backend Server Architecture

The BubbaFlix backend server runs on Express.js and FFmpeg (default port: `3000` or custom port via `TRANSCODER_PORT`). It serves three primary functions:

1. **On-the-Fly Video & Audio Transcoding**: Real-time conversion of MKV, x265, HEVC, and 5.1/7.1 audio into web/native-compatible H.264 + AAC stereo streams.
2. **Centralized Settings Storage**: Persists shared API keys and configuration across devices in `/app/server/settings.json`.
3. **SIMKL Sync Proxy**: Proxies watch history tracking calls to SIMKL API.

---

## 🍿 Real-Time Stream Transcoding API (`/api/transcode`)

### When to Transcode vs. Direct Stream

| Video / Audio Format | Action Required | Stream URL Format |
| :--- | :--- | :--- |
| **MP4 / x264 / AAC Stereo** | Direct Play | `https://...energycdn.com/.../movie.mp4` |
| **MKV (`.mkv`)** | Transcode via FFmpeg | `http://<SERVER_IP>:3000/api/transcode?url=<ENCODED_URL>` |
| **AVI (`.avi`)** | Transcode via FFmpeg | `http://<SERVER_IP>:3000/api/transcode?url=<ENCODED_URL>` |
| **x265 / HEVC / H.265** | Transcode via FFmpeg | `http://<SERVER_IP>:3000/api/transcode?url=<ENCODED_URL>` |
| **DTS / AC3 / EAC3 / 5.1 / 7.1 Audio** | Transcode via FFmpeg | `http://<SERVER_IP>:3000/api/transcode?url=<ENCODED_URL>` |

### Endpoint Details

- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:3000/api/transcode?url=<ENCODED_STREAM_URL>`
- **Content-Type**: `video/mp4`
- **Streaming Protocol**: Progressive MP4 fragmented stream (`frag_keyframe+empty_moov+default_base_moof`).

#### Example HTTP Request
```http
GET http://192.168.10.10:3000/api/transcode?url=https%3A%2F%2F3-cdn2-ovh-bea.energycdn.com%2Fcdn3sto%2Fsillymonkey-sto%2F6a85d899edd920.89161440%2F387149411%2F1787256889%2Fec55b35514847685d326c1550e2890d517f6ae23%2Fe2adc3a6eafc372d139c131582a666b407d8ec3dccd2d85e917df9213cafdf42%2FMutiny.2026.1080p.WEBRip.10Bit.DDP5.1.x265-NeoNoir.mkv HTTP/1.1
Host: 192.168.10.10:3000
```

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

### Response Payload
```json
{
  "status": "success",
  "filename": "Mutiny.2026.1080p.WEBRip.x265.mkv",
  "filesize": 2147483648,
  "content": [
    {
      "path": "Mutiny.2026.1080p.WEBRip.x265.mkv",
      "size": 2147483648,
      "link": "https://3-cdn2-ovh-bea.energycdn.com/.../Mutiny.mkv",
      "stream_link": "https://3-cdn2-ovh-bea.energycdn.com/.../Mutiny.mkv"
    }
  ]
}
```

---

## ⚙️ Centralized Server Settings API (`/api/settings`)

Native devices can read and write shared configuration settings directly to/from the BubbaFlix server.

### 1. Get Server Settings
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:3000/api/settings`
- **Response**:
```json
{
  "status": "success",
  "settings": {
    "theme": "dark-red",
    "simklClientId": "your_simkl_client_id",
    "simklToken": "your_simkl_access_token",
    "premiumizeKey": "your_premiumize_key",
    "groqKey": "gsk_...",
    "tmdbToken": "eyJhbGci...",
    "bitsearchKey": "your_bitsearch_key",
    "stream_resolutions": ["2160p", "1080p", "720p", "480p"],
    "stream_codecs": ["x265", "x264", "av1", "xvid"],
    "stream_exclude_low_quality": true
  }
}
```

### 2. Update Server Settings
- **HTTP Method**: `POST`
- **URL**: `http://<SERVER_IP>:3000/api/settings`
- **Headers**: `Content-Type: application/json`
- **Body**: Include key-value pairs to update.

### 3. Server Health Check
- **HTTP Method**: `GET`
- **URL**: `http://<SERVER_IP>:3000/api/transcode/health`
- **Response**: `{"status": "ok", "service": "BubbaFlix Backend Engine"}`

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

#### Movie Payload
```json
{
  "movies": [
    {
      "title": "Mutiny",
      "ids": { "tmdb": "1288445" }
    }
  ]
}
```

#### TV Episode Payload
```json
{
  "shows": [
    {
      "title": "Breaking Bad",
      "ids": { "tmdb": "1396" },
      "seasons": [
        {
          "number": 1,
          "episodes": [{ "number": 1 }]
        }
      ]
    }
  ]
}
```

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

fun playBubbaFlixStream(context: Context, rawStreamUrl: String, isFmpegNeeded: Boolean) {
    val serverIp = "http://192.168.10.10:3000"
    val targetUrl = if (isFmpegNeeded) {
        "$serverIp/api/transcode?url=${URLEncoder.encode(rawStreamUrl, "UTF-8")}"
    } else {
        rawStreamUrl
    }

    val player = ExoPlayer.Builder(context).build()
    val mediaItem = MediaItem.fromUri(targetUrl)
    player.setMediaItem(mediaItem)
    player.prepare()
    player.play()
}
```

### 2. External Player Intent (Android TV - VLC / MX Player)
```kotlin
fun launchVlcPlayer(context: Context, transcodeStreamUrl: String) {
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(Uri.parse(transcodeStreamUrl), "video/mp4")
        setPackage("org.videolan.vlc") // Or "com.mxtech.videoplayer.ad"
    }
    context.startActivity(intent)
}
```

### 3. iOS / Apple TV AVPlayer (Swift)
```swift
import AVKit

func playStream(rawUrl: String, needsTranscode: Bool) {
    let serverBase = "http://192.168.10.10:3000"
    let finalUrlString = needsTranscode 
        ? "\(serverBase)/api/transcode?url=\(rawUrl.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")"
        : rawUrl

    guard let url = URL(string: finalUrlString) else { return }
    let player = AVPlayer(url: url)
    let controller = AVPlayerViewController()
    controller.player = player
    
    present(controller, animated: true) {
        player.play()
    }
}
```

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
