import axios from "axios";
import { getServerUrl } from "./serverSettings";

export const getIptvStreamUrl = (streamId) => {
  if (!streamId) return "";
  const base = getServerUrl();
  return `${base}/api/iptv/stream/${streamId}.m3u8`;
};

export const fetchIptvConfig = async () => {
  try {
    const base = getServerUrl();
    const res = await axios.get(`${base}/api/iptv/config`, { timeout: 8000 });
    return res.data?.config || null;
  } catch (err) {
    console.error("[IPTV] Failed to fetch IPTV config:", err.message);
    return null;
  }
};

export const saveIptvConfig = async (config) => {
  try {
    const base = getServerUrl();
    const res = await axios.post(`${base}/api/iptv/config`, config, { timeout: 10000 });
    return { success: res.data?.status === "success", config: res.data?.config };
  } catch (err) {
    console.error("[IPTV] Failed to save IPTV config:", err.message);
    return { success: false, error: err.response?.data?.error || err.message };
  }
};

export const testIptvConnection = async ({ serverUrl, username, password }) => {
  try {
    const base = getServerUrl();
    const res = await axios.post(
      `${base}/api/iptv/test`,
      { serverUrl, username, password },
      { timeout: 15000 }
    );
    if (res.data?.status === "success") {
      return {
        success: true,
        userInfo: res.data.userInfo,
        serverInfo: res.data.serverInfo,
      };
    }
    return { success: false, error: res.data?.error || "Connection test failed." };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to connect to Xtream Codes server.",
    };
  }
};

export const fetchIptvGroups = async (forceRefresh = false) => {
  try {
    const base = getServerUrl();
    const res = await axios.get(`${base}/api/iptv/groups${forceRefresh ? "?refresh=true" : ""}`, {
      timeout: 15000,
    });
    return res.data?.groups || [];
  } catch (err) {
    console.error("[IPTV] Failed to fetch groups:", err.message);
    return [];
  }
};

export const fetchIptvChannels = async (includeAll = false) => {
  try {
    const base = getServerUrl();
    const url = `${base}/api/iptv/channels${includeAll ? "?all=true" : ""}`;
    const res = await axios.get(url, { timeout: 20000 });
    return res.data?.channels || [];
  } catch (err) {
    console.error("[IPTV] Failed to fetch channels:", err.message);
    return [];
  }
};

export const fetchIptvEpg = async (streamId) => {
  if (!streamId) return [];
  try {
    const base = getServerUrl();
    const res = await axios.get(`${base}/api/iptv/epg?stream_id=${encodeURIComponent(streamId)}`, {
      timeout: 8000,
    });
    return res.data?.epg || [];
  } catch (err) {
    console.error(`[IPTV] Failed to fetch EPG for stream ${streamId}:`, err.message);
    return [];
  }
};
