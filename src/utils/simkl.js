import axios from "axios";
import { getServerUrl } from "./serverSettings";

const APP_NAME = "BubbaFlix";
const APP_VERSION = "1.0";
const USER_AGENT = "BubbaFlix/1.0 (Smart TV Media App)";

// Helper for rate-limiting POST requests to 1 request per second per SIMKL rules
let lastPostTimestamp = 0;
const enforcePostRateLimit = async () => {
  const now = Date.now();
  const timeSinceLast = now - lastPostTimestamp;
  if (timeSinceLast < 1050) {
    const delay = 1050 - timeSinceLast;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  lastPostTimestamp = Date.now();
};

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

const getRequiredQueryParams = (clientId, extraParams = {}) => {
  const params = new URLSearchParams({
    client_id: clientId,
    "app-name": APP_NAME,
    "app-version": APP_VERSION,
    ...extraParams,
  });
  return params.toString();
};

const getRequiredHeaders = (clientId, userToken) => {
  const headers = {
    "simkl-api-key": clientId,
    "User-Agent": USER_AGENT,
    "Content-Type": "application/json",
  };
  if (userToken && userToken.trim().length > 0) {
    headers["Authorization"] = `Bearer ${userToken.trim()}`;
  }
  return headers;
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

// SIMKL API Phase 1 & Phase 2 Compliant Sync Strategy
export const fetchUserSimklHistory = async (forceManualSync = false) => {
  const { clientId, userToken } = getSimklConfig();
  if (!clientId) return getSimklWatchCache();

  if (typeof window !== "undefined" && !forceManualSync) {
    const lastSyncTime = localStorage.getItem("simkl_last_sync_time");
    const now = Date.now();
    // Throttle background startup sync checks to at most once every 15 minutes (15 * 60 * 1000)
    if (lastSyncTime && now - Number(lastSyncTime) < 15 * 60 * 1000) {
      console.log("[SIMKL Sync Rules] Background sync skipped (throttled to once every 15 mins).");
      return getSimklWatchCache();
    }
  }

  const cache = getSimklWatchCache();
  const headers = getRequiredHeaders(clientId, userToken);
  const baseUrl = getServerUrl();
  const savedActivityDate = typeof window !== "undefined" ? localStorage.getItem("simkl_last_activity_date") : null;

  try {
    // PHASE 2: Check Activities First (Required SIMKL Rule)
    console.log("[SIMKL Sync Phase 2] Checking /sync/activities first...");
    const actQuery = getRequiredQueryParams(clientId);
    const actRes = await axios.get(`${baseUrl}/api/simkl/sync/activities?${actQuery}`, { headers, timeout: 8000 });

    const latestActivity = actRes.data?.all || actRes.data?.movies || actRes.data?.shows || null;

    // Compare Dates: If local activity date matches latest activity date, SKIP SYNC!
    if (savedActivityDate && latestActivity && savedActivityDate === latestActivity && !forceManualSync) {
      console.log(`[SIMKL Sync Rules] Activity dates match (${latestActivity}). Skiping payload fetch!`);
      if (typeof window !== "undefined") localStorage.setItem("simkl_last_sync_time", String(Date.now()));
      return cache;
    }

    // PHASE 2: Combined Delta Sync (if date_from is saved)
    if (savedActivityDate) {
      console.log(`[SIMKL Sync Phase 2] Fetching delta changes with date_from=${savedActivityDate}...`);
      const deltaQuery = getRequiredQueryParams(clientId, { date_from: savedActivityDate });
      const deltaRes = await axios.get(`${baseUrl}/api/simkl/sync/all-items/?${deltaQuery}`, { headers, timeout: 10000 });

      if (Array.isArray(deltaRes.data?.movies)) {
        deltaRes.data.movies.forEach((m) => {
          if (m.ids?.tmdb) cache.movies[String(m.ids.tmdb)] = true;
        });
      }

      if (Array.isArray(deltaRes.data?.shows)) {
        deltaRes.data.shows.forEach((show) => {
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
    } else {
      // PHASE 1: Initial Sync Strategy (Fetch Libraries Separately & Sequentially)
      console.log("[SIMKL Sync Phase 1] Performing initial sequential library sync (movies -> shows -> anime)...");
      const baseQuery = getRequiredQueryParams(clientId);

      // 1. Fetch movies library
      const moviesRes = await axios.get(`${baseUrl}/api/simkl/sync/movies?${baseQuery}`, { headers, timeout: 10000 });
      if (Array.isArray(moviesRes.data?.movies)) {
        moviesRes.data.movies.forEach((m) => {
          if (m.ids?.tmdb) cache.movies[String(m.ids.tmdb)] = true;
        });
      }

      // 2. Fetch shows library (sequential wait)
      const showsRes = await axios.get(`${baseUrl}/api/simkl/sync/shows?${baseQuery}`, { headers, timeout: 10000 });
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

      // 3. Fetch anime library (sequential wait)
      const animeRes = await axios.get(`${baseUrl}/api/simkl/sync/anime?${baseQuery}`, { headers, timeout: 10000 });
      if (Array.isArray(animeRes.data?.anime)) {
        animeRes.data.anime.forEach((a) => {
          if (a.ids?.tmdb) cache.movies[String(a.ids.tmdb)] = true;
        });
      }
    }

    saveSimklWatchCache(cache);

    if (latestActivity && typeof window !== "undefined") {
      localStorage.setItem("simkl_last_activity_date", latestActivity);
      localStorage.setItem("simkl_last_sync_time", String(Date.now()));
    }

    console.log("[SIMKL Sync Rules] SIMKL watch history sync completed successfully.");
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn("[SIMKL API] User Access Token required or expired for private SIMKL account sync.");
    } else {
      console.warn("[SIMKL Sync Warning]:", err.message);
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

  // Enforce 1 request / sec rate limit for POST requests per SIMKL rules
  await enforcePostRateLimit();

  const endpointPath = currentlyWatched ? "/api/simkl/sync/history/remove" : "/api/simkl/sync/history";
  const queryParams = getRequiredQueryParams(clientId);
  const headers = getRequiredHeaders(clientId, userToken);

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
    console.log(`[SIMKL API] ${currentlyWatched ? "Removing from" : "Adding to"} SIMKL history:`, payload);
    const baseUrl = getServerUrl();
    await axios.post(`${baseUrl}${endpointPath}?${queryParams}`, payload, { headers, timeout: 8000 });
  } catch (err) {
    console.warn(`[SIMKL API Sync Error]:`, err.message);
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

  // Enforce 1 request / sec rate limit for POST requests per SIMKL rules
  await enforcePostRateLimit();

  try {
    const queryParams = getRequiredQueryParams(clientId);
    const headers = getRequiredHeaders(clientId, userToken);

    const item = {
      title,
      to: status || "plantowatch",
      ids: { tmdb: String(tmdbId) },
    };

    const payload = mediaType === "movie" ? { movies: [item] } : { shows: [item] };

    console.log(`[SIMKL API] Updating watchlist status to '${status}':`, payload);
    const baseUrl = getServerUrl();
    await axios.post(`${baseUrl}/api/simkl/sync/add-to-list?${queryParams}`, payload, {
      headers,
      timeout: 8000,
    });

    return true;
  } catch (err) {
    console.warn("[SIMKL API Watchlist Error]:", err.message);
  }

  return false;
};

export const testSimklConnection = async (clientId, userToken) => {
  const cId = clientId || getSimklConfig().clientId;
  const token = userToken || getSimklConfig().userToken;

  if (!cId) {
    return { success: false, message: "SIMKL Client ID is required." };
  }

  const queryParams = getRequiredQueryParams(cId);
  const headers = getRequiredHeaders(cId, token);
  const baseUrl = getServerUrl();

  // 1. If User Access Token is provided, test user account endpoint
  if (token && token.trim().length > 0) {
    try {
      const response = await axios.get(`${baseUrl}/api/simkl/users/settings?${queryParams}`, {
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
        // Test if Client ID itself is valid
        try {
          const searchParams = getRequiredQueryParams(cId, { tmdb: "550" });
          const testRes = await axios.get(`${baseUrl}/api/simkl/search/id?${searchParams}`, {
            headers: { "simkl-api-key": cId, "User-Agent": USER_AGENT },
            timeout: 5000,
          });
          if (testRes.status === 200) {
            return {
              success: false,
              message: "SIMKL Client ID is valid, but the User Access Token was rejected (401). If you do not have an OAuth User Token, leave the User Access Token field empty (do not use Client Secret).",
            };
          }
        } catch (e) {
          // Fallthrough
        }

        return {
          success: false,
          message: "Invalid SIMKL User Access Token. Leave User Access Token empty if you only have a Client ID.",
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
    const searchParams = getRequiredQueryParams(cId, { tmdb: "550" });
    const response = await axios.get(`${baseUrl}/api/simkl/search/id?${searchParams}`, {
      headers: { "simkl-api-key": cId, "User-Agent": USER_AGENT },
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
