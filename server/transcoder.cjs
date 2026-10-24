const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const dgram = require("dgram");
const os = require("os");
const { spawn } = require("child_process");
const zlib = require("zlib");

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

const getLocalVersionData = () => {
  try {
    const candidatePaths = [
      path.resolve(process.cwd(), "version.json"),
      path.resolve(__dirname, "..", "version.json"),
      path.resolve(__dirname, "version.json"),
      "/app/version.json",
      path.resolve(process.cwd(), "package.json"),
      path.resolve(__dirname, "..", "package.json"),
      "/app/package.json"
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, "utf8"));
        if (raw.versionName) {
          return raw;
        }
        if (raw.version) {
          return { versionCode: 41, versionName: raw.version };
        }
      }
    }
  } catch (e) {}
  return { versionCode: 41, versionName: "1.0.40" };
};


// Internal Node settings server port (always 5000 for Nginx proxy inside container)
const PORT = process.env.PORT || 5000;
const UDP_DISCOVERY_PORT = 5151;
const DATA_DIR = path.join(__dirname, "..", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const IMAGE_CACHE_DIR = path.join(DATA_DIR, "cache", "images");
if (!fs.existsSync(IMAGE_CACHE_DIR)) {
  fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
}

const TMDB_CACHE_DIR = path.join(DATA_DIR, "cache", "tmdb");
if (!fs.existsSync(TMDB_CACHE_DIR)) {
  fs.mkdirSync(TMDB_CACHE_DIR, { recursive: true });
}

// In-memory cache + disk persistence for TMDB metadata requests
const tmdbMemoryCache = new Map();
const TMDB_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days server TTL

const getTmdbCacheKey = (tmdbPath, queryParams) => {
  const sortedKeys = Object.keys(queryParams || {}).sort();
  const serialized = sortedKeys.map((k) => `${k}=${queryParams[k]}`).join("&");
  return crypto.createHash("md5").update(`${tmdbPath}?${serialized}`).digest("hex");
};

const FOREIGN_SCRIPT_REGEX_SERVER = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF\u0590-\u05FF\u1EA0-\u1EF9]/;

const PORN_TITLE_KEYWORDS_SERVER = [
  "xxx", "porn", "hentai", "striptease", "playboy", "penthouse", 
  "softcore", "hardcore", "erotica", "brazzers", "gangbang", "orgy", 
  "suicidegirls", "playmate", "hustler", "bdsm"
];

const PORN_OVERVIEW_REGEX_SERVER = /\b(pornography|hardcore porn|softcore porn|adult film|xxx video|gangbang|erotic sex)\b/i;

const isAdultServer = (item) => {
  if (!item || typeof item !== "object") return false;
  if (item.adult === true) return true;

  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();

  // Allow mainstream exceptions like the xXx franchise
  if ((item.vote_count || 0) > 200 && (title.includes("xander cage") || title.includes("state of the union"))) {
    return false;
  }

  // Check whole words in title for explicit porn terms
  const titleWords = title.split(/[\s,._\-:;!?/]+/);
  if (titleWords.some((w) => PORN_TITLE_KEYWORDS_SERVER.includes(w))) return true;

  // Overview explicit phrase check (whole word pattern, never substring match on "adult" or "sex")
  const overview = (item.overview || "").toLowerCase();
  if (overview && PORN_OVERVIEW_REGEX_SERVER.test(overview)) return true;

  return false;
};

const isAnimeServer = (item) => {
  if (!item || typeof item !== "object") return false;
  if (item.original_language) {
    const lang = item.original_language.toLowerCase();
    if (lang === "ja" || lang === "jpn" || lang === "japanese") return true;
  }
  if (Array.isArray(item.origin_country) && item.origin_country.includes("JP")) {
    return true;
  }
  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();
  const animeKeywords = [
    "anime", "manga", "hentai", "otaku", "studio ghibli", "ghibli", "dragon ball", "dragonball",
    "naruto", "one piece", "bleach", "attack on titan", "shingeki", "demon slayer", "kimetsu",
    "my hero academia", "boku no hero", "jujutsu kaisen", "death note", "pokemon", "pokémon"
  ];
  if (animeKeywords.some((kw) => title.includes(kw) || overview.includes(kw))) return true;
  return false;
};

const filterServerTmdbResults = (data) => {
  if (!data || typeof data !== "object") return data;
  if (Array.isArray(data.results)) {
    data.results = data.results.filter((item) => {
      if (!item || typeof item !== "object") return false;
      if (isAdultServer(item)) return false;
      if (isAnimeServer(item)) return false;
      if (item.vote_average === 0 || item.vote_average === 0.0) return false;
      if (item.media_type === "person") return true;
      if (item.original_language) {
        const lang = item.original_language.toLowerCase();
        if (lang !== "en" && lang !== "eng" && (!item.vote_count || item.vote_count < 1500)) {
          return false;
        }
      }
      const title = item.title || item.name || item.original_title || item.original_name || "";
      if (!title || FOREIGN_SCRIPT_REGEX_SERVER.test(title)) return false;
      return true;
    });
  }
  return data;
};
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

const sendJson = (res, statusCode, data, headers = {}) => {
  if (res.headersSent) return;
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    ...headers,
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

// ==========================================
// IPTV Engine: M3U Plus (/get.php) & XMLTV (/xmltv.php)
// ==========================================
const IPTV_CONFIG_FILE = path.join(DATA_DIR, "iptv_config.json");
const IPTV_CACHE_DIR = path.join(DATA_DIR, "cache", "iptv");
if (!fs.existsSync(IPTV_CACHE_DIR)) {
  fs.mkdirSync(IPTV_CACHE_DIR, { recursive: true });
}

let iptvChannelsCache = { timestamp: 0, channels: [], groups: [], streamUrlMap: new Map() };
let iptvXmltvCache = { timestamp: 0, byTvgId: new Map(), byName: new Map(), epgChannels: [] };
const iptvShortEpgCache = new Map(); // streamId -> { timestamp, listings }
const IPTV_CHANNELS_CACHE_TTL = 15 * 60 * 1000; // 15 mins
const IPTV_XMLTV_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

const loadIptvConfig = () => {
  try {
    if (fs.existsSync(IPTV_CONFIG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(IPTV_CONFIG_FILE, "utf8"));
      return {
        credentials: {
          serverUrl: parsed.credentials?.serverUrl || "",
          username: parsed.credentials?.username || "",
          password: parsed.credentials?.password || "",
          epgUrl: parsed.credentials?.epgUrl || "",
        },
        groups: parsed.groups || {},
        channels: parsed.channels || {},
        autoNumberStrategy: parsed.autoNumberStrategy || "manual",
        lastSync: parsed.lastSync || null,
      };
    }
  } catch (e) {
    logMessage(`[IPTV Config Warning] Failed to read ${IPTV_CONFIG_FILE}: ${e.message}`, true);
  }
  return {
    credentials: { serverUrl: "", username: "", password: "", epgUrl: "" },
    groups: {},
    channels: {},
    autoNumberStrategy: "manual",
    lastSync: null,
  };
};

const saveIptvConfig = (config, credentialsChanged = false) => {
  try {
    fs.writeFileSync(IPTV_CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
    if (credentialsChanged) {
      iptvChannelsCache = { timestamp: 0, channels: [], groups: [], streamUrlMap: new Map() };
      iptvShortEpgCache.clear();
      const diskCacheFile = path.join(IPTV_CACHE_DIR, "channels_cache.json");
      if (fs.existsSync(diskCacheFile)) {
        try { fs.unlinkSync(diskCacheFile); } catch (e) {}
      }
    }
    return true;
  } catch (e) {
    logMessage(`[IPTV Config Error] Failed to write ${IPTV_CONFIG_FILE}: ${e.message}`, true);
    return false;
  }
};

// Parse XMLTV Date string: YYYYMMDDHHmmss [+/-ZZZZ]
const parseXmltvDate = (dateStr) => {
  if (!dateStr) return 0;
  const m = String(dateStr).match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{2})(\d{2}))?/);
  if (!m) return 0;
  const year = m[1], month = m[2], day = m[3], hour = m[4], min = m[5], sec = m[6];
  const tzHour = m[7] || "+00";
  const tzMin = m[8] || "00";
  const isoStr = `${year}-${month}-${day}T${hour}:${min}:${sec}${tzHour}:${tzMin}`;
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
};

