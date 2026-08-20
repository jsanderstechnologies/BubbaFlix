import axios from "axios";

export const getSimklConfig = () => {
  let clientId = "";
  let userToken = "";
  if (typeof window !== "undefined") {
    clientId = localStorage.getItem("simkl_client_id") || "";
    userToken = localStorage.getItem("simkl_access_token") || "";
  }
  return {
    clientId: clientId || import.meta.env.VITE_SIMKL_CLIENT_ID || "",
    userToken: userToken || import.meta.env.VITE_SIMKL_ACCESS_TOKEN || "",
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
  if (!clientId || !userToken) return getSimklWatchCache();

  const cache = getSimklWatchCache();
  const headers = {
    "simkl-api-key": clientId,
    "Content-Type": "application/json",
    "Authorization": `Bearer ${userToken}`,
  };

  try {
    // 1. Fetch movies history
    const moviesRes = await axios.get("/api/simkl/sync/all-items/movies", { headers, timeout: 8000 });
    if (Array.isArray(moviesRes.data?.movies)) {
      moviesRes.data.movies.forEach((m) => {
        if (m.ids?.tmdb) {
          cache.movies[String(m.ids.tmdb)] = true;
        }
      });
    }

    // 2. Fetch shows history
    const showsRes = await axios.get("/api/simkl/sync/all-items/shows", { headers, timeout: 8000 });
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
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn("[Simkl API] User Access Token required or expired for SIMKL account sync.");
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

  if (!clientId || !userToken) {
    console.log("[Simkl] Toggled locally. Add SIMKL User Access Token in Settings for account sync.");
    return !currentlyWatched;
  }

  const endpoint = currentlyWatched ? "/api/simkl/sync/history/remove" : "/api/simkl/sync/history";
  const headers = {
    "simkl-api-key": clientId,
    "Content-Type": "application/json",
    "Authorization": `Bearer ${userToken}`,
  };

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
    await axios.post(endpoint, payload, { headers, timeout: 8000 });
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
  if (!clientId || !userToken) return false;

  try {
    const headers = {
      "simkl-api-key": clientId,
      "Content-Type": "application/json",
      "Authorization": `Bearer ${userToken}`,
    };

    const item = {
      title,
      to: status || "plantowatch",
      ids: { tmdb: String(tmdbId) },
    };

    const payload = mediaType === "movie" ? { movies: [item] } : { shows: [item] };

    console.log(`[Simkl API] Updating watchlist status to '${status}':`, payload);
    await axios.post("/api/simkl/sync/add-to-list", payload, {
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
    return { success: false, message: "Simkl Client ID is required." };
  }

  try {
    const headers = {
      "simkl-api-key": cId,
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await axios.get("/api/simkl/users/settings", {
      headers,
      timeout: 8000,
    });

    if (response.data && (response.data.user || response.data.account)) {
      const username = response.data.user?.name || response.data.user?.username || "Connected";
      return {
        success: true,
        message: `Simkl Connection Successful! Logged in as: ${username}`,
      };
    }

    return {
      success: true,
      message: "Simkl API Client ID connected successfully!",
    };
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to connect to Simkl API.",
    };
  }
};
