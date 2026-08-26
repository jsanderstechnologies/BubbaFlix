import { getServerUrl, updateServerSettings, fetchServerSettings } from "./serverSettings";

/**
 * Ensures Dispatcharr URL has a valid protocol prefix (e.g. http:// or https://)
 */
export const sanitizeDispatcharrUrl = (inputUrl) => {
  let url = (inputUrl || "").trim().replace(/\/$/, "");
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (!parsed.port && parsed.hostname !== "localhost") {
      url = `${parsed.protocol}//${parsed.hostname}:9191`;
    }
  } catch (e) {
    if (!url.includes(":", 7)) {
      url = `${url}:9191`;
    }
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

export const getDispatcharrConfigAsync = async () => {
  try {
    const serverSettings = await fetchServerSettings();
    if (serverSettings && serverSettings.dispatcharrUrl) {
      const cleanUrl = sanitizeDispatcharrUrl(serverSettings.dispatcharrUrl);
      const cleanKey = (serverSettings.dispatcharrApiKey || "").trim();
      if (typeof window !== "undefined") {
        localStorage.setItem("dispatcharr_url", cleanUrl);
        localStorage.setItem("dispatcharr_api_key", cleanKey);
      }
      return { url: cleanUrl, apiKey: cleanKey };
    }
  } catch (err) {
    // Fallback to localStorage
  }
  return getDispatcharrConfig();
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

/**
 * Universal JSON response normalizer for arrays, dictionaries, and nested objects
 */
const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  let obj = data;
  if (obj.response && typeof obj.response === "object") obj = obj.response;
  if (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)) obj = obj.data;

  const candidates = [
    obj.results,
    obj.channels,
    obj.epg,
    obj.events,
    obj.recordings,
    obj.items,
    obj.streams,
    obj.data,
    obj.programs
  ];

  for (const cand of candidates) {
    if (Array.isArray(cand)) return cand;
    if (cand && typeof cand === "object") {
      const vals = Object.values(cand);
      if (vals.length > 0) return vals;
    }
  }

  if (typeof obj === "object" && obj !== null) {
    const vals = Object.values(obj);
    if (vals.length > 0) return vals;
  }

  return [];
};

const normalizeChannel = (ch, serverUrl, apiKey) => {
  if (typeof ch !== "object" || ch === null) {
    return { id: String(ch), name: `Channel ${ch}`, stream_url: "" };
  }

  const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";
  const id = ch.id || ch.channel_id || ch.uuid || ch.number || ch.ch_id || ch.key || Math.random().toString(36).substring(7);
  const name = ch.name || ch.title || ch.display_name || ch.channel_name || ch.callsign || `Channel ${ch.number || id}`;

  let streamUrl = ch.stream_url || ch.url || ch.play_url || ch.m3u8 || ch.hls_url || ch.stream || ch.link || ch.stream_path || "";
  if (!streamUrl && serverUrl && id) {
    streamUrl = `${serverUrl}/stream/${id}${authQuery}`;
  } else if (streamUrl && apiKey && !streamUrl.includes("token=") && !streamUrl.includes("api_key=")) {
    streamUrl += streamUrl.includes("?") ? `&token=${encodeURIComponent(apiKey)}` : `?token=${encodeURIComponent(apiKey)}`;
  }

  const program = ch.current_program || ch.now_playing || ch.epg_now || ch.program || ch.title || ch.event || null;
  const programTitle = typeof program === "object" ? program?.title || program?.name || "Live Broadcast" : (typeof program === "string" ? program : "Live Broadcast");
  const programDesc = typeof program === "object" ? program?.description || program?.summary || "No guide detail available" : "No guide detail available";

  return {
    ...ch,
    id,
    name,
    number: ch.number || ch.channel_number || ch.ch_number || "",
    logo: ch.logo || ch.icon || ch.tvg_logo || ch.logo_url || ch.image || "",
    stream_url: streamUrl,
    current_program: typeof program === "object" ? program : null,
    now_playing: programTitle,
    program_description: programDesc
  };
};

/**
 * Robust Multi-Endpoint Dispatcharr Fetcher (Direct + Backend Proxy Fallback)
 */
const fetchDispatcharrWithFallback = async (endpointPaths) => {
  const { url, apiKey } = await getDispatcharrConfigAsync();
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
 * Fetch list of Live TV channels from Dispatcharr (probes channels + EPG combined endpoints).
 */
export const fetchDispatcharrChannels = async () => {
  const { data, serverUrl, apiKey } = await fetchDispatcharrWithFallback([
    "/api/channels/",
    "/api/v1/channels/",
    "/api/epg/",
    "/api/v1/epg/",
    "/api/channels",
    "/api/v1/channels",
    "/api/epg",
    "/api/v1/epg",
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
  const { url, apiKey } = await getDispatcharrConfigAsync();
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
  const { url, apiKey } = await getDispatcharrConfigAsync();
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
