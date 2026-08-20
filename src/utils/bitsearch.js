import axios from "axios";

export const getBitsearchApiKey = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("bitsearch_api_key") || "";
  }
  return "";
};

export const searchBitsearchMagnets = async (title, year) => {
  const apiKey = getBitsearchApiKey();

  if (!title) return { results: [], error: "No title provided" };

  const searchQuery = year ? `${title} ${year}` : title;

  try {
    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await axios.get("https://bitsearch.to/api/v1/search", {
      params: {
        q: searchQuery,
        limit: 20,
      },
      headers,
      timeout: 10000,
    });

    const rawResults = response.data?.results || response.data || [];
    if (Array.isArray(rawResults) && rawResults.length > 0) {
      const results = rawResults
        .filter((item) => item.magnet || item.magnet_link || item.link)
        .map((item) => ({
          title: item.title || item.name || searchQuery,
          magnet: item.magnet || item.magnet_link || item.link,
          size: item.size || item.size_formatted || "N/A",
          seeders: item.seeders !== undefined ? item.seeders : item.seeds || 0,
          leechers: item.leechers !== undefined ? item.leechers : item.leeches || 0,
          date: item.date || item.created_at || "",
        }));

      return { results, error: null };
    }

    return { results: [], error: null };
  } catch (err) {
    console.error("Bitsearch API fetch error:", err);
    return {
      results: [],
      error: err.response?.data?.message || err.message || "Unable to connect to Bitsearch API.",
    };
  }
};
