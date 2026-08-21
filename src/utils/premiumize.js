import axios from "axios";
import { fetchServerSettings, getServerUrl } from "./serverSettings";

export const getPremiumizeApiKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("premiumize_api_key");
    if (saved) return saved;
  }
  return import.meta.env.VITE_PREMIUMIZE_API_KEY || "";
};

export const testPremiumizeAccount = async (apiKey) => {
  let key = apiKey || getPremiumizeApiKey();

  if (!key) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.premiumizeKey) {
      key = serverSettings.premiumizeKey;
      localStorage.setItem("premiumize_api_key", key);
    }
  }

  if (!key) return { success: false, message: "No Premiumize API Key provided." };

  try {
    const baseUrl = getServerUrl();
    const response = await axios.get(`${baseUrl}/api/premiumize/account/info`, {
      params: { apikey: key },
      timeout: 8000,
    });

    if (response.data?.status === "success") {
      const premiumDays = response.data.premium_until
        ? Math.max(0, Math.ceil((response.data.premium_until - Date.now() / 1000) / 86400))
        : 0;
      return {
        success: true,
        message: `Account Connected! Premium Days Remaining: ${premiumDays}`,
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: response.data?.message || "Invalid Premiumize API Key.",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to connect to Premiumize API.",
    };
  }
};

// Premiumize Cache Check API: Checks which stream magnet links are instantly cached on Premiumize cloud servers
export const checkPremiumizeCache = async (results) => {
  if (!Array.isArray(results) || results.length === 0) return results;

  let apiKey = getPremiumizeApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.premiumizeKey) {
      apiKey = serverSettings.premiumizeKey;
      localStorage.setItem("premiumize_api_key", apiKey);
    }
  }

  if (!apiKey) return results;

  try {
    const baseUrl = getServerUrl();
    const items = results.map((r) => r.magnet || r.info_hash).filter(Boolean);
    if (items.length === 0) return results;

    const params = new URLSearchParams();
    params.append("apikey", apiKey);
    items.forEach((item) => params.append("items[]", item));

    console.log(`[Premiumize Cache Check] Checking cache status for ${items.length} stream magnets...`);
    const response = await axios.get(`${baseUrl}/api/premiumize/cache/check?${params.toString()}`, {
      timeout: 8000,
    });

    if (response.data?.status === "success" && Array.isArray(response.data?.response)) {
      const cacheStatuses = response.data.response;
      const updatedResults = results.map((item, idx) => ({
        ...item,
        isCached: !!cacheStatuses[idx],
      }));

      // Sort: Cached streams (isCached: true) boosted to top of list!
      updatedResults.sort((a, b) => (b.isCached ? 1 : 0) - (a.isCached ? 1 : 0));
      console.log(`[Premiumize Cache Check] Found ${updatedResults.filter((r) => r.isCached).length} instantly cached streams!`);
      return updatedResults;
    }
  } catch (err) {
    console.warn("[Premiumize Cache Check Warning]:", err.message);
  }

  return results;
};

export const getDirectStreamUrl = async (magnetLink) => {
  let apiKey = getPremiumizeApiKey();

  // Automatic fallback: Pull backend server settings if key is missing locally
  if (!apiKey) {
    console.log("[Premiumize API] Local key missing. Fetching backend server settings...");
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.premiumizeKey) {
      apiKey = serverSettings.premiumizeKey;
      localStorage.setItem("premiumize_api_key", apiKey);
    }
  }

  if (!apiKey) {
    return {
      streamUrl: null,
      rawUrl: null,
      error: "No Premiumize API Key configured on backend server or in settings.",
    };
  }

  if (!magnetLink) {
    return { streamUrl: null, rawUrl: null, error: "Invalid stream magnet link." };
  }

  try {
    console.log("[Premiumize API] Requesting direct stream URL for magnet...");
    const baseUrl = getServerUrl();
    const response = await axios.post(
      `${baseUrl}/api/premiumize/transfer/directdl`,
      null,
      {
        params: {
          apikey: apiKey,
          src: magnetLink,
        },
        timeout: 12000,
      }
    );

    if (response.data?.status === "success") {
      const data = response.data;

      let directStreamLink = data.stream_link || data.link || data.location || null;
      let filename = data.filename || "Video Stream";
      let filesize = data.filesize || 0;

      // Check for content array (multi-file torrent)
      if (Array.isArray(data.content) && data.content.length > 0) {
        const videoFiles = data.content.filter((file) => {
          const path = (file.path || file.filename || "").toLowerCase();
          return (
            path.endsWith(".mp4") ||
            path.endsWith(".mkv") ||
            path.endsWith(".avi") ||
            path.endsWith(".mov") ||
            path.endsWith(".webm") ||
            path.endsWith(".m4v") ||
            path.endsWith(".ts")
          );
        });

        if (videoFiles.length > 0) {
          videoFiles.sort((a, b) => (b.size || 0) - (a.size || 0));
          const bestFile = videoFiles[0];
          directStreamLink = bestFile.stream_link || bestFile.link || directStreamLink;
          filename = bestFile.path || bestFile.filename || filename;
          filesize = bestFile.size || filesize;
        }
      }

      if (!directStreamLink) {
        return {
          streamUrl: null,
          rawUrl: null,
          error: "Torrent cached on Premiumize, but no playable video files were found.",
        };
      }

      console.log(`[Premiumize Direct Stream] Handing off direct stream URL: ${directStreamLink}`);

      return {
        streamUrl: directStreamLink,
        rawUrl: directStreamLink,
        filename,
        filesize,
        error: null,
      };
    } else {
      return {
        streamUrl: null,
        rawUrl: null,
        error: response.data?.message || "Torrent is not yet cached or failed on Premiumize.",
      };
    }
  } catch (err) {
    console.error("[Premiumize API Error]:", err.message);
    return {
      streamUrl: null,
      rawUrl: null,
      error: err.response?.data?.message || err.message || "Unable to reach Premiumize server.",
    };
  }
};
