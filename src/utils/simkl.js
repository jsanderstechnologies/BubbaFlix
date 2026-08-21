import axios from "axios";
import { getServerUrl } from "./serverSettings";

export const getSimklConfig = () => {
  let clientId = "";
  let userToken = "";
  if (typeof window !== "undefined") {
    clientId = localStorage.getItem("simkl_client_id") || "";
    userToken = localStorage.getItem("simkl_access_token") || "";
  }
  return {
    clientId: (clientId && clientId.trim()) || import.meta.env.VITE_SIMKL_CLIENT_ID || "",
    userToken: (userToken && userToken.trim()) || import.meta.env.VITE_SIMKL_ACCESS_TOKEN || "",
  };
};

export const getSimklWatchCache = () => {
  if (typeof window === "undefined") {
    return { movies: {}, shows: {}, seasons: {}, episodes: {} };
  }
  try {
    const raw = localStorage.getItem("simkl_watch_cache");
    return raw ? JSON.parse(raw) : { movies: {}, shows: {}, seasons: {}, episodes: {} };
  } catch (e) {
    return { movies: {}, shows: {}, seasons: {}, episodes: {} };
  }
};

export const saveSimklWatchCache = (cache) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("simkl_watch_cache", JSON.stringify(cache));
    window.dispatchEvent(new Event("simkl-watch-updated"));
  }
};

export const isSimklWatched = ({ tmdbId, mediaType, seasonNum, episodeNum }) => {
  if (!tmdbId) return false;
  const cache = getSimklWatchCache();
  const idStr = String(tmdbId);

  if (episodeNum !== undefined && seasonNum !== undefined) {
    const epKey = `${idStr}_s${seasonNum}_e${episodeNum}`;
    return !!cache.episodes[epKey];
  }

  if (seasonNum !== undefined) {
    const seasonKey = `${idStr}_s${seasonNum}`;
    return !!cache.seasons[seasonKey];
  }

  if (mediaType === "movie") {
    return !!cache.movies[idStr];
  }

  if (mediaType === "tv") {
    return !!cache.shows[idStr];
  }

  return false;
};

export const fetchUserSimklHistory = async () => {
  const { clientId, userToken } = getSimklConfig();
  if (!clientId) return getSimklWatchCache();

  console.log("[Simkl API] Fetching account watch history from SIMKL server...");
  const cache = getSimklWatchCache();
  const headers = {
    "simkl-api-key": clientId,
    "Content-Type": "application/json",
  };
  if (userToken && userToken.trim().length > 0) {
    headers["Authorization"] = `Bearer ${userToken.trim()}`;
  }

  const baseUrl = getServerUrl();

  try {
    // 1. Fetch movies history
    const moviesRes = await axios.get(`${baseUrl}/api/simkl/sync/all-items/movies`, { headers, timeout: 8000 });
    if (Array.isArray(moviesRes.data?.movies)) {
      moviesRes.data.movies.forEach((m) => {
        if (m.ids?.tmdb) {
          cache.movies[String(m.ids.tmdb)] = true;
        }
      });
    }

    // 2. Fetch shows history
    const showsRes = await axios.get(`${baseUrl}/api/simkl/sync/all-items/shows`, { headers, timeout: 8000 });
    if (Array.isArray(showsRes.data?.shows)) {
      showsRes.data.shows.forEach((show) => {
        const showId = show.ids?.tmdb ? String(show.ids.tmdb) : null;
        if (showId) {
          cache.shows[showId] = true;
          if (Array.isArray(show.seasons)) {
            show.seasons.forEach((season) => {
              const sNum = season.number;
              cache.seasons[`${showId}_s${sNum}`] = true;
              if (Array.isArray(season.episodes)) {
                season.episodes.forEach((ep) => {
                  cache.episodes[`${showId}_s${sNum}_e${ep.number}`] = true;
                });
              }
            });
          }
        }
      });
    }

    saveSimklWatchCache(cache);
    console.log("[Simkl API] Successfully synced watched items from SIMKL.");
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn("[Simkl API] User Access Token required or expired for private SIMKL account sync.");
    } else {
      console.warn("[Simkl History Sync Warning]:", err.message);
    }
  }

  return cache;
};

