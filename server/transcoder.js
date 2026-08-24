import express from "express";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.TRANSCODER_PORT || 5000;

app.use(express.json());

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

  console.log(`[FFmpeg Transcoder Engine] [SPAWN] Executing: ffmpeg ${ffmpegArgs.join(" ")}`);
  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  // Pipe FFmpeg stdout directly to HTTP response stream
  ffmpegProcess.stdout.pipe(res);

  // Stream full FFmpeg output logs directly to container stdout so Portainer logs display all transcoding functions & stats
  ffmpegProcess.stderr.on("data", (data) => {
    const msg = data.toString();
    process.stdout.write(`[FFmpeg] ${msg}`);
  });

  ffmpegProcess.on("error", (err) => {
    console.error(`[FFmpeg Transcoder Engine] [ERROR] Process failed to start: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).json({ error: "FFmpeg transcoding failed to start." });
    }
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`[FFmpeg Transcoder Engine] [EXIT] Process terminated with code: ${code}`);
    console.log(`====================================================`);
  });

  // Kill FFmpeg process immediately if user closes player or disconnects stream
  req.on("close", () => {
    console.log(`[FFmpeg Transcoder Engine] [DISCONNECT] Client closed player. Killing FFmpeg process...`);
    ffmpegProcess.kill("SIGKILL");
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[BubbaFlix FFmpeg Transcoder Engine] Server listening on 0.0.0.0:${PORT}`);
});
