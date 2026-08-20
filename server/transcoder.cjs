const express = require("express");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.TRANSCODER_PORT || 5000;
const SETTINGS_FILE = path.join(__dirname, "settings.json");

app.use(express.json());

const DEFAULT_TMDB_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU";

// Load environment variables for default server settings (for Docker, Portainer, CasaOS deployments)
const getEnvDefaultSettings = () => {
  const defaultTmdb = process.env.TMDB_READ_ACCESS_TOKEN || process.env.VITE_APP_TMDB_KEY || process.env.TMDB_TOKEN || DEFAULT_TMDB_KEY;
  const defaultResolutions = process.env.STREAM_RESOLUTIONS
    ? process.env.STREAM_RESOLUTIONS.split(",").map((s) => s.trim())
    : ["2160p", "1080p", "720p", "480p"];
  const defaultCodecs = process.env.STREAM_CODECS
    ? process.env.STREAM_CODECS.split(",").map((s) => s.trim())
    : ["x265", "x264", "av1", "xvid"];
  const defaultExcludeLow = process.env.STREAM_EXCLUDE_LOW_QUALITY !== undefined
    ? process.env.STREAM_EXCLUDE_LOW_QUALITY.toLowerCase() === "true"
    : true;

  return {
    theme: process.env.THEME || process.env.DEFAULT_THEME || "dark-red",
    simklClientId: process.env.SIMKL_CLIENT_ID || "",
    simklToken: process.env.SIMKL_ACCESS_TOKEN || process.env.SIMKL_USER_TOKEN || "",
    premiumizeKey: process.env.PREMIUMIZE_API_KEY || "",
    groqKey: process.env.GROQ_API_KEY || "",
    tmdbToken: defaultTmdb,
    bitsearchKey: process.env.BITSEARCH_API_KEY || "",
    stream_resolutions: defaultResolutions,
    stream_codecs: defaultCodecs,
    stream_exclude_low_quality: defaultExcludeLow,
  };
};

// Load settings from disk merged with environment variable defaults
const loadServerSettings = () => {
  const envDefaults = getEnvDefaultSettings();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      const loaded = JSON.parse(data);

      const merged = { ...envDefaults, ...loaded };

      // Apply environment variable overrides if local fields are empty
      if (!merged.simklClientId && envDefaults.simklClientId) merged.simklClientId = envDefaults.simklClientId;
      if (!merged.simklToken && envDefaults.simklToken) merged.simklToken = envDefaults.simklToken;
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
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settingsData, null, 2), "utf8");
    console.log("[Backend Settings Storage] Updated global settings.json on server disk.");
    return true;
  } catch (err) {
    console.error("[Backend Settings Storage Error]: Failed to save settings.json", err.message);
    return false;
  }
};

// Health check endpoint
app.get("/api/transcode/health", (req, res) => {
  res.json({ status: "ok", service: "BubbaFlix Backend Engine" });
});

// Centralized Settings API Endpoints
app.get("/api/settings", (req, res) => {
  const currentSettings = loadServerSettings();
  res.json({ status: "success", settings: currentSettings });
});

app.post("/api/settings", (req, res) => {
  const currentSettings = loadServerSettings();
  const updatedSettings = { ...currentSettings, ...(req.body || {}) };
  if (!updatedSettings.tmdbToken || updatedSettings.tmdbToken.trim() === "") {
    updatedSettings.tmdbToken = DEFAULT_TMDB_KEY;
  }
  const saved = saveServerSettings(updatedSettings);

  if (saved) {
    res.json({ status: "success", message: "Global server settings updated successfully.", settings: updatedSettings });
  } else {
    res.status(500).json({ error: "Failed to persist settings on server storage." });
  }
});

// FFmpeg On-the-Fly Video & Audio Transcoding Stream Endpoint
app.get("/api/transcode", (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    console.error("[FFmpeg Transcoder Error] Request missing required 'url' parameter.");
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  console.log(`====================================================`);
  console.log(`[FFmpeg Transcoder Engine] [REQUEST] Incoming transcode stream request`);
  console.log(`[FFmpeg Transcoder Engine] [TARGET URL] ${videoUrl}`);

  // Set HTTP headers for fragmented MP4 video streaming
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Spawn FFmpeg process for real-time MP4 streaming with H.264 video and AAC stereo audio
  const ffmpegArgs = [
    "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "-i", videoUrl,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-tune", "zerolatency",
    "-crf", "23",
    "-maxrate", "4M",
    "-bufsize", "8M",
    "-c:a", "aac",
    "-b:a", "192k",
    "-ac", "2",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov+default_base_moof",
    "pipe:1"
  ];

  console.log(`[FFmpeg Transcoder Engine] [SPAWN] Executing: ffmpeg ${ffmpegArgs.join(" ")}`);
  let ffmpegProcess;

  try {
    ffmpegProcess = spawn("ffmpeg", ffmpegArgs);
  } catch (err) {
    console.error(`[FFmpeg Transcoder Engine] [SPAWN ERROR] Failed to spawn FFmpeg: ${err.message}`);
    if (!res.headersSent) {
      return res.status(500).json({ error: "Failed to spawn FFmpeg process." });
    }
    return;
  }

  // Pipe FFmpeg stdout directly to HTTP response stream
  ffmpegProcess.stdout.pipe(res);

  // Stream full FFmpeg output logs directly to container stdout so Portainer logs display all transcoding functions & stats
  ffmpegProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    process.stdout.write(`[FFmpeg] ${msg}`);
  });

  ffmpegProcess.on("error", (err) => {
    console.error(`[FFmpeg Transcoder Engine] [ERROR] Process error: ${err.message}`);
    if (!res.headersSent) {
      try {
        res.status(500).json({ error: "FFmpeg transcoding failed." });
      } catch (e) {}
    }
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`[FFmpeg Transcoder Engine] [EXIT] Process terminated with code: ${code}`);
    console.log(`====================================================`);
    if (!res.writableEnded) {
      try {
        res.end();
      } catch (e) {}
    }
  });

  // Kill FFmpeg process immediately if user closes player or disconnects stream
  req.on("close", () => {
    console.log(`[FFmpeg Transcoder Engine] [DISCONNECT] Client closed player. Killing FFmpeg process...`);
    if (ffmpegProcess && !ffmpegProcess.killed) {
      try {
        ffmpegProcess.kill("SIGKILL");
      } catch (e) {}
    }
  });
});

process.on("uncaughtException", (err) => {
  console.error("[FFmpeg Transcoder Uncaught Exception]:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FFmpeg Transcoder Unhandled Rejection]:", reason);
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BubbaFlix Backend Engine] Server listening on 0.0.0.0:${PORT}`);
  // Initialize and write settings.json on boot
  loadServerSettings();
});

server.on("error", (err) => {
  console.error("[BubbaFlix Backend Listen Error]:", err);
});
