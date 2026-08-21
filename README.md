<p align="center">
  <img src="public/icon.svg" alt="BubbaFlix Logo" width="180" />
</p>

# BubbaFlix 🎬 - Movie & TV Show Streaming & Discovery App

BubbaFlix is a modern, high-performance movie and TV show streaming discovery app built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, **Express**, and integrated with **AIOStreams (ElfHosted)**, **TMDB**, **Groq AI**, and **SIMKL**.

BubbaFlix features **Direct AIOStreams (ElfHosted + Premiumize) Integration**, **Android TV & Smart TV D-Pad Spatial Navigation with Horizontal Boundary Locks**, **Zero Transcoding Native Playback**, **Official SIMKL API Rule Compliance & Activity Sync**, **Centralized Backend Server Settings Storage**, **Client-Side TV Screen Zoom (50%–140%)**, and automatic **English-only Live-Action Filtering (No Anime/Animation)**.

---

## 🌟 Key Features

### ⚡ AIOStreams (ElfHosted + Premiumize) Direct Streaming
- **Direct Addon Integration**: Powered by AIOStreams (ElfHosted) to fetch torrents and resolve direct Premiumize streams without client-side resolving.
- **Custom Addon Manifest URLs**: Configure your personal AIOStreams addon URL (with Premiumize & torrent indexers) in Settings or Docker environment variables.
- **Zero Transcode Latency**: Stream links play directly in native device players or the full-screen player modal with zero server CPU load.

### 🎬 Official SIMKL API Compliance & Activity Delta Sync
- **Streamlined Client ID Integration**: Simplified SIMKL watch history tracking requiring ONLY your SIMKL Client ID.
- **Official API Rules Compliant**: Fully compliant with SIMKL API rules (`client_id`, `app-name=BubbaFlix`, `app-version=1.0`, `User-Agent: BubbaFlix/1.0 (Smart TV Media App)`).
- **Phase 2 Activity Check First**: Always queries `/sync/activities` first on startup/wake, skipping payload sync if activity dates match.
- **Phase 2 Combined Delta Sync**: Uses `/sync/all-items/?date_from=SAVED_DATE` to fetch only updated items.

### 📺 Smart TV & Remote Control Spatial Navigation
- **Native Smart TV Remote D-Pad Navigation**: Fully compatible with Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, and TV browser D-Pad remotes (`Arrow Keys`, `OK / Select (KeyCodes 13, 23, 66)`, `Back (KeyCodes 4, 27, 10009, 461)`).
- **Universal 3D "Bring Forward" Focus Effect**: All focusable elements elevate forward (`transform: scale(1.14) translateY(-6px)`) with dynamic depth drop-shadows and vibrant active theme glows.
- **Strict Horizontal Boundary Locking**: Left and Right D-Pad arrow keys are locked within the active horizontal row/carousel container (`vertical diff <= 80px`), preventing focus from jumping into the Hero section or header bar unless the user explicitly presses **Up Arrow**.

---

## ⚙️ Docker / Portainer / CasaOS Environment Variables

Pre-configure your API credentials directly in `docker-compose.yml`, Portainer Stacks, or CasaOS container settings:

| Environment Variable | Description | Default Value |
| :--- | :--- | :--- |
| `AIOSTREAMS_URL` | AIOStreams Addon Manifest URL | `https://aiostreams.elfhosted.com/` |
| `SIMKL_CLIENT_ID` | SIMKL API Client ID | `""` |
| `GROQ_API_KEY` | Groq AI Stream Filter API Key | `""` |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 Read Access Token | Built-in fallback |

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
