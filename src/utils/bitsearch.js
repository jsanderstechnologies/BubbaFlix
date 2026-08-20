import axios from "axios";
import { filterWithGroqAI } from "./groqFilter";

export const getBitsearchApiKey = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("bitsearch_api_key") || "";
  }
  return "";
};

export const getStreamPreferences = () => {
  if (typeof window === "undefined") {
    return {
      resolutions: ["2160p", "1080p", "720p", "480p"],
      codecs: ["x265", "x264", "av1", "xvid"],
      excludeLowQuality: true,
    };
  }
  const savedRes = localStorage.getItem("stream_resolutions");
  const savedCodecs = localStorage.getItem("stream_codecs");
  const savedExcludeLow = localStorage.getItem("stream_exclude_low_quality");
  return {
    resolutions: savedRes ? JSON.parse(savedRes) : ["2160p", "1080p", "720p", "480p"],
    codecs: savedCodecs ? JSON.parse(savedCodecs) : ["x265", "x264", "av1", "xvid"],
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
  if (t.includes("480p") || t.includes("576p") || t.includes("sd") || t.includes("dvd") || t.includes("xvid")) return "480p";
  return "1080p";
};

const detectCodec = (titleStr) => {
  const t = titleStr.toLowerCase();
  if (t.includes("x265") || t.includes("h265") || t.includes("h.265") || t.includes("hevc")) return "x265";
  if (t.includes("x264") || t.includes("h264") || t.includes("h.264") || t.includes("avc")) return "x264";
  if (t.includes("av1")) return "av1";
  if (t.includes("xvid") || t.includes("divx")) return "xvid";
  return "x264";
};

const filterByPreferences = (results) => {
  if (!results || results.length === 0) return [];

  const { resolutions, codecs, excludeLowQuality } = getStreamPreferences();

  // 1. Filter out Adult content & standalone audio/music files
  let pool = results.filter((item) => !isAdultOrAudioFile(item.title));
  if (pool.length === 0 && results.length > 0) {
    // If everything was adult/audio, keep empty
    return [];
  }

  // 2. Filter out CAM, HDCAM, Telesync, HDTS, TC videos if excludeLowQuality is true
  if (excludeLowQuality) {
    const cleanPool = pool.filter((item) => !isLowQualityCamOrTS(item.title));
    if (cleanPool.length > 0) {
      pool = cleanPool;
    }
  }

  // 3. Filter by user resolution and codec selections
  const resActive = resolutions && resolutions.length > 0 && resolutions.length < 4;
  const codecActive = codecs && codecs.length > 0 && codecs.length < 4;

  if (!resActive && !codecActive) {
    return pool;
  }

  const filtered = pool.filter((item) => {
    const res = detectResolution(item.title);
    const cod = detectCodec(item.title);

    const resMatch = !resActive || resolutions.includes(res);
    const codMatch = !codecActive || codecs.includes(cod);

    return resMatch && codMatch;
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

  // 1. Try Nginx/Vite proxied torrent API (/api/torrent?q=...)
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
