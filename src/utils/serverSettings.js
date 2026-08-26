import axios from "axios";
import { applyTheme } from "./theme";
import { fetchUserSimklHistory } from "./simkl";
import { saveAioStreamsUrl, DEFAULT_AIOSTREAMS_URL } from "./aiostreams";

export const getServerUrl = () => {
  if (typeof window === "undefined") return "";
  const saved = localStorage.getItem("bubbaflix_server_url");
  if (saved && saved.trim().length > 0) {
    let url = saved.trim();
    if (url.endsWith("/")) url = url.slice(0, -1);
    return url;
  }
  return "";
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

export const fetchServerSettings = async () => {
  try {
    const baseUrl = getServerUrl();
    const res = await axios.get(`${baseUrl}/api/settings`, { timeout: 6000 });
    if (res.data?.status === "success" && res.data.settings) {
      const s = res.data.settings;

      // Sync settings to client cache
      if (s.theme) {
        localStorage.setItem("bubbaflix_theme", s.theme);
        applyTheme(s.theme);
      }
      if (s.aiostreams_url) {
        saveAioStreamsUrl(s.aiostreams_url);
      }
      if (s.simklClientId) localStorage.setItem("simkl_client_id", s.simklClientId);
      if (s.groqKey && s.groqKey.trim().length > 0) {
        localStorage.setItem("groq_api_key", s.groqKey.trim());
      }
      if (s.tmdbToken && s.tmdbToken.trim().length > 0) {
        localStorage.setItem("tmdb_token", s.tmdbToken.trim());
      }
      if (s.dispatcharrUrl) {
        let cleanUrl = s.dispatcharrUrl.trim().replace(/\/$/, "");
        if (cleanUrl && !/^https?:\/\//i.test(cleanUrl)) cleanUrl = `http://${cleanUrl}`;
        localStorage.setItem("dispatcharr_url", cleanUrl);
      }
      if (s.dispatcharrApiKey !== undefined) {
        localStorage.setItem("dispatcharr_api_key", (s.dispatcharrApiKey || "").trim());
      }
      if (s.stream_resolutions) localStorage.setItem("stream_resolutions", JSON.stringify(s.stream_resolutions));
      if (s.stream_exclude_low_quality !== undefined) {
        localStorage.setItem("stream_exclude_low_quality", JSON.stringify(s.stream_exclude_low_quality));
      }

      console.log("[Server Settings Sync] Successfully pulled backend server settings.");

      // Sync SIMKL account watch history if SIMKL Client ID is configured
      if (s.simklClientId) {
        fetchUserSimklHistory();
      }

      return s;
    }
  } catch (err) {
    console.warn("[Server Settings Sync Warning]: Unable to pull server settings. Operating in cached mode.", err.message);
  }
  return null;
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
      return { success: true, message: `Backend Server Connected! (${res.data.service || "BubbaFlix Engine"})` };
    }
    return { success: false, message: "Server responded, but health status failed." };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || err.message || "Failed to connect to backend server." };
  }
};
