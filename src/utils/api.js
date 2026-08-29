import axios from "axios";

const BASE_URL = "https://api.themoviedb.org/3";
const DEFAULT_TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmYjM3ODM3YzJiMDlkNzEyMDIwMDIxZjc0NGI5ZTQwNyIsInN1YiI6IjY0NjNlNzE5ZTNmYTJmMDEyNDQ3ODk1NCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.3Y0VloCdPlprLy-OMZQmqtZd4_Ti9GDfHo4SZXh3erU";

export const getActiveTmdbToken = () => {
  const customToken = typeof window !== "undefined" ? localStorage.getItem("tmdb_token") : null;
  if (customToken && customToken.trim().length > 0) {
    return customToken.trim();
  }
  return import.meta.env.VITE_APP_TMDB_KEY || DEFAULT_TMDB_TOKEN;
};

// Helper function to filter out Animation/Anime and non-English foreign content
const isEnglishAndNonAnime = (item) => {
  if (!item || typeof item !== "object") return false;

  // Filter out Animation (TMDB genre ID 16)
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

  // Filter out Japanese origin content (anime)
  if (Array.isArray(item.origin_country) && item.origin_country.includes("JP")) {
    return false;
  }

  // Filter out non-English original language content
  if (item.original_language && item.original_language.toLowerCase() !== "en") {
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

    const customParams = {
      language: "en-US",
      with_original_language: "en",
      ...params,
    };

    // Pre-filter on TMDB discover endpoints
    if (url.startsWith("/discover")) {
      customParams.without_genres = "16";
      customParams.with_original_language = "en";
    }

    const { data } = await axios.get(BASE_URL + url, {
      headers,
      params: customParams,
    });

    if (data && Array.isArray(data.results)) {
      data.results = data.results.filter(isEnglishAndNonAnime);
    }

    return data;
  } catch (e) {
    console.error("[TMDB API Request Failed]:", e.message || e);
    return e;
  }
};
