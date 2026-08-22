<p align="center">
  <img src="public/icon.svg" alt="BubbaFlix Logo" width="180" />
</p>

# BubbaFlix 🎬 - Movie & TV Show Streaming & Discovery App

BubbaFlix is a modern, high-performance movie and TV show streaming discovery app built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, **Pure Node.js**, and integrated with **AIOStreams (ElfHosted + Premiumize)**, **TMDB**, **Groq AI**, and **SIMKL**.

BubbaFlix features **Direct AIOStreams Integration**, **Universal Integrated Web Video Player across All Devices (Android TV, Firestick, Smart TVs, Desktop, Mobile)**, **Smart TV D-Pad 2D Spatial Grid Navigation with Row Wrapping**, **Official SIMKL API Rule Compliance & Activity Delta Sync**, **Groq AI Llama 3 Stream Title Filtering**, **Centralized Backend Server Settings API**, **Dual Console & Volume Log Persistence**, and automatic **English-only Live-Action Filtering (No Anime/Animation)**.

---

## 🌟 Key Features

### ⚡ AIOStreams (ElfHosted + Premiumize) Direct Streaming
- **Direct Addon Integration**: Powered by AIOStreams (ElfHosted) to fetch torrents and resolve direct Premiumize streams without client-side resolving.
- **Custom Addon Manifest URLs**: Configure your personal AIOStreams addon URL (with Premiumize & torrent indexers) in Settings or Docker environment variables.
- **Universal Integrated Web Player**: Android TV devices, Firestick, Smart TVs, desktop browsers, and mobile devices all use the built-in, zero-latency **BubbaFlix Web Video Player** (`VideoPlayerModal`), ensuring a unified streaming interface without external native app launches or intent hijacking.

### 📺 Universal Web Video Player & Remote Controls
- **100% Viewport Overlay**: Fullscreen video overlay rendered cleanly across all browsers and Android TV WebViews without intent pickers.
- **TMDB Transparent Title Logos**: Renders transparent title artwork overlay in the upper-left player header fetched from TMDB's CDN.
- **OpenSubtitles Integration**: Search and download gzipped WebVTT subtitle tracks on the fly.
- **D-Pad Remote Controls**: Complete remote navigation for `-30s`, `-10s`, `Play/Pause`, `+10s`, `+30s` transport controls, scrubber timeline, and subtitle menus.

### 🎮 Smart TV Remote Control Spatial Navigation Engine
- **2D Spatial Sector Navigation**: Fully compatible with Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, and TV D-Pad remotes.
- **Grid Row Wrapping**: `ArrowRight` and `ArrowLeft` traverse cards smoothly on Explore Movies (`/explore/movie`), Explore TV Shows (`/explore/tv`), and Search Results with automatic row wrapping at grid edges.
- **Luminous 3D Focus Glow**: Focused items elevate (`transform: scale(1.08)`) with glowing outlines for clear 10ft TV viewing.

### 🤖 Groq AI Llama 3 Stream Title Classifier
- **Fast AI Inference**: Uses Groq AI (`llama3-8b-8192`) to classify torrent and stream titles, automatically filtering out adult content, music albums, software, and unrelated releases.

### 🎬 Official SIMKL API Compliance & Activity Delta Sync
- **Streamlined Client ID Integration**: Simplified SIMKL watch history tracking requiring ONLY your SIMKL Client ID.
- **Official API Rules Compliant**: Fully compliant with SIMKL API rules (`client_id`, `app-name=BubbaFlix`, `app-version=1.0`, `User-Agent: BubbaFlix/1.0 (Smart TV Media App)`).
- **Phase 2 Activity Check First**: Always queries `/sync/activities` first on startup/wake, skipping payload sync if activity dates match.
- **Phase 2 Combined Delta Sync**: Uses `/sync/all-items/?date_from=SAVED_DATE` to fetch only updated items.

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

## 📝 Comprehensive Logging System

BubbaFlix features a dual-output logging pipeline:
- **Container Standard Output (`stdout`/`stderr`)**: Logs HTTP API requests, settings updates, and system health in real-time for `docker logs bubbaflix` and Portainer monitoring.
- **Persistent Disk Volume (`/app/server/bubbaflix.log`)**: Appends formatted ISO 8601 logs to disk volume storage across container restarts.

---

## 🚀 Quick Start (Local Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jsanderstechnologies/BubbaFlix.git
   cd BubbaFlix
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🐳 Docker Deployment

Run BubbaFlix containerized:
```bash
docker compose up -d
```
Access the application at **`http://localhost:5150`**.

---

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
