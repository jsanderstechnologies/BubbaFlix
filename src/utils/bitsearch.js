import axios from "axios";
import { filterWithGroqAI } from "./groqFilter";
import { isTvDevice } from "./zoom";
import { fetchServerSettings, getServerUrl } from "./serverSettings";
import { checkPremiumizeCache } from "./premiumize";

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

  // Incompatible video containers & codecs for native HTML5 web players
  const incompatibleVideo = [
    ".mkv", ".avi", "x265", "h265", "h.265", "hevc", "av1", "xvid", "divx"
  ];

  // Incompatible audio codecs & multi-channel surround sound tags for native HTML5 web players
  const incompatibleAudio = [
    "dts", "dts-hd", "dtshd", "dts-x", "dtsx", "ac3", "eac3", "ddp", "dd+",
    "dd5.1", "ddp5.1", "ddp7.1", "truehd", "atmos", "5.1", "7.1", "6ch", "8ch",
    "aac5.1", "flac"
  ];

  const hasBadVideo = incompatibleVideo.some((w) => t.includes(w));
  if (hasBadVideo) return false;

  const hasBadAudio = incompatibleAudio.some((w) => {
    const regex = new RegExp(`\\b${w.replace(".", "\\.")}\\b`, "i");
    return regex.test(t) || t.includes(`.${w}.`) || t.includes(`-${w}-`) || t.includes(` ${w} `) || t.includes(`${w}-`);
  });

  if (hasBadAudio) return false;

  return true;
};

