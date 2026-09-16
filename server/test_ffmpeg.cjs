const { spawn } = require("child_process");

const targetUrl = "https://1-cdn2-ovh-bea.energycdn.com/cdn3sto/funnydonkey-sto/66f64111c18912.29070127/387149411/1789223941/ec55b35514847685d326c1550e2890d517f6ae23/68b4c4171561779556af5929833908398185178fec4c75eeaa0ee42b09a4ae42/2012.2009.Open.Matte.1080p.WEBRip.x265.10bit-KONTRAST.mp4";

const ffmpegArgs = [
  "-headers", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\nAccept: */*\r\n",
  "-reconnect", "1",
  "-reconnect_at_eof", "1",
  "-reconnect_streamed", "1",
  "-reconnect_delay_max", "3",
  "-analyzeduration", "3000000",
  "-probesize", "3000000",
  "-threads", "4",
  "-i", targetUrl,
  "-map", "0:v:0",
  "-map", "0:2",
  "-c:v", "libx264",
  "-preset", "superfast",
  "-crf", "20",
  "-pix_fmt", "yuv420p",
  "-maxrate", "6M",
  "-bufsize", "8M",
  "-c:a", "aac",
  "-b:a", "192k",
  "-ac", "2",
  "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
  "-movflags", "frag_keyframe+empty_moov+default_base_moof",
  "-f", "mp4",
  "pipe:1"
];

const proc = spawn("ffmpeg", ffmpegArgs);

proc.stderr.on("data", (data) => {
  console.log(data.toString());
});

proc.on("close", (code) => {
  console.log("Exited with code:", code);
});
