import { getServerUrl, updateServerSettings } from "./serverSettings";

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
  const cleanKey = (apiKey || "").trim();
  localStorage.setItem("dispatcharr_url", cleanUrl);
  localStorage.setItem("dispatcharr_api_key", cleanKey);

  // Sync to backend settings.json immediately
  updateServerSettings({
    dispatcharrUrl: cleanUrl,
    dispatcharrApiKey: cleanKey
  });
};

const getProxyBase = () => {
  const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  return `${backend}/api/dispatcharr`;
};

const getHeaders = (apiKey) => {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    headers["X-API-Key"] = apiKey;
  }
  return headers;
};

const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results || data.channels || data.epg || data.events || data.recordings || data.data || data.items || [];
};

/**
 * Robust Multi-Endpoint Dispatcharr Fetcher (Direct + Backend Proxy Fallback)
 */
const fetchDispatcharrWithFallback = async (endpointPaths) => {
  const { url, apiKey } = getDispatcharrConfig();
  const cleanServerUrl = (url || "").replace(/\/$/, "");
  const proxyBase = getProxyBase();
  const headers = getHeaders(apiKey);

  const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";

  // Strategy A: Direct fetch to user's Dispatcharr IP/URL
  if (cleanServerUrl) {
    for (const path of endpointPaths) {
      try {
        const fullUrl = `${cleanServerUrl}${path}${authQuery}`;
        const res = await fetch(fullUrl, { method: "GET", headers });
        if (res.ok) {
          const json = await res.json();
          const normalized = normalizeArray(json);
          if (normalized.length > 0) return normalized;
        }
      } catch (err) {
        // Direct fetch failed (e.g. CORS or network restriction), continue to proxy fallback
      }
    }
  }

  // Strategy B: Proxy fetch via Node transcoder backend
  for (const path of endpointPaths) {
    try {
      const proxyUrl = `${proxyBase}${path}${authQuery}`;
      const res = await fetch(proxyUrl, { method: "GET", headers });
      if (res.ok) {
        const json = await res.json();
        const normalized = normalizeArray(json);
        if (normalized.length > 0) return normalized;
      }
    } catch (err) {
      console.warn(`[Dispatcharr Proxy Fetch Warning] ${path}:`, err.message);
    }
  }

  return [];
};

/**
 * Fetch list of Live TV channels from Dispatcharr.
 */
export const fetchDispatcharrChannels = async () => {
  return await fetchDispatcharrWithFallback([
    "/api/channels/",
    "/api/v1/channels/",
    "/api/channels",
    "/api/v1/channels",
    "/channels/",
    "/channels"
  ]);
};

/**
 * Fetch EPG Guide data for channels.
 */
export const fetchDispatcharrEpg = async () => {
  return await fetchDispatcharrWithFallback([
    "/api/epg/",
    "/api/v1/epg/",
    "/api/epg",
    "/api/v1/epg",
    "/api/epg/events/",
    "/api/v1/epg/events/",
    "/api/guide/",
    "/api/v1/guide/",
    "/epg/",
    "/epg"
  ]);
};

/**
 * Fetch recorded TV shows & movies from Dispatcharr DVR.
 */
export const fetchDispatcharrRecordings = async () => {
  return await fetchDispatcharrWithFallback([
    "/api/recordings/",
    "/api/v1/recordings/",
    "/api/recordings",
    "/api/v1/recordings",
    "/recordings/",
    "/recordings"
  ]);
};

/**
 * Schedule a new recording in Dispatcharr.
 */
export const scheduleDispatcharrRecording = async (programData) => {
  const { url, apiKey } = getDispatcharrConfig();
  const cleanServerUrl = (url || "").replace(/\/$/, "");
  const proxyBase = getProxyBase();
  const headers = getHeaders(apiKey);

  const targets = [
    `${cleanServerUrl}/api/recordings/`,
    `${proxyBase}/api/recordings/`,
    `${cleanServerUrl}/api/v1/recordings/`,
    `${proxyBase}/api/v1/recordings/`
  ];

  for (const target of targets) {
    if (!target.startsWith("http")) continue;
    try {
      const res = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify(programData)
      });
      if (res.ok) return true;
    } catch (err) {
      // Continue to next target
    }
  }
  return false;
};

/**
 * Delete a recording from Dispatcharr DVR.
 */
export const deleteDispatcharrRecording = async (recordingId) => {
  const { url, apiKey } = getDispatcharrConfig();
  const cleanServerUrl = (url || "").replace(/\/$/, "");
  const proxyBase = getProxyBase();
  const headers = getHeaders(apiKey);

  const targets = [
    `${cleanServerUrl}/api/recordings/${recordingId}/`,
    `${proxyBase}/api/recordings/${recordingId}/`,
    `${cleanServerUrl}/api/v1/recordings/${recordingId}/`,
    `${proxyBase}/api/v1/recordings/${recordingId}/`
  ];

  for (const target of targets) {
    if (!target.startsWith("http")) continue;
    try {
      const res = await fetch(target, { method: "DELETE", headers });
      if (res.ok) return true;
    } catch (err) {
      // Continue to next target
    }
  }
  return false;
};
