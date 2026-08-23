import axios from "axios";
import { fetchDataFromAPI } from "./api";

export const DEFAULT_AIOSTREAMS_URL = "https://aiostreams.elfhosted.com/";

export const getAioStreamsUrl = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("aiostreams_url");
    if (saved && saved.trim().length > 0) {
      let clean = saved.trim();
      if (clean.endsWith("/manifest.json")) {
        clean = clean.replace(/\/manifest\.json$/, "/");
      }
      if (!clean.endsWith("/")) clean += "/";
      return clean;
    }
  }
  return DEFAULT_AIOSTREAMS_URL;
};

export const saveAioStreamsUrl = (url) => {
  if (typeof window === "undefined") return;
  if (!url || url.trim().length === 0) {
    localStorage.removeItem("aiostreams_url");
  } else {
    let clean = url.trim();
    if (clean.endsWith("/manifest.json")) {
      clean = clean.replace(/\/manifest\.json$/, "/");
    }
    if (!clean.endsWith("/")) clean += "/";
    localStorage.setItem("aiostreams_url", clean);
  }
};

export const fetchImdbId = async (tmdbId, mediaType = "movie") => {
  if (!tmdbId) return null;
  try {
    const endpoint = mediaType === "tv" || mediaType === "series" ? `/tv/${tmdbId}/external_ids` : `/movie/${tmdbId}/external_ids`;
    const res = await fetchDataFromAPI(endpoint);
    return res?.imdb_id || null;
  } catch (err) {
    console.warn("[AIOStreams IMDB Lookup Warning]:", err.message);
  }
  return null;
};

const parseStremioStreams = (rawStreams, providerName = "AIOStreams") => {
  if (!Array.isArray(rawStreams)) return [];

  return rawStreams
    .filter((s) => !s.name?.includes("[❌]") && !s.description?.includes("reconfigure") && !s.externalUrl?.includes("/configure"))
    .map((s, index) => {
      const fullText = s.description || s.title || s.name || `${providerName} #${index + 1}`;
      const nameText = s.name || providerName;
      const lines = fullText.split("\n").map((l) => l.trim()).filter(Boolean);
      const cleanTitle = lines[0] || fullText;
      const metaText = lines.slice(1).join(" • ");
      let streamUrl = s.url || s.externalUrl || "";

      if (!streamUrl && s.infoHash) {
        streamUrl = `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(cleanTitle)}`;
      }

      return {
        id: `${providerName}-${index}`,
        name: nameText,
        title: cleanTitle,
        metaText: metaText,
        url: streamUrl,
        behaviorHints: s.behaviorHints || {},
      };
    })
    .filter((s) => s.url && s.url.length > 0);
};

/**
 * Fetches stream sources from AIOStreams with up to 3 automatic retries (2.5s delay).
 * Torrentio fallback removed per user request.
 */
export const fetchAioStreams = async ({ tmdbId, imdbId, mediaType = "movie", seasonNum, episodeNum }) => {
  let targetImdbId = imdbId;
  if (!targetImdbId && tmdbId) {
    targetImdbId = await fetchImdbId(tmdbId, mediaType);
  }

  const userAioUrl = getAioStreamsUrl();
  const cleanAioUrl = userAioUrl.replace(/\/manifest\.json$/, "").replace(/\/$/, "");

  // Build stream resource path per Stremio / AIOStreams protocol
  let streamPath = "";
  if (mediaType === "tv" || mediaType === "series" || seasonNum !== undefined) {
    const sNum = seasonNum !== undefined ? seasonNum : 1;
    const eNum = episodeNum !== undefined ? episodeNum : 1;
    const idParam = targetImdbId || `tmdb:${tmdbId}`;
    streamPath = `/stream/series/${idParam}:${sNum}:${eNum}.json`;
  } else {
    const idParam = targetImdbId || `tmdb:${tmdbId}`;
    streamPath = `/stream/movie/${idParam}.json`;
  }

  const targetEndpoint = `${cleanAioUrl}${streamPath}`;
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2500;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[AIOStreams Engine] Querying AIOStreams (Attempt ${attempt}/${MAX_RETRIES}): ${targetEndpoint}`);

      const response = await axios.get(targetEndpoint, { timeout: 9000 });
      const rawStreams = response.data?.streams || [];

      const hasConfigError = rawStreams.some((s) =>
        s.name?.includes("[❌]") || s.description?.includes("reconfigure") || s.externalUrl?.includes("/configure")
      );

      if (!hasConfigError && Array.isArray(rawStreams) && rawStreams.length > 0) {
        const formatted = parseStremioStreams(rawStreams, "AIOStreams");
        if (formatted.length > 0) {
          console.log(`[AIOStreams Engine] Success! Retrieved ${formatted.length} stream sources on attempt ${attempt}.`);
          return { streams: formatted, unconfigured: false, message: null };
        }
      }
    } catch (err) {
      console.warn(`[AIOStreams Engine Warning] Attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);
    }

    if (attempt < MAX_RETRIES) {
      console.log(`[AIOStreams Engine] Waiting ${RETRY_DELAY_MS / 1000}s before retry ${attempt + 1}...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  return {
    streams: [],
    unconfigured: true,
    message: "AIOStreams requires configuration. Please configure your custom AIOStreams URL in Settings.",
    configUrl: "https://aiostreams.elfhosted.com/stremio/configure",
  };
};

export const testAioStreamsConnection = async (customUrl) => {
  const target = customUrl ? customUrl.trim() : getAioStreamsUrl();
  let cleanTarget = target.replace(/\/manifest\.json$/, "").replace(/\/$/, "");
  const manifestUrl = `${cleanTarget}/manifest.json`;

  try {
    const res = await axios.get(manifestUrl, { timeout: 8000 });
    if (res.data && (res.data.id || res.data.name)) {
      const name = res.data.name || "AIOStreams Addon";
      return { success: true, message: `Connected to ${name} successfully!` };
    }
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to connect to AIOStreams manifest.",
    };
  }

  return { success: true, message: "AIOStreams URL saved!" };
};
