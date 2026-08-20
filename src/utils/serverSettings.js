import axios from "axios";
import { applyTheme } from "./theme";
import { fetchUserSimklHistory } from "./simkl";

export const fetchServerSettings = async () => {
  try {
    const res = await axios.get("/api/settings", { timeout: 6000 });
    if (res.data?.status === "success" && res.data.settings) {
      const s = res.data.settings;

      // Sync settings to client cache (except zoom which remains per-device!)
      if (s.theme) {
        localStorage.setItem("bubbaflix_theme", s.theme);
        applyTheme(s.theme);
      }
      if (s.simklClientId) localStorage.setItem("simkl_client_id", s.simklClientId);
      if (s.simklToken) localStorage.setItem("simkl_access_token", s.simklToken);
      if (s.premiumizeKey) localStorage.setItem("premiumize_api_key", s.premiumizeKey);
      if (s.groqKey) localStorage.setItem("groq_api_key", s.groqKey);
      if (s.tmdbToken && s.tmdbToken.trim().length > 0) {
        localStorage.setItem("tmdb_token", s.tmdbToken.trim());
      }
      if (s.bitsearchKey) localStorage.setItem("bitsearch_api_key", s.bitsearchKey);
      if (s.stream_resolutions) localStorage.setItem("stream_resolutions", JSON.stringify(s.stream_resolutions));
      if (s.stream_codecs) localStorage.setItem("stream_codecs", JSON.stringify(s.stream_codecs));
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
    console.log("[Server Settings Sync] Pushing updated settings to backend server:", settingsPartial);
    const res = await axios.post("/api/settings", settingsPartial, { timeout: 6000 });
    if (res.data?.status === "success") {
      return { success: true, settings: res.data.settings };
    }
  } catch (err) {
    console.error("[Server Settings Sync Error]: Failed to push settings to server.", err.message);
  }
  return { success: false };
};
