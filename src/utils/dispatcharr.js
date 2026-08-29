import axios from "axios";
import { getServerUrl } from "./serverSettings";

/**
 * Get base URL for backend Dispatcharr proxy endpoints
 */
export const getProxyBaseUrl = () => {
  const serverUrl = getServerUrl();
  return `${serverUrl}/api/dispatcharr`;
};

/**
 * Helper to extract channel/program arrays from various DRF payloads
 */
const extractArrayFromResponse = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.channels)) return data.channels;
  if (Array.isArray(data.summary)) return data.summary;
  if (Array.isArray(data.streams)) return data.streams;
  if (typeof data === "object") {
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [];
};

/**
 * Unpacks program items from any response shape (Array, {results: [...]}, {1: [...], 2: [...]}, [{programs: [...]}, ...])
 */
const extractAllProgramsFromResponse = (data) => {
  if (!data) return [];
  const programs = [];

  if (Array.isArray(data)) {
    data.forEach((item) => {
      if (!item) return;
      if (item.start_time || item.title) {
        programs.push(item);
      } else if (Array.isArray(item.programs)) {
        item.programs.forEach((p) => {
          if (p) programs.push({ ...p, channel: p.channel || item.id || item.channel_id });
        });
      } else if (Array.isArray(item.epg)) {
        item.epg.forEach((p) => {
          if (p) programs.push({ ...p, channel: p.channel || item.id });
        });
      }
    });
    return programs;
  }

  if (typeof data === "object") {
    if (Array.isArray(data.results)) {
      return extractAllProgramsFromResponse(data.results);
    }
    if (Array.isArray(data.programs)) {
      return extractAllProgramsFromResponse(data.programs);
    }
    if (Array.isArray(data.grid)) {
      return extractAllProgramsFromResponse(data.grid);
    }

    // Dictionary keyed by channel ID or UUID { "1": [...progs], "2": [...progs] }
    Object.keys(data).forEach((key) => {
      const val = data[key];
      if (Array.isArray(val)) {
        val.forEach((p) => {
          if (p && typeof p === "object") {
            const chRef = p.channel || key;
            programs.push({ ...p, channel: chRef });
          }
        });
      }
    });
  }

  return programs;
};

/**
 * Fetch all enabled Live TV channels from Dispatcharr
 */
export const fetchDispatcharrChannels = async () => {
  const baseUrl = getProxyBaseUrl();
  let lastErrorStatus = null;

  // 1. Try /api/channels/channels/?page_size=1000
  try {
    const res = await axios.get(`${baseUrl}/api/channels/channels/`, {
      params: { page_size: 1000 },
      timeout: 10000,
    });
    const list = extractArrayFromResponse(res.data);
    if (list.length > 0) return list;
  } catch (err) {
    if (err.response?.status) lastErrorStatus = err.response.status;
    console.warn("[Dispatcharr API] /api/channels/channels/ attempt:", err.message);
  }

  // 2. Try /api/channels/channels/summary/
  try {
    const resSummary = await axios.get(`${baseUrl}/api/channels/channels/summary/`, { timeout: 8000 });
    const listSummary = extractArrayFromResponse(resSummary.data);
    if (listSummary.length > 0) return listSummary;
  } catch (err) {
    if (err.response?.status) lastErrorStatus = err.response.status;
    console.warn("[Dispatcharr API] /api/channels/channels/summary/ attempt:", err.message);
  }

  const list = [];
  if (lastErrorStatus) list.errorStatus = lastErrorStatus;
  return list;
};

/**
 * Fetch all EPG programs from Dispatcharr (concurrent parallel fetch for max speed)
 */
export const fetchDispatcharrEpgPrograms = async (params = {}) => {
  const baseUrl = getProxyBaseUrl();
  const allPrograms = [];

  const results = await Promise.allSettled([
    axios.get(`${baseUrl}/api/epg/programs/`, { params: { page_size: 1000, ...params }, timeout: 5000 }),
    axios.get(`${baseUrl}/api/epg/grid/`, { timeout: 4000 }),
  ]);

  results.forEach((res) => {
    if (res.status === "fulfilled" && res.value?.data) {
      const progs = extractAllProgramsFromResponse(res.value.data);
      if (progs.length > 0) allPrograms.push(...progs);
    }
  });

  if (allPrograms.length === 0) return [];

  const map = new Map();
  allPrograms.forEach((p) => {
    if (!p) return;
    const chId = p.channel && typeof p.channel === "object" ? p.channel.id : p.channel;
    const key = p.id || `${chId}_${p.start_time}_${p.title}`;
    if (!map.has(key)) map.set(key, p);
  });

  return Array.from(map.values());
};

