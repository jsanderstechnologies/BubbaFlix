const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const dgram = require("dgram");
const os = require("os");
const { spawn } = require("child_process");

// Multi-Core & Hyperthreading Utilization Engine
const cpusList = os.cpus();
const cpuCount = cpusList ? cpusList.length : 4;
const cpuModel = cpusList && cpusList.length > 0 ? cpusList[0].model.trim() : "Generic Multi-Core CPU";
// Prioritize high-concurrency hyperthreading worker pool size
const uvThreadPoolSize = String(Math.max(16, cpuCount * 2));
process.env.UV_THREADPOOL_SIZE = uvThreadPoolSize;

const getCpuTopologyInfo = () => ({
  model: cpuModel,
  logicalCores: cpuCount,
  uvThreadPoolSize: uvThreadPoolSize,
  hyperthreadingActive: cpuCount > 1,
  arch: os.arch(),
  platform: os.platform(),
});


// Internal Node settings server port (always 5000 for Nginx proxy inside container)
const PORT = process.env.PORT || 5000;
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
  const defaultResolutions = process.env.STREAM_RESOLUTIONS
    ? process.env.STREAM_RESOLUTIONS.split(",").map((s) => s.trim())
    : ["2160p", "1080p", "720p", "480p"];
  const defaultExcludeLow = process.env.STREAM_EXCLUDE_LOW_QUALITY !== undefined
    ? process.env.STREAM_EXCLUDE_LOW_QUALITY.toLowerCase() === "true"
    : true;

  return {
    theme: process.env.THEME || process.env.DEFAULT_THEME || "dark-red",
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

// Helper to extract initiator details from request headers
const getRequestInitiator = (req) => {
  const ip = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket?.remoteAddress || "127.0.0.1";
  const clientIp = ip.split(",")[0].trim();
  const userAgent = req.headers["user-agent"] || "Unknown Client";
  const referer = req.headers["referer"] || req.headers["origin"] || "Direct Connection";

  let initiatorComponent = "Unknown Component";
  if (referer.includes("/settings")) {
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
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  parsedUrl.query = Object.fromEntries(parsedUrl.searchParams);
  const rawPath = (parsedUrl.pathname || "/") + (parsedUrl.search || "");
  const rawClean = parsedUrl.pathname || "/";
  const cleanPath = rawClean.length > 1 && rawClean.endsWith("/") ? rawClean.slice(0, -1) : rawClean;
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

  // CORS-transparent Stream Proxy Endpoint
  // Allows MoviPlayer (WASM) to fetch video bytes from CDNs that don't send CORS headers.
  // Pure pipe-through — zero transcoding, no FFmpeg.
  if ((cleanPath === "/api/proxy" || cleanPath === "/proxy") && req.method === "GET") {
    const targetUrl = parsedUrl.searchParams.get("url");
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return sendJson(res, 400, { error: "Missing or invalid 'url' parameter." });
    }

    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === "https:";
      const httpModule = isHttps ? require("https") : require("http");

      const proxyHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      };

      // Forward Range header if present (needed for seeking in MoviPlayer)
      if (req.headers["range"]) {
        proxyHeaders["Range"] = req.headers["range"];
      }

      logMessage(`[Stream Proxy] Forwarding request for [${initiator.initiatorComponent}] (${initiator.ip}): ${targetUrl.substring(0, 100)}...`);

      const upstream = httpModule.request(targetUrl, {
        method: "GET",
        headers: proxyHeaders,
        rejectUnauthorized: false,
        timeout: 15000,
      }, (upstreamRes) => {
        const responseHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
        };

        // Forward relevant upstream headers
        const forwardHeaders = [
          "content-type", "content-length", "content-range",
          "accept-ranges", "last-modified", "etag"
        ];
        for (const h of forwardHeaders) {
          if (upstreamRes.headers[h]) {
            responseHeaders[h] = upstreamRes.headers[h];
          }
        }

        res.writeHead(upstreamRes.statusCode || 200, responseHeaders);
        upstreamRes.pipe(res);
        req.on("close", () => upstream.destroy());
      });

      upstream.on("error", (err) => {
        logMessage(`[Stream Proxy Error] ${err.message}`, true);
        if (!res.headersSent) {
          sendJson(res, 502, { error: "Upstream stream error." });
        }
      });

      upstream.end();
    } catch (err) {
      logMessage(`[Stream Proxy Exception] ${err.message}`, true);
      if (!res.headersSent) sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // GET Settings API
  if ((cleanPath === "/api/settings" || cleanPath === "/settings") && req.method === "GET") {
    const settings = loadServerSettings();
    const cpuTopology = getCpuTopologyInfo();

    logMessage(`[Settings GET] Served settings to [${initiator.initiatorComponent}] (${initiator.ip}) | CPU: ${cpuTopology.model} (${cpuTopology.logicalCores} threads)`);
    return sendJson(res, 200, { status: "success", settings, ...settings, cpuTopology });
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
        const msg = payload.message || payload.error || "Client Report";
        const src = payload.source || initiator.initiatorComponent || "Client App";
        const mediaUrl = payload.mediaUrl || payload.url || "";
        const title = payload.title || payload.mediaTitle || "";

        let logStr = `[Android/Client Player Error] Source: ${src} | Client IP: ${initiator.ip} | Message: ${msg}`;
        if (title) logStr += ` | Title: ${title}`;
        if (payload.errorCode) logStr += ` | Code: ${payload.errorCode}`;
        if (mediaUrl) logStr += ` | Stream URL: ${mediaUrl}`;

        logMessage(logStr, true);
        return sendJson(res, 200, { status: "logged" });
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid log payload" });
      }
    });
    return;
  }

  // Transparent Groq AI Chat Completion Proxy Endpoint
  if ((cleanPath === "/api/groq/chat/completions" || cleanPath === "/groq/chat/completions") && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const settings = loadServerSettings();
        const serverGroqKey = settings.groqKey || process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
        const authHeader = req.headers.authorization || (serverGroqKey ? `Bearer ${serverGroqKey}` : "");

        if (!authHeader) {
          return sendJson(res, 400, { error: "Missing Groq API Key" });
        }

        const https = require("https");
        const groqReq = https.request("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        }, (groqRes) => {
          res.writeHead(groqRes.statusCode, groqRes.headers);
          groqRes.pipe(res);
        });

        groqReq.on("error", (e) => {
          logMessage(`[Groq Proxy Error]: ${e.message}`, true);
          return sendJson(res, 500, { error: e.message });
        });

        groqReq.write(body);
        groqReq.end();
      } catch (e) {
        logMessage(`[Groq Proxy Exception]: ${e.message}`, true);
        return sendJson(res, 500, { error: e.message });
      }
    });
    return;
  }

  // Transparent SIMKL API Proxy Endpoint
  if (cleanPath.startsWith("/api/simkl")) {
    const simklPath = cleanPath.replace(/^\/api\/simkl/, "");
    const queryString = parsedUrl.search || "";
    const targetSimklUrl = `https://api.simkl.com${simklPath}${queryString}`;

    const https = require("https");
    const proxyHeaders = { ...req.headers };
    delete proxyHeaders.host;
    delete proxyHeaders.connection;
    proxyHeaders["host"] = "api.simkl.com";

    const proxyReq = https.request(
      targetSimklUrl,
      {
        method: req.method,
        headers: proxyHeaders,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      logMessage(`[SIMKL API Proxy Error]: ${err.message}`, true);
      sendJson(res, 502, { error: "SIMKL upstream service unavailable." });
    });

    req.pipe(proxyReq);
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
          sendJson(res, 200, { versionCode: 2, versionName: "1.0.1" });
        }
      });
    }).on("error", (vErr) => {
      logMessage(`[Version Check Network Error] Unable to fetch version.json from GitHub: ${vErr.message}`, true);
      sendJson(res, 200, { versionCode: 2, versionName: "1.0.1" });
    });
    return;
  }

  // Static File Serving for Production Vite Web App (dist folder)
  const candidateDirs = [
    path.resolve(process.cwd(), "dist"),
    path.resolve(__dirname, "..", "dist"),
    path.resolve(__dirname, "dist"),
    "/app/dist"
  ];
  const distDir = candidateDirs.find((d) => fs.existsSync(path.join(d, "index.html"))) || candidateDirs[0];
  let filePath = path.join(distDir, cleanPath === "/" ? "index.html" : cleanPath);

  // Security check to prevent path traversal
  if (!filePath.startsWith(distDir)) {
    return sendJson(res, 403, { error: "Access Denied" });
  }

  // If request is an unmatched API endpoint (/api/...), return 404 JSON instead of HTML
  if (cleanPath.startsWith("/api/")) {
    const duration = Date.now() - startTime;
    logMessage(`[HTTP 404 Warning] Unmatched API Route ${req.method} ${rawPath} (${duration}ms) | Client IP: ${initiator.ip}`, true);
    return sendJson(res, 404, { error: "Endpoint not found." });
  }

  const mimeTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
  };

  const serveFile = (targetFile) => {
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(targetFile, (readErr, content) => {
      if (readErr) {
        if (targetFile !== path.join(distDir, "index.html")) {
          return serveFile(path.join(distDir, "index.html"));
        }
        const duration = Date.now() - startTime;
        logMessage(`[HTTP 404 Warning] Failed to serve file ${targetFile} (${duration}ms) | Client IP: ${initiator.ip}`, true);
        return sendJson(res, 404, { error: "Endpoint not found." });
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": ext === ".html" ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(content);
    });
  };

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(distDir, "index.html");
    }
    serveFile(filePath);
  });
});

