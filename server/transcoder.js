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

try {
  const udpSocket = dgram.createSocket({ type: "udp4", reuseAddr: true });

  udpSocket.on("error", (err) => {
    logMessage(`[UDP Discovery Beacon Error]: ${err.stack}`, true);
    try { udpSocket.close(); } catch (e) {}
  });

  udpSocket.on("message", (msg, rinfo) => {
    const messageStr = msg.toString().trim();
    if (messageStr === "BUBBAFLIX_DISCOVER") {
      logMessage(`[UDP Discovery Beacon] Received discover probe from ${rinfo.address}:${rinfo.port}`);
      const localIp = getLocalIpAddress();
      const responseBuf = Buffer.from(`bubbaflix-server|${localIp}|5150`);
      udpSocket.send(responseBuf, 0, responseBuf.length, rinfo.port, rinfo.address, (err) => {
        if (err) {
          logMessage(`[UDP Discovery Beacon Send Error]: ${err.message}`, true);
        }
      });
    }
  });

  udpSocket.on("listening", () => {
    const address = udpSocket.address();
    logMessage(`[UDP Discovery Beacon] Listening for broadcasts on UDP 0.0.0.0:${address.port}`);
  });

  udpSocket.bind(UDP_DISCOVERY_PORT);
} catch (udpErr) {
  logMessage(`[UDP Discovery Beacon Setup Failed]: ${udpErr.message}`, true);
}

const getEnvDefaults = () => ({
  aiostreamsUrl: process.env.AIOSTREAMS_URL || "",
  simklClientId: process.env.SIMKL_CLIENT_ID || "",
  groqKey: process.env.GROQ_API_KEY || "",
  tmdbToken: process.env.TMDB_READ_ACCESS_TOKEN || DEFAULT_TMDB_KEY,
  dispatcharrUrl: process.env.DISPATCHARR_URL || "http://192.168.1.100:9191",
  dispatcharrApiKey: process.env.DISPATCHARR_API_KEY || ""
});

const loadServerSettings = () => {
  const envDefaults = getEnvDefaults();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
      const saved = JSON.parse(raw);
      const merged = { ...envDefaults, ...saved };
      logMessage(`Loaded server settings from ${SETTINGS_FILE}`);
      return merged;
    }
  } catch (err) {
    logMessage(`Failed to read ${SETTINGS_FILE}, falling back to environment defaults: ${err.message}`, true);
  }
  return envDefaults;
};

const getSettings = () => {
  return loadServerSettings();
};

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

  if (pathname === "/api/transcode/health" && req.method === "GET") {
    return sendJson(res, 200, {
      status: "ok",
      service: "BubbaFlix VLC & FFmpeg Transcoder Engine",
      capabilities: ["AC3", "EAC3", "TrueHD", "DTS", "DTS-HD", "FLAC", "HEVC", "AV1", "VP9", "H264", "MKV", "TS", "MP4"]
    });
  }

  if ((pathname === "/api/transcode" || pathname === "/api/transcode/") && req.method === "GET") {
    const targetUrl = parsedUrl.query.url;

    if (!targetUrl) {
      logMessage("[Transcoder Engine Error] Request missing required 'url' parameter.", true);
      return sendJson(res, 400, { error: "Missing required query parameter: url" });
    }

    logMessage(`[Transcoder Engine] Proxying video stream: ${targetUrl}`);

    try {
      const parsedTarget = url.parse(targetUrl);
      const isHttps = parsedTarget.protocol === "https:";
      const httpModule = isHttps ? require("https") : require("http");

      const proxyReq = httpModule.request(targetUrl, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
          "Accept": "*/*"
        }
      }, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, {
          ...proxyRes.headers,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        });
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (err) => {
        logMessage(`[Transcoder Stream Proxy Error]: ${err.message}`, true);
        sendJson(res, 500, { error: `Failed to stream target URL: ${err.message}` });
      });

      proxyReq.end();
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  if (pathname === "/api/settings" && req.method === "GET") {
    const settings = getSettings();
    return sendJson(res, 200, settings);
  }

  if (pathname === "/api/settings" && req.method === "POST") {
    let body = "";
    req.on("data", chunk => { body += chunk.toString(); });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const currentSettings = getSettings();
        const updatedSettings = { ...currentSettings, ...payload };
        const saved = saveServerSettings(updatedSettings);
        if (saved) {
          logMessage(`[Settings Updated] Successfully saved settings.json.`);
          return sendJson(res, 200, { status: "success", settings: updatedSettings });
        } else {
          return sendJson(res, 500, { error: "Failed to persist settings." });
        }
      } catch (e) {
        return sendJson(res, 400, { error: "Invalid JSON payload." });
      }
    });
    return;
  }

  if (pathname.startsWith("/api/dispatcharr")) {
    const settings = getSettings();
    const dispatcharrUrl = (settings.dispatcharrUrl || "http://192.168.1.100:9191").replace(/\/$/, "");
    const apiKey = settings.dispatcharrApiKey || "";

    const subPath = pathname.replace(/^\/api\/dispatcharr/, "") || "/";
    const targetDispatcharrUrl = `${dispatcharrUrl}${subPath}${parsedUrl.search || ""}`;

    logMessage(`[Dispatcharr Proxy] Forwarding ${req.method} request to ${targetDispatcharrUrl}`);

    try {
      const targetParsed = url.parse(targetDispatcharrUrl);
      const headers = { ...req.headers, host: targetParsed.host };
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
        headers["X-API-Key"] = apiKey;
      }

      const proxyReq = http.request(targetDispatcharrUrl, {
        method: req.method,
        headers: headers,
        timeout: 5000
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
  logMessage(`[BubbaFlix Backend Server] Node listening on 0.0.0.0:${PORT}`);
  loadServerSettings();
});
