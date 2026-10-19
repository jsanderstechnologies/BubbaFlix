import { useState, useEffect } from "react";
import { fetchDataFromAPI, getCachedDataFromAPI, setCachedDataInAPI } from "../utils/api";

const useFetch = (url, pagesCount = 2) => {
  const cacheKey = pagesCount > 2 ? `${url}__pages_${pagesCount}` : url;
  const initialCached = url ? getCachedDataFromAPI(cacheKey) : null;
  const [data, setData] = useState(initialCached);
  const [loading, setLoading] = useState(initialCached ? false : "Loading...");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    const cached = getCachedDataFromAPI(cacheKey);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading("Loading...");
    setData(null);
    setError(null);

    const separator = url.includes("?") ? "&" : "?";
    const promises = [];
    for (let p = 1; p <= pagesCount; p++) {
      const pageUrl = p === 1 ? url : `${url}${separator}page=${p}`;
      promises.push(fetchDataFromAPI(pageUrl).catch(() => null));
    }

    Promise.all(promises)
      .then((responses) => {
        const combined = [];
        responses.forEach((res) => {
          if (Array.isArray(res?.results)) {
            combined.push(...res.results);
          }
        });

        const existingIds = new Set();
        const uniqueCombined = combined.filter((item) => {
          if (!item || !item.id) return false;
          if (existingIds.has(item.id)) return false;
          existingIds.add(item.id);
          return true;
        });

        const firstValidRes = responses.find((r) => r && typeof r === "object") || null;
        const finalData = firstValidRes
          ? { ...firstValidRes, results: uniqueCombined }
          : null;

        if (finalData) {
          setCachedDataInAPI(cacheKey, finalData);
        }

        setData(finalData);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setError("Something went wrong", err);
      });
  }, [url, pagesCount]);

  return { data, loading, error };
};

export default useFetch;
