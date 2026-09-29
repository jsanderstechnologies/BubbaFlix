<p align="center">
  <img src="public/tv_banner.png" alt="BubbaFlix Logo" width="280" />
</p>

# BubbaFlix 🎬 - Movie & TV Show Streaming & Discovery App (v1.0.16)

BubbaFlix is a modern, high-performance movie and TV show streaming discovery platform built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, **Pure Node.js**, **Native Android TV (Kotlin / ExoPlayer)**, **Torrent Stream Scraper & Premiumize Debrid**, **TMDB**, **Groq AI**, and **SIMKL**.

BubbaFlix features **🎯 Navigation Focus Retention & Non-Poster Page Auto-Focus (v1.0.16)**, **🎬 YouTube Trailer Embed Bot Bypass & TV D-Pad Focus Release (v1.0.16)**, **📺 ExoPlayer Smart Back Control Flow (v1.0.16)**, **🎭 Refined Actor Search & Filmography Engine**, **⚡ Android TV Local Poster & Metadata Caching (`WebSettings.LOAD_DEFAULT`)**, **📦 Stream Droplist Category & Layout Manager Container Cards**, **⚡ Server-Side TMDB & Explore Metadata Caching Engine (`/api/tmdb/*`, `/api/explore/*`)**, **🔍 Dedicated Interactive Search Page (`/search`)**, **⭐ Favorites Section & Star Toggle Persistence**, **Native Android TV App (`android-tv/`) with ExoPlayer 5-Minute Ahead-Buffering & Automatic Server Settings Inheritance**, **Automatic Web Audio Transcoder (AC3/EAC3/DTS → AAC) with FFprobe Multi-Language Audio Extraction**, **Customizable & Syncable Home Screen Layouts**, **Unlocked Smart TV D-Pad Spatial Navigation with Focus Retention**, **Canonical OTA Version Updates (`version.json`)**, **Groq AI Llama 3 Stream Title Filtering**, **Official SIMKL Watch History Sync**, and **Centralized Backend Transcoder Proxy**.

---

## 📲 Downloader App Quick Install

Install **BubbaFlix TV** directly on any Firestick, Fire TV, or Android TV device using the **Downloader** app:

> 🔥 **Downloader Code**: **`7862216`**
> 
> 🔗 **Direct APK URL**: `https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/BubbaFlixTV.apk`

---

## 🌟 Key Features

### ⚡ Android TV Local Poster & Metadata Caching (`v1.0.15`)
- **Native Device HTTP Caching**: Android TV client uses `WebSettings.LOAD_DEFAULT` to store TMDB poster images and JSON metadata directly on device disk storage.
- **Fast Load Times & Reduced Bandwidth**: Images persist with long-term 1-year TTL and metadata responses persist with 1-hour TTL, matching backend server retention policies.

### 🎭 Refined Actor Search & Filmography Engine (`v1.0.15`)
- **Actor Query Classification**: Searching for an actor (e.g. *"John Wayne"*, *"Clint Eastwood"*, *"Tom Hanks"*) automatically resolves their exact TMDB profile and loads their complete filmography (`/person/{id}/combined_credits`).
- **Strict Multi-Token Person Filtering**: When searching actor names, person entries are strictly required to match **all** query tokens (e.g. both *"John"* and *"Wayne"*), filtering out unrelated single-token names like *"John Smith"* or *"Wayne Brady"*.
- **Filmography Categorization & Deduplication**: Filmography results are deduplicated by ID and sorted into **Feature Movies**, **TV Series**, and **Documentaries & Specials**.

### 📦 Stream Dropdown & Layout Manager Container Cards (`v1.0.15`)
- **Initial Closed State**: Streams dropdown on details pages starts out closed with real-time count badges (*{count} Streams Found*, *Searching...*, *0 Streams Found*, *Setup Required*).
- **Category & Layout Manager Styling**: Stream results are rendered in dedicated card containers matching the Settings Category & Layout Manager card style.
- **Theme Variable Controls**: Dynamic app theme colors (`var(--pink)`, `var(--gradient)`, `var(--black3)`) with D-pad TV focus and hover glow states.

