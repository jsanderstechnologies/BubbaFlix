import axios from "axios";
import { fetchDataFromAPI } from "./api";
import { isSeasonPackStream } from "./filterUtils";
import { getPremiumizeKey } from "./premiumize";

export const getHash = (url) => {
  if (!url) return null;
  const match = url.match(/urn:btih:([a-zA-Z0-9]+)/i);
  return match ? match[1].toLowerCase() : null;
};

export const DEFAULT_TORRENTIO_PROVIDERS = [
  { id: "yts", label: "YTS (Movies)" },
  { id: "eztv", label: "EZTV (TV Shows)" },
  { id: "rarbg", label: "RARBG" },
  { id: "1337x", label: "1337x" },
  { id: "thepiratebay", label: "The Pirate Bay" },
  { id: "kickasstorrents", label: "KickassTorrents" },
  { id: "torrentgalaxy", label: "TorrentGalaxy" },
  { id: "magnetdl", label: "MagnetDL" },
  { id: "nyaasi", label: "Nyaa (Anime)" },
  { id: "tokyotosho", label: "Tokyo Toshokan" },
  { id: "anidex", label: "AniDex" }
];

export const DEFAULT_TORRENTIO_CONFIG = {
  enabled: true,
  customUrl: "",
  providers: DEFAULT_TORRENTIO_PROVIDERS.map((p) => p.id),
  sort: "quality", // "quality" | "seeders" | "size"
  priorityForeignLanguage: "",
  maxResultsPerQuality: "",
  excludeCam: true,
  excludeTeleSync: true,
  excludeScreener: true,
  exclude3D: false,
};

export const getTorrentioConfig = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("torrentio_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_TORRENTIO_CONFIG, ...parsed };
      }
    } catch (e) {}
  }
  return { ...DEFAULT_TORRENTIO_CONFIG };
};

export const saveTorrentioConfig = (config) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("torrentio_config", JSON.stringify(config));
    } catch (e) {}
  }
};

export const buildTorrentioUrl = (config, idToUse, isTv, seasonNum, episodeNum) => {
  if (!config || config.enabled === false) return null;

  let base = (config.customUrl || "").trim();
  if (base) {
    base = base.replace(/\/manifest\.json$/i, "").replace(/\/stream.*$/i, "").replace(/\/+$/, "");
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      base = "https://" + base;
    }
  } else {
    const parts = [];
    const allProviderIds = DEFAULT_TORRENTIO_PROVIDERS.map((p) => p.id);
    const hasRestrictedProviders = Array.isArray(config.providers) &&
      config.providers.length > 0 &&
      config.providers.length < allProviderIds.length;

    if (hasRestrictedProviders) {
      parts.push("providers=" + config.providers.join(","));
    }
    if (config.sort && config.sort !== "quality") {
      parts.push("sort=" + config.sort);
    }
    const qf = [];
    if (config.excludeCam) qf.push("cam");
    if (config.excludeTeleSync) qf.push("ts");
    if (config.excludeScreener) qf.push("scr");
    if (config.exclude3D) qf.push("3d");
    if (qf.length > 0) {
      parts.push("qualityfilter=" + qf.join(","));
    }
    if (config.maxResultsPerQuality) {
      parts.push("limit=" + config.maxResultsPerQuality);
    }
    if (config.priorityForeignLanguage) {
      parts.push("priority=" + config.priorityForeignLanguage);
    }

    base = "https://torrentio.strem.fun" + (parts.length > 0 ? "/" + parts.join("|") : "");
  }

  if (isTv) {
    const s = seasonNum || 1;
    const e = episodeNum || 1;
    return `${base}/stream/series/${idToUse}:${s}:${e}.json`;
  }
  return `${base}/stream/movie/${idToUse}.json`;
};

export const testTorrentioConnection = async (customConfig = null) => {
  try {
    const config = customConfig || getTorrentioConfig();
    const testUrl = buildTorrentioUrl(config, "tt0111161", false);
    if (!testUrl) {
      return { success: false, message: "Torrentio is disabled in settings." };
    }
    const res = await axios.get(testUrl, { timeout: 7000 });
    if (res.data && Array.isArray(res.data.streams)) {
      return { success: true, count: res.data.streams.length, message: `Connected! Found ${res.data.streams.length} test streams.` };
    }
    return { success: false, message: "Invalid response from Torrentio API." };
  } catch (err) {
    return { success: false, message: err.message || "Failed to connect to Torrentio API." };
  }
};

// ==========================================
// MAGNETIO STREAM SCRAPER
// ==========================================

export const DEFAULT_MAGNETIO_CONFIG = {
  enabled: true,
  customUrl: "https://magnetio.peterdsp.dev",
  sort: "qualityseeders", // "qualityseeders" | "seeders" | "size"
  maxResults: "15",
  p2pFallback: true, // Ensures torrent magnet links are returned even if debrid is unconfigured
  qualities: ["4k", "1080p", "720p"],
  languages: ["en"],
  includeDebrid: true, // Automatically append pm=API_KEY if Premiumize key is set
};

