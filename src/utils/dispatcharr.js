import axios from "axios";
import { getServerUrl } from "./serverSettings";

/**
 * Get base URL for backend Dispatcharr proxy endpoints
 */
const getProxyBaseUrl = () => {
  const serverUrl = getServerUrl();
  return `${serverUrl}/api/dispatcharr`;
};

/**
 * Fetch all enabled Live TV channels from Dispatcharr
 */
export const fetchDispatcharrChannels = async () => {
  try {
    const baseUrl = getProxyBaseUrl();
    const res = await axios.get(`${baseUrl}/api/channels/channels/`, {
      params: { page_size: 1000 },
      timeout: 10000,
    });
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    if (data && Array.isArray(data.channels)) return data.channels;
    if (data && typeof data === "object") {
      const keys = Object.keys(data);
      for (const k of keys) {
        if (Array.isArray(data[k])) return data[k];
      }
    }
    return [];
  } catch (err) {
    console.warn("[Dispatcharr API] Failed to fetch channels:", err.message);
    const list = [];
    if (err.response?.status) list.errorStatus = err.response.status;
    return list;
  }
};

/**
 * Fetch EPG program schedule from Dispatcharr (combines /api/epg/grid/ and /api/epg/programs/)
 */
export const fetchDispatcharrEpgPrograms = async (params = {}) => {
  const baseUrl = getProxyBaseUrl();
  let allPrograms = [];
  let lastErrorStatus = null;

  // 1. Try /api/epg/grid/ (Dispatcharr native EPG grid)
  try {
    const resGrid = await axios.get(`${baseUrl}/api/epg/grid/`, { timeout: 8000 });
    const dataGrid = resGrid.data;
    const gridPrograms = Array.isArray(dataGrid)
      ? dataGrid
      : dataGrid?.results || dataGrid?.programs || [];
    if (Array.isArray(gridPrograms)) {
      allPrograms.push(...gridPrograms);
    }
  } catch (err) {
    if (err.response?.status) lastErrorStatus = err.response.status;
    console.warn("[Dispatcharr API] /api/epg/grid/ attempt:", err.message);
  }

  // 2. Try /api/epg/programs/
  try {
    const resProg = await axios.get(`${baseUrl}/api/epg/programs/`, {
      params: { page_size: 1000, ...params },
      timeout: 10000,
    });
    const dataProg = resProg.data;
    const progList = Array.isArray(dataProg)
      ? dataProg
      : dataProg?.results || dataProg?.programs || [];
    if (Array.isArray(progList)) {
      allPrograms.push(...progList);
    }
  } catch (err) {
    if (err.response?.status) lastErrorStatus = err.response.status;
    console.warn("[Dispatcharr API] /api/epg/programs/ attempt:", err.message);
  }

  if (allPrograms.length === 0) {
    const list = [];
    if (lastErrorStatus) list.errorStatus = lastErrorStatus;
    return list;
  }

  // Deduplicate programs by ID or (channel + start_time + title)
  const seen = new Set();
  const deduped = [];
  allPrograms.forEach((p) => {
    if (!p) return;
    const chId = p.channel && typeof p.channel === "object" ? p.channel.id : p.channel;
    const key = p.id || `${chId}_${p.start_time}_${p.title}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  });

  return deduped;
};

/**
 * Fetch all DVR recordings (completed, in-progress, upcoming) from Dispatcharr
 */
export const fetchDispatcharrRecordings = async () => {
  try {
    const baseUrl = getProxyBaseUrl();
    const res = await axios.get(`${baseUrl}/api/channels/recordings/`, { timeout: 10000 });
    const data = res.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  } catch (err) {
    console.warn("[Dispatcharr API] Failed to fetch DVR recordings:", err.message);
    return [];
  }
};

/**
 * Schedule a one-time program recording on Dispatcharr
 */
export const createOneTimeRecording = async ({ programId, channelId, title, startTime, endTime }) => {
  try {
    const baseUrl = getProxyBaseUrl();
    const payload = {
      program_id: programId,
      channel: channelId,
      title: title || "Recorded Program",
      start_time: startTime,
      end_time: endTime,
    };
    const res = await axios.post(`${baseUrl}/api/channels/recordings/`, payload, { timeout: 10000 });
    return { success: true, data: res.data };
  } catch (err) {
    console.error("[Dispatcharr API] Failed to create one-time recording:", err);
    return {
      success: false,
      message: err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to schedule recording.",
    };
  }
};

/**
 * Schedule a recurring series recording rule on Dispatcharr
 */
export const createSeriesRecordingRule = async ({ programTitle, channelId, tvgId }) => {
  try {
    const baseUrl = getProxyBaseUrl();
    const payload = {
      title: programTitle,
      channel: channelId,
      tvg_id: tvgId,
      record_all: true,
    };
    const res = await axios.post(`${baseUrl}/api/channels/recordings/`, payload, { timeout: 10000 });
    return { success: true, data: res.data };
  } catch (err) {
    console.error("[Dispatcharr API] Failed to create series recording rule:", err);
    return {
      success: false,
      message: err.response?.data?.detail || err.response?.data?.message || err.message || "Failed to schedule series recording.",
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
export const getChannelStreamUrl = (channelId) => {
  const baseUrl = getProxyBaseUrl();
  return `${baseUrl}/proxy/ts/stream/${channelId}`;
};

export const getRecordingStreamUrl = (recording) => {
  if (!recording) return "";
  const baseUrl = getProxyBaseUrl();
  if (recording.file_url) return recording.file_url;
  if (recording.stream_url) return recording.stream_url;
  return `${baseUrl}/api/channels/recordings/${recording.id}/file/`;
};
