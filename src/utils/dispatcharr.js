import { getServerUrl } from "./serverSettings";

/**
 * Dispatcharr API Service Utility for Live TV, Channels, EPG Guide & DVR Recordings.
 */
export const getDispatcharrConfig = () => {
  if (typeof window === "undefined") return { url: "http://192.168.1.100:9191", apiKey: "" };
  return {
    url: localStorage.getItem("dispatcharr_url") || "http://192.168.1.100:9191",
    apiKey: localStorage.getItem("dispatcharr_api_key") || ""
  };
};

export const setDispatcharrConfig = (url, apiKey = "") => {
  if (typeof window === "undefined") return;
  const cleanUrl = (url || "").trim().replace(/\/$/, "");
  localStorage.setItem("dispatcharr_url", cleanUrl);
  localStorage.setItem("dispatcharr_api_key", apiKey.trim());
};

const getProxyBase = () => {
  const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  return `${backend}/api/dispatcharr`;
};

/**
 * Fetch list of Live TV channels from Dispatcharr.
 */
export const fetchDispatcharrChannels = async () => {
  const proxyBase = getProxyBase();
  try {
    const res = await fetch(`${proxyBase}/api/channels/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || data.channels || [];
  } catch (err) {
    console.warn("[Dispatcharr Channels Error]:", err.message);
    // Return sample mock channels if Dispatcharr is offline or unreachable so UI remains interactive
    return [];
  }
};

/**
 * Fetch EPG Guide data for channels.
 */
export const fetchDispatcharrEpg = async () => {
  const proxyBase = getProxyBase();
  try {
    const res = await fetch(`${proxyBase}/api/epg/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || data.epg || [];
  } catch (err) {
    console.warn("[Dispatcharr EPG Error]:", err.message);
    return [];
  }
};

/**
 * Fetch recorded TV shows & movies from Dispatcharr DVR.
 */
export const fetchDispatcharrRecordings = async () => {
  const proxyBase = getProxyBase();
  try {
    const res = await fetch(`${proxyBase}/api/recordings/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : data.results || data.recordings || [];
  } catch (err) {
    console.warn("[Dispatcharr Recordings Error]:", err.message);
    return [];
  }
};

/**
 * Schedule a new recording in Dispatcharr.
 */
export const scheduleDispatcharrRecording = async (programData) => {
  const proxyBase = getProxyBase();
  try {
    const res = await fetch(`${proxyBase}/api/recordings/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(programData)
    });
    return res.ok;
  } catch (err) {
    console.error("[Dispatcharr Schedule Error]:", err);
    return false;
  }
};

/**
 * Delete a recording from Dispatcharr DVR.
 */
export const deleteDispatcharrRecording = async (recordingId) => {
  const proxyBase = getProxyBase();
  try {
    const res = await fetch(`${proxyBase}/api/recordings/${recordingId}/`, {
      method: "DELETE"
    });
    return res.ok;
  } catch (err) {
    console.error("[Dispatcharr Delete Recording Error]:", err);
    return false;
  }
};
