const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const dgram = require("dgram");
const os = require("os");
const { spawn } = require("child_process");

// Internal Node settings server port inside Docker container (always 5000 for Nginx proxy)
const PORT = 5000;
const UDP_DISCOVERY_PORT = 5151;
const SETTINGS_FILE = path.join(__dirname, "settings.json");
const LOG_FILE = path.join(__dirname, "bubbaflix.log");

const DEFAULT_TMDB_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU";

// Dual-logging utility: writes to stdout/stderr AND appends to disk volume log file (/app/server/bubbaflix.log)
const logMessage = (msg, isError = false) => {
  const timestamp = new Date().toISOString();
  const formatted = `[${timestamp}] ${msg}`;
  if (isError) {
    console.error(formatted);
  } else {
    console.log(formatted);
  }

  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, formatted + "\n", "utf8");
  } catch (err) {
    // Ignore log file write errors
  }
};

// Get local network IPv4 address
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
};

// Start UDP Server Discovery Beacon
const startUdpDiscovery = () => {
  try {
    const udpServer = dgram.createSocket({ type: "udp4", reuseAddr: true });

    udpServer.on("error", (err) => {
      logMessage(`UDP Discovery Error: ${err.message}`, true);
    });

    udpServer.on("message", (msg, rinfo) => {
      const messageStr = msg.toString().trim();
      if (messageStr.includes("BUBBAFLIX_DISCOVER")) {
        const localIp = getLocalIpAddress();
        const response = JSON.stringify({
          service: "bubbaflix-server",
          name: "BubbaFlix Media Server",
          port: 5150,
          ip: localIp,
          url: `http://${localIp}:5150`
        });
        const replyBuf = Buffer.from(response);
        udpServer.send(replyBuf, 0, replyBuf.length, rinfo.port, rinfo.address, (err) => {
          if (err) logMessage(`Failed to send UDP discovery response: ${err.message}`, true);
        });
      }
    });

    udpServer.bind(UDP_DISCOVERY_PORT, () => {
      try {
        udpServer.setBroadcast(true);
      } catch (e) {
        // Ignore setBroadcast error on some platforms
      }
      logMessage(`[BubbaFlix Server] UDP Local Server Discovery Beacon running on port ${UDP_DISCOVERY_PORT}`);
    });
  } catch (err) {
    logMessage(`[BubbaFlix Server] Failed to start UDP Discovery Beacon: ${err.message}`, true);
  }
};

startUdpDiscovery();

// Load environment variables for default server settings
const getEnvDefaultSettings = () => {
  const defaultTmdb = process.env.TMDB_READ_ACCESS_TOKEN || process.env.VITE_APP_TMDB_KEY || process.env.TMDB_TOKEN || DEFAULT_TMDB_KEY;
  const defaultGroq = process.env.GROQ_API_KEY || process.env.GROQ_KEY || process.env.VITE_GROQ_API_KEY || "";
  const defaultSimkl = process.env.SIMKL_CLIENT_ID || process.env.VITE_SIMKL_CLIENT_ID || "";
  const defaultAio = process.env.AIOSTREAMS_URL || process.env.VITE_AIOSTREAMS_URL || "https://aiostreams.elfhosted.com/";
  const defaultResolutions = process.env.STREAM_RESOLUTIONS
    ? process.env.STREAM_RESOLUTIONS.split(",").map((s) => s.trim())
    : ["2160p", "1080p", "720p", "480p"];
  const defaultExcludeLow = process.env.STREAM_EXCLUDE_LOW_QUALITY !== undefined
    ? process.env.STREAM_EXCLUDE_LOW_QUALITY.toLowerCase() === "true"
    : true;

  return {
    theme: process.env.THEME || process.env.DEFAULT_THEME || "dark-red",
    aiostreams_url: defaultAio,
    simklClientId: defaultSimkl,
    groqKey: defaultGroq,
    tmdbToken: defaultTmdb,
    stream_resolutions: defaultResolutions,
    stream_exclude_low_quality: defaultExcludeLow,
  };
};