const normalizeText = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[\._\-\:\,\(\)\[\]\{\}\']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isExactTitleMatch = (streamTitle, targetTitle, targetYear, seasonNum, episodeNum) => {
  if (!streamTitle || !targetTitle) return false;

  const normStream = normalizeText(streamTitle);
  const normTarget = normalizeText(targetTitle);

  // 1. For TV Episodes: Require exact season & episode number matching
  if (seasonNum !== undefined && episodeNum !== undefined) {
    const sPad = String(seasonNum).padStart(2, "0");
    const ePad = String(episodeNum).padStart(2, "0");

    const epRegexes = [
      new RegExp(`\\bs${seasonNum}e${episodeNum}\\b`, "i"),
      new RegExp(`\\bs${sPad}e${ePad}\\b`, "i"),
      new RegExp(`\\b${seasonNum}x${episodeNum}\\b`, "i"),
      new RegExp(`\\b${seasonNum}x${ePad}\\b`, "i"),
    ];

    const hasEpMatch = epRegexes.some((rgx) => rgx.test(streamTitle));
    if (!hasEpMatch) return false;

    // Verify title prefix matches target title
    const epMatchIndex = streamTitle.search(/s\d+e\d+|\d+x\d+/i);
    const titlePrefix = epMatchIndex > 0 ? normalizeText(streamTitle.slice(0, epMatchIndex)) : normStream;

    const cleanPrefix = titlePrefix.replace(/^the\s+/, "").trim();
    const cleanTarget = normTarget.replace(/^the\s+/, "").trim();

    return cleanPrefix === cleanTarget || cleanPrefix.startsWith(cleanTarget);
  }

  // 2. For Movies
  const yearMatch = streamTitle.match(/\b(19\d{2}|20\d{2})\b/);
  let streamMovieName = normStream;
  let streamYear = null;

  if (yearMatch) {
    streamYear = Number(yearMatch[1]);
    const yearIdx = normStream.indexOf(yearMatch[1]);
    if (yearIdx > 0) {
      streamMovieName = normStream.slice(0, yearIdx).trim();
    }
  } else {
    const tagMatch = normStream.match(/\b(2160p|1080p|720p|480p|webrip|web-dl|web|bluray|hdtv|x264|x265|hevc|mkv|mp4)\b/);
    if (tagMatch && tagMatch.index > 0) {
      streamMovieName = normStream.slice(0, tagMatch.index).trim();
    }
  }

  // Verify target year if provided (allow 1 year margin for release differences)
  if (targetYear && streamYear) {
    const targetYrNum = Number(targetYear);
    if (!isNaN(targetYrNum) && Math.abs(streamYear - targetYrNum) > 1) {
      return false;
    }
  }

  const cleanStreamTitle = streamMovieName.replace(/^the\s+/, "").trim();
  const cleanTargetTitle = normTarget.replace(/^the\s+/, "").trim();

  // Exact title match
  if (cleanStreamTitle === cleanTargetTitle) {
    return true;
  }

  // Allow clean prefix matches with optional release descriptors (e.g. "Mutiny Extended Cut")
  if (cleanStreamTitle.startsWith(cleanTargetTitle)) {
    const remainder = cleanStreamTitle.slice(cleanTargetTitle.length).trim();
    const allowedSuffixes = [
      "", "the", "movie", "complete", "extended", "cut", "unrated", "edition",
      "directors cut", "remastered", "special edition", "collector", "4k", "repack"
    ];
    if (allowedSuffixes.some((sfx) => sfx === remainder)) {
      return true;
    }
  }

  return false;
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

const filterByPreferences = (results, targetTitle, targetYear, seasonNum, episodeNum) => {
  if (!results || results.length === 0) return [];

  const { resolutions, excludeLowQuality } = getStreamPreferences();
  const isTv = isTvDevice();

  // 1. Strictly require valid Magnet URI (magnet:?xt=urn:btih:) & exclude dead streams (0 seeders)
  let pool = results.filter((item) => {
    if (!item || !item.magnet || typeof item.magnet !== "string") {
      return false;
    }

    const cleanMagnet = item.magnet.trim().toLowerCase();
    if (!cleanMagnet.startsWith("magnet:?xt=urn:btih:")) {
      return false;
    }

    const seeds = Number(item.seeders);
    if (isNaN(seeds) || seeds <= 0) {
      return false;
    }

    return true;
  });

  if (pool.length === 0) {
    return [];
  }

  // 2. Filter out Adult content & standalone audio/music files
  pool = pool.filter((item) => !isAdultOrAudioFile(item.title));
  if (pool.length === 0) {
    return [];
  }

  // 3. Strict Title & Episode / Movie Year Match Filter
  if (targetTitle) {
    const titleMatchedPool = pool.filter((item) =>
      isExactTitleMatch(item.title, targetTitle, targetYear, seasonNum, episodeNum)
    );
    if (titleMatchedPool.length > 0) {
      pool = titleMatchedPool;
    }
  }

  // 4. Web Player Audio & Video Compatibility Filter (for non-TV desktop/mobile browsers)
  if (!isTv) {
    const webPool = pool.filter((item) => isWebCompatibleStream(item.title));
    if (webPool.length > 0) {
      pool = webPool;
    }
  }

  // 5. Filter out CAM, HDCAM, Telesync, HDTS, TC videos if excludeLowQuality is true
  if (excludeLowQuality) {
    const cleanPool = pool.filter((item) => !isLowQualityCamOrTS(item.title));
    if (cleanPool.length > 0) {
      pool = cleanPool;
    }
  }

  // 6. Filter by user resolution selections
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

// Stream Magnet Search Engine (SolidTorrents API + Bitsearch API)
const fetchMagnetResults = async (searchQuery, targetTitle, targetYear, seasonNum, episodeNum) => {
  let apiKey = getBitsearchApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.bitsearchKey) {
      apiKey = serverSettings.bitsearchKey;
      localStorage.setItem("bitsearch_api_key", apiKey);
    }
  }

  const baseUrl = getServerUrl();
  const rawPool = [];
  const seenHashes = new Set();

  // 1. Fetch from SolidTorrents API (Nginx proxy & direct fallbacks)
  const solidEndpoints = [
    `${baseUrl}/api/solidtorrents/search?q=${encodeURIComponent(searchQuery)}&category=video`,
    `https://solidtorrents.to/api/v1/search?q=${encodeURIComponent(searchQuery)}&category=video`,
    `https://solidtorrents.net/api/v1/search?q=${encodeURIComponent(searchQuery)}&category=video`,
  ];

  for (const solidUrl of solidEndpoints) {
    try {
      console.log(`[SolidTorrents API] Fetching magnet links: ${solidUrl}`);
      const response = await axios.get(solidUrl, { timeout: 7000 });
      const results = response.data?.results || response.data?.data || [];

      if (Array.isArray(results) && results.length > 0) {
        results.forEach((item) => {
          if (!item) return;

          let magnet = item.magnet;
          let infoHash = item.infoHash || item.info_hash;

          if (!infoHash && magnet) {
            const hashMatch = magnet.match(/btih:([a-fA-F0-9]{40})/i);
            if (hashMatch) infoHash = hashMatch[1];
          }

          if ((!magnet || !magnet.startsWith("magnet:?")) && infoHash) {
            magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(item.title || searchQuery)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.stealth.si:80/announce`;
          }

          if (magnet && infoHash) {
            const hashLower = infoHash.toLowerCase();
            if (!seenHashes.has(hashLower)) {
              seenHashes.add(hashLower);
              const seeders = item.swarm?.seeders !== undefined ? Number(item.swarm.seeders) : Number(item.seeders || item.seeds || 0);
              const leechers = item.swarm?.leechers !== undefined ? Number(item.swarm.leechers) : Number(item.leechers || item.leeches || 0);

              rawPool.push({
                source: "SolidTorrents",
                title: item.title || searchQuery,
                magnet: magnet,
                info_hash: infoHash,
                size: formatSize(item.size),
                seeders: seeders,
                leechers: leechers,
              });
            }
          }
        });

        if (rawPool.length > 0) {
          console.log(`[SolidTorrents API Success] Retrieved ${rawPool.length} torrents from ${solidUrl}`);
          break;
        }
      }
    } catch (err) {
      console.warn(`[SolidTorrents API Warning - ${solidUrl}]:`, err.message);
    }
  }

  // 2. Fetch from Bitsearch API
  try {
    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const bitsearchUrl = `${baseUrl}/api/bitsearch/v1/search?q=${encodeURIComponent(searchQuery)}&limit=25`;
    console.log(`[Bitsearch API] Fetching via proxy: ${bitsearchUrl}`);
    const response = await axios.get(bitsearchUrl, { headers, timeout: 8000 });

    const rawResults = response.data?.results || response.data || [];
    if (Array.isArray(rawResults) && rawResults.length > 0) {
      rawResults.forEach((item) => {
        if (item) {
          let magnet = item.magnet || item.magnet_link;
          let infoHash = item.info_hash;
          if (!infoHash && magnet) {
            const hashMatch = magnet.match(/btih:([a-fA-F0-9]{40})/i);
            if (hashMatch) infoHash = hashMatch[1];
          }

          if ((!magnet || !magnet.startsWith("magnet:?")) && infoHash) {
            magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(item.title || item.name || searchQuery)}`;
          }

          const hashKey = infoHash ? infoHash.toLowerCase() : (magnet || "").toLowerCase();
          if (magnet && !seenHashes.has(hashKey)) {
            seenHashes.add(hashKey);
            rawPool.push({
              source: "Bitsearch",
              title: item.title || item.name || searchQuery,
              magnet: magnet,
              info_hash: infoHash,
              size: formatSize(item.size || item.size_formatted || item.filesize),
              seeders: item.seeders !== undefined ? Number(item.seeders) : Number(item.seeds || 0),
              leechers: item.leechers !== undefined ? Number(item.leechers) : Number(item.leeches || 0),
              date: item.date || item.created_at || "",
            });
          }
        }
      });
    }
  } catch (err) {
    console.warn("[Bitsearch API Warning]:", err.message);
  }

  if (rawPool.length > 0) {
    // Sort pool by seeders descending
    rawPool.sort((a, b) => b.seeders - a.seeders);
    return filterByPreferences(rawPool, targetTitle, targetYear, seasonNum, episodeNum);
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
    const res1 = await fetchMagnetResults(epQuery1, title, year, seasonNum, episodeNum);
    if (res1 && res1.length > 0) rawResults = res1;

    if (rawResults.length === 0) {
      const epQuery2 = `${title} S${seasonNum}E${episodeNum}`;
      const res2 = await fetchMagnetResults(epQuery2, title, year, seasonNum, episodeNum);
      if (res2 && res2.length > 0) rawResults = res2;
    }
  } else {
    // 2. Movie search with year
    const currentYear = new Date().getFullYear();
    const yearNum = Number(year);
    if (year && !isNaN(yearNum) && yearNum <= currentYear) {
      const resultsWithYear = await fetchMagnetResults(`${title} ${year}`, title, year, seasonNum, episodeNum);
      if (resultsWithYear && resultsWithYear.length > 0) {
        rawResults = resultsWithYear;
      }
    }

    // 3. Fallback: Search title alone
    if (rawResults.length === 0) {
      const resultsTitleOnly = await fetchMagnetResults(title, title, year, seasonNum, episodeNum);
      if (resultsTitleOnly && resultsTitleOnly.length > 0) {
        rawResults = resultsTitleOnly;
      }
    }
  }

  if (rawResults.length === 0) {
    return { results: [], error: null };
  }

  // 4. If Groq AI is configured, run AI stream classification filter
  const aiFilteredResults = await filterWithGroqAI(rawResults, title);

  // 5. Premiumize Cache Check: Check which streams are instantly cached on Premiumize & boost cached streams to top
  const finalResults = await checkPremiumizeCache(aiFilteredResults);

  return { results: finalResults, error: null };
};
