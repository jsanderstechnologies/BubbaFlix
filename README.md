# BubbaFlix 🎬 - Movie & TV Show Streaming App

BubbaFlix is a modern, high-performance movie and TV show streaming discovery app built with **React 18**, **Redux Toolkit**, **React Router v6**, **Vite**, and integrated with the **TMDB (The Movie Database) API**.

BubbaFlix features automatic content filtering for **English-only live-action movies and TV shows (no anime/animation)**, in-app **API Settings Page**, multi-stage **Docker containerization**, automated **GitHub Actions CI/CD**, and **PWA / App Store Container Manifest** support.

---

## 🌟 Key Features

- 🔍 **Browse & Search**: Explore trending, popular, top-rated movies and TV shows with instant search.
- ⚙️ **In-App API Key Settings**: Dedicated Settings page (`/settings`) to view, save, test, and manage your TMDB v4 Read Access Token (`VITE_APP_TMDB_KEY`) without needing to rebuild or restart.
- 🍿 **English-Only & No Anime Filter**: Automatic server & client-side filtering enforcing English language content and excluding all animation / anime titles.
- ⚡ **Optimized Performance**: Built with Vite, lazy-loading image components, and infinite scrolling.
- 🎬 **Video Trailer Modal**: Watch official movie & show trailers powered by React Player.
- 🐳 **Docker Ready**: Multi-stage production Docker build served via lightweight Nginx with SPA routing support.
- 🚢 **Portainer Compatible**: Full deployment support via Portainer Stacks, Repository deployment, and GHCR images.
- 🤖 **GitHub Actions CI/CD**: Automatic Docker image builds pushed to GitHub Container Registry (`ghcr.io`).
- 📱 **PWA & Container App Store Manifest**: Includes `manifest.json` for homelab app managers (Portainer, Cosmos, CasaOS, Unraid) and PWA desktop/mobile installation.
- 📱 **Fully Responsive**: Sleek dark UI optimized for desktop, tablets, mobile, and TV browsers.

---

## 🛠️ Built With

- **Frontend**: [React 18](https://react.dev/), [React Router Dom v6](https://reactrouter.com/), [Redux Toolkit](https://redux-toolkit.js.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: SASS / SCSS Modules
- **HTTP Client**: Axios
- **API**: [TMDB (The Movie Database) API](https://www.themoviedb.org/)
- **Containerization & Hosting**: Docker, Nginx, GitHub Container Registry (GHCR)

---

## ⚙️ In-App API Key Configuration

BubbaFlix includes an in-app **Settings Page** accessible via the gear icon in the navigation header or by navigating to `/settings`.

### Features:
- **Save Custom Key**: Store your TMDB Read Access Token directly in browser `localStorage`.
- **Test Connection**: Run instant connection tests to verify whether your token is valid and active.
- **Show / Hide Key Toggle**: Easily inspect or mask your secret API key.
- **Reset to Default**: Instantly revert back to the default `.env` token with one click.

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
   Ensure a `.env` file exists in the root directory with your default TMDB Read Access Token:
   ```env
   VITE_APP_TMDB_KEY =your_tmdb_read_access_token
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

Run BubbaFlix with a single command:
```bash
docker compose up --build -d
```
Access the application at **`http://localhost:3000`**.

To stop the container:
```bash
docker compose down
```

---

### Option 2: Deploying via Portainer 🚢

#### Method A: Portainer Stack (Direct GitHub Repository - Recommended)
1. Open your **Portainer** dashboard.
2. Go to **Stacks** > **+ Add stack**.
3. Name your stack (e.g., `bubbaflix`).
4. Under **Build method**, select **Repository**:
   - **Repository URL**: `https://github.com/jsanderstechnologies/BubbaFlix`
   - **Repository reference**: `refs/heads/master`
   - **Compose path**: `docker-compose.yml`
5. Click **Deploy the stack**.
6. Access BubbaFlix at **`http://<your-server-ip>:3000`**.

#### Method B: Portainer Stack (Web Editor)
1. In Portainer, go to **Stacks** > **+ Add stack**.
2. Select **Web editor** and paste:
   ```yaml
   version: '3.8'
   services:
     bubbaflix:
       image: ghcr.io/jsanderstechnologies/bubbaflix:latest
       container_name: bubbaflix-app
       ports:
         - "3000:80"
       restart: unless-stopped
   ```
3. Click **Deploy the stack**.

#### Method C: Portainer Container (Pre-built Image)
1. Go to **Containers** > **+ Add container**.
2. Set Name: `bubbaflix`.
3. Set Image: `ghcr.io/jsanderstechnologies/bubbaflix:latest`.
4. Under **Port mapping**, click **+ publish a new network port**:
   - Host: `3000` | Container: `80`
5. Click **Deploy the container**.

---

### Option 3: Pull & Run from GitHub Container Registry (GHCR)

```bash
docker run -d -p 3000:80 --name bubbaflix ghcr.io/jsanderstechnologies/bubbaflix:latest
```

---

### Option 4: Build & Run directly from GitHub URL

```bash
docker build -t bubbaflix https://github.com/jsanderstechnologies/BubbaFlix.git#master
docker run -d -p 3000:80 --name bubbaflix bubbaflix
```

---

## 📄 License & Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve BubbaFlix.

Made with ❤️ by [jsanderstechnologies](https://github.com/jsanderstechnologies).
