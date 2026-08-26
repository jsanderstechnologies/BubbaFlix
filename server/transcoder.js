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
const DATA_DIR = process.env.DATA_DIR || (fs.existsSync("/app/data") ? "/app/data" : __dirname);
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const LOG_FILE = path.join(DATA_DIR, "bubbaflix.log");

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
  const defaultDispatcharrUrl = process.env.DISPATCHARR_URL || process.env.VITE_DISPATCHARR_URL || "http://192.168.10.3:9191";
  const defaultDispatcharrApiKey = process.env.DISPATCHARR_API_KEY || process.env.VITE_DISPATCHARR_API_KEY || "";
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
    dispatcharrUrl: defaultDispatcharrUrl,
    dispatcharrApiKey: defaultDispatcharrApiKey,
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
      if (envDefaults.dispatcharrUrl && (!merged.dispatcharrUrl || merged.dispatcharrUrl.trim() === "" || merged.dispatcharrUrl === "http://192.168.1.100:9191")) {
        merged.dispatcharrUrl = envDefaults.dispatcharrUrl;
      }
      if (envDefaults.dispatcharrApiKey && (!merged.dispatcharrApiKey || merged.dispatcharrApiKey.trim() === "")) {
        merged.dispatcharrApiKey = envDefaults.dispatcharrApiKey;
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

// Helper to extract initiator details from request headers
const getRequestInitiator = (req) => {
  const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "127.0.0.1";
  const clientIp = ip.split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "Unknown Client";
  const referer = req.headers["referer"] || req.headers["origin"] || "Direct Connection";

  let initiatorComponent = "Unknown Component";
  if (referer.includes("/livetv")) {
    initiatorComponent = "Live TV & EPG UI";
  } else if (referer.includes("/settings")) {
    initiatorComponent = "Settings Page UI";
  } else if (referer.includes("/movie") || referer.includes("/tv")) {
    initiatorComponent = "Video Player";
  } else if (userAgent.includes("ExoPlayer") || userAgent.includes("VLC") || userAgent.includes("Stagefright")) {
    initiatorComponent = "Android TV Video Engine";
  } else if (userAgent.includes("BubbaFlixTV")) {
    initiatorComponent = "BubbaFlix Android TV App";
  } else if (userAgent.includes("Mozilla") || userAgent.includes("Chrome") || userAgent.includes("Safari")) {
    initiatorComponent = "BubbaFlix Web Dashboard";
  }

  return { ip: clientIp, userAgent, referer, initiatorComponent };
};

const sendJson = (res, statusCode, data) => {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
};

const server = http.createServer((req, res) => {
  const startTime = Date.now();
  const parsedUrl = url.parse(req.url, true);
  const rawPath = parsedUrl.pathname || "/";
  const cleanPath = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
  const initiator = getRequestInitiator(req);

  logMessage(`[HTTP Request] ${req.method} ${rawPath} | Initiator: [${initiator.initiatorComponent}] | Client IP: ${initiator.ip} | Referer: ${initiator.referer} | User-Agent: ${initiator.userAgent}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    });
    return res.end();
  }

  // Local Network Server Discovery Endpoint
  if ((cleanPath === "/api/discover" || cleanPath === "/discover") && req.method === "GET") {
    const localIp = getLocalIpAddress();
    logMessage(`[Server Discovery] Responded to [${initiator.initiatorComponent}] (${initiator.ip})`);
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
  if ((cleanPath === "/api/transcode/health" || cleanPath === "/transcode/health") && req.method === "GET") {
    logMessage(`[Health Check] Responded to [${initiator.initiatorComponent}] (${initiator.ip})`);
    return sendJson(res, 200, {
      status: "ok",
      service: "BubbaFlix VLC & FFmpeg Transcoder Engine",
      capabilities: ["AC3", "EAC3", "TrueHD", "DTS", "DTS-HD", "FLAC", "HEVC", "AV1", "VP9", "H264", "MKV", "TS", "MP4"]
    });
  }

  // Real-Time Transcoding & Remuxing Proxy Stream Endpoint
  if ((cleanPath === "/api/transcode" || cleanPath === "/transcode") && req.method === "GET") {
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
      logMessage(`[Transcoder Engine Error] Request from [${initiator.initiatorComponent}] (${initiator.ip}) missing required 'url' parameter.`, true);
      return sendJson(res, 400, { error: "Missing required query parameter: url" });
    }

    if (targetUrl.startsWith("magnet:")) {
      logMessage(`[Transcoder Engine Warning] Magnet link received from [${initiator.initiatorComponent}] (${initiator.ip}). Direct P2P magnet transcoding requires Debrid.`, true);
      res.writeHead(400, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
      return res.end(JSON.stringify({
        error: "Magnet torrent links require a Debrid account. Please configure your AIOStreams Debrid URL in Settings or select a direct HTTP stream."
      }));
    }

    logMessage(`====================================================`);
    logMessage(`[Backend Transcoder Engine] Stream Transcode Initiated by [${initiator.initiatorComponent}] (${initiator.ip})`);
    logMessage(`[Backend Transcoder Engine] Stream Target: ${targetUrl}`);
    logMessage(`[Backend Transcoder Engine] Client Referer: ${initiator.referer}`);

    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      "Transfer-Encoding": "chunked",
      "Access-Control-Allow-Origin": "*",
    });

    const settings = loadServerSettings();
    const apiKey = settings.dispatcharrApiKey || parsedUrl.query.api_key || parsedUrl.query.token || "";
    const dispatcharrBase = (settings.dispatcharrUrl || "http://192.168.10.3:9191").replace(/\/+$/, "");

    // Normalize stream target URL: convert external proxy URLs to direct local Dispatcharr URLs for FFmpeg
    let normalizedTargetUrl = targetUrl;
    if (normalizedTargetUrl.includes("/proxy/ts/stream/")) {
      const match = normalizedTargetUrl.match(/\/proxy\/ts\/stream\/([^/?]+)/);
      if (match && match[1]) {
        const streamId = match[1];
        const authParam = apiKey ? `?token=${encodeURIComponent(apiKey)}&api_key=${encodeURIComponent(apiKey)}` : "";
        normalizedTargetUrl = `${dispatcharrBase}/proxy/ts/stream/${streamId}/${authParam}`;
      }
    } else {
      const urlParts = normalizedTargetUrl.split("?");
      const basePath = urlParts[0].replace(/\/+$/, "");
      const queryStr = urlParts[1] ? `?${urlParts[1]}` : "";
      if (basePath.includes("/proxy/ts/stream/")) {
        normalizedTargetUrl = `${basePath}/${queryStr}`;
      }
    }

    const headersStr = apiKey
      ? `X-API-Key: ${apiKey}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n`
      : `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n`;

    const ffmpegArgs = [
      "-headers", headersStr,
      "-i", normalizedTargetUrl,
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
      logMessage(`[Backend Transcoder Engine FFmpeg Error] Initiated by [${initiator.initiatorComponent}] (${initiator.ip}): ${err.message}`, true);
      if (!res.headersSent) {
        sendJson(res, 500, { error: "Transcoder engine failed to spawn FFmpeg." });
      }
    });

    ffmpegProcess.on("close", (code) => {
      logMessage(`[Backend Transcoder Engine] FFmpeg process for [${initiator.initiatorComponent}] (${initiator.ip}) terminated with exit code ${code}`);
      if (!res.writableEnded) {
        res.end();
      }
    });

    req.on("close", () => {
      logMessage(`[Backend Transcoder Engine] Client [${initiator.initiatorComponent}] (${initiator.ip}) closed HTTP connection. Terminating FFmpeg process...`);
      ffmpegProcess.kill("SIGKILL");
    });
    return;
  }

  // GET Settings API
  if ((cleanPath === "/api/settings" || cleanPath === "/settings") && req.method === "GET") {
    const settings = loadServerSettings();
    logMessage(`[Settings GET] Served settings to [${initiator.initiatorComponent}] (${initiator.ip})`);
    return sendJson(res, 200, settings);
  }

  // POST Settings API
  if ((cleanPath === "/api/settings" || cleanPath === "/settings") && req.method === "POST") {
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
          logMessage(`[Settings Update Success] Initiated by [${initiator.initiatorComponent}] (${initiator.ip}) from ${initiator.referer} | Keys Updated: ${Object.keys(payload).join(", ")}`);
          return sendJson(res, 200, {
            status: "success",
            message: "Global server settings updated successfully.",
            settings: updatedSettings,
          });
        } else {
          logMessage(`[Settings Error] Initiated by [${initiator.initiatorComponent}] (${initiator.ip}) - Failed to write settings.json to disk.`, true);
          return sendJson(res, 500, { error: "Failed to persist settings on server storage." });
        }
      } catch (e) {
        logMessage(`[Settings Error] Initiated by [${initiator.initiatorComponent}] (${initiator.ip}) - Invalid JSON payload: ${e.message}`, true);
        return sendJson(res, 400, { error: "Invalid JSON payload." });
      }
    });
    return;
  }

  // Client Error Logging Endpoint
  if ((cleanPath === "/api/log" || cleanPath === "/log") && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const level = payload.level || "ERROR";
        const message = payload.message || payload.error || "Client Report";
        logMessage(`[Client Report ${level}] Sent by [${initiator.initiatorComponent}] (${initiator.ip}) | Referer: ${initiator.referer} | Details: ${message}`, level === "ERROR");
        return sendJson(res, 200, { status: "logged" });
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid log payload" });
      }
    });
    return;
  }

  // Version Check Proxy Endpoint
  if ((cleanPath === "/api/version" || cleanPath === "/version") && req.method === "GET") {
    const https = require("https");
    https.get("https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/version.json", (vRes) => {
      let body = "";
      vRes.on("data", (chunk) => { body += chunk; });
      vRes.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          logMessage(`[Version Check] Served version ${parsed.versionName} (v${parsed.versionCode}) to [${initiator.initiatorComponent}] (${initiator.ip})`);
          sendJson(res, 200, parsed);
        } catch (e) {
          logMessage(`[Version Check Error] Failed to parse GitHub version.json: ${e.message}`, true);
          sendJson(res, 200, { versionCode: 14, versionName: "1.0.4" });
        }
      });
    }).on("error", (vErr) => {
      logMessage(`[Version Check Network Error] Unable to fetch version.json from GitHub: ${vErr.message}`, true);
      sendJson(res, 200, { versionCode: 14, versionName: "1.0.4" });
    });
    return;
  }

  // Manual Dispatcharr Auto-Sync Endpoint
  if (cleanPath === "/api/dispatcharr/sync-now" || cleanPath === "/dispatcharr/sync-now") {
    logMessage(`[Manual Auto-Sync] Triggered by [${initiator.initiatorComponent}] (${initiator.ip})`);
    triggerDispatcharrSync();
    return sendJson(res, 200, { status: "success", message: "Dispatcharr 2-hour automated playlist and EPG refresh triggered." });
  }

  // Dispatcharr Proxy Endpoints for Live TV, Channels, EPG Guide, & Recordings
  if (cleanPath.startsWith("/api/dispatcharr") || cleanPath.startsWith("/dispatcharr")) {
    const settings = loadServerSettings();
    const dispatcharrUrl = (settings.dispatcharrUrl || "http://192.168.1.100:9191").replace(/\/$/, "");
    let apiKey = settings.dispatcharrApiKey || "";

    // Fallback: extract API Key from request headers or query parameters if not stored in server settings
    if (!apiKey) {
      apiKey = req.headers["x-api-key"] || parsedUrl.query.api_key || parsedUrl.query.token || "";
      if (req.headers["authorization"] && req.headers["authorization"].startsWith("Bearer ")) {
        apiKey = req.headers["authorization"].replace(/^Bearer\s+/i, "");
      }
    }

    let subPath = rawPath.replace(/^\/api\/dispatcharr/, "").replace(/^\/dispatcharr/, "") || "/";
    const cleanSubPath = subPath.split("?")[0].replace(/\/$/, "");

    // Alias mapping for Dispatcharr Swagger OpenAPI endpoints (Django requires trailing slashes)
    if (cleanSubPath === "/epg" || cleanSubPath === "/api/epg" || cleanSubPath === "/output/epg" || cleanSubPath === "/output/xmltv") {
      subPath = subPath.replace(cleanSubPath, "/api/epg/programs/");
    } else if (cleanSubPath === "/channels" || cleanSubPath === "/api/channels" || cleanSubPath === "/output/m3u") {
      subPath = subPath.replace(cleanSubPath, "/api/channels/channels/");
    } else if (cleanSubPath === "/recordings" || cleanSubPath === "/api/recordings") {
      subPath = subPath.replace(cleanSubPath, "/api/channels/recordings/");
    } else if (cleanSubPath.startsWith("/proxy/ts/stream/")) {
      const parts = subPath.split("?");
      const cleanBase = parts[0].replace(/\/+$/, "");
      subPath = `${cleanBase}/` + (parts[1] ? `?${parts[1]}` : "");
    }

    const targetDispatcharrUrl = `${dispatcharrUrl}${subPath.startsWith("/") ? "" : "/"}${subPath}`;

    logMessage(`[Dispatcharr Proxy] Initiated by [${initiator.initiatorComponent}] (${initiator.ip}) -> ${req.method} ${targetDispatcharrUrl}`);

    try {
      const targetParsed = url.parse(targetDispatcharrUrl);
      const isHttps = targetParsed.protocol === "https:";
      const httpModule = isHttps ? require("https") : require("http");

      const headers = { ...req.headers, host: targetParsed.host };
      delete headers["content-length"];
      if (apiKey) {
        if (apiKey.startsWith("eyJ")) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        } else {
          headers["X-API-Key"] = apiKey;
          delete headers["authorization"];
        }
      }

      const proxyReq = httpModule.request(targetDispatcharrUrl, {
        method: req.method,
        headers: headers,
        rejectUnauthorized: false, // Allow local self-signed HTTPS certs
        timeout: 30000
      }, (proxyRes) => {
        const duration = Date.now() - startTime;
        logMessage(`[Dispatcharr Proxy Response] ${req.method} ${targetDispatcharrUrl} -> Status ${proxyRes.statusCode} (${duration}ms) | Initiator: [${initiator.initiatorComponent}] (${initiator.ip})`);
        if (proxyRes.statusCode >= 400) {
          logMessage(`[Dispatcharr HTTP Warning] ${req.method} ${targetDispatcharrUrl} returned HTTP ${proxyRes.statusCode} for [${initiator.initiatorComponent}] (${initiator.ip})`, true);
        }
        if (!res.headersSent) {
          res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            "Access-Control-Allow-Origin": "*"
          });
          proxyRes.pipe(res);
        }
      });

      proxyReq.on("error", (err) => {
        if (res.headersSent) return;
        const duration = Date.now() - startTime;
        logMessage(`[Dispatcharr Proxy Network Error] ${req.method} ${targetDispatcharrUrl} failed (${duration}ms) for [${initiator.initiatorComponent}] (${initiator.ip}): ${err.message}`, true);
        sendJson(res, 502, { error: `Dispatcharr proxy error: ${err.message}`, targetUrl: targetDispatcharrUrl, dispatcharrUrl });
      });

      proxyReq.on("timeout", () => {
        proxyReq.destroy();
        if (res.headersSent) return;
        const duration = Date.now() - startTime;
        logMessage(`[Dispatcharr Proxy Timeout Error] ${req.method} ${targetDispatcharrUrl} timed out after ${duration}ms for [${initiator.initiatorComponent}] (${initiator.ip})`, true);
        sendJson(res, 504, { error: "Dispatcharr proxy request timed out", targetUrl: targetDispatcharrUrl, dispatcharrUrl });
      });

      if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }
    } catch (err) {
      logMessage(`[Dispatcharr Proxy Exception] Initiated by [${initiator.initiatorComponent}] (${initiator.ip}) - Failed: ${err.stack || err.message}`, true);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  const duration = Date.now() - startTime;
  logMessage(`[HTTP 404 Warning] Unmatched Route ${req.method} ${rawPath} (${duration}ms) | Client IP: ${initiator.ip} | Initiator: [${initiator.initiatorComponent}] | Referer: ${initiator.referer}`, true);
  return sendJson(res, 404, { error: "Endpoint not found." });
});

process.on("uncaughtException", (err) => {
  logMessage(`[BubbaFlix Server Uncaught Exception]: ${err.stack || err}`, true);
});

process.on("unhandledRejection", (reason) => {
  logMessage(`[BubbaFlix Server Unhandled Rejection]: ${reason}`, true);
});

// Dispatcharr 2-Hour Automated Playlist & EPG Refresh Engine
const triggerDispatcharrSync = async () => {
  try {
    const settings = loadServerSettings();
    const dispatcharrUrl = (settings.dispatcharrUrl || "http://192.168.10.3:9191").replace(/\/$/, "");
    let apiKey = settings.dispatcharrApiKey || "";

    logMessage(`[Dispatcharr Auto-Sync] Requesting 2-Hour Playlist & EPG update on ${dispatcharrUrl}...`);

    const headers = { "Content-Type": "application/json" };
    if (apiKey) {
      if (apiKey.startsWith("eyJ")) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      } else {
        headers["X-API-Key"] = apiKey;
      }
    }

    const isHttps = dispatcharrUrl.startsWith("https:");
    const httpModule = isHttps ? require("https") : require("http");

    // 1. Trigger M3U Playlists Refresh (POST /api/m3u/refresh/)
    try {
      const m3uReq = httpModule.request(`${dispatcharrUrl}/api/m3u/refresh/`, {
        method: "POST",
        headers,
        rejectUnauthorized: false,
        timeout: 15000
      }, (res) => {
        logMessage(`[Dispatcharr Auto-Sync] M3U Playlist Refresh Triggered -> Status ${res.statusCode}`);
      });
      m3uReq.on("error", (e) => logMessage(`[Dispatcharr Auto-Sync] M3U Refresh Warning: ${e.message}`, true));
      m3uReq.end();
    } catch (e) {
      logMessage(`[Dispatcharr Auto-Sync] M3U Refresh Error: ${e.message}`, true);
    }

    // 2. Trigger EPG Sources Import (POST /api/epg/import/)
    try {
      const sourcesReq = httpModule.request(`${dispatcharrUrl}/api/epg/sources/`, {
        method: "GET",
        headers,
        rejectUnauthorized: false,
        timeout: 15000
      }, (res) => {
        let body = "";
        res.on("data", chunk => body += chunk);
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            const sources = Array.isArray(data) ? data : (data.results || []);
            if (sources.length > 0) {
              sources.forEach(source => {
                const sourceId = source.id;
                const importReq = httpModule.request(`${dispatcharrUrl}/api/epg/import/`, {
                  method: "POST",
                  headers,
                  rejectUnauthorized: false,
                  timeout: 15000
                }, (impRes) => {
                  logMessage(`[Dispatcharr Auto-Sync] EPG Import Triggered for Source #${sourceId} -> Status ${impRes.statusCode}`);
                });
                importReq.on("error", () => {});
                importReq.write(JSON.stringify({ source_id: sourceId, source: sourceId }));
                importReq.end();
              });
            } else {
              const importReq = httpModule.request(`${dispatcharrUrl}/api/epg/import/`, {
                method: "POST",
                headers,
                rejectUnauthorized: false,
                timeout: 15000
              }, (impRes) => {
                logMessage(`[Dispatcharr Auto-Sync] Generic EPG Import Triggered -> Status ${impRes.statusCode}`);
              });
              importReq.on("error", () => {});
              importReq.end();
            }
          } catch (e) {
            const importReq = httpModule.request(`${dispatcharrUrl}/api/epg/import/`, {
              method: "POST",
              headers,
              rejectUnauthorized: false,
              timeout: 15000
            }, (impRes) => {
              logMessage(`[Dispatcharr Auto-Sync] EPG Import Triggered -> Status ${impRes.statusCode}`);
            });
            importReq.on("error", () => {});
            importReq.end();
          }
        });
      });
      sourcesReq.on("error", (e) => logMessage(`[Dispatcharr Auto-Sync] EPG Sources Warning: ${e.message}`, true));
      sourcesReq.end();
    } catch (e) {
      logMessage(`[Dispatcharr Auto-Sync] EPG Refresh Error: ${e.message}`, true);
    }

    return true;
  } catch (err) {
    logMessage(`[Dispatcharr Auto-Sync Exception]: ${err.message}`, true);
    return false;
  }
};

// Schedule 2-Hour Automated Sync (2 hours = 7,200,000 ms)
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
setInterval(triggerDispatcharrSync, TWO_HOURS_MS);

server.listen(PORT, "0.0.0.0", () => {
  logMessage(`[BubbaFlix Backend Transcoder & Settings Engine] Pure Node Server listening on 0.0.0.0:${PORT}`);
  loadServerSettings();
  setTimeout(triggerDispatcharrSync, 30000);
});

server.on("error", (err) => {
  logMessage(`[BubbaFlix Backend Listen Error]: ${err.stack || err}`, true);
});
