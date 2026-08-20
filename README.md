<p align="center">
  <img src="public/logo.svg" alt="BubbaFlix Logo" width="240" />
</p>

# BubbaFlix 🎬 - Movie & TV Show Streaming & Discovery App

BubbaFlix is a modern, high-performance movie and TV show streaming discovery app built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, **Express**, and integrated with **TMDB (The Movie Database)**, **Bitsearch**, **Premiumize.me**, **Groq AI**, and **SIMKL**.

BubbaFlix features **Android TV & Smart TV D-Pad Spatial Navigation**, **Native Web Player Stream Filtering (x264/MP4)**, **Centralized Backend Server Settings Storage**, **SIMKL Watch Status Synchronization**, **Client-Side TV Screen Zoom (50%–140%)**, and automatic **English-only Live-Action Filtering (No Anime/Animation)**.

---

## 🌟 Key Features

### 🍿 Native Web Player Stream Filtering
- **Automatic Web Compatibility Filtering**: Stream search results (`src/utils/bitsearch.js`) are pre-filtered to return ONLY natively playable x264/H.264 MP4 streams with AAC audio.
- **Direct Web Playback**: Eliminates backend FFmpeg transcoding CPU overhead and buffering—every stream listed in "Available Streams" plays instantly in HTML5 web players across desktop, mobile, and Smart TV browsers.

### 📺 Smart TV & Remote Control Spatial Navigation
- **Native Smart TV Remote D-Pad Navigation**: Fully compatible with Android TV, Google TV, Firestick, Apple TV, LG webOS, Samsung Tizen, and TV browser D-Pad remotes (`Arrow Keys`, `OK / Select (KeyCodes 13, 23, 66)`, `Back (KeyCodes 4, 27, 10009, 461)`).
- **3D "Bring Forward" Elevation Focus Effect**: Cards elevate forward (`transform: scale(1.14) translateY(-6px)`) with dynamic depth drop-shadows and active theme glows (`var(--pink)`).
- **Auto-Centering Horizontal Carousels**: Smoothly scrolls horizontal poster rows to center the focused poster card automatically.
- **Virtual Keyboard Lock on D-Pad Focus**: Input search bars stay locked (`readOnly`) when focused via remote control, opening OS virtual keyboards ONLY when explicitly selected.

### 🌐 Centralized Backend Server Settings Storage (`/api/settings`)
- **Backend Disk & Docker Persistence**: Settings persist in `/app/server/settings.json` on the server and sync across all connected client devices:
  - **Color Themes**: Dark Red (Netflix Style), Dark Purple, Cyberpunk Teal, Dark Gold, Slate Blue.
  - **SIMKL Credentials**: Client ID & User Access Token.
  - **Premiumize.me API Key**: For instant torrent streaming.
  - **Groq AI Key**: Fast Llama 3 AI stream title classification.
  - **TMDB Read Access Token**: Movie & TV metadata fallback.
  - **Bitsearch API Key**: Torrent magnet searching.
  - **Stream Resolution Filters**: Allowed resolutions (4K, 1080p, 720p, 480p) and CAM/HDTS exclusions.
- **Per-Device Local Settings**:
  - **TV Screen Zoom Scale**: 50% to 140% UI scale saved independently per device.
  - **Backend Server Address**: Custom server IP/URL per device (e.g. `http://192.168.10.10:3000`).

### 🎬 SIMKL Watch Status Tracking
- **Cross-Device Watch Status**: Single-click checkmark tracking for movies, TV series, seasons, and episodes automatically pushed and pulled from SIMKL account watch history.

### 📐 Dynamic Adaptive Responsive Poster Grid
- **Screen-Adaptive Layout**: Automatically fits **3 posters per row on mobile**, **4 on small tablets**, **5 on tablets**, **6 on desktop**, and **7–8 posters per row on 10ft TV screens**.

---

## 🛠️ Built With

- **Frontend**: [React 18](https://react.dev/), [React Router Dom v6](https://reactrouter.com/), [Redux Toolkit](https://redux-toolkit.js.org/)
- **Backend & Settings Engine**: Node.js, Express.js
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: SASS / SCSS Modules with CSS Variable Themes
- **HTTP Client**: Axios
- **APIs**: TMDB API, Bitsearch API, Premiumize.me API, Groq AI API, SIMKL API
- **Containerization & Hosting**: Docker (Alpine), Nginx, GitHub Container Registry (GHCR)

---

## ⚙️ Docker / Portainer / CasaOS Environment Variables

Pre-configure your API credentials directly in `docker-compose.yml`, Portainer Stacks, or CasaOS container settings:

| Environment Variable | Description | Default Value |
| :--- | :--- | :--- |
| `SIMKL_CLIENT_ID` | SIMKL API Client ID | `""` |
| `SIMKL_ACCESS_TOKEN` | SIMKL User Access Token | `""` |
| `PREMIUMIZE_API_KEY` | Premiumize.me API Key | `""` |
| `GROQ_API_KEY` | Groq AI Stream Filter API Key | `""` |
| `TMDB_READ_ACCESS_TOKEN` | TMDB v4 Read Access Token | Built-in fallback |
| `BITSEARCH_API_KEY` | Bitsearch API Key | `""` |

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jsanderstechnologies/BubbaFlix.git
   cd BubbaFlix
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_APP_TMDB_KEY=your_tmdb_read_access_token
   PREMIUMIZE_API_KEY=your_premiumize_api_key
   SIMKL_CLIENT_ID=your_simkl_client_id
   SIMKL_ACCESS_TOKEN=your_simkl_access_token
   BITSEARCH_API_KEY=your_bitsearch_api_key
   GROQ_API_KEY=your_groq_api_key
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🐳 Docker Deployment

### Option 1: Docker Compose (Recommended)

Run BubbaFlix containerized with Nginx reverse proxy:
```bash
docker compose up --build -d
```
Access the application at **`http://localhost:3000`**.

To stop the stack:
```bash
docker compose down
```

---

### Option 2: Deploying via Portainer 🚢 & CasaOS

#### Method A: Portainer Stack (Direct GitHub Repository - Recommended)
1. Open **Portainer** > **Stacks** > **+ Add stack**.
2. Name stack: `bubbaflix`.
3. Under **Build method**, select **Repository**:
   - **Repository URL**: `https://github.com/jsanderstechnologies/BubbaFlix`
   - **Repository reference**: `refs/heads/master`
   - **Compose path**: `docker-compose.yml`
4. Click **Deploy the stack**.
5. Access BubbaFlix at **`http://<your-server-ip>:3000`**.

---

## 📄 License & Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve BubbaFlix.

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
