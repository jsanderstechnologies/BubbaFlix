const http = require("http");
const fs = require("fs");
const path = require("path");

// Internal Node settings server port inside Docker container (always 5000 for Nginx proxy)
const PORT = 5000;
const SETTINGS_FILE = path.join(__dirname, "settings.json");

const DEFAULT_TMDB_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU";

// Load environment variables for default server settings (for Docker, Portainer, CasaOS deployments)
const getEnvDefaultSettings = () => {
  const defaultTmdb = process.env.TMDB_READ_ACCESS_TOKEN || process.env.VITE_APP_TMDB_KEY || process.env.TMDB_TOKEN || DEFAULT_TMDB_KEY;
  const defaultResolutions = process.env.STREAM_RESOLUTIONS
    ? process.env.STREAM_RESOLUTIONS.split(",").map((s) => s.trim())
    : ["2160p", "1080p", "720p", "480p"];
  const defaultExcludeLow = process.env.STREAM_EXCLUDE_LOW_QUALITY !== undefined
    ? process.env.STREAM_EXCLUDE_LOW_QUALITY.toLowerCase() === "true"
    : true;

  return {
    theme: process.env.THEME || process.env.DEFAULT_THEME || "dark-red",
    simklClientId: process.env.SIMKL_CLIENT_ID || "",
    premiumizeKey: process.env.PREMIUMIZE_API_KEY || "",
    groqKey: process.env.GROQ_API_KEY || "",
    tmdbToken: defaultTmdb,
    bitsearchKey: process.env.BITSEARCH_API_KEY || "",
    stream_resolutions: defaultResolutions,
    stream_exclude_low_quality: defaultExcludeLow,
  };
};

// Load settings from disk merged with environment variable defaults
const loadServerSettings = () => {
  const envDefaults = getEnvDefaultSettings();
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      const loaded = JSON.parse(data);

      const merged = { ...envDefaults, ...loaded };

      // Apply environment variable overrides if local fields are empty
      if (!merged.simklClientId && envDefaults.simklClientId) merged.simklClientId = envDefaults.simklClientId;
      if (!merged.premiumizeKey && envDefaults.premiumizeKey) merged.premiumizeKey = envDefaults.premiumizeKey;
      if (!merged.groqKey && envDefaults.groqKey) merged.groqKey = envDefaults.groqKey;
      if (!merged.bitsearchKey && envDefaults.bitsearchKey) merged.bitsearchKey = envDefaults.bitsearchKey;
      if (!merged.tmdbToken || merged.tmdbToken.trim() === "") merged.tmdbToken = envDefaults.tmdbToken;

      return merged;
    }
  } catch (err) {
    console.error("[Backend Settings Storage Error]: Failed to read settings.json", err.message);
  }
  return { ...envDefaults };
};

// Save settings to disk
const saveServerSettings = (settingsData) => {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2), "utf8");
    console.log("[Backend Settings Storage] Updated global settings.json on server disk.");
    return true;
  } catch (err) {
    console.error("[Backend Settings Storage Error]: Failed to save settings.json", err.message);
    return false;
  }
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  // Use WHATWG URL API to resolve Node.js DEP0169 url.parse() deprecation warning
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  if (pathname === "/api/transcode/health" && req.method === "GET") {
    return sendJson(res, 200, { status: "ok", service: "BubbaFlix Backend Engine" });
  }

  if (pathname === "/api/settings" && req.method === "GET") {
    const settings = loadServerSettings();
    return sendJson(res, 200, { status: "success", settings });
  }

  if (pathname === "/api/settings" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const currentSettings = loadServerSettings();
        const updatedSettings = { ...currentSettings, ...payload };
        if (!updatedSettings.tmdbToken || updatedSettings.tmdbToken.trim() === "") {
          updatedSettings.tmdbToken = DEFAULT_TMDB_KEY;
        }

        const saved = saveServerSettings(updatedSettings);
        if (saved) {
          return sendJson(res, 200, {
            status: "success",
            message: "Global server settings updated successfully.",
            settings: updatedSettings,
          });
        } else {
          return sendJson(res, 500, { error: "Failed to persist settings on server storage." });
        }
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid JSON payload." });
      }
    });
    return;
  }

  return sendJson(res, 404, { error: "Endpoint not found." });
});

process.on("uncaughtException", (err) => {
  console.error("[BubbaFlix Server Uncaught Exception]:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[BubbaFlix Server Unhandled Rejection]:", reason);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[BubbaFlix Backend Engine] Pure Node Settings Server listening on 0.0.0.0:${PORT}`);
  loadServerSettings();
});

server.on("error", (err) => {
  console.error("[BubbaFlix Backend Listen Error]:", err);
});