export const getMagnetioConfig = () => {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("magnetio_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_MAGNETIO_CONFIG, ...parsed };
      }
    } catch (e) {}
  }
  return { ...DEFAULT_MAGNETIO_CONFIG };
};

export const saveMagnetioConfig = (config) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("magnetio_config", JSON.stringify(config));
    } catch (e) {}
  }
};

export const buildMagnetioUrl = (config, idToUse, isTv, seasonNum, episodeNum) => {
  if (!config || config.enabled === false) return null;

  let base = (config.customUrl || "https://magnetio.peterdsp.dev").trim();
  if (base) {
    base = base.replace(/\/manifest\.json$/i, "").replace(/\/stream.*$/i, "").replace(/\/+$/, "");
    if (!base.startsWith("http://") && !base.startsWith("https://")) {
      base = "https://" + base;
    }
  } else {
    base = "https://magnetio.peterdsp.dev";
  }

  // Check if custom URL already has pipe-delimited parameters embedded
  let origin = base;
  let hasEmbeddedTokens = false;
  try {
    const urlObj = new URL(base);
    origin = urlObj.origin;
    const pathParts = urlObj.pathname.split("/").filter(Boolean);
    hasEmbeddedTokens = pathParts.some((p) => p.includes("=") || p.includes("|"));
  } catch (e) {}

  if (!hasEmbeddedTokens) {
    const parts = [];
    parts.push("sort=" + (config.sort || "qualityseeders"));

    if (config.maxResults) {
      parts.push("limit=" + config.maxResults);
    }

    if (config.p2pFallback !== false) {
      parts.push("p2pFallback=1");
    }

    if (Array.isArray(config.qualities) && config.qualities.length > 0) {
      parts.push("qualities=" + config.qualities.join(","));
    }

    if (Array.isArray(config.languages) && config.languages.length > 0) {
      parts.push("languages=" + config.languages.join(","));
    }

    if (config.includeDebrid !== false) {
      try {
        const premKey = getPremiumizeKey();
        if (premKey) {
          parts.push("pm=" + encodeURIComponent(premKey));
        }
      } catch (e) {}
    }

    if (parts.length > 0) {
      base = `${origin}/${parts.join("|")}`;
    }
  }

  if (isTv) {
    const s = seasonNum || 1;
    const e = episodeNum || 1;
    return `${base}/stream/series/${idToUse}:${s}:${e}.json`;
  }
  return `${base}/stream/movie/${idToUse}.json`;
};

export const testMagnetioConnection = async (customConfig = null) => {
  try {
    const config = customConfig || getMagnetioConfig();
    const testUrl = buildMagnetioUrl(config, "tt0111161", false);
    if (!testUrl) {
      return { success: false, message: "Magnetio is disabled in settings." };
    }
    const res = await axios.get(testUrl, { timeout: 7000 });
    if (res.data && Array.isArray(res.data.streams)) {
      return {
        success: true,
        count: res.data.streams.length,
        message: `Connected! Found ${res.data.streams.length} test streams from Magnetio.`,
      };
    }
    return { success: false, message: "Invalid response from Magnetio API." };
  } catch (err) {
    return { success: false, message: err.message || "Failed to connect to Magnetio API." };
  }
};

/**
 * Fetch external IMDb ID for TMDB media items if available
 */
export const fetchImdbId = async (tmdbId, mediaType = "movie", title = null, year = null) => {
  if (typeof tmdbId === "string" && tmdbId.startsWith("tt")) {
    return tmdbId;
  }
  if (!tmdbId && !title) return null;

  const type = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";

  // 1. Direct external_ids lookup via TMDB API
  if (tmdbId) {
    try {
      const res = await fetchDataFromAPI(`/${type}/${tmdbId}/external_ids`);
      if (res?.imdb_id && String(res.imdb_id).startsWith("tt")) {
        return res.imdb_id;
      }
    } catch (err) {}

    // 2. Main item details lookup (movies frequently embed imdb_id directly in details)
    try {
      const res = await fetchDataFromAPI(`/${type}/${tmdbId}`);
      if (res?.imdb_id && String(res.imdb_id).startsWith("tt")) {
        return res.imdb_id;
      }
      if (res?.external_ids?.imdb_id && String(res.external_ids.imdb_id).startsWith("tt")) {
        return res.external_ids.imdb_id;
      }
    } catch (err) {}
  }

  // 3. Strict Title + Year fallback search if tmdbId was missing or failed to return IMDb ID
  if (title) {
    try {
      const params = { query: title };
      if (year) params.year = year;
      const searchRes = await fetchDataFromAPI(`/search/${type}`, params);
      const hit = searchRes?.results?.[0];
      if (hit?.id) {
        const extRes = await fetchDataFromAPI(`/${type}/${hit.id}/external_ids`);
        if (extRes?.imdb_id && String(extRes.imdb_id).startsWith("tt")) {
          return extRes.imdb_id;
        }
      }
    } catch (err) {}
  }

  return null;
};

