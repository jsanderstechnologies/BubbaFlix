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
const IMAGE_CACHE_DIR = path.join(DATA_DIR, "image_cache");
if (!fs.existsSync(IMAGE_CACHE_DIR)) {
  fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
}
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const LOG_FILE = path.join(DATA_DIR, "bubbaflix.log");
const https = require("https");

const crypto = require("crypto");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

// In-memory sessions { token: { userId, role, expiresAt } }
let activeSessions = {};
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

const loadSessions = () => {
  if (fs.existsSync(SESSIONS_FILE)) {
    try {
      activeSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      // Cleanup expired sessions on load
      const now = Date.now();
      let changed = false;
      for (const [token, session] of Object.entries(activeSessions)) {
        if (now > session.expiresAt) {
          delete activeSessions[token];
          changed = true;
        }
      }
      if (changed) saveSessions();
    } catch (e) {
      console.error("Error reading sessions.json");
    }
  }
};

const saveSessions = () => {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(activeSessions, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing sessions.json");
  }
};

loadSessions();

const getUsers = () => {
  if (fs.existsSync(USERS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    } catch (e) {
      logMessage("Error reading users.json", true);
    }
  }
  return {};
};

const saveUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (e) {
    logMessage("Error writing users.json", true);
  }
};

const hashPassword = (password, salt) => {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

const authenticate = (req) => {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  if (!token) return null;
  
  const session = activeSessions[token];
  if (!session) return null;
  
  if (Date.now() > session.expiresAt) {
    delete activeSessions[token];
    saveSessions();
    return null;
  }
  
  // Extend session
  session.expiresAt = Date.now() + SESSION_TTL;
  saveSessions();
  return session;
};


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


// GPU Hardware Acceleration Auto-Detection Engine
let cachedGpuConfig = null;

const detectGpuCapabilities = (videoCodec = null) => {
  if (cachedGpuConfig && !videoCodec) return cachedGpuConfig;
  let baseConfig = cachedGpuConfig;

  if (!baseConfig) {
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

    const verifyHardwareEncoder = (encoderName) => {
      try {
        let testCmd = "";
        if (encoderName === "h264_vaapi") {
          const fs = require("fs");
          const hasRenderNode = fs.existsSync("/dev/dri/renderD128");
          const vaapiDevice = hasRenderNode ? "-vaapi_device /dev/dri/renderD128 " : "";
          testCmd = `ffmpeg ${vaapiDevice}-f lavfi -i testsrc=duration=1:size=320x240:rate=30 -vf format=nv12,hwupload -c:v h264_vaapi -f null -`;
        } else if (encoderName === "h264_qsv") {
          const fs = require("fs");
          const hasRenderNode = fs.existsSync("/dev/dri/renderD128");
          const qsvDevice = hasRenderNode ? "-qsv_device /dev/dri/renderD128 " : "";
          testCmd = `ffmpeg ${qsvDevice}-f lavfi -i testsrc=duration=1:size=320x240:rate=30 -c:v h264_qsv -f null -`;
        } else {
          testCmd = `ffmpeg -f lavfi -i testsrc=duration=1:size=320x240:rate=30 -c:v ${encoderName} -f null -`;
        }
        execSync(testCmd, { encoding: "utf8", timeout: 4000, stdio: ["ignore", "ignore", "ignore"] });
        return true;
      } catch (err) {
        logMessage(`[GPU Verification Warning] ${encoderName} is compiled but sandbox hardware initialization test failed: ${err.message}. Disabling GPU option.`);
        return false;
      }
    };

    const hasNvenc = encodersOutput.includes("h264_nvenc") && verifyHardwareEncoder("h264_nvenc");
    const hasQsv = encodersOutput.includes("h264_qsv") && verifyHardwareEncoder("h264_qsv");
    const hasAmf = encodersOutput.includes("h264_amf") && verifyHardwareEncoder("h264_amf");
    const hasVaapi = encodersOutput.includes("h264_vaapi") && verifyHardwareEncoder("h264_vaapi");
    const hasVideotoolbox = encodersOutput.includes("h264_videotoolbox") && verifyHardwareEncoder("h264_videotoolbox");

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
      const fs = require("fs");
      const hasRenderNode = fs.existsSync("/dev/dri/renderD128");
      inputArgs = ["-hwaccel", "qsv", "-hwaccel_output_format", "qsv"];
      if (hasRenderNode) {
        inputArgs.unshift("-qsv_device", "/dev/dri/renderD128");
      }
      outputArgs = [
        "-vf", "vpp_qsv=format=nv12",
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
      inputArgs = ["-hwaccel", "vaapi", "-hwaccel_output_format", "vaapi"];
      if (hasRenderNode) {
        inputArgs.unshift("-vaapi_device", "/dev/dri/renderD128");
      }
      outputArgs = [
        "-vf", "scale_vaapi=format=nv12",
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

    baseConfig = {
      enabled: encoder !== "libx264",
      type: gpuType,
      encoder: encoder,
      inputArgs: inputArgs,
      outputArgs: outputArgs
    };

    cachedGpuConfig = baseConfig;
    logMessage(`[GPU Transcoder Engine] Auto-Detected Hardware Accelerator: ${gpuType} (${encoder})`);
  } catch (err) {
    baseConfig = {
      enabled: false,
      type: "CPU Software (libx264)",
      encoder: "libx264",
      inputArgs: [],
      outputArgs: ["-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency", "-crf", "23"]
    };
    cachedGpuConfig = baseConfig;
    logMessage(`[GPU Transcoder Engine] GPU auto-detection fallback to CPU libx264: ${err.message}`);
  }
  }

  // Disable hardware decoding for unsupported codecs
  const finalConfig = JSON.parse(JSON.stringify(baseConfig));
  if (videoCodec && videoCodec !== "h264" && videoCodec !== "hevc" && videoCodec !== "vp9" && videoCodec !== "av1") {
    // Keep device init args (like -vaapi_device) but strip the hardware decoder accelerators
    finalConfig.inputArgs = finalConfig.inputArgs.filter(arg => arg !== "-hwaccel" && arg !== "vaapi" && arg !== "qsv" && arg !== "-hwaccel_output_format");
    if (finalConfig.encoder === "h264_nvenc") {
      finalConfig.outputArgs = finalConfig.outputArgs.filter(arg => arg !== "-hwaccel_output_format" && arg !== "cuda");
    } else if (finalConfig.encoder === "h264_vaapi" || finalConfig.encoder === "h264_qsv") {
      // VAAPI/QSV encoders require a hardware frame upload filter if decoded in software
      finalConfig.outputArgs = finalConfig.outputArgs.map(arg => {
        if (arg === "scale_vaapi=format=nv12") return "format=nv12,hwupload";
        if (arg === "vpp_qsv=format=nv12") return "format=nv12,hwupload";
        return arg;
      });
    }
  }

  return finalConfig;
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

  // ========== AUTHENTICATION & USER ENDPOINTS ==========
  
  // Status - check if setup is needed
  if (cleanPath === "/api/auth/status" && req.method === "GET") {
    const users = getUsers();
    return sendJson(res, 200, { setupRequired: Object.keys(users).length === 0 });
  }

  // Setup first admin
  if (cleanPath === "/api/auth/setup" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { username, password } = JSON.parse(body);
        const users = getUsers();
        if (Object.keys(users).length > 0) {
          return sendJson(res, 403, { error: "Setup already completed." });
        }
        if (!username || !password || password.length < 6) {
          return sendJson(res, 400, { error: "Invalid username or password (min 6 chars)." });
        }
        
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);
        const userId = crypto.randomUUID();
        
        users[userId] = {
          id: userId,
          username,
          salt,
          hash,
          role: "admin",
          preferences: {}
        };
        saveUsers(users);
        
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions[token] = { userId, role: "admin", expiresAt: Date.now() + SESSION_TTL };
        saveSessions();
        
        return sendJson(res, 201, { message: "Admin created.", token, user: { id: userId, username, role: "admin" } });
      } catch (err) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  // Login
  if (cleanPath === "/api/auth/login" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const { username, password } = JSON.parse(body);
        const users = getUsers();
        const user = Object.values(users).find(u => u.username === username);
        if (!user) return sendJson(res, 401, { error: "Invalid credentials" });
        
        const hash = hashPassword(password, user.salt);
        if (hash !== user.hash) return sendJson(res, 401, { error: "Invalid credentials" });
        
        const token = crypto.randomBytes(32).toString('hex');
        activeSessions[token] = { userId: user.id, role: user.role, expiresAt: Date.now() + SESSION_TTL };
        saveSessions();
        
        return sendJson(res, 200, { token, user: { id: user.id, username: user.username, role: user.role, preferences: user.preferences } });
      } catch (err) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }

  // Auth Me
  if (cleanPath === "/api/auth/me" && req.method === "GET") {
    const session = authenticate(req);
    if (!session) return sendJson(res, 401, { error: "Unauthorized" });
    const users = getUsers();
    const user = users[session.userId];
    if (!user) return sendJson(res, 401, { error: "User not found" });
    
    return sendJson(res, 200, { user: { id: user.id, username: user.username, role: user.role, preferences: user.preferences } });
  }

  // Logout
  if (cleanPath === "/api/auth/logout" && req.method === "POST") {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      delete activeSessions[authHeader.split(' ')[1]];
      saveSessions();
    }
    return sendJson(res, 200, { message: "Logged out" });
  }

  // User Preferences sync
  if (cleanPath === "/api/users/preferences" && req.method === "PUT") {
    const session = authenticate(req);
    if (!session) return sendJson(res, 401, { error: "Unauthorized" });
    
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const updates = JSON.parse(body);
        const users = getUsers();
        const user = users[session.userId];
        if (!user) return sendJson(res, 401, { error: "User not found" });
        
        user.preferences = { ...user.preferences, ...updates };
        saveUsers(users);
        
        return sendJson(res, 200, { preferences: user.preferences });
      } catch (err) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    });
    return;
  }
  
  if (cleanPath === "/api/users/preferences" && req.method === "GET") {
    const session = authenticate(req);
    if (!session) return sendJson(res, 401, { error: "Unauthorized" });
    const users = getUsers();
    return sendJson(res, 200, { preferences: users[session.userId]?.preferences || {} });
  }

  // Admin User Management
  if (cleanPath.startsWith("/api/users") && (req.method === "GET" || req.method === "POST" || req.method === "DELETE") && cleanPath !== "/api/users/preferences") {
    const session = authenticate(req);
    if (!session || session.role !== "admin") return sendJson(res, 403, { error: "Admin access required" });
    
    const users = getUsers();
    
    if (req.method === "GET") {
      const sanitized = Object.values(users).map(u => ({ id: u.id, username: u.username, role: u.role }));
      return sendJson(res, 200, { users: sanitized });
    }
    
    if (req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        try {
          const { username, password, role } = JSON.parse(body);
          if (Object.values(users).some(u => u.username === username)) {
            return sendJson(res, 400, { error: "Username taken" });
          }
          if (!username || !password || password.length < 6) return sendJson(res, 400, { error: "Invalid data" });
          
          const salt = crypto.randomBytes(16).toString('hex');
          const hash = hashPassword(password, salt);
          const userId = crypto.randomUUID();
          
          users[userId] = { id: userId, username, salt, hash, role: role === 'admin' ? 'admin' : 'normal', preferences: {} };
          saveUsers(users);
          return sendJson(res, 201, { user: { id: userId, username, role: users[userId].role } });
        } catch(e) { return sendJson(res, 400, { error: "Invalid JSON" }); }
      });
      return;
    }
    
    if (req.method === "DELETE") {
      const userId = parsedUrl.query.id;
      if (userId === session.userId) return sendJson(res, 400, { error: "Cannot delete yourself" });
      if (users[userId]) {
        delete users[userId];
        saveUsers(users);
        return sendJson(res, 200, { message: "User deleted" });
      }
      return sendJson(res, 404, { error: "User not found" });
    }
  }

  // Image caching proxy endpoint
  if (cleanPath === "/api/image" && req.method === "GET") {
    const imageUrl = parsedUrl.query.url;
    if (!imageUrl) return sendJson(res, 400, { error: "Missing image url" });
    
    // Validate it's a TMDB image
    if (!imageUrl.startsWith("https://image.tmdb.org/")) {
      return sendJson(res, 403, { error: "Only TMDB images are allowed" });
    }
    
    // Hash the URL for safe filename
    const hash = crypto.createHash("md5").update(imageUrl).digest("hex");
    const ext = path.extname(new URL(imageUrl).pathname) || ".jpg";
    const cachePath = path.join(IMAGE_CACHE_DIR, hash + ext);
    
    if (fs.existsSync(cachePath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      const stream = fs.createReadStream(cachePath);
      return stream.pipe(res);
    }
    
    // Fetch and cache
    https.get(imageUrl, (imageRes) => {
      if (imageRes.statusCode !== 200) {
        res.writeHead(imageRes.statusCode);
        return res.end();
      }
      res.setHeader("Content-Type", imageRes.headers["content-type"] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000");
      
      const fileStream = fs.createWriteStream(cachePath);
      imageRes.pipe(fileStream);
      imageRes.pipe(res);
    }).on("error", (err) => {
      console.error("[Image Proxy Error]", err.message);
      res.writeHead(500);
      res.end();
    });
    return;
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
      startUrl.includes(".m3u8") ||
      startUrl.includes("/proxy/ts/stream/")
    ) {
      return resolve(startUrl);
    }

    try {
      const parsed = new URL(startUrl);
      const isHttps = parsed.protocol === "https:";
      const httpModule = isHttps ? require("https") : require("http");

      const reqHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*",
      };
      if (apiKey) {
        if (apiKey.startsWith("eyJ")) {
          reqHeaders["Authorization"] = `Bearer ${apiKey}`;
        } else {
          reqHeaders["x-api-key"] = apiKey;
        }
      }

      const req = httpModule.request(startUrl, {
        method: "GET",
        headers: reqHeaders,
        rejectUnauthorized: false,
        timeout: 5000,
      }, (res) => {
        // 1. Follow HTTP Redirects (301, 302, 303, 307, 308)
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          req.destroy();
          let loc = res.headers.location;
          if (!loc.startsWith("http")) {
            loc = new URL(loc, startUrl).toString();
          }
          if (apiKey && !loc.includes("api_key=") && !loc.includes("token=")) {
            const sep = loc.includes("?") ? "&" : "?";
            loc = `${loc}${sep}api_key=${encodeURIComponent(apiKey)}`;
          }
          logMessage(`[Pre-Transcode Redirect Follower ${res.statusCode}] Resolved redirect to: ${loc}`);
          return resolve(resolveFinalStreamUrl(loc, apiKey, maxRedirects - 1));
        }

        // 2. Check Content-Type & JSON API Responses
        let contentType = (res.headers["content-type"] || "").toLowerCase();
        if (contentType.includes("json") || contentType.includes("text/plain") || contentType.includes("text/html")) {
          let body = "";
          res.on("data", (chunk) => {
            if (body.length < 65536) body += chunk.toString();
          });
          res.on("end", () => {
            try {
              const data = JSON.parse(body);
              const extractedUrl = data.stream_url || data.url || data.file_url || data.target || data.stream || data.path;
              if (extractedUrl && typeof extractedUrl === "string" && extractedUrl !== startUrl) {
                let fullExtracted = extractedUrl;
                if (!fullExtracted.startsWith("http")) {
                  fullExtracted = new URL(fullExtracted, startUrl).toString();
                }
                if (apiKey && !fullExtracted.includes("api_key=") && !fullExtracted.includes("token=")) {
                  const sep = fullExtracted.includes("?") ? "&" : "?";
                  fullExtracted = `${fullExtracted}${sep}api_key=${encodeURIComponent(apiKey)}`;
                }
                logMessage(`[Pre-Transcode JSON Resolver] Extracted target stream URL from JSON: ${fullExtracted}`);
                return resolve(resolveFinalStreamUrl(fullExtracted, apiKey, maxRedirects - 1));
              }
            } catch (e) {
              // Not JSON or parse failed
            }
            return resolve(startUrl);
          });
        } else {
          req.destroy();
          return resolve(startUrl);
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

  // Probe Media Metadata & Duration Endpoint
  if ((cleanPath === "/api/transcode/metadata" || cleanPath === "/transcode/metadata") && req.method === "GET") {
    const targetUrl = parsedUrl.query.url;
    if (!targetUrl) {
      return sendJson(res, 400, { error: "Missing required query parameter: url" });
    }

    let cleanedTargetUrl = targetUrl;
    try {
      cleanedTargetUrl = encodeURI(decodeURI(targetUrl));
    } catch (e) {
      cleanedTargetUrl = targetUrl;
    }

    const { exec } = require("child_process");
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    // Run ffprobe with standard user-agent headers to prevent CDN 403 blocks
    const probeCmd = `ffprobe -headers "User-Agent: ${userAgent}\r\n" -v error -show_entries format=duration:stream=index,codec_type,codec_name,width,height,tags -show_chapters -of json "${cleanedTargetUrl.replace(/"/g, '\\"')}"`;
    
    exec(probeCmd, { timeout: 12000 }, (error, stdout, stderr) => {
      if (error) {
        logMessage(`[ffprobe Error] Failed to probe metadata: ${error.message}`);
        return sendJson(res, 500, { error: "Failed to probe media metadata", details: error.message });
      }
      try {
        const data = JSON.parse(stdout);
        const duration = parseFloat(data.format?.duration || 0);
        
        const audioTracks = [];
        const subtitleTracks = [];
        const chapters = [];

        if (Array.isArray(data.chapters)) {
          data.chapters.forEach((chap) => {
            chapters.push({
              id: chap.id,
              start_time: parseFloat(chap.start_time),
              end_time: parseFloat(chap.end_time),
              title: chap.tags?.title || `Chapter ${chapters.length + 1}`
            });
          });
        }

        let videoCodec = null;
        if (Array.isArray(data.streams)) {
          data.streams.forEach((stream) => {
            const index = stream.index;
            const codec = stream.codec_name;
            const type = stream.codec_type;
            const tags = stream.tags || {};
            const language = tags.language || tags.LANGUAGE || tags.Language || "und";
            const title = tags.title || tags.TITLE || tags.Title || tags.handler_name || `${type.charAt(0).toUpperCase() + type.slice(1)} Track ${index}`;

            if (type === "video" && !videoCodec) {
              videoCodec = codec;
            } else if (type === "audio") {
              audioTracks.push({ index, codec, language, title });
            } else if (type === "subtitle") {
              subtitleTracks.push({ index, codec, language, title });
            }
          });
        }

        return sendJson(res, 200, {
          duration: isNaN(duration) ? 0 : duration,
          videoCodec,
          audioTracks,
          subtitleTracks,
          chapters
        });
      } catch (err) {
        return sendJson(res, 500, { error: "Failed to parse ffprobe output", details: err.message });
      }
    });
    return;
  }

  // On-the-fly Subtitle Extraction & WebVTT Conversion Endpoint
  if ((cleanPath === "/api/transcode/subtitle" || cleanPath === "/transcode/subtitle") && req.method === "GET") {
    const targetUrl = parsedUrl.query.url;
    const streamIndex = parsedUrl.query.index;

    if (!targetUrl || !streamIndex) {
      return sendJson(res, 400, { error: "Missing required query parameters: url, index" });
    }

    let cleanedTargetUrl = targetUrl;
    try {
      cleanedTargetUrl = encodeURI(decodeURI(targetUrl));
    } catch (e) {
      cleanedTargetUrl = targetUrl;
    }

    res.writeHead(200, {
      "Content-Type": "text/vtt; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    });

    const { spawn } = require("child_process");
    
    const seekTime = parsedUrl.query.ss;
    const ffmpegArgs = [];
    if (seekTime && parseFloat(seekTime) > 0) {
      ffmpegArgs.push("-ss", seekTime);
    }
    ffmpegArgs.push(
      "-i", cleanedTargetUrl,
      "-map", `0:${streamIndex}`,
      "-f", "webvtt",
      "pipe:1"
    );

    const subProcess = spawn("ffmpeg", ffmpegArgs);

    const { Transform } = require("stream");
    let leftover = "";
    const vttFixer = new Transform({
      transform(chunk, encoding, callback) {
        let text = leftover + chunk.toString("utf8");
        const lastNewline = text.lastIndexOf('\n');
        if (lastNewline !== -1) {
          let processText = text.slice(0, lastNewline + 1);
          leftover = text.slice(lastNewline + 1);
          // Fix negative timestamps that cause WebVTT parsers to instantly abort
          processText = processText.replace(/-\d{2}:\d{2}:\d{2}\.\d{3}/g, "00:00:00.000");
          this.push(Buffer.from(processText, "utf8"));
        } else {
          leftover = text;
        }
        callback();
      },
      flush(callback) {
        if (leftover) {
          leftover = leftover.replace(/-\d{2}:\d{2}:\d{2}\.\d{3}/g, "00:00:00.000");
          this.push(Buffer.from(leftover, "utf8"));
        }
        callback();
      }
    });

    subProcess.stdout.pipe(vttFixer).pipe(res);
    subProcess.stderr.on("data", () => {});
    subProcess.on("error", () => {});
    return;
  }

  // Real-Time Transcoding & Remuxing Proxy Stream Endpoint
  if ((cleanPath === "/api/transcode" || cleanPath === "/transcode") && (req.method === "GET" || req.method === "HEAD")) {
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

    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "none"
      });
      return res.end();
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
    const preResolvePromise = Promise.resolve(cleanedTargetUrl);
    preResolvePromise.then((finalMediaUrl) => {
      res.writeHead(200, {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "Transfer-Encoding": "chunked",
        "Access-Control-Allow-Origin": "*",
        "Accept-Ranges": "none"
      });

      const headersStr = `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: */*\r\n`;

      const videoCodec = parsedUrl.query.video_codec;
      const gpuInfo = detectGpuCapabilities(videoCodec);
      const isLiveStream = finalMediaUrl.includes("/proxy/ts/stream") || finalMediaUrl.includes("/stream/");

      const audioIndex = parsedUrl.query.audio_index;
      const seekTime = parsedUrl.query.ss;

      const ffmpegArgs = [
        "-headers", headersStr,
        "-reconnect", "1",
        "-reconnect_at_eof", "1",
        "-reconnect_streamed", "1",
        "-reconnect_delay_max", "3",
        ...(seekTime ? ["-ss", seekTime] : []),
        ...(isLiveStream
          ? ["-fflags", "+genpts+discardcorrupt", "-analyzeduration", "1500000", "-probesize", "1500000"]
          : ["-analyzeduration", "3000000", "-probesize", "3000000"]),
        "-threads", String(cpuCount),
        ...(gpuInfo.inputArgs || []),
        "-i", finalMediaUrl,
        "-map", "0:v:0",
        "-map", audioIndex ? `0:${audioIndex}` : "0:a:0",
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

  // CORS-transparent Stream Proxy Endpoint
  // Allows MoviPlayer (WASM) to fetch video bytes from CDNs that don't send CORS headers.
  // Pure pipe-through — zero transcoding, no FFmpeg.
  if ((cleanPath === "/api/proxy" || cleanPath === "/proxy") && (req.method === "GET" || req.method === "HEAD")) {
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

      if (req.headers["range"]) {
        proxyHeaders["Range"] = req.headers["range"];
      }

      logMessage(`[Stream Proxy] Forwarding ${req.method} request for [${initiator.initiatorComponent}] (${initiator.ip}): ${targetUrl.substring(0, 100)}...`);

      const upstream = httpModule.request(targetUrl, {
        method: req.method,
        headers: proxyHeaders,
        rejectUnauthorized: false,
        timeout: 15000,
      }, (upstreamRes) => {
        const responseHeaders = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
        };

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
    const session = authenticate(req);
    if (!session) return sendJson(res, 401, { error: "Unauthorized" });
    const settings = loadServerSettings();
    const cpuTopology = getCpuTopologyInfo();
    const gpuInfo = detectGpuCapabilities();
    logMessage(`[Settings GET] Served settings to [${initiator.initiatorComponent}] (${initiator.ip}) | CPU: ${cpuTopology.model} (${cpuTopology.logicalCores} threads) | GPU: ${gpuInfo.type}`);
    return sendJson(res, 200, { status: "success", settings, ...settings, cpuTopology, gpuInfo });
  }

  // POST Settings API
  if ((cleanPath === "/api/settings" || cleanPath === "/settings") && req.method === "POST") {
    const session = authenticate(req);
    if (!session || session.role !== "admin") return sendJson(res, 403, { error: "Admin access required" });
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
  // Schedule recurring reload every 1 hour (3600000 ms)
});

server.on("error", (err) => {
  logMessage(`[BubbaFlix Backend Listen Error]: ${err.stack || err}`, true);
});