process.on("uncaughtException", (err) => {
  logMessage(`[BubbaFlix Server Uncaught Exception]: ${err.stack || err}`, true);
});

process.on("unhandledRejection", (reason) => {
  logMessage(`[BubbaFlix Server Unhandled Rejection]: ${reason}`, true);
});

server.listen(PORT, "0.0.0.0", () => {
  logMessage(`================================================================================`);
  logMessage(`[BubbaFlix Server Startup] Pure Node Server listening on 0.0.0.0:${PORT}`);
  logMessage(`[CPU Hardware Topology] Model: ${cpuModel}`);
  logMessage(`[CPU Hardware Topology] Logical Cores / Hyperthreads: ${cpuCount}`);
  logMessage(`[CPU Hardware Topology] Libuv Threadpool Size (UV_THREADPOOL_SIZE): ${uvThreadPoolSize}`);
  logMessage(`[CPU Hardware Topology] Multi-Core Hyperthreading Active: YES`);
  logMessage(`================================================================================`);
  loadServerSettings();

  // Load EPG & DVR recordings in background immediately on startup
  // Schedule recurring reload every 1 hour (3600000 ms)
});

server.on("error", (err) => {
  logMessage(`[BubbaFlix Backend Listen Error]: ${err.stack || err}`, true);
});
