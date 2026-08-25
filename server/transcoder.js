import express from "express";
import { spawn } from "child_process";
import dgram from "dgram";
import os from "os";

const app = express();
const PORT = process.env.TRANSCODER_PORT || 5000;
const UDP_DISCOVERY_PORT = 5151;

app.use(express.json());

// Get local IPv4 address
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
        udpServer.send(replyBuf, 0, replyBuf.length, rinfo.port, rinfo.address);
      }
    });

    udpServer.bind(UDP_DISCOVERY_PORT, () => {
      try {
        udpServer.setBroadcast(true);
      } catch (e) {}
      console.log(`[BubbaFlix Server] UDP Local Discovery Beacon running on port ${UDP_DISCOVERY_PORT}`);
    });
  } catch (err) {
    console.error(`[BubbaFlix Server] Failed to start UDP Discovery Beacon: ${err.message}`);
  }
};

startUdpDiscovery();

// Local Network Server Discovery Endpoint
app.get(["/api/discover", "/api/discover/"], (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({
    status: "ok",
    service: "bubbaflix-server",
    name: "BubbaFlix Media Server",
    port: 5150,
    ip: localIp,
    url: `http://${localIp}:5150`
  });
});

// Health check endpoint
app.get("/api/transcode/health", (req, res) => {
  res.json({ status: "ok", service: "BubbaFlix FFmpeg Transcoder Engine" });
});

// FFmpeg On-the-Fly Video & Audio Transcoding Stream Endpoint
app.get(["/api/transcode", "/api/transcode/"], (req, res) => {
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
  res.setHeader("Transfer-Encoding", "chunked");

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

  console.log(`[FFmpeg Transcoder Engine] Spawning command: ffmpeg ${ffmpegArgs.join(" ")}`);
  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  ffmpegProcess.stdout.pipe(res);

  ffmpegProcess.stderr.on("data", (data) => {
    const logLine = data.toString();
    if (logLine.includes("Error") || logLine.includes("failed") || logLine.includes("frame=")) {
      console.log(`[FFmpeg Log] ${logLine.trim()}`);
    }
  });

  ffmpegProcess.on("error", (err) => {
    console.error(`[FFmpeg Transcoder Error] Failed to start process: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "FFmpeg process error." });
    }
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`[FFmpeg Transcoder Engine] Process exited with code ${code}`);
    if (!res.writableEnded) {
      res.end();
    }
  });

  req.on("close", () => {
    console.log("[FFmpeg Transcoder Engine] Client disconnected. Terminating FFmpeg...");
    ffmpegProcess.kill("SIGKILL");
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BubbaFlix Transcoder Engine] Listening on http://0.0.0.0:${PORT}`);
});