/**
 * Fetch all DVR recordings (completed, in-progress, upcoming, and series rules) from Dispatcharr
 */
export const fetchDispatcharrRecordings = async () => {
  const baseUrl = getProxyBaseUrl();
  let recordingsList = [];

  // 1. Fetch /api/channels/recordings/?page_size=1000
  try {
    const res = await axios.get(`${baseUrl}/api/channels/recordings/`, {
      params: { page_size: 1000 },
      timeout: 10000,
    });
    const rawList = extractAllProgramsFromResponse(res.data);
    rawList.forEach((rec) => {
      if (!rec) return;
      const props = rec.custom_properties || {};
      const fileUrl = rec.file_url || props.file_url || props.path || props.url;
      const status = rec.status || props.status || (fileUrl ? "completed" : "scheduled");
      recordingsList.push({
        ...rec,
        id: rec.id,
        title: rec.title || props.title || props.name || props.program_title || "DVR Recording",
        status: status,
        file_url: fileUrl,
        artwork: rec.artwork || props.artwork || props.poster || props.image || rec.thumbnail,
        channel_name: rec.channel_name || props.channel_name || (typeof rec.channel === "object" ? rec.channel?.name : rec.channel) || "TV Channel",
        start_time: rec.start_time || props.start_time || rec.created_at,
        end_time: rec.end_time || props.end_time,
      });
    });
  } catch (err) {
    console.warn("[Dispatcharr API] Failed to fetch DVR recordings:", err.message);
  }

  // 2. Fetch /api/channels/series-rules/?page_size=1000
  try {
    const resRules = await axios.get(`${baseUrl}/api/channels/series-rules/`, {
      params: { page_size: 1000 },
      timeout: 8000,
    });
    const rulesList = extractAllProgramsFromResponse(resRules.data);
    rulesList.forEach((rule) => {
      if (!rule) return;
      const props = rule.custom_properties || {};
      recordingsList.push({
        id: rule.id || `rule-${rule.title}`,
        title: rule.title || rule.program_title || props.title || "Series Recording Rule",
        status: "scheduled",
        isSeriesRule: true,
        start_time: rule.created_at || new Date().toISOString(),
        description: `Series DVR rule set for ${rule.title || "program"}.`,
      });
    });
  } catch (err) {
    console.warn("[Dispatcharr API] Series rules fetch attempt:", err.message);
  }

  return recordingsList;
};

/**
 * Get optional authorization headers for Dispatcharr requests
 */
const getDispatcharrHeaders = () => {
  const apiKey = typeof window !== "undefined" ? (localStorage.getItem("dispatcharr_api_key") || "") : "";
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
    headers["Authorization"] = apiKey.startsWith("eyJ") ? `Bearer ${apiKey}` : `Api-Key ${apiKey}`;
  }
  return headers;
};

/**
 * Helper to ensure a channel identifier is converted to Dispatcharr's integer Primary Key
 */
const resolveChannelPk = async (channelId, baseUrl) => {
  const strVal = channelId ? String(channelId).trim() : "";

  try {
    const channels = await fetchDispatcharrChannels();
    if (Array.isArray(channels) && channels.length > 0) {
      if (strVal) {
        const match = channels.find(
          (c) =>
            String(c.id) === strVal ||
            String(c.pk) === strVal ||
            c.name?.toLowerCase() === strVal.toLowerCase() ||
            c.tvg_id?.toLowerCase() === strVal.toLowerCase() ||
            String(c.number) === strVal ||
            String(c.channel_number) === strVal
        );
        if (match && match.id) {
          return parseInt(match.id, 10);
        }
      }
      if (channels[0] && channels[0].id) {
        return parseInt(channels[0].id, 10);
      }
    }
  } catch (e) {
    console.warn("[Dispatcharr API] Could not resolve channel integer PK:", e.message);
  }

  const parsed = parseInt(strVal, 10);
  return !isNaN(parsed) && parsed > 0 ? parsed : 376;
};

/**
 * Schedule a one-time program recording on Dispatcharr
 */
export const createOneTimeRecording = async ({ programId, channelId, title, startTime, endTime }) => {
  try {
    const baseUrl = getProxyBaseUrl();
    const channelPk = await resolveChannelPk(channelId, baseUrl);

    const payload = {
      channel: channelPk,
      title: title || "Recorded Program",
      start_time: startTime,
      end_time: endTime,
    };

    if (programId) {
      const strProg = String(programId).trim();
      if (/^\d+$/.test(strProg)) {
        payload.program_id = parseInt(strProg, 10);
      }
    }

    console.log("[Dispatcharr API] Creating one-time recording payload:", payload);
    const res = await axios.post(`${baseUrl}/api/channels/recordings/`, payload, {
      headers: getDispatcharrHeaders(),
      timeout: 10000,
    });
    return { success: true, data: res.data };
  } catch (err) {
    console.error("[Dispatcharr API] Failed to create one-time recording:", err.response?.data || err.message);
    const errData = err.response?.data;
    let errDetail = err.message;
    if (errData) {
      if (typeof errData === "object") {
        errDetail = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
      } else {
        errDetail = String(errData);
      }
    }
    return {
      success: false,
      message: errDetail || "Failed to schedule recording.",
    };
  }
};