// Load settings from disk merged with environment variable defaults
const loadServerSettings = () => {
  const envDefaults = getEnvDefaultSettings();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf8");
      const diskSettings = JSON.parse(data);
      const merged = { ...envDefaults, ...diskSettings };

      if (envDefaults.groqKey && (!merged.groqKey || merged.groqKey.trim() === "")) {
        merged.groqKey = envDefaults.groqKey;
      }
      if (envDefaults.simklClientId && (!merged.simklClientId || merged.simklClientId.trim() === "")) {
        merged.simklClientId = envDefaults.simklClientId;
      }
      if (!merged.tmdbToken || merged.tmdbToken.trim() === "") {
        merged.tmdbToken = DEFAULT_TMDB_KEY;
      }

      return merged;
    }
  } catch (err) {
    logMessage(`Failed to read settings.json: ${err.message}`, true);
  }
  return envDefaults;
};

// Write settings object to settings.json
const saveServerSettings = (settings) => {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (err) {
    logMessage(`Failed to write settings.json: ${err.message}`, true);
    return false;
  }
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  logMessage(`[HTTP Request] ${req.method} ${pathname}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    return res.end();
  }

  // Local Network Server Discovery Endpoint
  if ((pathname === "/api/discover" || pathname === "/api/discover/") && req.method === "GET") {
    const localIp = getLocalIpAddress();
    return sendJson(res, 200, {
      status: "ok",
      service: "bubbaflix-server",
      name: "BubbaFlix Media Server",
      port: 5150,
      ip: localIp,
      url: `http://${localIp}:5150`
    });
  }

  // Health check endpoint
  if (pathname === "/api/transcode/health" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "ok",
      service: "BubbaFlix VLC & FFmpeg Transcoder Engine",
      capabilities: ["AC3", "EAC3", "TrueHD", "DTS", "DTS-HD", "FLAC", "HEVC", "AV1", "VP9", "H264", "MKV", "TS", "MP4"]
    });
  }

  // Real-Time Transcoding & Remuxing Proxy Stream Endpoint
  if ((pathname === "/api/transcode" || pathname === "/api/transcode/") && req.method === "GET") {
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
      logMessage("[Transcoder Engine Error] Request missing required 'url' parameter.", true);
      return sendJson(res, 400, { error: "Missing required query parameter: url" });
    }

    if (targetUrl.startsWith("magnet:")) {
      logMessage("[Transcoder Engine Warning] Magnet link received. Direct P2P magnet transcoding requires Debrid.", true);
      res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      return res.end(JSON.stringify({
        error: "Magnet torrent links require a Debrid account. Please configure your AIOStreams Debrid URL in Settings or select a direct HTTP stream."
      }));
    }

    logMessage(`====================================================`);
    logMessage(`[Backend Transcoder Engine] Incoming stream transcode request`);
    logMessage(`[Backend Transcoder Engine] Stream Target: ${targetUrl}`);

    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Transfer-Encoding": "chunked",
      "Access-Control-Allow-Origin": "*",
    });

    const ffmpegArgs = [
      "-user_agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "-i", targetUrl,
      "-c:v", "libx264",
      "-preset", "ultrafast",
      "-tune", "zerolatency",
      "-crf", "23",
      "-c:a", "aac",
      "-b:a", "192k",
      "-ac", "2",
      "-movflags", "frag_keyframe+empty_moov+default_base_moof",
      "-f", "mp4",
      "pipe:1"
    ];

    logMessage(`[Backend Transcoder Engine] Spawning FFmpeg command: ffmpeg ${ffmpegArgs.join(" ")}`);
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    ffmpegProcess.stdout.pipe(res);

    ffmpegProcess.stderr.on("data", (data) => {
      const logLine = data.toString();
      if (logLine.includes("Error") || logLine.includes("failed") || logLine.includes("frame=")) {
        logMessage(`[FFmpeg Log] ${logLine.trim()}`);
      }
    });

    ffmpegProcess.on("error", (err) => {
      logMessage(`[Backend Transcoder Engine FFmpeg Error]: ${err.message}`, true);
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Transcoder engine failed to spawn FFmpeg." });
      }
    });

    ffmpegProcess.on("close", (code) => {
      logMessage(`[Backend Transcoder Engine] FFmpeg process terminated with exit code ${code}`);
      if (!res.writableEnded) {
        res.end();
      }
    });

    req.on("close", () => {
      logMessage("[Backend Transcoder Engine] Client closed HTTP connection. Terminating FFmpeg process...");
      ffmpegProcess.kill("SIGKILL");
    });
    return;
  }

  // GET Settings API
  if (pathname === "/api/settings" && req.method === "GET") {
    const settings = loadServerSettings();
    return sendJson(res, 200, settings);
  }

  // POST Settings API
  if (pathname === "/api/settings" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const envDefaults = getEnvDefaultSettings();
        const currentSettings = loadServerSettings();
        const updatedSettings = { ...currentSettings, ...payload };

        if (envDefaults.groqKey && (!updatedSettings.groqKey || updatedSettings.groqKey.trim() === "")) {
          updatedSettings.groqKey = envDefaults.groqKey;
        }
        if (envDefaults.simklClientId && (!updatedSettings.simklClientId || updatedSettings.simklClientId.trim() === "")) {
          updatedSettings.simklClientId = envDefaults.simklClientId;
        }
        if (!updatedSettings.tmdbToken || updatedSettings.tmdbToken.trim() === "") {
          updatedSettings.tmdbToken = DEFAULT_TMDB_KEY;
        }

        const saved = saveServerSettings(updatedSettings);
        if (saved) {
          logMessage(`[Settings Updated] Successfully saved keys to settings.json.`);
          return sendJson(res, 200, {
            status: "success",
            message: "Global server settings updated successfully.",
            settings: updatedSettings,
          });
        } else {
          logMessage("[Settings Error] Failed to write settings.json to disk.", true);
          return sendJson(res, 500, { error: "Failed to persist settings on server storage." });
        }
      } catch (e) {
        logMessage(`[Settings Error] Invalid JSON payload: ${e.message}`, true);
        return sendJson(res, 400, { error: "Invalid JSON payload." });
      }
    });
    return;
  }

  // Dispatcharr Proxy Endpoints for Live TV, Channels, EPG Guide, & Recordings
  if (pathname.startsWith("/api/dispatcharr")) {
    const settings = getSettings();
    const dispatcharrUrl = (settings.dispatcharrUrl || "http://192.168.1.100:9191").replace(/\/$/, "");
    const apiKey = settings.dispatcharrApiKey || "";

    const subPath = pathname.replace(/^\/api\/dispatcharr/, "") || "/";
    const targetDispatcharrUrl = `${dispatcharrUrl}${subPath}${parsedUrl.search || ""}`;

    logMessage(`[Dispatcharr Proxy] Forwarding ${req.method} request to ${targetDispatcharrUrl}`);

    try {
      const targetParsed = url.parse(targetDispatcharrUrl);
      const isHttps = targetParsed.protocol === "https:";
      const httpModule = isHttps ? require("https") : require("http");

      const headers = { ...req.headers, host: targetParsed.host };
      delete headers["content-length"];
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["X-API-Key"] = apiKey;
      }

      const proxyReq = httpModule.request(targetDispatcharrUrl, {
        method: req.method,
        headers: headers,
        rejectUnauthorized: false, // Allow local self-signed HTTPS certs
        timeout: 8000
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          "Access-Control-Allow-Origin": "*"
        });
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (err) => {
        logMessage(`[Dispatcharr Proxy Error]: ${err.message}`, true);
        sendJson(res, 502, { error: `Dispatcharr proxy error: ${err.message}`, dispatcharrUrl });
      });

      if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  return sendJson(res, 404, { error: "Endpoint not found." });
});

process.on("uncaughtException", (err) => {
  logMessage(`[BubbaFlix Server Uncaught Exception]: ${err.stack || err}`, true);
});

process.on("unhandledRejection", (reason) => {
  logMessage(`[BubbaFlix Server Unhandled Rejection]: ${reason}`, true);
});

server.listen(PORT, "0.0.0.0", () => {
  logMessage(`[BubbaFlix Backend Transcoder & Settings Engine] Pure Node Server listening on 0.0.0.0:${PORT}`);
  loadServerSettings();
});

server.on("error", (err) => {
  logMessage(`[BubbaFlix Backend Listen Error]: ${err.stack || err}`, true);
});
