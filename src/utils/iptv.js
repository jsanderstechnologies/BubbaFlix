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

export const testIptvConnection = async ({ serverUrl, username, password, epgUrl }) => {
  try {
    const base = getServerUrl();
    const res = await axios.post(
      `${base}/api/iptv/test`,
      { serverUrl, username, password, epgUrl },
      { timeout: 65000 }
    );
    if (res.data?.status === "success") {
      return {
        success: true,
        channelCount: res.data.channelCount,
        groupCount: res.data.groupCount,
        epgGuideCount: res.data.epgGuideCount,
        message: res.data.message,
        userInfo: res.data.userInfo,
      };
    }
    return { success: false, error: res.data?.error || "Connection test failed." };
  } catch (err) {
    return {
      success: false,
      error: err.response?.data?.error || err.message || "Failed to connect to IPTV provider.",
    };
  }
};

export const fetchIptvGroups = async (forceRefresh = false) => {
  try {
    const base = getServerUrl();
    const res = await axios.get(`${base}/api/iptv/groups${forceRefresh ? "?refresh=true" : ""}`, {
      timeout: 65000,
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
    const res = await axios.get(url, { timeout: 65000 });
    return res.data?.channels || [];
  } catch (err) {
    console.error("[IPTV] Failed to fetch channels:", err.message);
    return [];
  }
};

export const fetchIptvEpg = async (streamId, tvgId = "", channelName = "") => {
  if (!streamId && !tvgId) return [];
  try {
    const base = getServerUrl();
    const params = new URLSearchParams();
    if (streamId) params.append("stream_id", streamId);
    if (tvgId) params.append("tvg_id", tvgId);
    if (channelName) params.append("name", channelName);

    const res = await axios.get(`${base}/api/iptv/epg?${params.toString()}`, {
      timeout: 10000,
    });
    return res.data?.epg || [];
  } catch (err) {
    console.error(`[IPTV] Failed to fetch EPG for stream ${streamId || tvgId}:`, err.message);
    return [];
  }
};

export const fetchIptvEpgBatch = async (channels = []) => {
  if (!channels || channels.length === 0) return {};
  try {
    const base = getServerUrl();
    const payload = {
      channels: channels.map((c) => ({
        stream_id: String(c.stream_id),
        tvg_id: c.epg_channel_id || c.tvg_id || "",
        name: c.name || c.original_name || "",
      })),
    };
    const res = await axios.post(`${base}/api/iptv/epg/batch`, payload, {
      timeout: 12000,
    });
    return res.data?.epg || {};
  } catch (err) {
    console.error("[IPTV] Failed to fetch batch EPG:", err.message);
    return {};
  }
};
