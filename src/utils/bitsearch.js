import axios from "axios";
import { filterWithGroqAI } from "./groqFilter";
import { isTvDevice } from "./zoom";

export const getBitsearchApiKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("bitsearch_api_key");
    if (saved) return saved;
  }
  return import.meta.env.VITE_BITSEARCH_API_KEY || "";
};

export const getStreamPreferences = () => {
  if (typeof window === "undefined") {
    return {
      resolutions: ["2160p", "1080p", "720p", "480p"],
      excludeLowQuality: true,
    };
  }
  const savedRes = localStorage.getItem("stream_resolutions");
  const savedExcludeLow = localStorage.getItem("stream_exclude_low_quality");
  return {
    resolutions: savedRes ? JSON.parse(savedRes) : ["2160p", "1080p", "720p", "480p"],
    excludeLowQuality: savedExcludeLow !== null ? JSON.parse(savedExcludeLow) : true,
  };
};

export const isAdultOrAudioFile = (titleStr) => {
  if (!titleStr) return false;
  const t = titleStr.toLowerCase();

  const adultKeywords = [
    "xxx", "porn", "hentai", "erotica", "adult", "brazzers", "bangbros",
    "naughtyamerica", "sweethearts", "fetish", "onlyfans", "s3xus", "gala3xy",
    "vr.inception", "jav", "uncensored", "x-rated", "playboy", "penthouse"
  ];

  const audioKeywords = [
    "soundtrack", "discography", "flac", "320kbps", "mp3", "aac 256",
    "audiobook", "album", "vinyl", "lossless", "24bit-44.1khz", "24bit-96khz"
  ];

  const hasAdult = adultKeywords.some((word) => t.includes(word));
  const hasAudio = audioKeywords.some((word) => t.includes(word));

  return hasAdult || hasAudio;
};

export const isWebCompatibleStream = (titleStr) => {
  if (!titleStr) return false;
  const t = titleStr.toLowerCase();

  // Incompatible containers, video codecs, and multi-channel surround audio codecs for native HTML5 web players
  const incompatibleKeywords = [
    ".mkv", ".avi", "x265", "h265", "h.265", "hevc", "av1", "xvid", "divx",
    "dts", "dts-hd", "dts-x", "ac3", "eac3", "truehd", "atmos", "5.1", "7.1"
  ];

  const isIncompatible = incompatibleKeywords.some((word) => t.includes(word));
  return !isIncompatible;
};

export const isLowQualityCamOrTS = (titleStr) => {
  if (!titleStr) return false;
  const t = titleStr.toLowerCase();

  return (
    t.includes("hdcam") ||
    t.includes("camrip") ||
    t.includes("telesync") ||
    t.includes("telecine") ||
    t.includes("hdts") ||
    t.includes("hdtc") ||
    /\b(cam|ts|tc)\b/i.test(t) ||
    /\.(cam|ts|tc)\./i.test(t) ||
    /-(cam|ts|tc)\b/i.test(t) ||
    /\b(cam|ts|tc)-/i.test(t)
  );
};

const detectResolution = (titleStr) => {
  const t = titleStr.toLowerCase();
  if (t.includes("2160p") || t.includes("4k") || t.includes("uhd")) return "2160p";
  if (t.includes("1080p") || t.includes("fhd") || t.includes("fullhd")) return "1080p";
  if (t.includes("720p") || t.includes("hd")) return "720p";
  if (t.includes("480p") || t.includes("576p") || t.includes("sd") || t.includes("dvd")) return "480p";
  return "1080p";
};

const filterByPreferences = (results) => {
  if (!results || results.length === 0) return [];

  const { resolutions, excludeLowQuality } = getStreamPreferences();
  const isTv = isTvDevice();

  // 1. Filter out Adult content & standalone audio/music files
  let pool = results.filter((item) => !isAdultOrAudioFile(item.title));
  if (pool.length === 0 && results.length > 0) {
    return [];
  }

  // 2. If NOT on a TV device (standard web browser/mobile), filter out web-incompatible formats.
  // Smart TV devices (Android TV, Firestick, Apple TV, webOS, Tizen) have native hardware decoders for MKV, x265, DTS, AC3, 5.1/7.1
  if (!isTv) {
    const webPool = pool.filter((item) => isWebCompatibleStream(item.title));
    if (webPool.length > 0) {
      pool = webPool;
    }
  }

  // 3. Filter out CAM, HDCAM, Telesync, HDTS, TC videos if excludeLowQuality is true
  if (excludeLowQuality) {
    const cleanPool = pool.filter((item) => !isLowQualityCamOrTS(item.title));
    if (cleanPool.length > 0) {
      pool = cleanPool;
    }
  }

  // 4. Filter by user resolution selections
  const resActive = resolutions && resolutions.length > 0 && resolutions.length < 4;
  if (!resActive) {
    return pool;
  }

  const filtered = pool.filter((item) => {
    const res = detectResolution(item.title);
    return resolutions.includes(res);
  });

  return filtered.length > 0 ? filtered : pool;
};