### 🌐 Server-Side Explore & TMDB Metadata Proxy (`/api/explore/*`, `/api/tmdb/*`)
- **High-Volume Explore Pages**: Movies and TV Shows explore pages load extended items served and cached directly by the backend server.
- **Persistent Disk & RAM Cache**: Fast responses with background caching for popular titles, genres, and trending categories.

### 🔍 Dedicated Interactive Search Page (`/search`)
- **Interactive Search Page**: Standalone menu item and dedicated route (`/search`) with a large, auto-focused D-Pad input bar.
- **Category Filter Chips**: 1-click filter between **All Results**, **Movies Only**, and **TV Series Only**.
- **Popular Search Suggestions**: 1-click search tags (*Action*, *Comedy*, *Marvel*, *Sci-Fi*, *Horror*, *Drama*, *Animation*, *Thriller*).
- **Focus Retention**: Spatial D-Pad navigation retains input focus while typing until you explicitly press Down to browse the results grid.

### 📺 Native Android TV, Google TV & Fire TV App (`android-tv/`)
- **Downloader Quick Install**: Enter code **`7862216`** in the Downloader app to install `BubbaFlixTV.apk` directly on your TV.
- **Single Clean Build Name**: Builds directly to `BubbaFlixTV.apk` without cumbersome version suffixes.
- **5-Minute Ahead-Buffering Engine**: ExoPlayer (`PlayerActivity.kt`) buffers up to 300 seconds (5 minutes) ahead with `DefaultLoadControl` to eliminate micro-stutters and video freezing on high-bitrate 4K / 1080p streams.
- **Canonical OTA Update Checker**: Automatically checks `version.json` on app launch and prompts the user with an interactive update notification.
- **Native Android TV Launcher Banner**: Includes full Leanback launcher integration (`LEANBACK_LAUNCHER`) for Android TV, Google TV, Chromecast, Nvidia Shield, and Amazon Fire TV devices.

### ⭐ Favorites Section & Persistence
- **Dedicated Favorites Page (`/favorites`)**: View all saved favorite movies and TV series in one centralized location with filter tabs (**All**, **Movies**, **TV Series**).
- **Details Screen Star Toggle (`FavoriteStar`)**: Toggle items in and out of Favorites directly from their details screen with instant visual feedback.

### 🔊 Automatic Web Audio Transcoder & Nginx Engine
- **Universal Audio Codec Transcoding**: Web browsers lack native decoders for AC3 (Dolby Digital), EAC3 (Dolby Digital Plus), TrueHD, and DTS audio tracks. The backend FFmpeg engine (`/api/transcode`) automatically converts unsupported audio into standard stereo AAC (`-c:a aac -b:a 192k -ac 2`), guaranteeing clear, loud audio across all web browsers.
- **Nginx Transcoder Proxy**: Pre-configured in `nginx.conf` (`proxy_pass http://127.0.0.1:5000;`) for unbuffered real-time video/audio streaming.

---

## ⚙️ Docker / Portainer / CasaOS Environment Variables

Pre-configure your API credentials directly in `docker-compose.yml`, Portainer Stacks, or CasaOS container settings:

| Environment Variable | Description | Default Value |
| :--- | :--- | :--- |
| `PREMIUMIZE_API_KEY` | Premiumize Debrid API Key | `""` |
| `SIMKL_CLIENT_ID` | SIMKL API Client ID | `""` |
| `GROQ_API_KEY` | Groq AI Stream Filter API Key | `""` |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 Read Access Token | Built-in fallback |

Settings persist across container restarts using the Docker volume mapping: `bubbaflix-data:/app/server`.

---

## 📱 Android TV APK Build & Deployment

- **Downloader App Code**: **`7862216`**
- **Canonical APK Download**: [`BubbaFlixTV.apk`](https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/BubbaFlixTV.apk)
- **Version Check JSON**: [`version.json`](https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/version.json)

To build the native Android TV APK manually:
```bash
cd android-tv
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleRelease
```
See [`android-tv/README.md`](file:///f:/Cyberflix/android-tv/README.md) for step-by-step sideloading & installation guides.

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
