<p align="center">
  <img src="public/icon.svg" alt="BubbaFlix Logo" width="180" />
</p>

# BubbaFlix 🎬 - Movie & TV Show Streaming & Discovery App (v1.0.0)

BubbaFlix is a modern, high-performance movie and TV show streaming discovery platform built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, **Pure Node.js**, **Native Android TV (Kotlin / ExoPlayer)**, and integrated with **AIOStreams (ElfHosted + Premiumize)**, **TMDB**, **Groq AI**, and **SIMKL**.

BubbaFlix features **⭐ Favorites Section & Star Toggle Persistence**, **Native Android TV App (`android-tv/`) with ExoPlayer 5-Minute Ahead-Buffering**, **Automatic Web Audio Transcoder (AC3/EAC3/DTS → AAC)**, **Unlocked Smart TV D-Pad Spatial Navigation with Top-Left Poster Auto-Focus**, **Canonical OTA Version Updates (`version.json`)**, **Groq AI Llama 3 Stream Title Filtering**, **Official SIMKL Watch History Sync**, and **Centralized Backend Transcoder Proxy**.

---

## 📲 Downloader App Quick Install

Install **BubbaFlix TV** directly on any Firestick, Fire TV, or Android TV device using the **Downloader** app:

> 🔥 **Downloader Code**: **`7862216`**
> 
> 🔗 **Direct APK URL**: `https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/BubbaFlixTV.apk`

---

## 🌟 Key Features

### 📺 Native Android TV, Google TV & Fire TV App (`android-tv/`)
- **Downloader Quick Install**: Enter code **`7862216`** in the Downloader app to install `BubbaFlixTV.apk` directly on your TV.
- **5-Minute Ahead-Buffering Engine**: ExoPlayer (`PlayerActivity.kt`) buffers up to 300 seconds (5 minutes) ahead with `DefaultLoadControl` to eliminate micro-stutters and video freezing on high-bitrate 4K / 1080p streams.
- **Canonical OTA Update Checker**: Automatically checks `version.json` on app launch and prompts the user with an interactive Yes/No update dialog.
- **Native Android TV Launcher Banner**: Includes full Leanback launcher integration (`LEANBACK_LAUNCHER`) for Android TV, Google TV, Chromecast, Nvidia Shield, and Amazon Fire TV devices.
- **Signed Production Keystore (`bubbaflix.jks`)**: Signed with V1 and V2 signatures for instant, seamless package installation on all Android TV versions.

### ⭐ Favorites Section & Persistence
- **Dedicated Favorites Page (`/favorites`)**: View all saved favorite movies and TV series in one centralized location with filter tabs (**All**, **Movies**, **TV Series**).
- **Details Screen Star Toggle (`FavoriteStar`)**: Toggle items in and out of Favorites directly from their details screen with instant visual feedback and Toast notices.
- **Top Menu Bar Position**: Positioned prominently in the top navigation bar right between **Home** and **Movies**:
  `Home` → `⭐ Favorites` → `Movies` → `TV Series` → `Settings`

### 🔊 Automatic Web Audio Transcoder & Nginx Engine
- **Universal Audio Codec Transcoding**: Web browsers lack native decoders for AC3 (Dolby Digital), EAC3 (Dolby Digital Plus), TrueHD, and DTS audio tracks. The backend FFmpeg engine (`/api/transcode`) automatically converts unsupported audio into standard stereo AAC (`-c:a aac -b:a 192k -ac 2`), guaranteeing clear, loud audio across all web browsers.
- **2-Stage Fail-Safe Fallback**: `VideoPlayerModal` attempts instant direct HTTP playback first, and automatically retries via `/api/transcode?url=...` in the background if a browser decoding error occurs.
- **Nginx Transcoder Proxy**: Pre-configured in `nginx.conf` (`proxy_pass http://127.0.0.1:5000;`) for unbuffered real-time video/audio streaming.

### 🕹️ Unlocked D-Pad Spatial Navigation & Top-Left Poster Auto-Focus
- **Top-Left Poster Auto-Focus**: On page load or route change, initial D-Pad focus automatically targets **the top-left poster card** (`.movieCard`, `.posterBlock`, `.carouselItem`).
- **Section-Transition Vertical Navigation**: Moving **`ArrowDown`** transitions smoothly to lower carousel rows, while moving **`ArrowUp`** transitions to upper rows and into the **Top Navigation Bar**.
- **Non-Navigable Top Logo**: Logo image is excluded from D-Pad focus loop since the **Home** button handles home navigation.

### ⚡ AIOStreams (ElfHosted + Premiumize) Direct Streaming
- **Direct Addon Integration**: Powered by AIOStreams (ElfHosted) to fetch torrents and resolve direct Premiumize streams without client-side resolving.
- **Custom Addon Manifest URLs**: Pre-configure your personal AIOStreams addon URL in Settings or Docker environment variables.

### 🤖 Groq AI Llama 3 Stream Title Classifier
- **Fast AI Inference**: Uses Groq AI (`llama3-8b-8192`) to classify stream titles, automatically filtering out adult content, software, and unrelated releases.

### 🎬 Official SIMKL API Compliance & Watch History Sync
- **Official API Rules Compliant**: Fully compliant with SIMKL API rules (`client_id`, `app-name=BubbaFlix`, `app-version=1.0`, `User-Agent: BubbaFlix/1.0 (Smart TV Media App)`).

---

## ⚙️ Docker / Portainer / CasaOS Environment Variables

Pre-configure your API credentials directly in `docker-compose.yml`, Portainer Stacks, or CasaOS container settings:

| Environment Variable | Description | Default Value |
| :--- | :--- | :--- |
| `AIOSTREAMS_URL` | AIOStreams Addon Manifest URL | `https://aiostreams.elfhosted.com/` |
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
