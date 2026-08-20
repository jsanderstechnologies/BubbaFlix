import axios from "axios";

const BASE_URL = "https://api.themoviedb.org/3";

export const getActiveTmdbToken = () => {
  const customToken = typeof window !== "undefined" ? localStorage.getItem("tmdb_token") : null;
  if (customToken && customToken.trim().length > 0) {
    return customToken.trim();
  }
  return import.meta.env.VITE_APP_TMDB_KEY || "";
};

// Helper function to filter out non-English content and Anime/Animation
const isEnglishAndNotAnime = (item) => {
  if (!item || typeof item !== "object") return false;

  // Must be English original language if language metadata exists
  if (item.original_language && item.original_language !== "en") {
    return false;
  }

  // Must not be Animation (TMDB genre ID 16)
  if (Array.isArray(item.genre_ids) && item.genre_ids.includes(16)) {
    return false;
  }

  if (
    Array.isArray(item.genres) &&
    item.genres.some(
      (g) => g.id === 16 || (g.name && g.name.toLowerCase().includes("animation"))
    )
  ) {
    return false;
  }

  // Must not be of Japanese origin (anime)
  if (Array.isArray(item.origin_country) && item.origin_country.includes("JP")) {
    return false;
  }

  return true;
};

export const fetchDataFromAPI = async (url, params) => {
  try {
    const activeToken = getActiveTmdbToken();
    const headers = {
      Authorization: "bearer " + activeToken,
    };

    const customParams = { ...params };

    // Pre-filter on TMDB discover endpoints
    if (url.startsWith("/discover")) {
      customParams.with_original_language = "en";
      customParams.without_genres = "16";
    }

    const { data } = await axios.get(BASE_URL + url, {
      headers,
      params: customParams,
    });

    if (data && Array.isArray(data.results)) {
      data.results = data.results.filter(isEnglishAndNotAnime);
    }

    return data;
  } catch (e) {
    console.log(e);
    return e;
  }
};
