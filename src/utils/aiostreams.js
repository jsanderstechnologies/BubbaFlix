import axios from "axios";
import { fetchDataFromAPI } from "./api";
import { fetchServerSettings, getServerUrl } from "./serverSettings";

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

export const fetchAioStreams = async ({ tmdbId, imdbId, mediaType = "movie", seasonNum, episodeNum }) => {
  let targetImdbId = imdbId;
  if (!targetImdbId && tmdbId) {
    targetImdbId = await fetchImdbId(tmdbId, mediaType);
  }

  const userAioUrl = getAioStreamsUrl();
  const baseUrl = getServerUrl();

  // Normalize URL to handle trailing slashes
  let cleanAioUrl = userAioUrl.replace(/\/manifest\.json$/, "").replace(/\/$/, "");

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
  console.log(`[AIOStreams Engine] Querying streams from: ${targetEndpoint}`);

  try {
    const response = await axios.get(targetEndpoint, { timeout: 10000 });
    const rawStreams = response.data?.streams || [];

    if (!Array.isArray(rawStreams) || rawStreams.length === 0) {
      return { streams: [], unconfigured: false, message: "No streams found for this item." };
    }

    // Check if instance returned a configuration error notice
    const hasConfigError = rawStreams.some((s) =>
      s.name?.includes("[❌]") || s.description?.includes("reconfigure") || s.externalUrl?.includes("/configure")
    );

    if (hasConfigError) {
      return {
        streams: [],
        unconfigured: true,
        message: "AIOStreams requires configuration. Please configure your AIOStreams URL in Settings.",
        configUrl: rawStreams[0]?.externalUrl || "https://aiostreams.elfhosted.com/stremio/configure",
      };
    }

    // Format streams for BubbaFlix player
    const formattedStreams = rawStreams.map((s, index) => {
      const titleText = s.description || s.title || s.name || `Stream #${index + 1}`;
      const nameText = s.name || "AIOStreams";

      return {
        id: index,
        name: nameText,
        title: titleText,
        url: s.url || s.externalUrl || "",
        behaviorHints: s.behaviorHints || {},
      };
    }).filter((s) => s.url && s.url.length > 0);

    return { streams: formattedStreams, unconfigured: false, message: null };
  } catch (err) {
    console.warn("[AIOStreams Engine Error]:", err.message);
    return { streams: [], unconfigured: false, error: err.message };
  }
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