/**
 * Scrape torrent magnet links for Movies and TV Shows from public torrent indexes, Torrentio & Magnetio
 * STRICT IDENTIFIER RULE: Never query torrent indexers with plain text ("The Matrix").
 * Uses IMDb ID (e.g. tt0133093) or TMDB ID plus season/episode syntax (e.g. tt0944947:1:1 or S01E01).
 */
export const fetchTorrentStreams = async ({ tmdbId, imdbId: propImdbId, mediaType = "movie", seasonNum, episodeNum, title, year }) => {
  try {
    let imdbId = propImdbId;
    if (!imdbId && tmdbId) {
      imdbId = await fetchImdbId(tmdbId, mediaType, title, year);
    } else if (!imdbId && title) {
      imdbId = await fetchImdbId(null, mediaType, title, year);
    }

    const idToUse = imdbId || (tmdbId ? `tmdb:${tmdbId}` : null);
    const isTv = mediaType === "tv" || seasonNum !== undefined;
    const s = seasonNum || 1;
    const e = episodeNum || 1;
    const streams = [];
    const seenHashes = new Set();

    console.log(`[TorrentScraper] Strict query identifier: "${idToUse}" (isTv=${isTv}, S${s}E${e}, title="${title || ""}", year="${year || ""}")`);

    // 1. Primary Scrapers: Torrentio & Magnetio (Queried concurrently with strict ID syntax)
    if (idToUse) {
      const torrentioConfig = getTorrentioConfig();
      const magnetioConfig = getMagnetioConfig();

      const [torrentioResult, magnetioResult] = await Promise.allSettled([
        torrentioConfig.enabled !== false
          ? (async () => {
              const url = buildTorrentioUrl(torrentioConfig, idToUse, isTv, s, e);
              if (!url) return [];
              const res = await axios.get(url, { timeout: 8000 });
              return res.data?.streams || [];
            })()
          : Promise.resolve([]),
        magnetioConfig.enabled !== false
          ? (async () => {
              const url = buildMagnetioUrl(magnetioConfig, idToUse, isTv, s, e);
              if (!url) return [];
              const res = await axios.get(url, { timeout: 8000 });
              return res.data?.streams || [];
            })()
          : Promise.resolve([]),
      ]);

      // Process Torrentio streams
      if (torrentioResult.status === "fulfilled" && Array.isArray(torrentioResult.value)) {
        torrentioResult.value.forEach((item) => {
          let magnet = item.url;
          if (!magnet && item.infoHash) {
            magnet = `magnet:?xt=urn:btih:${item.infoHash}`;
            if (item.title) {
              const firstLine = item.title.split("\n")[0];
              magnet += `&dn=${encodeURIComponent(firstLine)}`;
            }
          }

          if (magnet) {
            const rawTitle = item.title || item.name || "Torrent Stream";
            const lines = rawTitle.split("\n");
            const fileName = lines[0] || "Torrent Stream";
            const metaInfo = lines.slice(1).join(" • ") || item.name || "";

            if (isTv && isSeasonPackStream({ title: fileName, name: item.name, metaText: metaInfo }, seasonNum, episodeNum)) {
              return;
            }

            const hash = item.infoHash ? item.infoHash.toLowerCase() : getHash(magnet);
            if (hash) {
              if (seenHashes.has(hash)) return;
              seenHashes.add(hash);
            }

            let quality = "HD";
            if (/2160p|4k|uhd/i.test(rawTitle)) quality = "2160p";
            else if (/1080p|fullhd/i.test(rawTitle)) quality = "1080p";
            else if (/720p|hd/i.test(rawTitle)) quality = "720p";
            else if (/480p|sd/i.test(rawTitle)) quality = "480p";

            streams.push({
              name: item.name || `[Torrentio] ${quality}`,
              title: fileName,
              metaText: metaInfo,
              url: magnet,
              quality,
              behaviorHints: item.behaviorHints || {}
            });
          }
        });
      } else if (torrentioResult.status === "rejected") {
        console.warn("[TorrentScraper] Torrentio fetch warning:", torrentioResult.reason?.message);
      }

      // Process Magnetio streams
      if (magnetioResult.status === "fulfilled" && Array.isArray(magnetioResult.value)) {
        magnetioResult.value.forEach((item) => {
          let magnet = item.url;
          if (!magnet && item.infoHash) {
            magnet = `magnet:?xt=urn:btih:${item.infoHash}`;
            const dn = item.behaviorHints?.filename || (item.title ? item.title.split("\n")[0] : null);
            if (dn) {
              magnet += `&dn=${encodeURIComponent(dn)}`;
            }
            if (Array.isArray(item.sources)) {
              item.sources.forEach((src) => {
                if (typeof src === "string" && src.startsWith("tracker:")) {
                  magnet += `&tr=${encodeURIComponent(src.replace(/^tracker:/, ""))}`;
                }
              });
            }
          }

          if (magnet) {
            const rawTitle = item.title || item.name || "Magnetio Stream";
            const lines = rawTitle.split("\n");
            const fileName = item.behaviorHints?.filename || lines[0] || "Magnetio Stream";
            const metaInfo = lines.slice(1).join(" • ") || item.name || "";

            if (isTv && isSeasonPackStream({ title: fileName, name: item.name, metaText: metaInfo }, seasonNum, episodeNum)) {
              return;
            }

            const hash = item.infoHash ? item.infoHash.toLowerCase() : getHash(magnet);
            if (hash) {
              if (seenHashes.has(hash)) return;
              seenHashes.add(hash);
            }

            let quality = "HD";
            const fullCheck = `${rawTitle} ${item.name || ""} ${item.behaviorHints?.bingeGroup || ""}`;
            if (/2160p|4k|uhd/i.test(fullCheck)) quality = "2160p";
            else if (/1080p|fullhd/i.test(fullCheck)) quality = "1080p";
            else if (/720p|hd/i.test(fullCheck)) quality = "720p";
            else if (/480p|sd/i.test(fullCheck)) quality = "480p";

            let nameTag = item.name ? item.name.split("\n")[0].trim() : `[Magnetio] ${quality}`;
            if (!nameTag.includes("Magnetio") && !nameTag.startsWith("[")) {
              nameTag = `[Magnetio] ${nameTag}`;
            }

            streams.push({
              name: nameTag,
              title: fileName,
              metaText: metaInfo,
              url: magnet,
              quality,
              behaviorHints: item.behaviorHints || {}
            });
          }
        });
      } else if (magnetioResult.status === "rejected") {
        console.warn("[TorrentScraper] Magnetio fetch warning:", magnetioResult.reason?.message);
      }
    }

    // 2. Secondary Scraper: SolidTorrents Search API (fallback if 0 streams returned)
    // STRICT RULE: Do NOT search torrent sites using plain text ("The Matrix").
    // Must search using the IMDB ID or strict season/episode syntax.
    if (streams.length === 0 && (imdbId || (isTv && title))) {
      try {
        let searchQuery = "";
        if (imdbId) {
          if (isTv) {
            const sPad = String(s).padStart(2, "0");
            const ePad = String(e).padStart(2, "0");
            searchQuery = `${imdbId} S${sPad}E${ePad}`;
          } else {
            searchQuery = imdbId;
          }
        } else if (isTv && title) {
          // TV with strict S01E01 syntax: NEVER search bare title alone!
          const sPad = String(s).padStart(2, "0");
          const ePad = String(e).padStart(2, "0");
          searchQuery = `${title} S${sPad}E${ePad}`;
        }

        if (searchQuery) {
          const solidUrl = `https://solidtorrents.net/api/v1/search?q=${encodeURIComponent(searchQuery)}`;
          const solidRes = await axios.get(solidUrl, { timeout: 6000 });

          if (solidRes.data && Array.isArray(solidRes.data.results)) {
            solidRes.data.results.forEach((item) => {
              if (item.magnet) {
                if (isTv && isSeasonPackStream({ title: item.title, name: item.name }, s, e)) {
                  return;
                }

                const hash = getHash(item.magnet);
                if (hash) {
                  if (seenHashes.has(hash)) return;
                  seenHashes.add(hash);
                }

                let quality = "HD";
                const nameStr = item.title || "";
                if (/2160p|4k|uhd/i.test(nameStr)) quality = "2160p";
                else if (/1080p|fullhd/i.test(nameStr)) quality = "1080p";
                else if (/720p|hd/i.test(nameStr)) quality = "720p";
                else if (/480p|sd/i.test(nameStr)) quality = "480p";

                const sizeMb = item.size ? `${(item.size / (1024 * 1024 * 1024)).toFixed(2)} GB` : "";
                const seeds = item.swarm?.seeders ? `👤 ${item.swarm.seeders}` : "";

                streams.push({
                  name: `[SolidTorrents] ${quality}`,
                  title: item.title,
                  metaText: [seeds, sizeMb].filter(Boolean).join(" • "),
                  url: item.magnet,
                  quality
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn("[TorrentScraper] Secondary search warning:", err.message);
      }
    }

    return { streams };
  } catch (err) {
    console.error("[TorrentScraper] Error fetching torrent streams:", err);
    return { streams: [] };
  }
};
