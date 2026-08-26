import { getServerUrl, updateServerSettings } from "./serverSettings";

/**
 * Ensures Dispatcharr URL has a valid protocol prefix (e.g. http:// or https://)
 */
export const sanitizeDispatcharrUrl = (inputUrl) => {
  let url = (inputUrl || "").trim().replace(/\/$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  return url;
};

/**
 * Dispatcharr API Service Utility for Live TV, Channels, EPG Guide & DVR Recordings.
 */
export const getDispatcharrConfig = () => {
  if (typeof window === "undefined") return { url: "http://192.168.1.100:9191", apiKey: "" };
  const rawUrl = localStorage.getItem("dispatcharr_url") || "http://192.168.1.100:9191";
  return {
    url: sanitizeDispatcharrUrl(rawUrl),
    apiKey: localStorage.getItem("dispatcharr_api_key") || ""
  };
};

export const setDispatcharrConfig = (url, apiKey = "") => {
  if (typeof window === "undefined") return;
  const cleanUrl = sanitizeDispatcharrUrl(url);
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
  return (
    data.results ||
    data.channels ||
    data.epg ||
    data.events ||
    data.recordings ||
    data.data ||
    data.items ||
    data.streams ||
    []
  );
};

const normalizeChannel = (ch, serverUrl, apiKey) => {
  const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";
  const id = ch.id || ch.channel_id || ch.uuid || ch.number || Math.random().toString(36).substring(7);
  const name = ch.name || ch.title || ch.display_name || `Channel ${ch.number || id}`;

  let streamUrl = ch.stream_url || ch.url || ch.play_url || ch.m3u8 || ch.hls_url || ch.stream || ch.link || "";
  if (!streamUrl && serverUrl && id) {
    streamUrl = `${serverUrl}/stream/${id}${authQuery}`;
  } else if (streamUrl && apiKey && !streamUrl.includes("token=") && !streamUrl.includes("api_key=")) {
    streamUrl += streamUrl.includes("?") ? `&token=${encodeURIComponent(apiKey)}` : `?token=${encodeURIComponent(apiKey)}`;
  }

  return {
    ...ch,
    id,
    name,
    number: ch.number || ch.channel_number || ch.ch_number || "",
    logo: ch.logo || ch.icon || ch.tvg_logo || ch.logo_url || "",
    stream_url: streamUrl,
    now_playing: ch.now_playing || ch.current_program?.title || ch.title || "Live Broadcast"
  };
};

/**
 * Robust Multi-Endpoint Dispatcharr Fetcher (Direct + Backend Proxy Fallback)
 */
const fetchDispatcharrWithFallback = async (endpointPaths) => {
  const { url, apiKey } = getDispatcharrConfig();
  const cleanServerUrl = sanitizeDispatcharrUrl(url);
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
          if (normalized.length > 0) return { data: normalized, serverUrl: cleanServerUrl, apiKey };
        }
      } catch (err) {
        // Direct fetch failed, continue to proxy fallback
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
        if (normalized.length > 0) return { data: normalized, serverUrl: cleanServerUrl, apiKey };
      }
    } catch (err) {
      console.warn(`[Dispatcharr Proxy Fetch Warning] ${path}:`, err.message);
    }
  }

  return { data: [], serverUrl: cleanServerUrl, apiKey };
};

/**
 * Fetch list of Live TV channels from Dispatcharr.
 */
export const fetchDispatcharrChannels = async () => {
  const { data, serverUrl, apiKey } = await fetchDispatcharrWithFallback([
    "/api/channels/",
    "/api/v1/channels/",
    "/api/channels",
    "/api/v1/channels",
    "/channels/",
    "/channels"
  ]);

  return data.map((ch) => normalizeChannel(ch, serverUrl, apiKey));
};

/**
 * Fetch EPG Guide data for channels.
 */
export const fetchDispatcharrEpg = async () => {
  const { data } = await fetchDispatcharrWithFallback([
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

  return data;
};

/**
 * Fetch recorded TV shows & movies from Dispatcharr DVR.
 */
export const fetchDispatcharrRecordings = async () => {
  const { data, serverUrl, apiKey } = await fetchDispatcharrWithFallback([
    "/api/recordings/",
    "/api/v1/recordings/",
    "/api/recordings",
    "/api/v1/recordings",
    "/recordings/",
    "/recordings"
  ]);

  return data.map((rec) => {
    const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";
    let streamUrl = rec.stream_url || rec.url || rec.play_url || rec.file_path || "";
    if (!streamUrl && serverUrl && rec.id) {
      streamUrl = `${serverUrl}/recordings/${rec.id}/stream${authQuery}`;
    }
    return {
      ...rec,
      title: rec.title || rec.name || "DVR Recording",
      stream_url: streamUrl
    };
  });
};

/**
 * Schedule a new recording in Dispatcharr.
 */
export const scheduleDispatcharrRecording = async (programData) => {
  const { url, apiKey } = getDispatcharrConfig();
  const cleanServerUrl = sanitizeDispatcharrUrl(url);
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
  const cleanServerUrl = sanitizeDispatcharrUrl(url);
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
