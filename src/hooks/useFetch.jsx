import { useState, useEffect } from "react";
import { fetchDataFromAPI, getCachedDataFromAPI } from "../utils/api";

const useFetch = (url) => {
  const initialCached = url ? getCachedDataFromAPI(url) : null;
  const [data, setData] = useState(initialCached);
  const [loading, setLoading] = useState(initialCached ? false : "Loading...");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;
    const cached = getCachedDataFromAPI(url);
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
    const page2Url = `${url}${separator}page=2`;

    Promise.all([
      fetchDataFromAPI(url).catch(() => null),
      fetchDataFromAPI(page2Url).catch(() => null),
    ])
      .then(([res1, res2]) => {
        const list1 = Array.isArray(res1?.results) ? res1.results : [];
        const list2 = Array.isArray(res2?.results) ? res2.results : [];
        const combined = [...list1, ...list2];
        const existingIds = new Set();
        const uniqueCombined = combined.filter((item) => {
          if (!item || !item.id) return false;
          if (existingIds.has(item.id)) return false;
          existingIds.add(item.id);
          return true;
        });

        if (res1) {
          setData({ ...res1, results: uniqueCombined });
        } else if (res2) {
          setData({ ...res2, results: uniqueCombined });
        } else {
          setData(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        setError("Something went wrong", err);
      });
  }, [url]);

  return { data, loading, error };
};

export default useFetch;
