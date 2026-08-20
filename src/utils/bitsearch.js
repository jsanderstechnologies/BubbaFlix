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

// Internal single-query search helper
const performSearch = async (queryStr, apiKey) => {
  const headers = {};
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  // Endpoints to attempt:
  // 1. Docker Nginx / Vite proxy (bypasses CORS & logs in Portainer)
  // 2. Direct Bitsearch API endpoint
  // 3. Public CORS proxy fallback
  const endpoints = [
    `/api/bitsearch/v1/search?q=${encodeURIComponent(queryStr)}&limit=25`,
    `https://bitsearch.to/api/v1/search?q=${encodeURIComponent(queryStr)}&limit=25`,
    `https://corsproxy.io/?${encodeURIComponent(`https://bitsearch.to/api/v1/search?q=${queryStr}&limit=25`)}`,
  ];

  for (const url of endpoints) {
    try {
      console.log(`[Bitsearch] Querying: ${url}`);
      const response = await axios.get(url, { headers, timeout: 8000 });

      // Handle standard response or wrapped CORS proxy response
      let data = response.data;
      if (data && typeof data === "string" && data.startsWith("{")) {
        try {
          data = JSON.parse(data);
        } catch {
          // ignore parse error
        }
      }

      const rawResults = data?.results || data || [];
      if (Array.isArray(rawResults) && rawResults.length > 0) {
        const results = rawResults
          .filter((item) => item && (item.magnet || item.magnet_link || item.link || item.info_hash))
          .map((item) => {
            let magnet = item.magnet || item.magnet_link || item.link;
            if (!magnet && item.info_hash) {
              magnet = `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.title || item.name || queryStr)}`;
            }
            return {
              title: item.title || item.name || queryStr,
              magnet: magnet,
              size: formatSize(item.size || item.size_formatted || item.filesize),
              seeders: item.seeders !== undefined ? Number(item.seeders) : Number(item.seeds || 0),
              leechers: item.leechers !== undefined ? Number(item.leechers) : Number(item.leeches || 0),
              date: item.date || item.created_at || "",
            };
          });

        if (results.length > 0) {
          return results;
        }
      }
    } catch (err) {
      console.warn(`[Bitsearch] Query attempt failed for ${url}:`, err.message);
    }
  }

  // Fallback: Open Torrent API (APIBay mirror)
  try {
    console.log(`[Bitsearch Fallback] Querying torrent mirror for: ${queryStr}`);
    const fallbackUrl = `https://apibay.org/q.php?q=${encodeURIComponent(queryStr)}`;
    const response = await axios.get(fallbackUrl, { timeout: 8000 });

    if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].id !== "0") {
      return response.data.map((item) => ({
        title: item.name,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}`,
        size: formatSize(item.size),
        seeders: Number(item.seeders || 0),
        leechers: Number(item.leechers || 0),
      }));
    }
  } catch (err) {
    console.warn(`[Bitsearch Fallback] Mirror query failed:`, err.message);
  }

  return [];
};

export const searchBitsearchMagnets = async (title, year) => {
  const apiKey = getBitsearchApiKey();

  if (!title) return { results: [], error: "No title provided" };

  // 1. Try search query with year if year exists
  if (year) {
    const resultsWithYear = await performSearch(`${title} ${year}`, apiKey);
    if (resultsWithYear && resultsWithYear.length > 0) {
      return { results: resultsWithYear, error: null };
    }
  }

  // 2. Fallback: Search by title alone if year returned 0 results or no year provided
  const resultsTitleOnly = await performSearch(title, apiKey);
  if (resultsTitleOnly && resultsTitleOnly.length > 0) {
    return { results: resultsTitleOnly, error: null };
  }

  return { results: [], error: null };
};
