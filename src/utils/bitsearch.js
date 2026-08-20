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

// Search helper function
const fetchMagnetResults = async (searchQuery) => {
  const apiKey = getBitsearchApiKey();

  // 1. Try Nginx/Vite proxied torrent API (/api/torrent?q=...)
  // Bypasses CORS and logs requests directly in Portainer!
  try {
    const proxyUrl = `/api/torrent?q=${encodeURIComponent(searchQuery)}`;
    console.log(`[Torrent API] Fetching magnet links via proxy: ${proxyUrl}`);
    const response = await axios.get(proxyUrl, { timeout: 8000 });

    if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].id !== "0") {
      const results = response.data.map((item) => ({
        title: item.name,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp://tracker.opentrackr.org:1337/announce&tr=udp://open.stealth.si:80/announce`,
        size: formatSize(item.size),
        seeders: Number(item.seeders || 0),
        leechers: Number(item.leechers || 0),
      }));

      if (results.length > 0) {
        return results;
      }
    }
  } catch (err) {
    console.warn("[Torrent API Proxy] Error:", err.message);
  }

  // 2. Try Bitsearch API (/api/bitsearch/v1/search?q=...)
  try {
    const headers = {};
    if (apiKey) {
      headers["X-API-Key"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const bitsearchUrl = `/api/bitsearch/v1/search?q=${encodeURIComponent(searchQuery)}&limit=25`;
    console.log(`[Bitsearch API] Fetching via proxy: ${bitsearchUrl}`);
    const response = await axios.get(bitsearchUrl, { headers, timeout: 8000 });

    const rawResults = response.data?.results || response.data || [];
    if (Array.isArray(rawResults) && rawResults.length > 0) {
      const results = rawResults
        .filter((item) => item && (item.magnet || item.magnet_link || item.link || item.info_hash))
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
        return results;
      }
    }
  } catch (err) {
    console.warn("[Bitsearch API] Error:", err.message);
  }

  // 3. Fallback: Direct APIBay API
  try {
    const directUrl = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}`;
    console.log(`[Torrent API Direct] Fetching: ${directUrl}`);
    const response = await axios.get(directUrl, { timeout: 8000 });

    if (Array.isArray(response.data) && response.data.length > 0 && response.data[0].id !== "0") {
      return response.data.map((item) => ({
        title: item.name,
        magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp://tracker.opentrackr.org:1337/announce`,
        size: formatSize(item.size),
        seeders: Number(item.seeders || 0),
        leechers: Number(item.leechers || 0),
      }));
    }
  } catch (err) {
    console.warn("[Torrent API Direct] Error:", err.message);
  }

  return [];
};

export const searchBitsearchMagnets = async (title, year) => {
  if (!title) return { results: [], error: "No title provided" };

  // 1. If year is present and not current/future, try title + year first
  const currentYear = new Date().getFullYear();
  const yearNum = Number(year);
  if (year && !isNaN(yearNum) && yearNum <= currentYear) {
    const resultsWithYear = await fetchMagnetResults(`${title} ${year}`);
    if (resultsWithYear && resultsWithYear.length > 0) {
      return { results: resultsWithYear, error: null };
    }
  }

  // 2. Search by title alone (returns best matches for all releases)
  const resultsTitleOnly = await fetchMagnetResults(title);
  if (resultsTitleOnly && resultsTitleOnly.length > 0) {
    return { results: resultsTitleOnly, error: null };
  }

  return { results: [], error: null };
};
