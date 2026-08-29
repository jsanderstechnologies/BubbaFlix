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
 * Fetch EPG program schedule from Dispatcharr (combines /api/epg/grid/ and /api/epg/programs/)
 */
export const fetchDispatcharrEpgPrograms = async (params = {}) => {
  const baseUrl = getProxyBaseUrl();
  let allPrograms = [];
  let lastErrorStatus = null;

  // 1. Try /api/epg/grid/ (Dispatcharr native EPG grid)
  try {
    const resGrid = await axios.get(`${baseUrl}/api/epg/grid/`, { timeout: 8000 });
    const gridPrograms = extractAllProgramsFromResponse(resGrid.data);
    if (gridPrograms.length > 0) {
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
    const progList = extractAllProgramsFromResponse(resProg.data);
    if (progList.length > 0) {
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
    const data = res.data;
    const list = Array.isArray(data) ? data : data?.results || data?.recordings || [];
    if (Array.isArray(list)) recordingsList.push(...list);
  } catch (err) {
    console.warn("[Dispatcharr API] Failed to fetch DVR recordings:", err.message);
  }

  // 2. Fetch /api/channels/series-rules/?page_size=1000
  try {
    const resRules = await axios.get(`${baseUrl}/api/channels/series-rules/`, {
      params: { page_size: 1000 },
      timeout: 8000,
    });
    const dataRules = resRules.data;
    const rulesList = Array.isArray(dataRules) ? dataRules : dataRules?.results || dataRules?.rules || [];
    if (Array.isArray(rulesList)) {
      rulesList.forEach((rule) => {
        recordingsList.push({
          id: rule.id || `rule-${rule.title}`,
          title: rule.title || rule.program_title || "Series Recording Rule",
          status: "scheduled",
          isSeriesRule: true,
          start_time: rule.created_at || new Date().toISOString(),
          description: `Series DVR rule set for ${rule.title || "program"}.`,
        });
      });
    }
  } catch (err) {
    console.warn("[Dispatcharr API] Series rules fetch attempt:", err.message);
  }

  return recordingsList;
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
