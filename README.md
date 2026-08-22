<p align="center">
  <img src="public/icon.svg" alt="BubbaFlix Logo" width="180" />
</p>

# BubbaFlix 🎬 - Movie & TV Show Streaming & Discovery App

BubbaFlix is a modern, high-performance movie and TV show streaming discovery app built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, **Pure Node.js**, **Native Android TV (Kotlin)**, and integrated with **AIOStreams (ElfHosted + Premiumize)**, **TMDB**, **Groq AI**, and **SIMKL**.

BubbaFlix features **Direct AIOStreams Integration**, **Native Android TV & Fire TV App (`android-tv/`)**, **Universal Integrated Web Video Player across All Devices (Android TV, Firestick, Smart TVs, Desktop, Mobile)**, **Smart TV D-Pad 2D Spatial Grid Navigation with Row Wrapping**, **Official SIMKL API Rule Compliance & Activity Delta Sync**, **Groq AI Llama 3 Stream Title Filtering**, **Centralized Backend Server Settings API**, **Dual Console & Volume Log Persistence**, and automatic **English-only Live-Action Filtering (No Anime/Animation)**.

---

## 📲 Downloader App Quick Install

Install **BubbaFlix TV** directly on any Firestick, Fire TV, or Android TV device using the **Downloader** app:

> 🔥 **Downloader Code**: **`3996723`**

---

## 🌟 Key Features

### 📺 Native Android TV, Google TV & Fire TV App (`android-tv/`)
- **Downloader App Quick Install**: Enter code **`3996723`** in the Downloader app to install directly on your TV.
- **Native Android TV Launcher Banner**: Includes full Leanback launcher integration (`LEANBACK_LAUNCHER`) for Android TV, Google TV, Chromecast, Nvidia Shield, and Amazon Fire TV devices.
- **Hardware-Accelerated Embedded Player**: Native Kotlin wrapper tuned for 10ft TV displays with hardware acceleration and zero external player intent hijacking.
- **Server Discovery & Address Prompt**: Connects seamlessly to your local network server IP (e.g. `http://192.168.1.50:5150`).

### ⚡ AIOStreams (ElfHosted + Premiumize) Direct Streaming
- **Direct Addon Integration**: Powered by AIOStreams (ElfHosted) to fetch torrents and resolve direct Premiumize streams without client-side resolving.
- **Custom Addon Manifest URLs**: Configure your personal AIOStreams addon URL (with Premiumize & torrent indexers) in Settings or Docker environment variables.
- **Universal Integrated Web Player**: Android TV devices, Firestick, Smart TVs, desktop browsers, and mobile devices all use the built-in, zero-latency **BubbaFlix Web Video Player** (`VideoPlayerModal`), ensuring a unified streaming interface without external native app launches.

### 🎮 Smart TV Remote Control Spatial Navigation Engine
- **2D Spatial Sector Navigation**: Fully compatible with Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, and TV D-Pad remotes.
- **Grid Row Wrapping**: `ArrowRight` and `ArrowLeft` traverse cards smoothly on Explore Movies (`/explore/movie`), Explore TV Shows (`/explore/tv`), and Search Results with automatic row wrapping at grid edges.
- **Luminous 3D Focus Glow**: Focused items elevate (`transform: scale(1.08)`) with glowing outlines for clear 10ft TV viewing.

### 🤖 Groq AI Llama 3 Stream Title Classifier
- **Fast AI Inference**: Uses Groq AI (`llama3-8b-8192`) to classify torrent and stream titles, automatically filtering out adult content, music albums, software, and unrelated releases.

### 🎬 Official SIMKL API Compliance & Activity Delta Sync
- **Streamlined Client ID Integration**: Simplified SIMKL watch history tracking requiring ONLY your SIMKL Client ID.
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

- **Downloader App Code**: **`3996723`**
- **Manual APK File**: [`BubbaFlixTV.apk`](file:///f:/Cyberflix/BubbaFlixTV.apk)

To build the native Android TV APK manually:
```bash
cd android-tv
./gradlew.bat assembleDebug
```
See [`android-tv/README.md`](file:///f:/Cyberflix/android-tv/README.md) for step-by-step sideloading & installation guides.

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