// Memory-Safe XMLTV Guide Parser
const parseXmltv = (xmlString) => {
  const byTvgId = new Map();
  const byName = new Map();
  const epgChannelsMap = new Map();
  if (!xmlString) return { byTvgId, byName, epgChannels: [] };

  // Safety ceiling: avoid running regex over multi-hundred MB strings
  const safeXml = xmlString.length > 25 * 1024 * 1024 ? xmlString.substring(0, 25 * 1024 * 1024) : xmlString;

  // 1. Extract <channel id="..."> tags for channel discovery & EPG assignment
  const chRegex = /<channel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;
  let chMatch;
  while ((chMatch = chRegex.exec(safeXml)) !== null) {
    const id = chMatch[1].trim();
    const inner = chMatch[2];
    const nameMatch = inner.match(/<display-name[^>]*>([\s\S]*?)<\/display-name>/i);
    const iconMatch = inner.match(/<icon[^>]+src="([^"]+)"/i);

    const name = nameMatch ? nameMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : id;
    const icon = iconMatch ? iconMatch[1].trim() : "";

    if (!epgChannelsMap.has(id)) {
      epgChannelsMap.set(id, { id, name, icon });
    }
  }

  // 2. Extract <programme> listings
  const progRegex = /<programme\s+start="([^"]+)"\s+stop="([^"]+)"\s+channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/gi;
  let match;
  let totalProgrammes = 0;
  const nowSec = Math.floor(Date.now() / 1000);

  while ((match = progRegex.exec(safeXml)) !== null) {
    if (totalProgrammes >= 40000) break; // Hard ceiling to protect Node.js heap

    const rawStart = match[1];
    const rawStop = match[2];
    const channelId = match[3];
    const stopTs = parseXmltvDate(rawStop);

    // Skip past programmes that ended more than 2 hours ago
    if (stopTs > 0 && stopTs < nowSec - 7200) {
      continue;
    }

    const key = channelId.trim();
    if (!epgChannelsMap.has(key)) {
      epgChannelsMap.set(key, { id: key, name: key, icon: "" });
    }

    const existing = byTvgId.get(key);
    // Limit to max 15 current/upcoming programmes per channel
    if (existing && existing.length >= 15) {
      continue;
    }

    const inner = match[4];
    const titleMatch = inner.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = inner.match(/<desc[^>]*>([\s\S]*?)<\/desc>/i);

    const title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : "";
    const desc = descMatch ? descMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/gi, "$1").trim() : "";
    const startTs = parseXmltvDate(rawStart);

    const prog = {
      title,
      description: desc,
      start: rawStart,
      end: rawStop,
      start_timestamp: startTs,
      stop_timestamp: stopTs,
    };

    if (!byTvgId.has(key)) byTvgId.set(key, []);
    byTvgId.get(key).push(prog);

    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normKey && !byName.has(normKey)) byName.set(normKey, []);
    if (normKey && byName.get(normKey).length < 15) byName.get(normKey).push(prog);

    totalProgrammes++;
  }

  return {
    byTvgId,
    byName,
    epgChannels: Array.from(epgChannelsMap.values()),
  };
};

// Fetch and Cache XMLTV EPG (/xmltv.php) with strict memory safeguards
const fetchXmltvEpg = async (credentials, force = false) => {
  const now = Date.now();
  if (!force && iptvXmltvCache.timestamp > 0 && now - iptvXmltvCache.timestamp < IPTV_XMLTV_CACHE_TTL) {
    return iptvXmltvCache;
  }

  const diskCacheFile = path.join(IPTV_CACHE_DIR, "epg.xml");
  if (!force && fs.existsSync(diskCacheFile)) {
    try {
      const stats = fs.statSync(diskCacheFile);
      if (now - stats.mtimeMs < IPTV_XMLTV_CACHE_TTL) {
        if (stats.size > 35 * 1024 * 1024) {
          logMessage(`[XMLTV Disk Cache] File size is ${Math.round(stats.size / 1024 / 1024)}MB. Skipping full read to protect RAM.`);
          return iptvXmltvCache;
        }
        const cachedXml = fs.readFileSync(diskCacheFile, "utf8");
        const parsed = parseXmltv(cachedXml);
        iptvXmltvCache = {
          timestamp: stats.mtimeMs,
          byTvgId: parsed.byTvgId,
          byName: parsed.byName,
          epgChannels: parsed.epgChannels || [],
        };
        logMessage(`[XMLTV EPG Cache Hit] Loaded ${parsed.byTvgId.size} channel guides from disk cache.`);
        return iptvXmltvCache;
      }
    } catch (e) {
      logMessage(`[XMLTV Disk Cache Warning] ${e.message}`, true);
    }
  }

  let serverUrl = (credentials.serverUrl || "").trim().replace(/\/+$/, "");
  const username = (credentials.username || "").trim();
  const password = (credentials.password || "").trim();
  const epgUrlOverride = (credentials.epgUrl || "").trim();

  let targetUrl = epgUrlOverride;
  if (!targetUrl && serverUrl && username && password) {
    targetUrl = `${serverUrl}/xmltv.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  }

  if (!targetUrl) {
    return { byTvgId: new Map(), byName: new Map() };
  }

  logMessage(`[XMLTV EPG Fetch] Fetching guide from ${targetUrl.replace(password, "******")}...`);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const resp = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BubbaFlix/1.0 (Android TV Smart IPTV Client)",
        "Accept-Encoding": "gzip, deflate",
      },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      throw new Error(`XMLTV endpoint returned HTTP ${resp.status}`);
    }

    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Safeguard: Do not decompress giant XML payloads > 35MB in memory
    if (buffer.length > 35 * 1024 * 1024) {
      logMessage(`[XMLTV EPG Warning] XMLTV payload too large (${Math.round(buffer.length / 1024 / 1024)}MB). Skipping to prevent memory overflow.`, true);
      return iptvXmltvCache.timestamp > 0 ? iptvXmltvCache : { byTvgId: new Map(), byName: new Map() };
    }

    let xmlText = "";
    if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
      xmlText = zlib.gunzipSync(buffer).toString("utf8");
    } else {
      xmlText = buffer.toString("utf8");
    }

    if (!xmlText.includes("<tv") && !xmlText.includes("<programme")) {
      logMessage(`[XMLTV EPG Warning] Response from ${targetUrl} did not contain valid XMLTV tags.`, true);
      return { byTvgId: new Map(), byName: new Map() };
    }

    try {
      fs.writeFileSync(diskCacheFile, xmlText, "utf8");
    } catch (writeErr) {}

    const parsed = parseXmltv(xmlText);
    iptvXmltvCache = {
      timestamp: now,
      byTvgId: parsed.byTvgId,
      byName: parsed.byName,
      epgChannels: parsed.epgChannels || [],
    };
    logMessage(`[XMLTV EPG Success] Successfully parsed and cached guide for ${parsed.byTvgId.size} channels.`);
    return iptvXmltvCache;
  } catch (err) {
    clearTimeout(timeoutId);
    logMessage(`[XMLTV EPG Error] Failed to fetch XMLTV guide: ${err.message}`, true);
    return iptvXmltvCache.timestamp > 0 ? iptvXmltvCache : { byTvgId: new Map(), byName: new Map() };
  }
};

// Fast M3U Plus Playlist Parser with EXTGRP support & pre-compiled attribute regex
const parseM3uPlus = (content) => {
  const lines = content.split(/\r?\n/);
  const channels = [];
  const groups = new Map();
  const streamUrlMap = new Map();
  let currentItem = null;
  const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      const commaIdx = line.lastIndexOf(",");
      const title = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : "";
      const attrPart = commaIdx !== -1 ? line.substring(8, commaIdx) : line.substring(8);

      const attrs = {};
      let m;
      attrRegex.lastIndex = 0;
      while ((m = attrRegex.exec(attrPart)) !== null) {
        attrs[m[1].toLowerCase()] = m[2];
      }

      const tvgId = attrs["tvg-id"] || "";
      const tvgName = attrs["tvg-name"] || title;
      const tvgLogo = attrs["tvg-logo"] || "";
      const groupTitle = attrs["group-title"] || attrs["tvg-group"] || "";

      currentItem = {
        name: title || tvgName,
        original_name: title || tvgName,
        tvg_id: tvgId,
        epg_channel_id: tvgId,
        stream_icon: tvgLogo,
        category_name: groupTitle || "",
        category_id: groupTitle || "",
      };
    } else if (line.startsWith("#EXTGRP:") && currentItem) {
      const extGrp = line.substring(8).trim();
      if (extGrp) {
        currentItem.category_name = extGrp;
        currentItem.category_id = extGrp;
      }
    } else if (!line.startsWith("#") && currentItem) {
      currentItem.stream_url = line;
      let streamId = null;
      try {
        const u = new URL(line);
        const pMatch = u.pathname.match(/\/(\d+)(\.(m3u8|ts|mp4)|\?|$)/i);
        if (pMatch) streamId = pMatch[1];
      } catch (e) {
        const pMatch = line.replace(/^https?:\/\/[^\/]+/, "").match(/\/(\d+)(\.(m3u8|ts|mp4)|\?|$)/i);
        if (pMatch) streamId = pMatch[1];
      }
      if (!streamId) {
        streamId = currentItem.tvg_id || `stream_${channels.length + 1}`;
      }
      currentItem.stream_id = String(streamId);

      if (!currentItem.category_name) {
        currentItem.category_name = "General";
        currentItem.category_id = "General";
      }

      channels.push(currentItem);
      streamUrlMap.set(String(streamId), line);

      if (!groups.has(currentItem.category_name)) {
        groups.set(currentItem.category_name, {
          category_id: currentItem.category_name,
          category_name: currentItem.category_name,
          channel_count: 0,
        });
      }
      groups.get(currentItem.category_name).channel_count++;
      currentItem = null;
    }
  }

  return { channels, groups: Array.from(groups.values()), streamUrlMap };
};

// Fallback to Xtream Codes Player API if M3U Plus is unavailable
const callXtreamApi = async (credentials, action = "", extraParams = {}) => {
  let serverUrl = (credentials.serverUrl || "").trim().replace(/\/+$/, "");
  const username = (credentials.username || "").trim();
  const password = (credentials.password || "").trim();

  if (!serverUrl || !username || !password) {
    throw new Error("Missing Xtream Codes server URL, username, or password.");
  }

  const queryParams = new URLSearchParams({
    username,
    password,
    ...(action ? { action } : {}),
    ...extraParams,
  });

  const apiUrl = `${serverUrl}/player_api.php?${queryParams.toString()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const resp = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "BubbaFlix/1.0 (Android TV Smart IPTV Client)",
      },
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      throw new Error(`Xtream Codes server returned HTTP ${resp.status}`);
    }

    const text = await resp.text();
    try {
      return JSON.parse(text);
    } catch (parseErr) {
      throw new Error("Invalid response format received from Xtream Codes server.");
    }
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

let pendingM3uPromise = null;

// Fetch Channels via /get.php?type=m3u_plus with Xtream player API fallback & disk caching
const fetchM3uPlaylist = async (credentials, force = false) => {
  const now = Date.now();
  if (!force && iptvChannelsCache.channels.length > 0 && now - iptvChannelsCache.timestamp < IPTV_CHANNELS_CACHE_TTL) {
    return iptvChannelsCache;
  }

  const diskCacheFile = path.join(IPTV_CACHE_DIR, "channels_cache.json");
  if (!force && fs.existsSync(diskCacheFile)) {
    try {
      const stats = fs.statSync(diskCacheFile);
      if (now - stats.mtimeMs < IPTV_CHANNELS_CACHE_TTL) {
        const rawJson = fs.readFileSync(diskCacheFile, "utf8");
        const parsedData = JSON.parse(rawJson);
        if (Array.isArray(parsedData.channels) && parsedData.channels.length > 0) {
          const streamUrlMap = new Map();
          parsedData.channels.forEach(ch => {
            if (ch.stream_id && ch.stream_url) streamUrlMap.set(String(ch.stream_id), ch.stream_url);
          });
          iptvChannelsCache = {
            timestamp: stats.mtimeMs,
            channels: parsedData.channels,
            groups: parsedData.groups || [],
            streamUrlMap,
          };
          logMessage(`[IPTV Disk Cache Hit] Loaded ${parsedData.channels.length} channels and ${(parsedData.groups || []).length} categories.`);
          return iptvChannelsCache;
        }
      }
    } catch (e) {
      logMessage(`[IPTV Disk Cache Warning] ${e.message}`, true);
    }
  }

  // Deduplicate concurrent requests so only 1 download stream runs against the IPTV server
  if (pendingM3uPromise) {
    return pendingM3uPromise;
  }

  pendingM3uPromise = (async () => {
    let serverUrl = (credentials.serverUrl || "").trim().replace(/\/+$/, "");
    const username = (credentials.username || "").trim();
    const password = (credentials.password || "").trim();

    if (!serverUrl || !username || !password) {
      return { channels: [], groups: [], streamUrlMap: new Map() };
    }

    const isExplicitM3u = serverUrl.includes("get.php") || serverUrl.endsWith(".m3u") || serverUrl.endsWith(".m3u8");

    // 1. FAST PATH: For Xtream Codes servers, query the fast JSON API (player_api.php) FIRST! (< 2 seconds)
    if (!isExplicitM3u) {
      try {
        logMessage(`[IPTV Fast Fetch] Querying Xtream player_api.php live streams & categories...`);
        const [categories, streams] = await Promise.all([
          callXtreamApi(credentials, "get_live_categories").catch(() => []),
          callXtreamApi(credentials, "get_live_streams").catch(() => []),
        ]);

        if (Array.isArray(streams) && streams.length > 0) {
          const catMap = {};
          const groups = [];
          if (Array.isArray(categories)) {
            categories.forEach((c) => {
              catMap[String(c.category_id)] = c.category_name;
              groups.push({
                category_id: String(c.category_id),
                category_name: c.category_name,
                channel_count: 0,
              });
            });
          }

          const channels = [];
          const streamUrlMap = new Map();
          streams.forEach((s) => {
            const catId = String(s.category_id || "");
            const streamId = String(s.stream_id || s.num);
            const streamUrl = `${serverUrl}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${streamId}.m3u8`;
            streamUrlMap.set(streamId, streamUrl);

            channels.push({
              stream_id: streamId,
              name: s.name,
              original_name: s.name,
              tvg_id: s.epg_channel_id || "",
              epg_channel_id: s.epg_channel_id || "",
              stream_icon: s.stream_icon || "",
              category_id: catId,
              category_name: catMap[catId] || "Live Channels",
              stream_url: streamUrl,
            });

            const grp = groups.find((g) => g.category_id === catId);
            if (grp) grp.channel_count++;
          });

          iptvChannelsCache = { timestamp: now, channels, groups, streamUrlMap };

          try {
            fs.writeFileSync(
              diskCacheFile,
              JSON.stringify({ channels, groups }),
              "utf8"
            );
          } catch (diskErr) {}

          logMessage(`[IPTV Fast Fetch Success] Loaded ${channels.length} channels across ${groups.length} categories via Xtream Codes JSON API.`);
          return iptvChannelsCache;
        }
      } catch (fastErr) {
        logMessage(`[IPTV Fast Fetch Notice] player_api.php check: ${fastErr.message}. Trying /get.php...`);
      }
    }

    // 2. Fallback to /get.php?type=m3u_plus
    const m3uUrl = serverUrl.includes("get.php")
      ? serverUrl
      : `${serverUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus&output=m3u8`;

    logMessage(`[M3U Playlist Fetch] Loading channels from ${m3uUrl.replace(password, "******")}...`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      const resp = await fetch(m3uUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "BubbaFlix/1.0 (Android TV Smart IPTV Client)",
          "Accept-Encoding": "gzip, deflate",
        },
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let text = "";
        if (buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) {
          text = zlib.gunzipSync(buffer).toString("utf8");
        } else {
          text = buffer.toString("utf8");
        }

        if (text.includes("#EXTM3U") || text.includes("#EXTINF")) {
          const parsed = parseM3uPlus(text);
          if (parsed.channels.length > 0) {
            let finalGroups = parsed.groups;

            // If groups is empty or only 1 generic group, enrich from get_live_categories
            if (finalGroups.length <= 1) {
              try {
                const xtreamCats = await callXtreamApi(credentials, "get_live_categories");
                if (Array.isArray(xtreamCats) && xtreamCats.length > 1) {
                  finalGroups = xtreamCats.map((c) => ({
                    category_id: String(c.category_id),
                    category_name: c.category_name,
                    channel_count: 0,
                  }));
                }
              } catch (e) {}
            }

            iptvChannelsCache = {
              timestamp: now,
              channels: parsed.channels,
              groups: finalGroups,
              streamUrlMap: parsed.streamUrlMap,
            };

            // Save to disk cache for fast future startup
            try {
              fs.writeFileSync(
                diskCacheFile,
                JSON.stringify({
                  channels: parsed.channels,
                  groups: finalGroups,
                }),
                "utf8"
              );
            } catch (diskErr) {}

            logMessage(`[M3U Playlist Success] Parsed ${parsed.channels.length} channels across ${finalGroups.length} categories.`);
            return iptvChannelsCache;
          }
        }
      }
    } catch (err) {
      clearTimeout(timeoutId);
      logMessage(`[M3U Playlist Warning] Failed /get.php fetch: ${err.message}`, true);
    }

    return iptvChannelsCache.channels.length > 0
      ? iptvChannelsCache
      : { channels: [], groups: [], streamUrlMap: new Map() };
  })();

  try {
    const res = await pendingM3uPromise;
    return res;
  } finally {
    pendingM3uPromise = null;
  }
};

