import { isTvDevice } from "./zoom";

/**
 * Checks if the current client is a native device with full hardware codec decoding
 * (Android TV, Firestick, Apple TV / iOS).
 */
export const isNativeCodecDevice = () => {
  if (typeof window === "undefined") return false;

  // 1. Android TV / Firestick / Android WebView with ExoPlayer Bridge
  if (isTvDevice() || window.AndroidPlayer || /Android|TV|FireTV|Firestick/i.test(navigator.userAgent)) {
    return true;
  }

  // 2. Apple TV / iOS device
  if (/iPhone|iPad|iPod|AppleTV/i.test(navigator.userAgent)) {
    return true;
  }

  return false;
};

/**
 * Determines whether a stream URL or title requires backend server transcoding
 * for web browser compatibility.
 */
export const shouldAutoTranscode = (streamUrl, streamTitle = "") => {
  if (!streamUrl) return false;

  // Native ExoPlayer & Apple TV devices decode all audio/video formats natively
  if (isNativeCodecDevice()) {
    return false;
  }

  const textToTest = `${streamUrl} ${streamTitle}`.toLowerCase();

  // Incompatible audio codecs for standard web browsers
  const incompatibleAudio = [
    "ac3",
    "eac3",
    "truehd",
    "atmos",
    "dts",
    "dts-hd",
    "dts-x",
    "dtshd",
    "dtsx",
    "dd5.1",
    "dd7.1",
    "dolby digital",
  ];

  // Incompatible containers/codecs for standard web browsers
  const incompatibleContainers = [".mkv", ".avi", ".ts", "hevc", "h265", "x265", "10bit"];

  const hasIncompatibleAudio = incompatibleAudio.some((codec) => textToTest.includes(codec));
  const hasIncompatibleContainer = incompatibleContainers.some((fmt) => textToTest.includes(fmt));

  return hasIncompatibleAudio || hasIncompatibleContainer;
};