export const toggleSimklWatched = async ({ tmdbId, title, mediaType, seasonNum, episodeNum }) => {
  const { clientId, userToken } = getSimklConfig();
  const currentlyWatched = isSimklWatched({ tmdbId, mediaType, seasonNum, episodeNum });
  const cache = getSimklWatchCache();
  const idStr = String(tmdbId);

  // Optimistically update local cache
  if (episodeNum !== undefined && seasonNum !== undefined) {
    const epKey = `${idStr}_s${seasonNum}_e${episodeNum}`;
    cache.episodes[epKey] = !currentlyWatched;
  } else if (seasonNum !== undefined) {
    const seasonKey = `${idStr}_s${seasonNum}`;
    cache.seasons[seasonKey] = !currentlyWatched;
  } else if (mediaType === "movie") {
    cache.movies[idStr] = !currentlyWatched;
  } else if (mediaType === "tv") {
    cache.shows[idStr] = !currentlyWatched;
  }

  saveSimklWatchCache(cache);

  if (!clientId) {
    console.log("[Simkl] Toggled locally. Configure SIMKL Client ID in Settings for account sync.");
    return !currentlyWatched;
  }

  const endpoint = currentlyWatched ? "/api/simkl/sync/history/remove" : "/api/simkl/sync/history";
  const headers = {
    "simkl-api-key": clientId,
    "Content-Type": "application/json",
  };
  if (userToken && userToken.trim().length > 0) {
    headers["Authorization"] = `Bearer ${userToken.trim()}`;
  }

  const payload = {};

  if (mediaType === "movie") {
    payload.movies = [{ title, ids: { tmdb: idStr } }];
  } else if (mediaType === "tv" || seasonNum !== undefined) {
    const showObj = { title, ids: { tmdb: idStr } };
    if (seasonNum !== undefined) {
      const seasonObj = { number: Number(seasonNum) };
      if (episodeNum !== undefined) {
        seasonObj.episodes = [{ number: Number(episodeNum) }];
      }
      showObj.seasons = [seasonObj];
    }
    payload.shows = [showObj];
  }

  try {
    console.log(`[Simkl API] ${currentlyWatched ? "Removing from" : "Adding to"} SIMKL history:`, payload);
    const baseUrl = getServerUrl();
    await axios.post(`${baseUrl}${endpoint}`, payload, { headers, timeout: 8000 });
  } catch (err) {
    console.warn(`[Simkl API Sync Error]:`, err.message);
  }

  return !currentlyWatched;
};

export const markAsWatchedOnSimkl = async ({ tmdbId, title, mediaType, seasonNum, episodeNum }) => {
  if (!isSimklWatched({ tmdbId, mediaType, seasonNum, episodeNum })) {
    return await toggleSimklWatched({ tmdbId, title, mediaType, seasonNum, episodeNum });
  }
  return true;
};

export const updateWatchlistStatusSimkl = async ({ tmdbId, title, mediaType, status }) => {
  const { clientId, userToken } = getSimklConfig();
  if (!clientId) return false;

  try {
    const headers = {
      "simkl-api-key": clientId,
      "Content-Type": "application/json",
    };
    if (userToken && userToken.trim().length > 0) {
      headers["Authorization"] = `Bearer ${userToken.trim()}`;
    }

    const item = {
      title,
      to: status || "plantowatch",
      ids: { tmdb: String(tmdbId) },
    };

    const payload = mediaType === "movie" ? { movies: [item] } : { shows: [item] };

    console.log(`[Simkl API] Updating watchlist status to '${status}':`, payload);
    const baseUrl = getServerUrl();
    await axios.post(`${baseUrl}/api/simkl/sync/add-to-list`, payload, {
      headers,
      timeout: 8000,
    });

    return true;
  } catch (err) {
    console.warn("[Simkl API Watchlist Error]:", err.message);
  }

  return false;
};

export const testSimklConnection = async (clientId, userToken) => {
  const cId = clientId || getSimklConfig().clientId;
  const token = userToken || getSimklConfig().userToken;

  if (!cId) {
    return { success: false, message: "SIMKL Client ID is required." };
  }

  const headers = {
    "simkl-api-key": cId,
    "Content-Type": "application/json",
  };

  const baseUrl = getServerUrl();

  // 1. If User Access Token is provided, test user account endpoint
  if (token && token.trim().length > 0) {
    headers["Authorization"] = `Bearer ${token.trim()}`;
    try {
      const response = await axios.get(`${baseUrl}/api/simkl/users/settings`, {
        headers,
        timeout: 8000,
      });

      if (response.data && (response.data.user || response.data.account)) {
        const username = response.data.user?.name || response.data.user?.username || "Connected";
        return {
          success: true,
          message: `SIMKL Account Connected! Logged in as: ${username}`,
        };
      }

      return {
        success: true,
        message: "SIMKL Client ID & User Token connected successfully!",
      };
    } catch (err) {
      if (err.response?.status === 401) {
        return {
          success: false,
          message: "Invalid or expired SIMKL User Access Token. Please verify your token in SIMKL developer settings.",
        };
      }
      return {
        success: false,
        message: err.response?.data?.message || err.message || "Failed to verify SIMKL User Token.",
      };
    }
  }

  // 2. If NO User Access Token is provided (Client ID only), verify Client ID via SIMKL API search endpoint
  try {
    const response = await axios.get(`${baseUrl}/api/simkl/search/id?tmdb=550`, {
      headers,
      timeout: 8000,
    });

    if (response.status === 200) {
      return {
        success: true,
        message: "SIMKL Client ID verified & saved successfully!",
      };
    }
  } catch (err) {
    if (err.response?.status === 401) {
      return {
        success: false,
        message: "Invalid SIMKL Client ID. Please check your SIMKL Client ID in developer settings.",
      };
    }
  }

  return {
    success: true,
    message: "SIMKL Client ID saved!",
  };
};
