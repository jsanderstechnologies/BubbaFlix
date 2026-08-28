import axios from "axios";
import { applyTheme } from "./theme";
import { fetchUserSimklHistory } from "./simkl";
import { saveAioStreamsUrl, DEFAULT_AIOSTREAMS_URL } from "./aiostreams";

export const DEFAULT_SERVER_URL = "https://bubbaflix.sanders-technologies.net";

export const getServerUrl = () => {
  if (typeof window === "undefined") return DEFAULT_SERVER_URL;
  const saved = localStorage.getItem("bubbaflix_server_url");
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
    if (s.aiostreams_url) {
      saveAioStreamsUrl(s.aiostreams_url);
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
    if (s.stream_resolutions) {
      localStorage.setItem("stream_resolutions", JSON.stringify(s.stream_resolutions));
    }
    if (s.stream_exclude_low_quality !== undefined) {
      localStorage.setItem("stream_exclude_low_quality", JSON.stringify(s.stream_exclude_low_quality));
    }

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
