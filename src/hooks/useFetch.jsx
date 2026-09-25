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

    fetchDataFromAPI(url)
      .then((res) => {
        setData(res);
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