const getProcessedChannels = async (config, includeAll = false) => {
  const { channels } = await fetchM3uPlaylist(config.credentials);

  const processed = [];
  let fallbackNumber = 1;

  for (const stream of channels) {
    const streamId = String(stream.stream_id);
    const catId = String(stream.category_id || stream.category_name || "");
    const groupCfg = config.groups[catId] || config.groups[stream.category_name];
    const isGroupEnabled = groupCfg ? groupCfg.enabled !== false : true;

    const channelCfg = config.channels[streamId];
    const isChannelExplicitlyEnabled = channelCfg?.enabled;
    const isChannelEnabled = isChannelExplicitlyEnabled !== undefined ? isChannelExplicitlyEnabled : isGroupEnabled;

    const assignedNumber = channelCfg?.channelNumber != null ? Number(channelCfg.channelNumber) : fallbackNumber++;
    const customName = channelCfg?.customName || stream.name;
    const defaultEpgId = stream.epg_channel_id || stream.tvg_id || "";
    const customEpgId = channelCfg?.epgChannelId !== undefined ? channelCfg.epgChannelId : channelCfg?.epg_channel_id;
    const assignedEpgId = (customEpgId != null && customEpgId !== "") ? customEpgId : defaultEpgId;

    if (!includeAll && (!isChannelEnabled || !isGroupEnabled)) {
      continue;
    }

    processed.push({
      stream_id: stream.stream_id,
      name: customName,
      original_name: stream.original_name,
      channel_number: assignedNumber,
      category_id: catId,
      category_name: stream.category_name,
      stream_icon: stream.stream_icon || "",
      epg_channel_id: assignedEpgId,
      default_epg_id: defaultEpgId,
      custom_epg: Boolean(customEpgId && customEpgId !== defaultEpgId),
      stream_url: stream.stream_url || "",
      stream_type: "live",
      enabled: isChannelEnabled,
      group_enabled: isGroupEnabled,
    });
  }

  processed.sort((a, b) => a.channel_number - b.channel_number);
  return processed;
};


