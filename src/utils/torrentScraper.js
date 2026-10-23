import axios from "axios";
import { fetchDataFromAPI } from "./api";
import { isSeasonPackStream } from "./filterUtils";

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
    // Only pass providers parameter if the user explicitly customized/restricted to a subset.
    // When omitted or when all default providers are active, Torrentio searches across its entire
    // global index (including EXT, BestTorrents, etc.) which yields 2x-5x more streams!
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

/**
 * Fetch external IMDb ID for TMDB media items if available
 */
const fetchImdbId = async (tmdbId, mediaType) => {
  if (!tmdbId) return null;
  try {
    const res = await fetchDataFromAPI(`/${mediaType || "movie"}/${tmdbId}/external_ids`);
    return res?.imdb_id || null;
  } catch (err) {
    return null;
  }
};

/**
 * Scrape torrent magnet links for Movies and TV Shows from public torrent indexes & Torrentio
 */
export const fetchTorrentStreams = async ({ tmdbId, mediaType = "movie", seasonNum, episodeNum, title, year }) => {
  try {
    const imdbId = await fetchImdbId(tmdbId, mediaType);
    const idToUse = imdbId || (tmdbId ? `tmdb:${tmdbId}` : null);

    const isTv = mediaType === "tv" || seasonNum !== undefined;
    const streams = [];

    // 1. Primary Scraper: Torrentio Stremio API
    if (idToUse) {
      try {
        const torrentioConfig = getTorrentioConfig();
        const torrentioUrl = buildTorrentioUrl(torrentioConfig, idToUse, isTv, seasonNum, episodeNum);

        if (torrentioUrl) {
          const res = await axios.get(torrentioUrl, { timeout: 8000 });
          if (res.data && Array.isArray(res.data.streams)) {
          res.data.streams.forEach((item) => {
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

              let quality = "HD";
              if (/2160p|4k|uhd/i.test(rawTitle)) quality = "2160p";
              else if (/1080p|fullhd/i.test(rawTitle)) quality = "1080p";
              else if (/720p|hd/i.test(rawTitle)) quality = "720p";
              else if (/480p|sd/i.test(rawTitle)) quality = "480p";

              streams.push({
                name: item.name || `[Torrent] ${quality}`,
                title: fileName,
                metaText: metaInfo,
                url: magnet,
                quality,
                behaviorHints: item.behaviorHints || {}
              });
            }
          });
        }
      }
    } catch (err) {
        console.warn("[TorrentScraper] Torrentio fetch warning:", err.message);
      }
    }

    // 2. Secondary Scraper: SolidTorrents Search API
    if (streams.length === 0 && title) {
      try {
        let searchQuery = title;
        if (isTv) {
          const s = String(seasonNum || 1).padStart(2, "0");
          const e = String(episodeNum || 1).padStart(2, "0");
          searchQuery += ` S${s}E${e}`;
        } else if (year) {
          searchQuery += ` ${year}`;
        }

        const solidUrl = `https://solidtorrents.net/api/v1/search?q=${encodeURIComponent(searchQuery)}`;
        const solidRes = await axios.get(solidUrl, { timeout: 6000 });

        if (solidRes.data && Array.isArray(solidRes.data.results)) {
          solidRes.data.results.forEach((item) => {
            if (item.magnet) {
              if (isTv && isSeasonPackStream({ title: item.title, name: item.name }, seasonNum, episodeNum)) {
                return;
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
      } catch (err) {
        console.warn("[TorrentScraper] SolidTorrents search warning:", err.message);
      }
    }

    return { streams };
  } catch (err) {
    console.error("[TorrentScraper] Error fetching torrent streams:", err);
    return { streams: [] };
  }
};
