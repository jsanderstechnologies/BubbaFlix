import axios from "axios";
import { applyTheme } from "./theme";
import { fetchUserSimklHistory } from "./simkl";

export const DEFAULT_SERVER_URL = "https://bubbaflix.sanders-technologies.net";

export const getServerUrl = () => {
  if (typeof window === "undefined") return DEFAULT_SERVER_URL;
  let saved = localStorage.getItem("bubbaflix_server_url");
  
  if (saved && saved.startsWith("http://") && window.location.protocol === "https:") {
    console.warn("Ignoring saved HTTP server URL to prevent Mixed Content blocking on HTTPS client.");
    saved = null;
  }
  
  if (saved && saved.trim().length > 0) {
    let url = saved.trim();
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url;
  }
  if (window.location && window.location.origin && window.location.origin.startsWith("http") && !window.location.origin.includes("localhost")) {
    return window.location.origin.replace(/\/$/, "");
  }
  return DEFAULT_SERVER_URL;
};

export const isAndroidTvClient = () => {
  if (typeof window === "undefined") return false;
  if (window.AndroidPlayer) return true;
  const ua = navigator.userAgent || "";
  return (
    ua.includes("BubbaFlixTV") ||
    ua.includes("ExoPlayer") ||
    ua.includes("AndroidTV") ||
    ua.includes("SmartTV") ||
    ua.includes("BRAVIA") ||
    ua.includes("MiTV") ||
    /Android|Tablet|Mobile|Silk|Kindle|KFTRWI/i.test(ua)
  );
};

export const getTranscodedStreamUrl = (url) => {
  if (!url) return "";
  
  let innerUrl = url;
  // Unwrap any old /api/transcode wrapper so we can re-wrap it with the proper current serverBase
  if (url.includes("/api/transcode")) {
    const split = url.split("?url=");
    if (split.length > 1) {
      try {
        innerUrl = decodeURIComponent(split[1]);
      } catch (e) {
        innerUrl = split[1];
      }
    }
  }

  // Web clients: route through backend FFmpeg to remux/transcode unsupported containers (like MKV) to MP4
  const serverBase = getServerUrl();
  const transcodeUrl = `${serverBase}/api/transcode?url=${encodeURIComponent(innerUrl)}`;
  console.log("[Direct Stream Router] Web: routing stream through backend FFmpeg transcoder:", transcodeUrl.substring(0, 100) + "...");
  return transcodeUrl;
};

export const getProxiedImageUrl = (url) => {
  if (!url) return "";
  if (!url.startsWith("http")) return url; // Already relative or invalid
  const serverBase = getServerUrl();
  return `${serverBase}/api/image?url=${encodeURIComponent(url)}`;
};

export const saveServerUrl = (url) => {
  if (typeof window === "undefined") return;
  if (!url || url.trim().length === 0) {
    localStorage.removeItem("bubbaflix_server_url");
  } else {
    let clean = url.trim();
    if (clean.endsWith("/")) clean = clean.slice(0, -1);
    localStorage.setItem("bubbaflix_server_url", clean);
  }
};

let cachedServerSettings = null;
let lastSettingsFetchTime = 0;
let pendingSettingsPromise = null;

export const fetchServerSettings = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedServerSettings && now - lastSettingsFetchTime < 30000) {
    return cachedServerSettings;
  }
  if (pendingSettingsPromise) {
    return pendingSettingsPromise;
  }

  pendingSettingsPromise = (async () => {
    try {
      const baseUrl = getServerUrl();
      const res = await axios.get(`${baseUrl}/api/settings`, { timeout: 6000 });
      const payload = res.data;
      const s = payload?.settings || (payload && (payload.theme || payload.simklClientId !== undefined) ? payload : null);
      if (s) {
        cachedServerSettings = s;
        lastSettingsFetchTime = Date.now();
        return s;
      }
    } catch (err) {
      console.warn("[Server Settings Sync Warning]: Unable to pull server settings. Operating in cached mode.", err.message);
    } finally {
      pendingSettingsPromise = null;
    }
    return cachedServerSettings;
  })();

  const s = await pendingSettingsPromise;
  if (s) {
    // Sync all backend settings to client storage
    if (s.theme) {
      localStorage.setItem("bubbaflix_theme", s.theme);
      applyTheme(s.theme);
    }
    if (s.simklClientId !== undefined) {
      localStorage.setItem("simkl_client_id", (s.simklClientId || "").trim());
    }
    if (s.groqKey !== undefined) {
      localStorage.setItem("groq_api_key", (s.groqKey || "").trim());
    }
    if (s.tmdbToken !== undefined) {
      if (s.tmdbToken && s.tmdbToken.trim().length > 0) {
        localStorage.setItem("tmdb_token", s.tmdbToken.trim());
      } else {
        localStorage.removeItem("tmdb_token");
      }
    }
    if (s.premiumizeKey !== undefined) {
      if (s.premiumizeKey && s.premiumizeKey.trim().length > 0) {
        localStorage.setItem("premiumize_api_key", s.premiumizeKey.trim());
      } else {
        localStorage.removeItem("premiumize_api_key");
      }
    }
    // We intentionally do not overwrite user stream_resolutions or stream_exclude_low_quality 
    // with global server settings so that the user's cross-device preferences take precedence.

    console.log("[Server Settings Sync] Successfully pulled backend server settings.");

    // Sync SIMKL account watch history if SIMKL Client ID is configured
    if (s.simklClientId) {
      fetchUserSimklHistory();
    }
  }
  return s || cachedServerSettings;
};

