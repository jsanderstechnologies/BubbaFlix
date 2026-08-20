import express from "express";
import { spawn } from "child_process";

const app = express();
const PORT = process.env.TRANSCODER_PORT || 5000;

app.use(express.json());

// Health check endpoint
app.get("/api/transcode/health", (req, res) => {
  res.json({ status: "ok", service: "BubbaFlix FFmpeg Transcoder" });
});

// FFmpeg On-the-Fly Video & Audio Transcoding Stream Endpoint
app.get("/api/transcode", (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing required query parameter: url" });
  }

  console.log(`[FFmpeg Transcoder] Starting real-time stream for: ${videoUrl}`);

  // Set HTTP headers for MP4 video streaming
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  // Spawn FFmpeg process for real-time MP4 streaming with H.264 video and AAC stereo audio
  const ffmpegArgs = [
    "-re",
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
    "-movflags", "frag_keyframe+empty_moov",
    "pipe:1"
  ];

  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  // Pipe FFmpeg stdout directly to HTTP response stream
  ffmpegProcess.stdout.pipe(res);

  ffmpegProcess.stderr.on("data", (data) => {
    // Suppress verbose FFmpeg log lines to keep terminal clean
    const msg = data.toString();
    if (msg.includes("Error") || msg.includes("error")) {
      console.warn("[FFmpeg Warning]:", msg.trim());
    }
  });

  ffmpegProcess.on("error", (err) => {
    console.error("[FFmpeg Process Error]:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "FFmpeg transcoding failed to start." });
    }
  });

  ffmpegProcess.on("close", (code) => {
    console.log(`[FFmpeg Transcoder] Process finished with exit code ${code}`);
  });

  // Kill FFmpeg process immediately if user closes player or disconnects stream
  req.on("close", () => {
    console.log("[FFmpeg Transcoder] Client disconnected. Terminating FFmpeg process...");
    ffmpegProcess.kill("SIGKILL");
  });
});

app.listen(PORT, () => {
  console.log(`[BubbaFlix FFmpeg Transcoder] Running on port ${PORT}`);
});
