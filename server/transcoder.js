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

// GPU Hardware Acceleration Auto-Detection Engine
let cachedGpuConfig = null;
let verifiedDispatcharrUrl = null;

const detectGpuCapabilities = () => {
  if (cachedGpuConfig) return cachedGpuConfig;

  let encodersOutput = "";
  let hwaccelsOutput = "";

  try {
    const { execSync } = require("child_process");
    try {
      encodersOutput = execSync("ffmpeg -encoders", { encoding: "utf8", timeout: 4000, stdio: ["pipe", "pipe", "ignore"] });
    } catch (e) {
      encodersOutput = "";
    }
    try {
      hwaccelsOutput = execSync("ffmpeg -hwaccels", { encoding: "utf8", timeout: 4000, stdio: ["pipe", "pipe", "ignore"] });
    } catch (e) {
      hwaccelsOutput = "";
    }

    const hasNvenc = encodersOutput.includes("h264_nvenc");
    const hasQsv = encodersOutput.includes("h264_qsv");
    const hasAmf = encodersOutput.includes("h264_amf");
    const hasVaapi = encodersOutput.includes("h264_vaapi");
    const hasVideotoolbox = encodersOutput.includes("h264_videotoolbox");

    // Runtime hardware device initialization probe helper
    const probeHwDevice = (hwArg) => {
      try {
        const { execSync } = require("child_process");
        execSync(`ffmpeg -hide_banner -loglevel error -init_hw_device ${hwArg} -f null -`, {
          timeout: 2500,
          stdio: ["ignore", "ignore", "ignore"]
        });
        return true;
      } catch (e) {
        return false;
      }
    };

    let gpuType = "CPU Software (libx264)";
    let encoder = "libx264";
    let inputArgs = [];
    let outputArgs = ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "23"];

    if (hasNvenc && hwaccelsOutput.includes("cuda") && probeHwDevice("cuda")) {
      gpuType = "NVIDIA Hardware Acceleration (NVENC CUDA)";
      encoder = "h264_nvenc";
      inputArgs = ["-hwaccel", "cuda"];
      outputArgs = ["-c:v", "h264_nvenc", "-preset", "p1", "-tune", "ll"];
    } else if (hasNvenc && probeHwDevice("cuda")) {
      gpuType = "NVIDIA Hardware Acceleration (NVENC)";
      encoder = "h264_nvenc";
      inputArgs = [];
      outputArgs = ["-c:v", "h264_nvenc", "-preset", "p1", "-tune", "ll"];
    } else if (hasQsv && hwaccelsOutput.includes("qsv") && probeHwDevice("qsv=hw")) {
      gpuType = "Intel QuickSync Hardware Acceleration (QSV)";
      encoder = "h264_qsv";
      inputArgs = ["-hwaccel", "qsv"];
      outputArgs = ["-c:v", "h264_qsv", "-preset", "veryfast"];
    } else if (hasAmf) {
      gpuType = "AMD Hardware Acceleration (AMF)";
      encoder = "h264_amf";
      inputArgs = [];
      outputArgs = ["-c:v", "h264_amf", "-quality", "speed"];
    } else if (hasVaapi && hwaccelsOutput.includes("vaapi") && probeHwDevice("vaapi=va:/dev/dri/renderD128")) {
      gpuType = "Linux Hardware Acceleration (VAAPI)";
      encoder = "h264_vaapi";
      inputArgs = ["-hwaccel", "vaapi"];
      outputArgs = ["-c:v", "h264_vaapi"];
    } else if (hasVideotoolbox) {
      gpuType = "Apple Hardware Acceleration (VideoToolbox)";
      encoder = "h264_videotoolbox";
      inputArgs = [];
      outputArgs = ["-c:v", "h264_videotoolbox", "-realtime", "true"];
    }

    cachedGpuConfig = {
      enabled: encoder !== "libx264",
      type: gpuType,
      encoder: encoder,
      inputArgs: inputArgs,
      outputArgs: outputArgs
    };

    logMessage(`[GPU Transcoder Engine] Auto-Detected Hardware Accelerator: ${gpuType} (${encoder})`);
    return cachedGpuConfig;
  } catch (err) {
    cachedGpuConfig = {
      enabled: false,
      type: "CPU Software (libx264)",
      encoder: "libx264",
      inputArgs: [],
      outputArgs: ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "23"]
    };
    logMessage(`[GPU Transcoder Engine] GPU auto-detection fallback to CPU libx264: ${err.message}`);
    return cachedGpuConfig;
  }
};

  // Health check endpoint
  if ((cleanPath === "/api/transcode/health" || cleanPath === "/transcode/health") && req.method === "GET") {
    const gpuInfo = detectGpuCapabilities();
    logMessage(`[Health Check] Responded to [${initiator.initiatorComponent}] (${initiator.ip})`);
    return sendJson(res, 200, {
      status: "ok",
      service: "BubbaFlix Transcoder Engine",
      gpu_acceleration: {
        enabled: gpuInfo.enabled,
        type: gpuInfo.type,
        encoder: gpuInfo.encoder
      },
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

    const normalizedTargetUrl = targetUrl;
    const headersStr = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n`;

    const gpuInfo = detectGpuCapabilities();

    const ffmpegArgs = [
      "-headers", headersStr,
      "-reconnect", "1",
      "-reconnect_at_eof", "1",
      "-reconnect_streamed", "1",
      "-reconnect_delay_max", "2",
      "-analyzeduration", "10000000",
      "-probesize", "10000000",
      ...(gpuInfo.inputArgs || []),
      "-i", normalizedTargetUrl,
      ...(gpuInfo.outputArgs || []),
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

    let hasGpuDeviceError = false;

    ffmpegProcess.stderr.on("data", (data) => {
      const logLine = data.toString();
      if (
        logLine.includes("MFX session") ||
        logLine.includes("Device creation failed") ||
        logLine.includes("No device available") ||
        logLine.includes("Hardware device setup failed") ||
        logLine.includes("cuda") ||
        logLine.includes("vaapi")
      ) {
        hasGpuDeviceError = true;
      }
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
      if (code !== 0 && gpuInfo.enabled && hasGpuDeviceError) {
        logMessage(`[GPU Transcoder Engine Warning] GPU Hardware device error detected (exit code ${code}). Reverting cached config to CPU libx264 fallback.`, true);
        cachedGpuConfig = {
          enabled: false,
          type: "CPU Software (libx264)",
          encoder: "libx264",
          inputArgs: [],
          outputArgs: ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "23"]
        };
      }
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
    return sendJson(res, 200, { status: "success", settings, ...settings });
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
          sendJson(res, 200, { versionCode: 2, versionName: "1.0.1" });
        }
      });
    }).on("error", (vErr) => {
      logMessage(`[Version Check Network Error] Unable to fetch version.json from GitHub: ${vErr.message}`, true);
      sendJson(res, 200, { versionCode: 2, versionName: "1.0.1" });
    });
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

server.listen(PORT, "0.0.0.0", () => {
  logMessage(`[BubbaFlix Backend Transcoder & Settings Engine] Pure Node Server listening on 0.0.0.0:${PORT}`);
  loadServerSettings();
});

server.on("error", (err) => {
  logMessage(`[BubbaFlix Backend Listen Error]: ${err.stack || err}`, true);
});