const server = http.createServer((req, res) => {
  const startTime = Date.now();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  parsedUrl.query = Object.fromEntries(parsedUrl.searchParams);
  const rawPath = (parsedUrl.pathname || "/") + (parsedUrl.search || "");
  const rawClean = parsedUrl.pathname || "/";
  const cleanPath = rawClean.length > 1 && rawClean.endsWith("/") ? rawClean.slice(0, -1) : rawClean;
  const initiator = getRequestInitiator(req);

  if (!rawPath.startsWith("/api/image")) {
    logMessage(`[HTTP Request] ${req.method} ${rawPath} | Initiator: [${initiator.initiatorComponent}] | Client IP: ${initiator.ip} | Referer: ${initiator.referer} | User-Agent: ${initiator.userAgent}`);
  }

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

  // TMDB Metadata Proxy & Disk/Memory Cache Endpoint
  if (cleanPath.startsWith("/api/tmdb/") && req.method === "GET") {
    const tmdbSubPath = cleanPath.replace(/^\/api\/tmdb/, "");
    const queryParams = parsedUrl.query || {};
    const cacheKey = getTmdbCacheKey(tmdbSubPath, queryParams);
    const diskCacheFile = path.join(TMDB_CACHE_DIR, `${cacheKey}.json`);

    // 1. Check Memory Cache
    const memCached = tmdbMemoryCache.get(cacheKey);
    if (memCached && Date.now() - memCached.timestamp < TMDB_CACHE_TTL_MS) {
      logMessage(`[TMDB Cache Hit (RAM)] GET ${tmdbSubPath}`);
      return sendJson(res, 200, memCached.data, { "Cache-Control": "public, max-age=300, must-revalidate" });
    }

    // 2. Check Disk Cache
    if (fs.existsSync(diskCacheFile)) {
      try {
        const fileStat = fs.statSync(diskCacheFile);
        if (Date.now() - fileStat.mtimeMs < TMDB_CACHE_TTL_MS) {
          const raw = fs.readFileSync(diskCacheFile, "utf-8");
          const parsedData = JSON.parse(raw);
          // If disk cached file has empty results, treat as expired so fresh data is retrieved
          const hasEmptyResults = Array.isArray(parsedData?.results) && parsedData.results.length === 0;
          if (!hasEmptyResults) {
            tmdbMemoryCache.set(cacheKey, { timestamp: fileStat.mtimeMs, data: parsedData });
            logMessage(`[TMDB Cache Hit (Disk)] GET ${tmdbSubPath}`);
            return sendJson(res, 200, parsedData, { "Cache-Control": "public, max-age=300, must-revalidate" });
          }
        }
      } catch (e) {}
    }

    // 3. Cache Miss: Query TMDB Upstream
    const authHeader = req.headers.authorization || "";
    const activeToken = authHeader.replace(/^bearer\s+/i, "").trim() ||
      (process.env.VITE_APP_TMDB_KEY || "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU");

    const queryStr = parsedUrl.search || "";
    const targetTmdbUrl = `https://api.themoviedb.org/3${tmdbSubPath}${queryStr}`;

    const https = require("https");
    const tmdbReq = https.request(
      targetTmdbUrl,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${activeToken}`,
          "Content-Type": "application/json",
        },
      },
      (tmdbRes) => {
        let body = "";
        tmdbRes.on("data", (chunk) => { body += chunk; });
        tmdbRes.on("end", () => {
          if (tmdbRes.statusCode >= 200 && tmdbRes.statusCode < 300) {
            try {
              let parsed = JSON.parse(body);
              parsed = filterServerTmdbResults(parsed);
              const isEmptyResults = Array.isArray(parsed?.results) && parsed.results.length === 0;
              // Never persist empty results to 30-day disk cache
              if (!isEmptyResults) {
                tmdbMemoryCache.set(cacheKey, { timestamp: Date.now(), data: parsed });
                fs.writeFile(diskCacheFile, JSON.stringify(parsed), "utf-8", () => {});
              } else {
                // Short 30-second RAM cache for empty results
                tmdbMemoryCache.set(cacheKey, { timestamp: Date.now() - TMDB_CACHE_TTL_MS + 30000, data: parsed });
              }
              logMessage(`[TMDB Cache Miss -> Saved] GET ${tmdbSubPath}`);
              return sendJson(res, 200, parsed, { "Cache-Control": "public, max-age=300, must-revalidate" });
            } catch (err) {
              return sendJson(res, 500, { error: "Failed to parse TMDB response" });
            }
          } else {
            logMessage(`[TMDB Proxy Error] Upstream returned status ${tmdbRes.statusCode}`, true);
            return sendJson(res, tmdbRes.statusCode, { error: "TMDB upstream error" });
          }
        });
      }
    );

    tmdbReq.on("error", (err) => {
      logMessage(`[TMDB Proxy Network Error]: ${err.message}`, true);
      return sendJson(res, 502, { error: "TMDB upstream service unavailable" });
    });

    tmdbReq.end();
    return;
  }

  // Admin Endpoint: Clear TMDB Metadata Cache
  if ((cleanPath === "/api/admin/cache/clear" || cleanPath === "/admin/cache/clear") && req.method === "POST") {
    try {
      tmdbMemoryCache.clear();
      if (fs.existsSync(TMDB_CACHE_DIR)) {
        const files = fs.readdirSync(TMDB_CACHE_DIR);
        for (const file of files) {
          if (file.endsWith(".json")) {
            fs.unlinkSync(path.join(TMDB_CACHE_DIR, file));
          }
        }
      }
      logMessage(`[Admin Cache Flush] Cleared all server-side TMDB metadata cache files.`);
      return sendJson(res, 200, { status: "success", message: "Server metadata cache cleared." });
    } catch (e) {
      return sendJson(res, 500, { error: e.message });
    }
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
      const sanitized = Object.values(users).map(u => ({ id: u.id, username: u.username, role: u.role, preferences: u.preferences }));
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
      const stats = fs.statSync(cachePath);
      if (stats.size > 0) {
        res.setHeader("Content-Type", "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
        res.setHeader("Expires", new Date(Date.now() + 31536000000).toUTCString());
        res.setHeader("X-Cache", "HIT");
        const stream = fs.createReadStream(cachePath);
        return stream.pipe(res);
      } else {
        try { fs.unlinkSync(cachePath); } catch (e) {}
      }
    }
    
    // Fetch and cache
    https.get(imageUrl, (imageRes) => {
      if (imageRes.statusCode !== 200) {
        res.writeHead(imageRes.statusCode);
        return res.end();
      }
      res.setHeader("Content-Type", imageRes.headers["content-type"] || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000, s-maxage=31536000, immutable");
      res.setHeader("Expires", new Date(Date.now() + 31536000000).toUTCString());
      res.setHeader("X-Cache", "MISS");
      
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
    const probeCmd = `ffprobe -headers "User-Agent: ${userAgent}\r\n" -v error -show_entries format=duration:stream=index,codec_type,codec_name,width,height,disposition:stream_tags -show_chapters -of json "${cleanedTargetUrl.replace(/"/g, '\\"')}"`;

    
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
            const isForced = stream.disposition?.forced === 1;
            const isDefault = stream.disposition?.default === 1;

            if (type === "video" && !videoCodec) {
              videoCodec = codec;
            } else if (type === "audio") {
              audioTracks.push({ index, codec, language, title });
            } else if (type === "subtitle") {
              subtitleTracks.push({ index, codec, language, title, forced: isForced, default: isDefault });
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
    
    const ffmpegArgs = [];
    ffmpegArgs.push(
      "-loglevel", "error",
      "-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: */*\r\n",
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
    subProcess.stderr.on("data", (data) => {
      const msg = data.toString().trim();
      if (msg && !msg.startsWith("size=") && !msg.startsWith("frame=") && !msg.includes("video:0kB")) {
        console.error(`[FFmpeg Subtitle Log] ${msg}`);
      }
    });
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

      let videoCodec = parsedUrl.query.video_codec;
      if (!videoCodec && targetUrl) {
        const lowerUrl = targetUrl.toLowerCase();
        if (lowerUrl.includes('.avi') || lowerUrl.includes('xvid') || lowerUrl.includes('divx')) {
          videoCodec = 'mpeg4';
        } else if (lowerUrl.includes('.mpg') || lowerUrl.includes('.mpeg') || lowerUrl.includes('mpeg2')) {
          videoCodec = 'mpeg2video';
        }
      }
      const gpuInfo = detectGpuCapabilities(videoCodec);
      const isLiveStream = finalMediaUrl.includes("/proxy/ts/stream") || finalMediaUrl.includes("/stream/");

      const audioIndex = parsedUrl.query.audio_index;
      const seekTime = parsedUrl.query.ss;

      const ffmpegArgs = [
        "-headers", headersStr,
        ...(!seekTime ? [
          "-reconnect", "1",
          "-reconnect_at_eof", "1",
          "-reconnect_streamed", "1",
          "-reconnect_delay_max", "3"
        ] : []),
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
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
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
      const lines = data.toString().split("\n");
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Suppress HEVC NAL unit and other meaningless spam
        if (line.includes("Skipping NAL unit") || line.includes("PPS id out of range")) {
          continue;
        }

        logMessage(`[FFmpeg Output] ${line}`);

        if (
          line.includes("Device creation failed") ||
          line.includes("No device available") ||
          line.includes("Hardware device setup failed") ||
          line.includes("CUDA_ERROR") ||
          line.includes("Cannot load libcuda") ||
          line.includes("Failed to create Nvenc") ||
          line.includes("Error creating CUDA context") ||
          line.includes("MFX session failed")
        ) {
          hasGpuDeviceError = true;
        }
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

  // CORS-transparent Stream Proxy Endpoint with server-side redirect following
  // Pure pipe-through — zero transcoding, no FFmpeg.
  if ((cleanPath === "/api/proxy" || cleanPath === "/proxy") && (req.method === "GET" || req.method === "HEAD")) {
    const targetUrl = parsedUrl.searchParams.get("url");
    if (!targetUrl || !targetUrl.startsWith("http")) {
      return sendJson(res, 400, { error: "Missing or invalid 'url' parameter." });
    }

    const forwardRequest = (currentUrl, redirectCount = 0) => {
      if (redirectCount > 5) {
        logMessage(`[Stream Proxy Error] Too many redirects for: ${targetUrl}`, true);
        if (!res.headersSent) sendJson(res, 502, { error: "Too many redirects from upstream." });
        return;
      }

      try {
        const parsed = new URL(currentUrl);
        const isHttps = parsed.protocol === "https:";
        const httpModule = isHttps ? require("https") : require("http");

        const proxyHeaders = {
          "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
          "Accept": "*/*",
          "Accept-Language": "en-US,en;q=0.9",
        };

        if (req.headers["range"]) {
          proxyHeaders["Range"] = req.headers["range"];
        }

        if (redirectCount === 0) {
          logMessage(`[Stream Proxy] Forwarding ${req.method} request for [${initiator.initiatorComponent}] (${initiator.ip}): ${targetUrl.substring(0, 100)}...`);
        }

        const upstream = httpModule.request(currentUrl, {
          method: req.method,
          headers: proxyHeaders,
          rejectUnauthorized: false,
          timeout: 20000,
        }, (upstreamRes) => {
          // Follow HTTP redirects internally on the backend to avoid Mixed Content on client
          if ([301, 302, 303, 307, 308].includes(upstreamRes.statusCode) && upstreamRes.headers.location) {
            let nextUrl = upstreamRes.headers.location;
            if (!nextUrl.startsWith("http://") && !nextUrl.startsWith("https://")) {
              nextUrl = new URL(nextUrl, currentUrl).href;
            }
            upstreamRes.resume();
            return forwardRequest(nextUrl, redirectCount + 1);
          }

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
    };

    forwardRequest(targetUrl);
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

  // GET /api/admin/backup - Admin Backup Export Endpoint
  if ((cleanPath === "/api/admin/backup" || cleanPath === "/admin/backup") && req.method === "GET") {
    const session = authenticate(req);
    if (!session || session.role !== "admin") return sendJson(res, 403, { error: "Admin access required" });

    const serverSettings = loadServerSettings();
    const users = getUsers();
    
    const backupData = {
      version: getLocalVersionData().versionName || "1.0.37",
      timestamp: new Date().toISOString(),
      serverSettings,
      users,
    };
    logMessage(`[Admin Backup] Backup archive exported by admin [${session.username}] (${initiator.ip})`);
    return sendJson(res, 200, { status: "success", backup: backupData });
  }

  // POST /api/admin/restore - Admin Backup Restore Endpoint
  if ((cleanPath === "/api/admin/restore" || cleanPath === "/admin/restore") && req.method === "POST") {
    const session = authenticate(req);
    if (!session || session.role !== "admin") return sendJson(res, 403, { error: "Admin access required" });

    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const backup = payload.backup || payload;
        
        if (!backup || typeof backup !== "object") {
          return sendJson(res, 400, { error: "Invalid backup format" });
        }

        if (backup.serverSettings && typeof backup.serverSettings === "object") {
          saveServerSettings(backup.serverSettings);
        }
        if (Array.isArray(backup.users) && backup.users.length > 0) {
          saveUsers(backup.users);
        }

        logMessage(`[Admin Restore] Server configuration and users restored by admin [${session.username}] (${initiator.ip})`);
        return sendJson(res, 200, { status: "success", message: "Backend settings and user accounts restored successfully." });
      } catch (e) {
        logMessage(`[Admin Restore Error] Failed to restore backup: ${e.message}`, true);
        return sendJson(res, 400, { error: "Failed to parse backup payload" });
      }
    });
    return;
  }

  // Client Logging Ingestion Endpoint (POST /api/log, POST /log)
  if ((cleanPath === "/api/log" || cleanPath === "/log" || cleanPath === "/api/logs" || cleanPath === "/logs") && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const entries = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.logs)
            ? payload.logs
            : Array.isArray(payload.entries)
              ? payload.entries
              : [payload];

        const defaultDevice = payload.device || initiator.initiatorComponent || "Unknown Device";
        const defaultAppVersion = payload.appVersion || (payload.versionName ? `${payload.versionName}${payload.versionCode ? ` (${payload.versionCode})` : ""}` : "");
        const defaultSource = payload.source || initiator.initiatorComponent || "Client App";
        const memSummary = payload.memory && (payload.memory.summary || (payload.memory.ramSummary ? `RAM: ${payload.memory.ramSummary} | ROM: ${payload.memory.romSummary}` : null));

        for (const entry of entries) {
          if (!entry || typeof entry !== "object") continue;
          const lvl = (entry.level || payload.level || "INFO").toUpperCase();
          const tag = entry.tag || entry.source || defaultSource;
          const device = entry.device || defaultDevice;
          const rawAppVer = entry.appVersion || (entry.versionName ? `${entry.versionName}${entry.versionCode ? ` (${entry.versionCode})` : ""}` : "") || defaultAppVersion;
          const appVer = rawAppVer ? (rawAppVer.startsWith("v") ? rawAppVer : `v${rawAppVer}`) : "";
          const msg = entry.message || entry.error || entry.msg || "Log Item";
          const isErr = (lvl === "ERROR" || lvl === "FATAL");

          let logStr = `[AndroidTV ${lvl}] [${tag}] [${device}${appVer ? ` ${appVer}` : ""}] ${msg}`;
          if (entry.title) logStr += ` | Title: ${entry.title}`;
          if (entry.errorCode) logStr += ` | Code: ${entry.errorCode}`;
          if (entry.mediaUrl || entry.url) logStr += ` | Stream: ${entry.mediaUrl || entry.url}`;
          if (entry.memory) {
            logStr += ` | ${typeof entry.memory === "string" ? entry.memory : (entry.memory.summary || JSON.stringify(entry.memory))}`;
          } else if (memSummary && !msg.includes("RAM:") && (tag === "AppLifecycle" || tag === "DeviceStats" || tag === "PlayerActivity" || lvl === "ERROR")) {
            logStr += ` | ${memSummary}`;
          }
          if (entry.details) logStr += ` | Details: ${entry.details}`;
          if (entry.stack) logStr += `\nStack: ${entry.stack}`;

          logMessage(logStr, isErr);
        }

        return sendJson(res, 200, { status: "logged", count: entries.length });
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid log payload: " + e.message });
      }
    });
    return;
  }

  // Client & Server Log Inspection Endpoint (GET /api/log, GET /log, GET /api/logs, GET /logs)
  if ((cleanPath === "/api/log" || cleanPath === "/log" || cleanPath === "/api/logs" || cleanPath === "/logs") && req.method === "GET") {
    try {
      const urlObj = new URL(req.url, "http://localhost");
      const linesCount = Math.min(Math.max(parseInt(urlObj.searchParams.get("lines") || "200", 10), 10), 2000);
      const filterText = (urlObj.searchParams.get("filter") || "").trim().toLowerCase();
      const format = (urlObj.searchParams.get("format") || "text").toLowerCase();

      if (!fs.existsSync(LOG_FILE)) {
        if (format === "json") return sendJson(res, 200, { status: "success", count: 0, lines: [] });
        res.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        return res.end("No log file found.");
      }

      const content = fs.readFileSync(LOG_FILE, "utf8");
      let allLines = content.split("\n").filter((l) => l.trim().length > 0);
      if (filterText) {
        allLines = allLines.filter((l) => l.toLowerCase().includes(filterText));
      }
      const tailLines = allLines.slice(-linesCount);

      if (format === "json") {
        return sendJson(res, 200, {
          status: "success",
          totalAvailable: allLines.length,
          returned: tailLines.length,
          lines: tailLines,
        });
      }

      res.writeHead(200, {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      return res.end(tailLines.join("\n"));
    } catch (err) {
      return sendJson(res, 500, { error: `Failed to read log file: ${err.message}` });
    }
  }

  // ==========================================
  // IPTV & Xtream Codes Management API Routes
  // ==========================================

  // POST /api/iptv/test - Fast & Reliable IPTV Connection Test (< 1 second)
  if (cleanPath === "/api/iptv/test" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const creds = {
          serverUrl: (payload.serverUrl || "").trim().replace(/\/+$/, ""),
          username: (payload.username || "").trim(),
          password: (payload.password || "").trim(),
          epgUrl: (payload.epgUrl || "").trim()
        };

        if (!creds.serverUrl || !creds.username || !creds.password) {
          return sendJson(res, 400, { error: "Server URL, Username, and Password are required." });
        }

        let isXtreamAuthenticated = false;
        let userInfo = null;
        let serverInfo = null;

        // 1. Fast Xtream Codes Auth Check (< 1 second)
        try {
          const authData = await callXtreamApi(creds, "");
          if (authData && authData.user_info) {
            userInfo = authData.user_info;
            serverInfo = authData.server_info;
            if (userInfo.auth === 1 || userInfo.status === "Active" || userInfo.username) {
              isXtreamAuthenticated = true;
            }
          }
        } catch (xtreamErr) {
          logMessage(`[IPTV Test Notice] Xtream player_api.php check: ${xtreamErr.message}`);
        }

        // 2. Fast Category Count Check (< 500ms)
        let groupCount = 0;
        if (isXtreamAuthenticated) {
          try {
            const cats = await callXtreamApi(creds, "get_live_categories");
            if (Array.isArray(cats)) {
              groupCount = cats.length;
            }
          } catch (e) {}

          const expDate = userInfo?.exp_date ? new Date(parseInt(userInfo.exp_date, 10) * 1000).toLocaleDateString() : "Active";
          const maxConn = userInfo?.max_connections || 1;
          const status = userInfo?.status || "Active";

          logMessage(`[IPTV Test Success] User [${creds.username}] verified via Xtream Codes API. Status: ${status}, Expiry: ${expDate}, Categories: ${groupCount}`);

          return sendJson(res, 200, {
            status: "success",
            channelCount: groupCount > 0 ? `${groupCount} categories detected` : "Active",
            groupCount,
            epgGuideCount: creds.epgUrl ? 1 : 0,
            userInfo,
            serverInfo,
            message: `Connected successfully! Account: ${status} (Expires: ${expDate}, Max Connections: ${maxConn}). Found ${groupCount} live categories.`
          });
        }

        // 3. Fallback for non-Xtream M3U URLs: Check playlist availability
        const m3uResult = await fetchM3uPlaylist(creds, false);
        const channelCount = m3uResult.channels.length;
        groupCount = m3uResult.groups.length;

        if (channelCount > 0) {
          return sendJson(res, 200, {
            status: "success",
            channelCount,
            groupCount,
            epgGuideCount: 0,
            message: `Connected successfully! Found ${channelCount} channels across ${groupCount} categories.`
          });
        }

        return sendJson(res, 400, { error: "Failed to authenticate with IPTV provider. Please verify Server URL, Username, and Password." });
      } catch (err) {
        logMessage(`[IPTV Test Error] ${err.message}`, true);
        return sendJson(res, 400, { error: err.message || "Failed to connect to IPTV provider." });
      }
    });
    return;
  }

  // GET /api/iptv/config - Get saved IPTV configuration
  if (cleanPath === "/api/iptv/config" && req.method === "GET") {
    const config = loadIptvConfig();
    return sendJson(res, 200, { status: "success", config });
  }

  // POST /api/iptv/config - Save updated IPTV configuration with intelligent merging
  if (cleanPath === "/api/iptv/config" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const current = loadIptvConfig();

        const credsPayload = payload.credentials || {};
        const credentialsChanged = Boolean(
          (credsPayload.serverUrl && credsPayload.serverUrl !== current.credentials.serverUrl) ||
          (credsPayload.username && credsPayload.username !== current.credentials.username) ||
          (credsPayload.password && credsPayload.password !== current.credentials.password)
        );

        // Merge groups: do not overwrite existing rules with an empty object
        let mergedGroups = { ...current.groups };
        if (payload.groups && typeof payload.groups === "object" && Object.keys(payload.groups).length > 0) {
          mergedGroups = { ...mergedGroups, ...payload.groups };
        }

        // Merge channels: do not overwrite existing rules with an empty object
        let mergedChannels = { ...current.channels };
        if (payload.channels && typeof payload.channels === "object" && Object.keys(payload.channels).length > 0) {
          mergedChannels = { ...mergedChannels, ...payload.channels };
        }

        const updated = {
          ...current,
          ...payload,
          credentials: {
            ...current.credentials,
            ...credsPayload,
          },
          groups: mergedGroups,
          channels: mergedChannels,
          autoNumberStrategy: payload.autoNumberStrategy || current.autoNumberStrategy,
          lastSync: new Date().toISOString()
        };

        const saved = saveIptvConfig(updated, credentialsChanged);
        if (saved) {
          if (payload.channels) {
            iptvShortEpgCache.clear();
          }
          logMessage(`[IPTV Config Saved] Groups: ${Object.keys(updated.groups).length}, Channel Rules: ${Object.keys(updated.channels).length}`);
          return sendJson(res, 200, { status: "success", config: updated });
        } else {
          return sendJson(res, 500, { error: "Failed to save IPTV config to disk." });
        }
      } catch (err) {
        return sendJson(res, 400, { error: `Invalid JSON payload: ${err.message}` });
      }
    });
    return;
  }

  // POST /api/iptv/channel/epg - Assign or update a channel's EPG ID
  if (cleanPath === "/api/iptv/channel/epg" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        const streamId = String(payload.stream_id || "").trim();
        const epgChannelId = payload.epg_channel_id !== undefined ? String(payload.epg_channel_id).trim() : null;

        if (!streamId) {
          return sendJson(res, 400, { error: "Missing stream_id parameter." });
        }

        const config = loadIptvConfig();
        const currentChannelCfg = config.channels[streamId] || {};

        if (epgChannelId === null || epgChannelId === "") {
          // Reset to default
          delete currentChannelCfg.epgChannelId;
          delete currentChannelCfg.epg_channel_id;
        } else {
          currentChannelCfg.epgChannelId = epgChannelId;
        }

        config.channels[streamId] = currentChannelCfg;
        config.lastSync = new Date().toISOString();

        saveIptvConfig(config, false);

        // Invalidate short EPG cache for this stream
        for (const k of iptvShortEpgCache.keys()) {
          if (k.startsWith(`epg_${streamId}`)) {
            iptvShortEpgCache.delete(k);
          }
        }

        logMessage(`[IPTV Channel EPG Assigned] Stream ${streamId} -> EPG ID "${epgChannelId || "(reset to default)"}"`);
        return sendJson(res, 200, {
          status: "success",
          stream_id: streamId,
          epg_channel_id: epgChannelId || "",
          message: "EPG assignment saved successfully."
        });
      } catch (err) {
        return sendJson(res, 400, { error: `Invalid JSON payload: ${err.message}` });
      }
    });
    return;
  }

  // GET /api/iptv/epg/channels - Search or list available EPG channels from XMLTV guide & playlist
  if (cleanPath === "/api/iptv/epg/channels" && req.method === "GET") {
    (async () => {
      try {
        const config = loadIptvConfig();
        const q = (parsedUrl.query.query || parsedUrl.query.q || "").trim().toLowerCase();

        // 1. Ensure XMLTV guide is loaded in memory if credentials exist
        let xmltvList = [];
        if (iptvXmltvCache && iptvXmltvCache.epgChannels && iptvXmltvCache.epgChannels.length > 0) {
          xmltvList = iptvXmltvCache.epgChannels;
        } else if (config.credentials.serverUrl || config.credentials.epgUrl) {
          const xmltv = await fetchXmltvEpg(config.credentials);
          if (xmltv && Array.isArray(xmltv.epgChannels)) {
            xmltvList = xmltv.epgChannels;
          }
        }

        // 2. Extract unique EPG IDs and channel names from playlist
        const playlist = await fetchM3uPlaylist(config.credentials);
        const map = new Map();

        // Add XMLTV channels first
        for (const item of xmltvList) {
          if (!item.id) continue;
          map.set(item.id, {
            id: item.id,
            name: item.name || item.id,
            icon: item.icon || "",
            source: "XMLTV Guide",
          });
        }

        // Add playlist channels that have tvg_id or epg_channel_id
        if (playlist && Array.isArray(playlist.channels)) {
          for (const ch of playlist.channels) {
            const tvgId = (ch.epg_channel_id || ch.tvg_id || "").trim();
            if (tvgId && !map.has(tvgId)) {
              map.set(tvgId, {
                id: tvgId,
                name: ch.name || ch.original_name || tvgId,
                icon: ch.stream_icon || "",
                stream_id: String(ch.stream_id || ""),
                source: "Playlist Channel",
              });
            }
          }
        }

        let results = Array.from(map.values());

        if (q) {
          results = results.filter((c) =>
            c.id.toLowerCase().includes(q) ||
            c.name.toLowerCase().includes(q)
          );
        }

        const total = results.length;
        const capped = results.slice(0, 200);

        return sendJson(res, 200, {
          status: "success",
          total,
          count: capped.length,
          channels: capped,
        });
      } catch (err) {
        logMessage(`[IPTV EPG Channels Error] ${err.message}`, true);
        return sendJson(res, 500, { error: err.message });
      }
    })();
    return;
  }

  // GET /api/iptv/groups - Get all stream categories with enabled state
  if (cleanPath === "/api/iptv/groups" && req.method === "GET") {
    (async () => {
      try {
        const config = loadIptvConfig();
        if (!config.credentials.serverUrl || !config.credentials.username) {
          return sendJson(res, 200, { status: "success", groups: [] });
        }
        const force = parsedUrl.query.refresh === "true";
        const playlist = await fetchM3uPlaylist(config.credentials, force);
        let groups = playlist.groups ? [...playlist.groups] : [];

        // Guaranteed fallback: If groups is empty but channels exist, derive from channels
        if (groups.length === 0 && playlist.channels && playlist.channels.length > 0) {
          const map = new Map();
          for (const ch of playlist.channels) {
            const name = ch.category_name || "General";
            const id = ch.category_id || name;
            if (!map.has(id)) {
              map.set(id, { category_id: String(id), category_name: name, channel_count: 0 });
            }
            map.get(id).channel_count++;
          }
          groups = Array.from(map.values());
        }

        // Additional fallback: If groups is still empty, call Xtream get_live_categories
        if (groups.length === 0) {
          try {
            const xtreamCats = await callXtreamApi(config.credentials, "get_live_categories");
            if (Array.isArray(xtreamCats) && xtreamCats.length > 0) {
              groups = xtreamCats.map((c) => ({
                category_id: String(c.category_id),
                category_name: c.category_name,
                channel_count: 0,
              }));
            }
          } catch (e) {
            logMessage(`[IPTV Groups Fallback] get_live_categories error: ${e.message}`, true);
          }
        }

        const result = groups.map((grp) => {
          const grpCfg = config.groups[grp.category_id] || config.groups[grp.category_name];
          return {
            category_id: grp.category_id,
            category_name: grp.category_name,
            enabled: grpCfg ? grpCfg.enabled !== false : true,
            channel_count: grp.channel_count || 0,
          };
        });

        return sendJson(res, 200, { status: "success", groups: result });
      } catch (err) {
        logMessage(`[IPTV Groups Error] ${err.message}`, true);
        return sendJson(res, 500, { error: err.message });
      }
    })();
    return;
  }

  // GET /api/iptv/channels - Get processed channels
  if (cleanPath === "/api/iptv/channels" && req.method === "GET") {
    (async () => {
      try {
        const config = loadIptvConfig();
        if (!config.credentials.serverUrl || !config.credentials.username) {
          return sendJson(res, 200, { status: "success", channels: [] });
        }
        const includeAll = parsedUrl.query.all === "true";
        let channels = await getProcessedChannels(config, includeAll);

        const limit = parsedUrl.query.limit ? parseInt(parsedUrl.query.limit, 10) : 0;
        if (limit > 0 && channels.length > limit) {
          channels = channels.slice(0, limit);
        }

        return sendJson(res, 200, { status: "success", count: channels.length, channels });
      } catch (err) {
        logMessage(`[IPTV Channels Error] ${err.message}`, true);
        return sendJson(res, 500, { error: err.message });
      }
    })();
    return;
  }

  // POST /api/iptv/epg/batch - Get batch EPG for visible channels in the EPG Grid
  if ((cleanPath === "/api/iptv/epg/batch" || (cleanPath === "/api/iptv/epg" && req.method === "POST")) && (req.method === "POST" || req.method === "GET")) {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", async () => {
      try {
        let channelsList = [];
        if (body) {
          try {
            const parsed = JSON.parse(body);
            if (Array.isArray(parsed.channels)) channelsList = parsed.channels;
            else if (Array.isArray(parsed.streamIds)) {
              channelsList = parsed.streamIds.map((id) => ({ stream_id: String(id) }));
            }
          } catch (e) {}
        }
        if (channelsList.length === 0 && parsedUrl.query.stream_ids) {
          channelsList = parsedUrl.query.stream_ids.split(",").map((id) => ({ stream_id: id.trim() }));
        }

        const config = loadIptvConfig();
        const results = {};
        const nowSec = Math.floor(Date.now() / 1000);

        // 1. Check in-memory caches (iptvShortEpgCache and iptvXmltvCache)
        const uncached = [];
        for (const ch of channelsList) {
          const sid = String(ch.stream_id || "");
          if (!sid) continue;

          // Check if channel has custom assigned EPG in config
          const chCfg = config.channels && config.channels[sid];
          const customEpgId = (chCfg?.epgChannelId || chCfg?.epg_channel_id || "").trim();
          const tvgId = (customEpgId || ch.tvg_id || ch.epg_channel_id || "").trim();
          const chName = (chCfg?.customName || ch.name || "").trim();

          const cacheKey = `epg_${sid}`;
          const cached = iptvShortEpgCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
            results[sid] = cached.listings;
            continue;
          }

          // Check XMLTV memory cache
          if (iptvXmltvCache && iptvXmltvCache.timestamp > 0) {
            const normName = chName.toLowerCase().replace(/[^a-z0-9]/g, "");
            let raw = null;
            if (tvgId && iptvXmltvCache.byTvgId && iptvXmltvCache.byTvgId.has(tvgId)) {
              raw = iptvXmltvCache.byTvgId.get(tvgId);
            } else if (iptvXmltvCache.byTvgId && iptvXmltvCache.byTvgId.has(sid)) {
              raw = iptvXmltvCache.byTvgId.get(sid);
            } else if (normName && iptvXmltvCache.byName && iptvXmltvCache.byName.has(normName)) {
              raw = iptvXmltvCache.byName.get(normName);
            }
            if (raw && raw.length > 0) {
              const relevant = raw
                .filter((p) => !p.stop_timestamp || p.stop_timestamp >= nowSec - 7200)
                .slice(0, 15);
              results[sid] = relevant;
              iptvShortEpgCache.set(cacheKey, { timestamp: Date.now(), listings: relevant });
              continue;
            }
          }

          const targetSid = (customEpgId && /^\d+$/.test(customEpgId)) ? customEpgId : sid;
          uncached.push({ ...ch, stream_id: sid, target_sid: targetSid, tvg_id: tvgId });
        }

        // 2. Query Xtream player_api.php get_short_epg for remaining channels in controlled parallel batches
        if (uncached.length > 0 && config.credentials.serverUrl && config.credentials.username) {
          const toFetch = uncached.slice(0, 20);
          await Promise.all(toFetch.map(async (ch) => {
            const sid = String(ch.stream_id);
            const targetStreamId = ch.target_sid || sid;
            try {
              const data = await callXtreamApi(config.credentials, "get_short_epg", {
                stream_id: targetStreamId,
                limit: "10"
              });
              const rawList = data && Array.isArray(data.epg_listings) ? data.epg_listings : [];
              if (rawList.length > 0) {
                const listings = rawList.map((item) => {
                  let title = item.title || "";
                  try {
                    const decoded = Buffer.from(title, "base64").toString("utf8");
                    if (/^[\x20-\x7E\s\u00A0-\u024F]+$/.test(decoded) && decoded.length > 2) title = decoded;
                  } catch (e) {}

                  let desc = item.description || "";
                  try {
                    const decodedDesc = Buffer.from(desc, "base64").toString("utf8");
                    if (/^[\x20-\x7E\s\u00A0-\u024F]+$/.test(decodedDesc) && decodedDesc.length > 2) desc = decodedDesc;
                  } catch (e) {}

                  return {
                    id: item.id,
                    title: title.trim(),
                    description: desc.trim(),
                    start: item.start,
                    end: item.end,
                    start_timestamp: item.start_timestamp,
                    stop_timestamp: item.stop_timestamp,
                  };
                });
                results[sid] = listings;
                iptvShortEpgCache.set(`epg_${sid}`, { timestamp: Date.now(), listings });
              } else {
                results[sid] = [];
              }
            } catch (err) {
              results[sid] = [];
            }
          }));
        }

        return sendJson(res, 200, { status: "success", epg: results });
      } catch (err) {
        logMessage(`[IPTV Batch EPG Error] ${err.message}`, true);
        return sendJson(res, 200, { status: "success", epg: {} });
      }
    });
    return;
  }

  // GET /api/iptv/epg - Get EPG for a channel (Xtream player API first, with XMLTV fallback)
  if (cleanPath === "/api/iptv/epg" && req.method === "GET") {
    (async () => {
      try {
        const streamId = parsedUrl.query.stream_id || "";
        const queryTvgId = (parsedUrl.query.tvg_id || "").trim();
        const queryChannelName = (parsedUrl.query.name || "").trim();

        if (!streamId && !queryTvgId && !queryChannelName) {
          return sendJson(res, 400, { error: "Missing stream_id or tvg_id parameter" });
        }

        const config = loadIptvConfig();
        if (!config.credentials.serverUrl) {
          return sendJson(res, 200, { status: "success", epg: [] });
        }

        const chCfg = (streamId && config.channels) ? config.channels[streamId] : null;
        const customEpgId = (chCfg?.epgChannelId || chCfg?.epg_channel_id || "").trim();
        const tvgId = (customEpgId || queryTvgId).trim();
        const channelName = (chCfg?.customName || queryChannelName).trim();
        const targetStreamId = (customEpgId && /^\d+$/.test(customEpgId)) ? customEpgId : streamId;

        // 1. FAST PATH: Check short EPG cache
        if (streamId) {
          const cacheKey = `epg_${streamId}`;
          const cached = iptvShortEpgCache.get(cacheKey);
          if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
            return sendJson(res, 200, { status: "success", source: "cache", epg: cached.listings });
          }
        }

        // 2. If custom EPG is set and exists in XMLTV, prioritize XMLTV guide
        if (customEpgId && iptvXmltvCache && iptvXmltvCache.timestamp > 0) {
          let rawListings = null;
          if (iptvXmltvCache.byTvgId && iptvXmltvCache.byTvgId.has(customEpgId)) {
            rawListings = iptvXmltvCache.byTvgId.get(customEpgId);
          }
          if (rawListings && rawListings.length > 0) {
            const nowSec = Math.floor(Date.now() / 1000);
            const relevant = rawListings
              .filter((p) => !p.stop_timestamp || p.stop_timestamp >= nowSec - 7200)
              .slice(0, 15);
            if (streamId) iptvShortEpgCache.set(`epg_${streamId}`, { timestamp: Date.now(), listings: relevant });
            return sendJson(res, 200, { status: "success", source: "xmltv", epg: relevant });
          }
        }

        // 3. Query player_api.php get_short_epg (< 150ms)
        if (targetStreamId) {
          try {
            const data = await callXtreamApi(config.credentials, "get_short_epg", {
              stream_id: targetStreamId,
              limit: "10"
            });
            const rawList = data && Array.isArray(data.epg_listings) ? data.epg_listings : [];
            if (rawList.length > 0) {
              const listings = rawList.map((item) => {
                let title = item.title || "";
                try {
                  const decoded = Buffer.from(title, "base64").toString("utf8");
                  if (/^[\x20-\x7E\s\u00A0-\u024F]+$/.test(decoded) && decoded.length > 2) title = decoded;
                } catch (e) {}

                let desc = item.description || "";
                try {
                  const decodedDesc = Buffer.from(desc, "base64").toString("utf8");
                  if (/^[\x20-\x7E\s\u00A0-\u024F]+$/.test(decodedDesc) && decodedDesc.length > 2) desc = decodedDesc;
                } catch (e) {}

                return {
                  id: item.id,
                  title: title.trim(),
                  description: desc.trim(),
                  start: item.start,
                  end: item.end,
                  start_timestamp: item.start_timestamp,
                  stop_timestamp: item.stop_timestamp,
                };
              });

              if (streamId) iptvShortEpgCache.set(`epg_${streamId}`, { timestamp: Date.now(), listings });
              return sendJson(res, 200, { status: "success", source: "xtream", epg: listings });
            }
          } catch (e) {}
        }

        // 4. SLOW FALLBACK: Check XMLTV guide
        if (tvgId || config.credentials.epgUrl) {
          const xmltv = await fetchXmltvEpg(config.credentials);
          let rawListings = [];

          if (tvgId && xmltv.byTvgId && xmltv.byTvgId.has(tvgId)) {
            rawListings = xmltv.byTvgId.get(tvgId);
          } else if (streamId && xmltv.byTvgId && xmltv.byTvgId.has(streamId)) {
            rawListings = xmltv.byTvgId.get(streamId);
          } else if (channelName && xmltv.byName) {
            const normName = channelName.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (xmltv.byName.has(normName)) {
              rawListings = xmltv.byName.get(normName);
            }
          }

          if (rawListings && rawListings.length > 0) {
            const nowSec = Math.floor(Date.now() / 1000);
            const relevant = rawListings
              .filter((p) => !p.stop_timestamp || p.stop_timestamp >= nowSec - 7200)
              .slice(0, 15);
            if (streamId) iptvShortEpgCache.set(`epg_${streamId}`, { timestamp: Date.now(), listings: relevant });
            return sendJson(res, 200, { status: "success", source: "xmltv", epg: relevant });
          }
        }

        return sendJson(res, 200, { status: "success", epg: [] });
      } catch (err) {
        logMessage(`[IPTV EPG Error] ${err.message}`, true);
        return sendJson(res, 200, { status: "success", epg: [] });
      }
    })();
    return;
  }

  // GET /api/iptv/stream/:streamId - Stream Resolver & HTTPS Proxy Endpoint
  if (cleanPath.startsWith("/api/iptv/stream/") && req.method === "GET") {
    (async () => {
      try {
        const streamId = cleanPath.replace("/api/iptv/stream/", "").replace(/\.(m3u8|ts)$/, "");
        const directUrl = parsedUrl.query.url;
        const config = loadIptvConfig();
        const { serverUrl, username, password } = config.credentials;

        logMessage(`[IPTV Stream Request] Stream ID: "${streamId}" | Direct URL: ${directUrl ? directUrl.substring(0, 80) : "none"}`);

        // Candidates to attempt
        const candidates = [];
        if (directUrl && directUrl.startsWith("http")) {
          candidates.push(directUrl);
        }
        const cachedUrl = iptvChannelsCache.streamUrlMap.get(String(streamId)) || iptvChannelsCache.streamUrlMap.get(decodeURIComponent(streamId));
        if (cachedUrl && !candidates.includes(cachedUrl)) {
          candidates.push(cachedUrl);
        }

        const cleanServer = (serverUrl || "").trim().replace(/\/+$/, "").replace(/\/get\.php.*$/, "");
        if (cleanServer && username && password) {
          const xtreamHls = `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(streamId)}.m3u8`;
          const xtreamTs = `${cleanServer}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(streamId)}.ts`;
          const xtreamDirect = `${cleanServer}/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${encodeURIComponent(streamId)}`;

          if (!candidates.includes(xtreamHls)) candidates.push(xtreamHls);
          if (!candidates.includes(xtreamTs)) candidates.push(xtreamTs);
          if (!candidates.includes(xtreamDirect)) candidates.push(xtreamDirect);
        }

        if (candidates.length === 0) {
          return sendJson(res, 404, { error: `No stream URL found for channel ${streamId}` });
        }

        let successfulRes = null;
        let successfulUrl = null;
        let lastError = null;

        for (const candidate of candidates) {
          try {
            logMessage(`[IPTV Stream] Trying candidate: ${candidate.substring(0, 100)}...`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const upstreamRes = await fetch(candidate, {
              signal: controller.signal,
              headers: {
                "User-Agent": "VLC/3.0.18 LibVLC/3.0.18",
                "Accept": "*/*",
                "Connection": "keep-alive",
              },
              redirect: "follow",
            });
            clearTimeout(timeoutId);

            if (upstreamRes.ok) {
              successfulRes = upstreamRes;
              successfulUrl = candidate;
              break;
            } else {
              logMessage(`[IPTV Stream] Candidate returned status ${upstreamRes.status} on ${candidate.substring(0, 80)}`);
              lastError = `HTTP ${upstreamRes.status}`;
            }
          } catch (e) {
            logMessage(`[IPTV Stream] Candidate fetch error: ${e.message} on ${candidate.substring(0, 80)}`, true);
            lastError = e.message;
          }
        }

        if (!successfulRes) {
          // If all candidates failed and any candidate contained /auth/, trigger background M3U refresh
          if (candidates.some((c) => c.includes("/auth/")) && config.credentials.serverUrl) {
            logMessage(`[IPTV Stream Token Refresh] Stale tokens detected. Triggering background M3U refresh...`);
            fetchM3uPlaylist(config.credentials, true).catch(() => {});
          }
          return sendJson(res, 502, { error: `Unable to connect to IPTV stream: ${lastError || "Upstream 404"}` });
        }

        const contentType = (successfulRes.headers.get("content-type") || "").toLowerCase();
        const reader = successfulRes.body.getReader();
        const firstChunk = await reader.read();
        if (firstChunk.done || !firstChunk.value) {
          return sendJson(res, 502, { error: "Empty response from IPTV upstream." });
        }

        const chunkStr = new TextDecoder().decode(firstChunk.value.slice(0, 1024));
        const isM3u8 = chunkStr.includes("#EXTM3U") || contentType.includes("mpegurl");

        // 1. If upstream returns an HLS playlist (M3U8)
        if (isM3u8) {
          let playlistText = new TextDecoder().decode(firstChunk.value);
          while (true) {
            const next = await reader.read();
            if (next.done) break;
            if (next.value) playlistText += new TextDecoder().decode(next.value);
          }

          const finalUrl = successfulRes.url || successfulUrl;
          const lines = playlistText.split(/\r?\n/);
          const rewritten = lines.map((l) => {
            const trimmed = l.trim();
            if (!trimmed || trimmed.startsWith("#")) return l;
            let absUrl = trimmed;
            if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
              try {
                absUrl = new URL(trimmed, finalUrl).href;
              } catch (e) {
                absUrl = trimmed;
              }
            }
            return `/api/proxy?url=${encodeURIComponent(absUrl)}`;
          }).join("\n");

          res.writeHead(200, {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache, no-store, must-revalidate",
          });
          return res.end(rewritten);
        }

        // 2. Upstream returned a binary stream or MPEG-TS
        res.writeHead(200, {
          "Content-Type": contentType || "video/mp2t",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        });

        res.write(Buffer.from(firstChunk.value.buffer, firstChunk.value.byteOffset, firstChunk.value.byteLength));

        let clientClosed = false;
        req.on("close", () => {
          clientClosed = true;
          try {
            reader.cancel();
          } catch (e) {}
        });

        while (!clientClosed) {
          const next = await reader.read();
          if (next.done || !next.value) break;
          const chunkBuf = Buffer.from(next.value.buffer, next.value.byteOffset, next.value.byteLength);
          if (!res.write(chunkBuf)) {
            await new Promise((resolve) => res.once("drain", resolve));
          }
        }
        if (!res.writableEnded) {
          res.end();
        }
      } catch (err) {
        logMessage(`[IPTV Stream Exception] ${err.message}`, true);
        if (!res.headersSent) sendJson(res, 500, { error: err.message });
      }
    })();
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
          sendJson(res, 200, getLocalVersionData());
        }
      });
    }).on("error", (vErr) => {
      logMessage(`[Version Check Network Error] Unable to fetch version.json from GitHub: ${vErr.message}`, true);
      sendJson(res, 200, getLocalVersionData());
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
  logMessage(`[BubbaFlix Server] HTTP API & Transcoder listening on port ${PORT}`);
  const localVersion = getLocalVersionData();
  const serverVersionStr = localVersion.versionName || "1.0.42";
  const formattedVersion = serverVersionStr.startsWith("v") ? serverVersionStr : `v${serverVersionStr}`;
  logMessage(`[BubbaFlix Server] Version: ${formattedVersion}`);
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
