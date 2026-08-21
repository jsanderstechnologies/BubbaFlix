import axios from "axios";
import { filterWithGroqAI } from "./groqFilter";
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

const normalizeText = (str) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[\._\-\:\,\(\)\[\]\{\}\']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const isExactTitleMatch = (streamTitle, targetTitle, targetYear, seasonNum, episodeNum) => {
  if (!streamTitle || !targetTitle) return true;

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

  // Verify target year if provided (allow 2 year margin for release differences)
  if (targetYear && streamYear) {
    const targetYrNum = Number(targetYear);
    if (!isNaN(targetYrNum) && Math.abs(streamYear - targetYrNum) > 2) {
      return false;
    }
  }

  const cleanStreamTitle = streamMovieName.replace(/^the\s+/, "").trim();
  const cleanTargetTitle = normTarget.replace(/^the\s+/, "").trim();

  // Exact title match
  if (cleanStreamTitle === cleanTargetTitle) {
    return true;
  }

  // Allow clean prefix matches with optional release descriptors
  if (cleanStreamTitle.startsWith(cleanTargetTitle)) {
    return true;
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

  // 1. Require valid Magnet URI (magnet:?xt=urn:btih:)
  let pool = results.filter((item) => {
    if (!item || !item.magnet || typeof item.magnet !== "string") {
      return false;
    }
    const cleanMagnet = item.magnet.trim().toLowerCase();
    return cleanMagnet.startsWith("magnet:?xt=urn:btih:");
  });

  if (pool.length === 0) return [];

  // 2. Filter out Adult content & standalone audio/music files
  const cleanAdultPool = pool.filter((item) => !isAdultOrAudioFile(item.title));
  if (cleanAdultPool.length > 0) {
    pool = cleanAdultPool;
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

  // 4. Filter out CAM, HDCAM, Telesync, HDTS, TC videos if excludeLowQuality is true
  if (excludeLowQuality) {
    const cleanPool = pool.filter((item) => !isLowQualityCamOrTS(item.title));
    if (cleanPool.length > 0) {
      pool = cleanPool;
    }
  }

  // 5. Filter by user resolution selections
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

// Parse Bitsearch HTML web search results (keyless fallback provider)
export const parseBitsearchHtml = (htmlStr) => {
  if (!htmlStr || typeof htmlStr !== "string") return [];
  const results = [];

  const cardRegex = /<li[^>]*class="[^"]*search-result[^"]*"[\s\S]*?<\/li>/gi;
  const cards = htmlStr.match(cardRegex) || [];

  for (const card of cards) {
    const magnetMatch = card.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i);
    if (!magnetMatch) continue;

    const magnet = magnetMatch[1];
    const hashMatch = magnet.match(/btih:([a-fA-F0-9]{40})/i);
    const infoHash = hashMatch ? hashMatch[1] : null;

    const titleMatch = card.match(/<h5[^>]*class="[^"]*title[^"]*"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const sizeMatch = card.match(/class="[^\"]*size[^\"]*"[^>]*>([\s\S]*?)<\/div>/i);
    let size = sizeMatch ? sizeMatch[1].replace(/<[^>]+>/g, "").trim() : "N/A";

    const seedMatch = card.match(/class="[^\"]*stats[^\"]*"[\s\S]*?(\d+)\s*seeds/i) || card.match(/(\d+)\s*seeds/i);
    const seeders = seedMatch ? Number(seedMatch[1]) : 1;

    const leechMatch = card.match(/class="[^\"]*stats[^\"]*"[\s\S]*?(\d+)\s*leeches/i) || card.match(/(\d+)\s*leeches/i);
    const leechers = leechMatch ? Number(leechMatch[1]) : 0;

    if (magnet && title) {
      results.push({
        source: "Bitsearch Web",
        title: title,
        magnet: magnet,
        info_hash: infoHash,
        size: size,
        seeders: seeders,
        leechers: leechers,
      });
    }
  }

  return results;
};

// Stream Magnet Search Engine: Bitsearch Web Scraper + Bitsearch API + SolidTorrents API
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

  // Provider 1: Keyless Bitsearch Web Search Scraper (via Nginx proxy & direct)
  const bitsearchWebUrls = [
    `${baseUrl}/api/bitsearch_web/search?q=${encodeURIComponent(searchQuery)}`,
    `https://bitsearch.to/search?q=${encodeURIComponent(searchQuery)}`,
  ];

  for (const webUrl of bitsearchWebUrls) {
    try {
      console.log(`[Bitsearch Web Scraper] Fetching magnet links: ${webUrl}`);
      const response = await axios.get(webUrl, { timeout: 8000 });
      if (typeof response.data === "string" && response.data.includes("magnet:?")) {
        const webResults = parseBitsearchHtml(response.data);
        if (webResults.length > 0) {
          webResults.forEach((item) => {
            const hashKey = item.info_hash ? item.info_hash.toLowerCase() : item.magnet.toLowerCase();
            if (!seenHashes.has(hashKey)) {
              seenHashes.add(hashKey);
              rawPool.push(item);
            }
          });
          console.log(`[Bitsearch Web Success] Retrieved ${webResults.length} magnets from ${webUrl}`);
          break;
        }
      }
    } catch (webErr) {
      console.warn(`[Bitsearch Web Scraper Warning - ${webUrl}]:`, webErr.message);
    }
  }

  // Provider 2: Bitsearch API (if API Key provided)
  try {
    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const bitsearchUrl = `${baseUrl}/api/bitsearch/v1/search?q=${encodeURIComponent(searchQuery)}&limit=30`;
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

  // Provider 3: SolidTorrents API
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
          break;
        }
      }
    } catch (err) {
      console.warn(`[SolidTorrents API Warning - ${solidUrl}]:`, err.message);
    }
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

    if (rawResults.length === 0) {
      const res3 = await fetchMagnetResults(title, title, year, seasonNum, episodeNum);
      if (res3 && res3.length > 0) rawResults = res3;
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
  const finalResults = await checkPremiumizeCache(aiFilteredResults || rawResults);

  return { results: finalResults || rawResults, error: null };
};
