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

// In-Memory Fast Cache for EPG 6-Hour Schedule & DVR Recordings
let cachedEpgPrograms = [];
let cachedDvrRecordings = [];
let cachedChannelsList = [];
let lastEpgFetchTime = 0;

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

// Background EPG (6-Hour Active Window) & DVR Recordings Reload Engine
const fetchDispatcharrDataBackground = async () => {
  const settings = loadServerSettings();
  if (!settings.dispatcharrUrl) return;

  const rawUrl = settings.dispatcharrUrl.replace(/\/$/, "");
  const apiKey = settings.dispatcharrApiKey || "";

  const headers = {
    "User-Agent": "BubbaFlix-Server-BackgroundCache/1.0"
  };
  if (apiKey) {
    if (apiKey.startsWith("eyJ")) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["x-api-key"] = apiKey;
    }
  }

  logMessage(`[Background Cache Engine] Starting 1-hour background reload for EPG and DVR recordings...`);

  const httpModule = rawUrl.startsWith("https:") ? require("https") : require("http");

  const makeRequest = (endpoint) => {
    return new Promise((resolve) => {
      const fullUrl = `${rawUrl}${endpoint}`;
      try {
        const req = httpModule.get(fullUrl, { headers, timeout: 15000, rejectUnauthorized: false }, (res) => {
          let body = "";
          res.on("data", (chunk) => { body += chunk; });
          res.on("end", () => {
            try {
              const parsed = JSON.parse(body);
              resolve(Array.isArray(parsed) ? parsed : (parsed.results || parsed.data || []));
            } catch (e) {
              resolve([]);
            }
          });
        });
        req.on("error", () => resolve([]));
      } catch (e) {
        resolve([]);
      }
    });
  };

  try {
    const [progs, recs, chans] = await Promise.all([
      makeRequest("/api/epg/programs/?page_size=2000"),
      makeRequest("/api/epg/recordings/?page_size=1000"),
      makeRequest("/api/channels/channels/?page_size=1000")
    ]);

    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

    // Filter EPG: Only keep currently playing programs or those starting within the next 6 hours!
    const filteredProgs = (progs || []).filter((p) => {
      if (!p || !p.start_time || !p.end_time) return false;
      const start = new Date(p.start_time);
      const end = new Date(p.end_time);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
      // Exclude expired past programs that ended before now
      if (end <= now) return false;
      // Exclude future programs starting beyond 6 hours
      if (start > sixHoursLater) return false;
      return true;
    });

    cachedEpgPrograms = filteredProgs;
    cachedDvrRecordings = recs || [];
    cachedChannelsList = chans || [];
    lastEpgFetchTime = Date.now();

    logMessage(`[Background Cache Engine] Refresh Complete! Cached ${cachedEpgPrograms.length} active/6h EPG programs, ${cachedDvrRecordings.length} DVR recordings, and ${cachedChannelsList.length} channels.`);
  } catch (err) {
    logMessage(`[Background Cache Engine] Background fetch warning: ${err.message}`, true);
  }
};

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

    let gpuType = "CPU Software (libx264)";
    let encoder = "libx264";
    let inputArgs = [];
    let outputArgs = ["-c:v", "libx264", "-preset", "superfast", "-crf", "20", "-pix_fmt", "yuv420p", "-maxrate", "6M", "-bufsize", "8M"];

    if (hasNvenc) {
      gpuType = "NVIDIA Hardware Acceleration (NVENC)";
      encoder = "h264_nvenc";
      inputArgs = hwaccelsOutput.includes("cuda") ? ["-hwaccel", "cuda"] : [];
      outputArgs = [
        "-c:v", "h264_nvenc",
        "-preset", "p4",
        "-rc", "vbr",
        "-cq", "20",
        "-b:v", "4M",
        "-maxrate", "6M",
        "-bufsize", "8M",
        "-spatial-aq", "1",
        "-temporal-aq", "1"
      ];
    } else if (hasQsv) {
      gpuType = "Intel QuickSync Hardware Acceleration (QSV)";
      encoder = "h264_qsv";
      inputArgs = hwaccelsOutput.includes("qsv") ? ["-hwaccel", "qsv"] : [];
      outputArgs = [
        "-c:v", "h264_qsv",
        "-preset", "medium",
        "-global_quality", "21",
        "-b:v", "4M",
        "-maxrate", "6M",
        "-bufsize", "8M"
      ];
    } else if (hasAmf) {
      gpuType = "AMD Hardware Acceleration (AMF)";
      encoder = "h264_amf";
      inputArgs = [];
      outputArgs = [
        "-c:v", "h264_amf",
        "-quality", "quality",
        "-rc", "cqp",
        "-qp_i", "20",
        "-qp_p", "22",
        "-b:v", "4M"
      ];
    } else if (hasVaapi) {
      gpuType = "Linux Hardware Acceleration (VAAPI / Intel iGPU)";
      encoder = "h264_vaapi";
      const fs = require("fs");
      const hasRenderNode = fs.existsSync("/dev/dri/renderD128");
      inputArgs = hasRenderNode
        ? ["-hwaccel", "vaapi", "-vaapi_device", "/dev/dri/renderD128"]
        : ["-hwaccel", "vaapi"];
      outputArgs = [
        "-vf", "format=nv12,hwupload",
        "-c:v", "h264_vaapi",
        "-qp", "21",
        "-b:v", "4M",
        "-maxrate", "6M"
      ];
    } else if (hasVideotoolbox) {
      gpuType = "Apple Hardware Acceleration (VideoToolbox)";
      encoder = "h264_videotoolbox";
      inputArgs = [];
      outputArgs = [
        "-c:v", "h264_videotoolbox",
        "-b:v", "4M",
        "-maxrate", "6M",
        "-realtime", "true"
      ];
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

const resolveFinalStreamUrl = (startUrl, apiKey, maxRedirects = 5) => {
  return new Promise((resolve) => {
    if (
      maxRedirects <= 0 ||
      !startUrl ||
      !startUrl.startsWith("http") ||
      startUrl.includes("/proxy/ts/stream") ||
      startUrl.includes("/stream") ||
      startUrl.includes(".m3u8") ||
      startUrl.includes(".ts")
    ) {
      return resolve(startUrl);
    }

    try {
      const parsed = new URL(startUrl);
      const isHttps = parsed.protocol === "https:";
      const httpModule = isHttps ? require("https") : require("http");

      const reqHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      };
      if (apiKey) {
        if (apiKey.startsWith("eyJ")) {
          reqHeaders["Authorization"] = `Bearer ${apiKey}`;
        } else {
          reqHeaders["x-api-key"] = apiKey;
        }
      }

      const req = httpModule.request(startUrl, {
        method: "HEAD",
        headers: reqHeaders,
        rejectUnauthorized: false,
        timeout: 4000,
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          let loc = res.headers.location;
          if (!loc.startsWith("http")) {
            loc = new URL(loc, startUrl).toString();
          }
          if (apiKey && !loc.includes("api_key=") && !loc.includes("token=")) {
            const sep = loc.includes("?") ? "&" : "?";
            loc = `${loc}${sep}api_key=${encodeURIComponent(apiKey)}`;
          }
          logMessage(`[Pre-Transcode Redirect Follower ${res.statusCode}] Resolved redirect to: ${loc}`);
          resolve(resolveFinalStreamUrl(loc, apiKey, maxRedirects - 1));
        } else {
          resolve(startUrl);
        }
      });

      req.on("error", () => resolve(startUrl));
      req.on("timeout", () => {
        req.destroy();
        resolve(startUrl);
      });
      req.end();
    } catch (e) {
      resolve(startUrl);
    }
  });
};

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

    let cleanedTargetUrl = targetUrl;
    try {
      cleanedTargetUrl = encodeURI(decodeURI(targetUrl));
    } catch (e) {
      cleanedTargetUrl = targetUrl;
    }

    const settings = loadServerSettings();
    const rawDispatcharrUrl = (settings.dispatcharrUrl || "http://192.168.10.3:9191").replace(/\/$/, "");

    const isDispatcharrTarget =
      cleanedTargetUrl.includes("/api/dispatcharr/") ||
      cleanedTargetUrl.includes("/dispatcharr/") ||
      cleanedTargetUrl.includes(rawDispatcharrUrl) ||
      cleanedTargetUrl.startsWith("http://192.168.") ||
      cleanedTargetUrl.startsWith("http://10.") ||
      cleanedTargetUrl.startsWith("http://172.16.");

    let resolvedTargetUrl = cleanedTargetUrl;
    if (isDispatcharrTarget) {
      if (cleanedTargetUrl.includes("/api/dispatcharr/") || cleanedTargetUrl.includes("/dispatcharr/")) {
        const subPath = cleanedTargetUrl.replace(/^https?:\/\/[^\/]+/, "").replace(/^\/api\/dispatcharr/, "").replace(/^\/dispatcharr/, "");
        resolvedTargetUrl = `${rawDispatcharrUrl}${subPath.startsWith("/") ? "" : "/"}${subPath}`;
        logMessage(`[Transcoder Direct Resolve] Rewrote internal proxy URL to direct Dispatcharr target: ${resolvedTargetUrl}`);
      }

      if (settings.dispatcharrApiKey && !resolvedTargetUrl.includes("api_key=") && !resolvedTargetUrl.includes("token=")) {
        const sep = resolvedTargetUrl.includes("?") ? "&" : "?";
        resolvedTargetUrl = `${resolvedTargetUrl}${sep}api_key=${encodeURIComponent(settings.dispatcharrApiKey)}`;
      }
    }

    const preResolvePromise = isDispatcharrTarget
      ? resolveFinalStreamUrl(resolvedTargetUrl, settings.dispatcharrApiKey)
      : Promise.resolve(resolvedTargetUrl);

    preResolvePromise.then((finalMediaUrl) => {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Transfer-Encoding": "chunked",
        "Access-Control-Allow-Origin": "*",
      });

      let authHeaderStr = "";
      if (isDispatcharrTarget && settings.dispatcharrApiKey) {
        if (settings.dispatcharrApiKey.startsWith("eyJ")) {
          authHeaderStr = `Authorization: Bearer ${settings.dispatcharrApiKey}\r\n`;
        } else {
          authHeaderStr = `x-api-key: ${settings.dispatcharrApiKey}\r\n`;
        }
      }
      const headersStr = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: */*\r\n${authHeaderStr}`;

      const gpuInfo = detectGpuCapabilities();
      const isLiveStream = finalMediaUrl.includes("/proxy/ts/stream") || finalMediaUrl.includes("/stream/");

      const ffmpegArgs = [
        "-headers", headersStr,
        "-tls_verify", "0",
        "-reconnect", "1",
        "-reconnect_at_eof", "1",
        "-reconnect_streamed", "1",
        "-reconnect_delay_max", "3",
        ...(isLiveStream
          ? ["-fflags", "+genpts+discardcorrupt", "-analyzeduration", "1500000", "-probesize", "1500000"]
          : ["-analyzeduration", "3000000", "-probesize", "3000000"]),
        "-threads", String(cpuCount),
        ...(gpuInfo.inputArgs || []),
        "-i", finalMediaUrl,
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
    let clientClosedConnection = false;

    ffmpegProcess.stderr.on("data", (data) => {
      const logLine = data.toString();
      logMessage(`[FFmpeg Output] ${logLine.trim()}`);
      if (
        logLine.includes("Device creation failed") ||
        logLine.includes("No device available") ||
        logLine.includes("Hardware device setup failed") ||
        logLine.includes("CUDA_ERROR") ||
        logLine.includes("Cannot load libcuda") ||
        logLine.includes("Failed to create Nvenc") ||
        logLine.includes("Error creating CUDA context") ||
        logLine.includes("MFX session failed")
      ) {
        hasGpuDeviceError = true;
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
      if (code !== 0 && !clientClosedConnection && gpuInfo.enabled && hasGpuDeviceError) {
        logMessage(`[GPU Transcoder Engine Warning] GPU Hardware device error detected (exit code ${code}). Reverting cached config to CPU libx264 fallback.`, true);
        cachedGpuConfig = {
          enabled: false,
          type: "CPU Software (libx264)",
          encoder: "libx264",
          inputArgs: [],
          outputArgs: ["-c:v", "libx264", "-preset", "superfast", "-crf", "20", "-pix_fmt", "yuv420p", "-maxrate", "6M", "-bufsize", "8M"]
        };
      }
      if (!res.writableEnded) {
        res.end();
      }
    });

    req.on("close", () => {
      clientClosedConnection = true;
      logMessage(`[Backend Transcoder Engine] Client [${initiator.initiatorComponent}] (${initiator.ip}) closed HTTP connection. Terminating FFmpeg process...`);
      ffmpegProcess.kill("SIGKILL");
    });
    });
    return;
  }

  // GET Settings API
  if ((cleanPath === "/api/settings" || cleanPath === "/settings") && req.method === "GET") {
    const settings = loadServerSettings();
    const cpuTopology = getCpuTopologyInfo();
    const gpuInfo = detectGpuCapabilities();
    logMessage(`[Settings GET] Served settings to [${initiator.initiatorComponent}] (${initiator.ip}) | CPU: ${cpuTopology.model} (${cpuTopology.logicalCores} threads) | GPU: ${gpuInfo.type}`);
    return sendJson(res, 200, { status: "success", settings, ...settings, cpuTopology, gpuInfo });
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
  // Dispatcharr Proxy Endpoints for Live TV Streams, Channels, EPG Guide, & Recordings
  if (
    cleanPath.startsWith("/api/dispatcharr") ||
    cleanPath.startsWith("/dispatcharr") ||
    cleanPath.startsWith("/proxy/ts/")
  ) {
    const settings = loadServerSettings();
    const rawDispatcharrUrl = (settings.dispatcharrUrl || "http://192.168.10.3:9191").replace(/\/$/, "");
    let apiKey = settings.dispatcharrApiKey || "";

    if (!apiKey) {
      apiKey = req.headers["x-api-key"] || parsedUrl.query.api_key || parsedUrl.query.token || "";
      if (req.headers["authorization"] && req.headers["authorization"].startsWith("Bearer ")) {
        apiKey = req.headers["authorization"].replace(/^Bearer\s+/i, "");
      }
    }

    let subPath = rawPath.replace(/^\/api\/dispatcharr/, "").replace(/^\/dispatcharr/, "") || "/";
    if (subPath.includes("?")) {
      const parts = subPath.split("?");
      const base = parts[0];
      const queries = parts.slice(1).filter(Boolean).join("&");
      subPath = `${base}?${queries}`;
    }

    // Serve directly from background memory cache (eliminates page-load refresh)
    if (req.method === "GET") {
      if ((subPath === "/epg/programs" || subPath.startsWith("/epg/programs/") || subPath.includes("/epg/grid") || subPath.includes("/cache/epg")) && !subPath.includes("/stream")) {
        if (cachedEpgPrograms.length > 0) {
          logMessage(`[Fast Server Cache] Served ${cachedEpgPrograms.length} cached EPG programs directly to [${initiator.initiatorComponent}] (${initiator.ip}).`);
          return sendJson(res, 200, cachedEpgPrograms);
        }
      }
      if (subPath.includes("/epg/recordings") || (subPath.includes("/channels/recordings") && !subPath.includes("/file/") && !subPath.includes("/stream/")) || subPath.includes("/cache/recordings")) {
        if (cachedDvrRecordings.length > 0) {
          logMessage(`[Fast Server Cache] Served ${cachedDvrRecordings.length} cached DVR recordings directly to [${initiator.initiatorComponent}] (${initiator.ip}).`);
          return sendJson(res, 200, cachedDvrRecordings);
        }
      }
      if ((subPath === "/channels/channels" || subPath.startsWith("/channels/channels/") || subPath.includes("/cache/channels")) && !subPath.includes("/stream") && !subPath.includes("/watch") && !subPath.includes("/file/")) {
        if (cachedChannelsList.length > 0 && !subPath.match(/\/channels\/channels\/\d+\//)) {
          logMessage(`[Fast Server Cache] Served ${cachedChannelsList.length} cached channels directly to [${initiator.initiatorComponent}] (${initiator.ip}).`);
          return sendJson(res, 200, cachedChannelsList);
        }
      }
    }

    const targetDispatcharrUrl = `${rawDispatcharrUrl}${subPath.startsWith("/") ? "" : "/"}${subPath}`;

    const proxyHeaders = {};
    for (const key of Object.keys(req.headers)) {
      const lower = key.toLowerCase();
      if (lower !== "host" && lower !== "content-length" && lower !== "connection") {
        proxyHeaders[key] = req.headers[key];
      }
    }

    if (apiKey) {
      proxyHeaders["x-api-key"] = apiKey;
      if (apiKey.startsWith("eyJ")) {
        proxyHeaders["authorization"] = `Bearer ${apiKey}`;
      } else {
        proxyHeaders["authorization"] = `Api-Key ${apiKey}`;
      }
    }

    const proxyWithRedirects = (req, res, targetUrl, headers, maxRedirects = 5) => {
      if (maxRedirects <= 0) {
        if (!res.headersSent) sendJson(res, 502, { error: "Too many redirects from stream server." });
        return;
      }

      try {
        const targetParsed = new URL(targetUrl);
        const isHttps = targetParsed.protocol === "https:";
        const httpModule = isHttps ? require("https") : require("http");
        const currentHeaders = { ...headers, host: targetParsed.host };

        const proxyReq = httpModule.request(targetUrl, {
          method: req.method,
          headers: currentHeaders,
          rejectUnauthorized: false,
          timeout: 15000,
        }, (proxyRes) => {
          if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
            let redirectUrl = proxyRes.headers.location;
            if (!redirectUrl.startsWith("http")) {
              redirectUrl = new URL(redirectUrl, targetUrl).toString();
            }
            logMessage(`[Dispatcharr Proxy Redirect ${proxyRes.statusCode}] Following redirect to: ${redirectUrl}`);
            return proxyWithRedirects(req, res, redirectUrl, headers, maxRedirects - 1);
          }

          if (!res.headersSent) {
            res.writeHead(proxyRes.statusCode, {
              ...proxyRes.headers,
              "Access-Control-Allow-Origin": "*",
            });
            proxyRes.pipe(res);
          }
        });

        proxyReq.on("error", (err) => {
          if (!res.headersSent) {
            sendJson(res, 502, { error: `Dispatcharr proxy error: ${err.message}`, targetUrl });
          }
        });

        if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE") {
          req.pipe(proxyReq);
        } else {
          proxyReq.end();
        }
      } catch (e) {
        if (!res.headersSent) {
          sendJson(res, 500, { error: `Dispatcharr proxy exception: ${e.message}` });
        }
      }
    };

    proxyWithRedirects(req, res, targetDispatcharrUrl, proxyHeaders);
    return;
  }

  // Static File Serving for Production Vite Web App (dist folder)
  const distDir = path.join(__dirname, "..", "dist");
  let filePath = path.join(distDir, cleanPath === "/" ? "index.html" : cleanPath);

  // Security check to prevent path traversal
  if (!filePath.startsWith(distDir)) {
    return sendJson(res, 403, { error: "Access Denied" });
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

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(distDir, "index.html");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        const duration = Date.now() - startTime;
        logMessage(`[HTTP 404 Warning] Unmatched Route ${req.method} ${rawPath} (${duration}ms) | Client IP: ${initiator.ip}`, true);
        return sendJson(res, 404, { error: "Endpoint not found." });
      }

      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": ext === ".html" ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(content);
    });
  });
});

process.on("uncaughtException", (err) => {
  logMessage(`[BubbaFlix Server Uncaught Exception]: ${err.stack || err}`, true);
});

process.on("unhandledRejection", (reason) => {
  logMessage(`[BubbaFlix Server Unhandled Rejection]: ${reason}`, true);
});

server.listen(PORT, "0.0.0.0", () => {
  const gpuInfo = detectGpuCapabilities();
  logMessage(`================================================================================`);
  logMessage(`[BubbaFlix Server Startup] Pure Node Server listening on 0.0.0.0:${PORT}`);
  logMessage(`[CPU Hardware Topology] Model: ${cpuModel}`);
  logMessage(`[CPU Hardware Topology] Logical Cores / Hyperthreads: ${cpuCount}`);
  logMessage(`[CPU Hardware Topology] Libuv Threadpool Size (UV_THREADPOOL_SIZE): ${uvThreadPoolSize}`);
  logMessage(`[CPU Hardware Topology] Multi-Core Hyperthreading Active: YES`);
  logMessage(`[GPU Hardware Engine] Auto-Detected GPU Accelerator: ${gpuInfo.type} (${gpuInfo.encoder})`);
  logMessage(`[GPU Hardware Engine] GPU Acceleration Active: ${gpuInfo.enabled ? "YES (Hardware Encoding)" : "NO (CPU Software Fallback)"}`);
  logMessage(`================================================================================`);
  loadServerSettings();

  // Load EPG & DVR recordings in background immediately on startup
  fetchDispatcharrDataBackground();
  // Schedule recurring reload every 1 hour (3600000 ms)
  setInterval(fetchDispatcharrDataBackground, 3600000);
});

server.on("error", (err) => {
  logMessage(`[BubbaFlix Backend Listen Error]: ${err.stack || err}`, true);
});