export const updateServerSettings = async (settingsPartial) => {
  try {
    const baseUrl = getServerUrl();
    console.log("[Server Settings Sync] Pushing updated settings to backend server:", settingsPartial);
    const res = await axios.post(`${baseUrl}/api/settings`, settingsPartial, { timeout: 6000 });
    if (res.data?.status === "success") {
      return { success: true, settings: res.data.settings };
    }
  } catch (err) {
    console.error("[Server Settings Sync Error]: Failed to push settings to server.", err.message);
  }
  return { success: false };
};

export const testBackendServerHealth = async (customServerUrl) => {
  const targetBase = customServerUrl !== undefined ? customServerUrl.trim().replace(/\/$/, "") : getServerUrl();
  try {
    const res = await axios.get(`${targetBase}/api/transcode/health`, { timeout: 5000 });
    if (res.data?.status === "ok") {
      const gpuText = res.data?.gpu_acceleration?.type ? ` | Transcoder: ${res.data.gpu_acceleration.type}` : "";
      return { success: true, message: `Backend Server Connected! (${res.data.service || "BubbaFlix Engine"}${gpuText})`, gpu: res.data?.gpu_acceleration };
    }
    return { success: false, message: "Server responded, but health status failed." };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to connect to backend server." };
  }
};

export const exportAdminBackup = async () => {
  try {
    const baseUrl = getServerUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("bubbaflix_token") : null;
    let backendBackup = null;
    if (token) {
      try {
        const res = await axios.get(`${baseUrl}/api/admin/backup`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 8000,
        });
        if (res.data?.status === "success") {
          backendBackup = res.data.backup;
        }
      } catch (err) {
        console.warn("[Admin Backup]: Failed to fetch server backend backup.", err.message);
      }
    }

    const clientLocalStorage = {};
    if (typeof window !== "undefined") {
      const keysToBackup = [
        "bubbaflix_favorites",
        "bubbaflix_watch_progress",
        "bubbaflix_home_sections",
        "groq_filter_cam_telecine",
        "bubbaflix_theme",
        "simkl_client_id",
        "groq_api_key",
        "tmdb_token",
        "premiumize_api_key",
        "bubbaflix_stream_resolutions",
        "bubbaflix_exclude_low_quality",
      ];
      keysToBackup.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val !== null) {
          clientLocalStorage[k] = val;
        }
      });
    }

    return {
      appName: "BubbaFlix",
      backupVersion: "1.0.13",
      timestamp: new Date().toISOString(),
      backendBackup,
      clientLocalStorage,
    };
  } catch (err) {
    console.error("[Export Admin Backup Error]:", err);
    throw err;
  }
};

export const importAdminBackup = async (backupPayload) => {
  try {
    if (!backupPayload || typeof backupPayload !== "object") {
      throw new Error("Invalid backup structure");
    }

    // 1. Restore local storage items
    if (backupPayload.clientLocalStorage && typeof backupPayload.clientLocalStorage === "object") {
      Object.entries(backupPayload.clientLocalStorage).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
        }
      });
    }

    // 2. Restore backend settings and users via server API if token exists
    const baseUrl = getServerUrl();
    const token = typeof window !== "undefined" ? localStorage.getItem("bubbaflix_token") : null;
    if (token && backupPayload.backendBackup) {
      try {
        await axios.post(
          `${baseUrl}/api/admin/restore`,
          { backup: backupPayload.backendBackup },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 8000,
          }
        );
      } catch (e) {
        console.warn("[Admin Restore Warning]: Failed to push server backend backup.", e.message);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[Import Admin Backup Error]:", err);
    return { success: false, error: err.message };
  }
};