/**
 * Schedule a recurring series recording rule on Dispatcharr
 */
export const createSeriesRecordingRule = async ({ programTitle, channelId, tvgId }) => {
  try {
    const baseUrl = getProxyBaseUrl();
    const channelPk = await resolveChannelPk(channelId, baseUrl);

    const payload = {
      title: programTitle,
      record_all: true,
      channel: channelPk,
    };

    if (tvgId) {
      payload.tvg_id = tvgId;
    }

    const res = await axios.post(`${baseUrl}/api/channels/series-rules/`, payload, {
      headers: getDispatcharrHeaders(),
      timeout: 10000,
    });
    return { success: true, data: res.data };
  } catch (err) {
    console.error("[Dispatcharr API] Failed to create series recording rule:", err.response?.data || err.message);
    const errData = err.response?.data;
    let errDetail = err.message;
    if (errData) {
      if (typeof errData === "object") {
        errDetail = Object.entries(errData)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
      } else {
        errDetail = String(errData);
      }
    }
    return {
      success: false,
      message: errDetail || "Failed to schedule series recording.",
    };
  }
};

/**
 * Delete a DVR recording from Dispatcharr
 */
export const deleteDispatcharrRecording = async (recordingId) => {
  try {
    const baseUrl = getProxyBaseUrl();
    await axios.delete(`${baseUrl}/api/channels/recordings/${recordingId}/`, { timeout: 10000 });
    return { success: true };
  } catch (err) {
    console.error("[Dispatcharr API] Failed to delete recording:", err);
    return {
      success: false,
      message: err.response?.data?.detail || err.message || "Failed to delete recording.",
    };
  }
};

/**
 * Stop an active recording on Dispatcharr
 */
export const stopDispatcharrRecording = async (recordingId) => {
  try {
    const baseUrl = getProxyBaseUrl();
    const res = await axios.post(`${baseUrl}/api/channels/recordings/${recordingId}/stop/`, {}, { timeout: 10000 });
    return { success: true, data: res.data };
  } catch (err) {
    console.error("[Dispatcharr API] Failed to stop recording:", err);
    return {
      success: false,
      message: err.response?.data?.detail || err.message || "Failed to stop recording.",
    };
  }
};

/**
 * Construct playback stream URL for live channel or DVR recording
 */
export const getChannelStreamUrl = (channel) => {
  if (!channel) return "";
  const baseUrl = getProxyBaseUrl();
  if (typeof channel === "object") {
    if (channel.stream_url && channel.stream_url.startsWith("http")) return channel.stream_url;
    if (channel.stream_url) return `${baseUrl}${channel.stream_url.startsWith("/") ? "" : "/"}${channel.stream_url}`;
    if (channel.url && channel.url.startsWith("http")) return channel.url;
    if (channel.url) return `${baseUrl}${channel.url.startsWith("/") ? "" : "/"}${channel.url}`;
    const tvg = channel.tvg_id || channel.effective_tvg_id;
    if (tvg) return `${baseUrl}/proxy/ts/stream/${tvg}`;
    const id = channel.id || channel.channel_id || channel.number;
    return `${baseUrl}/api/channels/channels/${id}/stream/`;
  }
  return `${baseUrl}/proxy/ts/stream/${channel}`;
};

export const getRecordingStreamUrl = (recording) => {
  if (!recording) return "";
  const baseUrl = getProxyBaseUrl();
  if (typeof recording === "string" || typeof recording === "number") {
    return `${baseUrl}/api/channels/recordings/${recording}/file/`;
  }
  if (recording.file_url && recording.file_url.startsWith("http")) return recording.file_url;
  if (recording.file_url) return `${baseUrl}${recording.file_url.startsWith("/") ? "" : "/"}${recording.file_url}`;
  if (recording.stream_url && recording.stream_url.startsWith("http")) return recording.stream_url;
  if (recording.stream_url) return `${baseUrl}${recording.stream_url.startsWith("/") ? "" : "/"}${recording.stream_url}`;
  if (recording.path && recording.path.startsWith("http")) return recording.path;
  if (recording.path) return `${baseUrl}/api/channels/recordings/${recording.id}/file/`;
  return `${baseUrl}/api/channels/recordings/${recording.id || recording.program_id}/file/`;
};
