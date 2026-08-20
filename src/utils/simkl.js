import axios from "axios";

export const getSimklConfig = () => {
  if (typeof window === "undefined") {
    return { clientId: "", userToken: "" };
  }
  return {
    clientId: localStorage.getItem("simkl_client_id") || "",
    userToken: localStorage.getItem("simkl_access_token") || "",
  };
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

export const markAsWatchedOnSimkl = async ({ tmdbId, title, mediaType, seasonNum, episodeNum }) => {
  const { clientId, userToken } = getSimklConfig();
  if (!clientId) {
    console.log("[Simkl] Client ID not configured in Settings.");
    return false;
  }

  try {
    const headers = {
      "simkl-api-key": clientId,
      "Content-Type": "application/json",
    };
    if (userToken) {
      headers["Authorization"] = `Bearer ${userToken}`;
    }

    const payload = {};

    if (mediaType === "movie") {
      payload.movies = [
        {
          title,
          ids: { tmdb: String(tmdbId) },
        },
      ];
    } else if (mediaType === "tv") {
      payload.shows = [
        {
          title,
          ids: { tmdb: String(tmdbId) },
          seasons: [
            {
              number: Number(seasonNum || 1),
              episodes: [
                { number: Number(episodeNum || 1) },
              ],
            },
          ],
        },
      ];
    }

    console.log("[Simkl API] Syncing history item:", payload);
    const response = await axios.post("/api/simkl/sync/history", payload, {
      headers,
      timeout: 8000,
    });

    if (response.data?.added || response.data?.status === "success") {
      console.log("[Simkl API] Successfully marked as watched on Simkl!");
      return true;
    }
  } catch (err) {
    console.warn("[Simkl API Warning]:", err.message);
  }

  return false;
};

export const updateWatchlistStatusSimkl = async ({ tmdbId, title, mediaType, status }) => {
  // status: "plantowatch", "watching", "completed", "hold", "dropped"
  const { clientId, userToken } = getSimklConfig();
  if (!clientId) return false;

  try {
    const headers = {
      "simkl-api-key": clientId,
      "Content-Type": "application/json",
    };
    if (userToken) {
      headers["Authorization"] = `Bearer ${userToken}`;
    }

    const item = {
      title,
      to: status || "plantowatch",
      ids: { tmdb: String(tmdbId) },
    };

    const payload = mediaType === "movie" ? { movies: [item] } : { shows: [item] };

    console.log(`[Simkl API] Updating watchlist status to '${status}':`, payload);
    const response = await axios.post("/api/simkl/sync/add-to-list", payload, {
      headers,
      timeout: 8000,
    });

    if (response.data) {
      return true;
    }
  } catch (err) {
    console.warn("[Simkl API Watchlist Error]:", err.message);
  }

  return false;
};