const formatSize = (bytes) => {
  if (!bytes) return "N/A";
  if (typeof bytes === "string" && (bytes.includes("GB") || bytes.includes("MB") || bytes.includes("KB"))) {
    return bytes;
  }
  const num = Number(bytes);
  if (isNaN(num) || num <= 0) return String(bytes);
  if (num >= 1073741824) return (num / 1073741824).toFixed(2) + " GB";
  if (num >= 1048576) return (num / 1048576).toFixed(2) + " MB";
  if (num >= 1024) return (num / 1024).toFixed(2) + " KB";
  return num + " B";
};

// Search helper function
const fetchMagnetResults = async (searchQuery) => {
  const apiKey = getBitsearchApiKey();

  // 1. Try Nginx proxied torrent API (/api/torrent?q=...)
  try {
    const proxyUrl = `/api/torrent?q=${encodeURIComponent(searchQuery)}`;
    console.log(`[Torrent API] Fetching magnet links via proxy: ${proxyUrl}`);
    const response = await axios.get(proxyUrl, { timeout: 8000 });

    if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].id !== "0") {
      const results = response.data.map((item) => ({
        title: item.name,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.stealth.si:80/announce`,
        size: formatSize(item.size),
        seeders: Number(item.seeders || 0),
        leechers: Number(item.leechers || 0),
      }));

      if (results.length > 0) {
        return filterByPreferences(results);
      }
    }
  } catch (err) {
    console.warn("[Torrent API Proxy] Error:", err.message);
  }

  // 2. Try Bitsearch API (/api/bitsearch/v1/search?q=...)
  try {
    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const bitsearchUrl = `/api/bitsearch/v1/search?q=${encodeURIComponent(searchQuery)}&limit=25`;
    console.log(`[Bitsearch API] Fetching via proxy: ${bitsearchUrl}`);
    const response = await axios.get(bitsearchUrl, { headers, timeout: 8000 });

    const rawResults = response.data?.results || response.data || [];
    if (Array.isArray(rawResults) && rawResults.length > 0) {
      const results = rawResults
        .filter((item) => item && (item.magnet || item.magnet_link || item.link || item.info_hash))
        .map((item) => {
          let magnet = item.magnet || item.magnet_link || item.link;
          if (!magnet && item.info_hash) {
            magnet = `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.title || item.name || searchQuery)}`;
          }
          return {
            title: item.title || item.name || searchQuery,
            magnet: magnet,
            size: formatSize(item.size || item.size_formatted || item.filesize),
            seeders: item.seeders !== undefined ? Number(item.seeders) : Number(item.seeds || 0),
            leechers: item.leechers !== undefined ? Number(item.leechers) : Number(item.leeches || 0),
            date: item.date || item.created_at || "",
          };
        });

      if (results.length > 0) {
        return filterByPreferences(results);
      }
    }
  } catch (err) {
    console.warn("[Bitsearch API] Error:", err.message);
  }

  // 3. Fallback: Direct APIBay API
  try {
    const directUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}`;
    console.log(`[Torrent API Direct] Fetching: ${directUrl}`);
    const response = await axios.get(directUrl, { timeout: 8000 });

    if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].id !== "0") {
      const results = response.data.map((item) => ({
        title: item.name,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp://tracker.opentrackr.org:1337/announce`,
        size: formatSize(item.size),
        seeders: Number(item.seeders || 0),
        leechers: Number(item.leechers || 0),
      }));
      return filterByPreferences(results);
    }
  } catch (err) {
    console.warn("[Torrent API Direct] Error:", err.message);
  }

  return [];
};

export const searchBitsearchMagnets = async (title, year, seasonNum, episodeNum) => {
  if (!title) return { results: [], error: "No title provided" };

  let rawResults = [];

  // 1. If season and episode numbers are provided for a TV Episode:
  if (seasonNum !== undefined && episodeNum !== undefined) {
    const sPad = String(seasonNum).padStart(2, "0");
    const ePad = String(episodeNum).padStart(2, "0");

    const epQuery1 = `${title} S${sPad}E${ePad}`;
    const res1 = await fetchMagnetResults(epQuery1);
    if (res1 && res1.length > 0) rawResults = res1;

    if (rawResults.length === 0) {
      const epQuery2 = `${title} S${seasonNum}E${episodeNum}`;
      const res2 = await fetchMagnetResults(epQuery2);
      if (res2 && res2.length > 0) rawResults = res2;
    }
  } else {
    // 2. Movie search with year
    const currentYear = new Date().getFullYear();
    const yearNum = Number(year);
    if (year && !isNaN(yearNum) && yearNum <= currentYear) {
      const resultsWithYear = await fetchMagnetResults(`${title} ${year}`);
      if (resultsWithYear && resultsWithYear.length > 0) {
        rawResults = resultsWithYear;
      }
    }

    // 3. Fallback: Search title alone
    if (rawResults.length === 0) {
      const resultsTitleOnly = await fetchMagnetResults(title);
      if (resultsTitleOnly && resultsTitleOnly.length > 0) {
        rawResults = resultsTitleOnly;
      }
    }
  }

  if (rawResults.length === 0) {
    return { results: [], error: null };
  }

  // 4. If Groq AI is configured, run AI stream classification filter
  const finalResults = await filterWithGroqAI(rawResults, title);
  return { results: finalResults, error: null };
};
