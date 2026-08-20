import axios from "axios";

export const getBitsearchApiKey = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("bitsearch_api_key") || "";
  }
  return "";
};

const formatSize = (bytes) => {
  if (!bytes) return "N/A";
  if (typeof bytes === "string" && (bytes.includes("GB") || bytes.includes("MB") || bytes.includes("KB"))) {
    return bytes;
  }
  const num = Number(bytes);
  if (isNaN(num) || num <= 0) return String(bytes);
  if (num >= 1073741824) return (num / 1073741824).toFixed(2) + " GB";
  if (num >= 1048576) return (num / 1048576).toFixed(2) + " MB";
  if (num >= 1024) return (num / 1024).toFixed(2) + " KB";
  return num + " B";
};

export const searchBitsearchMagnets = async (title, year) => {
  const apiKey = getBitsearchApiKey();

  if (!title) return { results: [], error: "No title provided" };

  const searchQuery = year ? `${title} ${year}` : title;

  const headers = {};
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // Endpoints: Try proxy through Docker Nginx/Vite first (logs in Portainer & bypasses CORS)
  const endpoints = [
    `/api/bitsearch/v1/search?q=${encodeURIComponent(searchQuery)}&limit=25`,
    `https://bitsearch.to/api/v1/search?q=${encodeURIComponent(searchQuery)}&limit=25`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`[Bitsearch] Fetching magnet links from: ${url}`);
      const response = await axios.get(url, { headers, timeout: 8000 });

      const rawResults = response.data?.results || response.data || [];
      if (Array.isArray(rawResults) && rawResults.length > 0) {
        const results = rawResults
          .filter((item) => item.magnet || item.magnet_link || item.link || item.info_hash)
          .map((item) => {
            let magnet = item.magnet || item.magnet_link || item.link;
            if (!magnet && item.info_hash) {
              magnet = `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.title || item.name || searchQuery)}`;
            }
            return {
              title: item.title || item.name || searchQuery,
              magnet: magnet,
              size: formatSize(item.size || item.size_formatted || item.filesize),
              seeders: item.seeders !== undefined ? Number(item.seeders) : Number(item.seeds || 0),
              leechers: item.leechers !== undefined ? Number(item.leechers) : Number(item.leeches || 0),
              date: item.date || item.created_at || "",
            };
          });

        if (results.length > 0) {
          return { results, error: null };
        }
      }
    } catch (err) {
      console.warn(`[Bitsearch] Attempt for ${url} failed:`, err.message);
    }
  }

  // Fallback: Open Torrent API mirror if Bitsearch is unreachable/rate-limited
  try {
    console.log(`[Bitsearch Fallback] Querying mirror for: ${searchQuery}`);
    const fallbackUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}`;
    const response = await axios.get(fallbackUrl, { timeout: 8000 });

    if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].id !== "0") {
      const results = response.data.map((item) => ({
        title: item.name,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}`,
        size: formatSize(item.size),
        seeders: Number(item.seeders || 0),
        leechers: Number(item.leechers || 0),
      }));
      return { results, error: null };
    }
  } catch (fallbackErr) {
    console.error("[Bitsearch Fallback Error]:", fallbackErr.message);
  }

  return { results: [], error: null };
};
