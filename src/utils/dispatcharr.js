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
  if (typeof window === "undefined") return { url: "http://192.168.10.3:9191", apiKey: "" };
  const rawUrl = localStorage.getItem("dispatcharr_url") || "http://192.168.10.3:9191";
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

export const getProxyBase = () => {
  const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  return `${backend}/api/dispatcharr`;
};

/**
 * Universal Stream URL generator for Live TV channels & recordings.
 * Proxies through Node backend for HTTPS / mixed-content and CORS compatibility.
 */
export const getDispatcharrStreamUrl = (channelOrId) => {
  const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const { apiKey } = getDispatcharrConfig();

  let chId = channelOrId;
  let rawUrl = "";
  if (typeof channelOrId === "object" && channelOrId !== null) {
    chId = channelOrId.id || channelOrId.channel_id || channelOrId.uuid || channelOrId.number || "";
    rawUrl = channelOrId.stream_url || channelOrId.url || channelOrId.play_url || "";
  }

  const authQuery = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";

  // If raw stream URL exists and is an external HTTP/HTTPS stream
  if (rawUrl && (rawUrl.startsWith("http://") || rawUrl.startsWith("https://"))) {
    // If running in web browser over HTTPS, proxy through Node /api/transcode for CORS & mixed-content compatibility
    if (typeof window !== "undefined" && window.location.protocol === "https:" && rawUrl.startsWith("http://")) {
      return `${backend}/api/transcode?url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }

  // Fallback to Dispatcharr TS stream endpoint via backend proxy
  return `${backend}/api/dispatcharr/proxy/ts/stream/${chId}/${authQuery}`;
};

const getHeaders = (apiKey) => {
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    if (apiKey.startsWith("eyJ")) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    } else {
      headers["X-API-Key"] = apiKey;
    }
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

  const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}&api_key=${encodeURIComponent(apiKey)}` : "";
  const id = ch.id || ch.channel_id || ch.uuid || ch.number || ch.ch_id || ch.key || Math.random().toString(36).substring(7);
  const name = ch.name || ch.title || ch.display_name || ch.channel_name || ch.callsign || `Channel ${ch.number || id}`;

  let streamUrl = ch.stream_url || ch.url || ch.play_url || ch.m3u8 || ch.hls_url || ch.stream || ch.link || ch.stream_path || "";
  if (!streamUrl && serverUrl && id) {
    streamUrl = `${serverUrl}/proxy/ts/stream/${id}${authQuery}`;
  } else if (streamUrl && apiKey && !streamUrl.includes("token=") && !streamUrl.includes("api_key=")) {
    streamUrl += streamUrl.includes("?") ? `&token=${encodeURIComponent(apiKey)}&api_key=${encodeURIComponent(apiKey)}` : `?token=${encodeURIComponent(apiKey)}&api_key=${encodeURIComponent(apiKey)}`;
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

let lastLoggedMsg = "";
const reportClientLog = (message, level = "ERROR") => {
  if (message === lastLoggedMsg) return;
  lastLoggedMsg = message;
  setTimeout(() => { lastLoggedMsg = ""; }, 10000);

  try {
    const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
    fetch(`${backend}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, level })
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Robust Multi-Endpoint Dispatcharr Fetcher (Direct + Backend Proxy Fallback)
 */
const fetchDispatcharrWithFallback = async (endpointPaths) => {
  const { url, apiKey } = await getDispatcharrConfigAsync();
  const cleanServerUrl = sanitizeDispatcharrUrl(url);
  const proxyBase = getProxyBase();
  const headers = getHeaders(apiKey);

  const authQuery = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";

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
      // Proxy fetch error
    }
  }

  if (cleanServerUrl) {
    reportClientLog(`[Dispatcharr Warning] Unable to reach Dispatcharr server at ${cleanServerUrl}`);
  }
  return { data: [], serverUrl: cleanServerUrl, apiKey };
};

/**
 * Fetch list of Live TV channels from Dispatcharr (probes channels + EPG combined endpoints).
 */
export const fetchDispatcharrChannels = async () => {
  const { data, serverUrl, apiKey } = await fetchDispatcharrWithFallback([
    "/api/channels/channels/",
    "/api/channels/summary/",
    "/api/channels/groups/",
    "/api/channels/streams/",
    "/hdhr/lineup.json",
    "/api/channels/",
    "/api/channels/list",
    "/output/m3u/",
    "/output/m3u",
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
    "/api/epg/programs/",
    "/api/epg/grid/",
    "/api/epg/current-programs/",
    "/api/epg/epgdata/",
    "/api/epg/",
    "/api/epg/events/",
    "/output/epg/",
    "/output/epg",
    "/output/xmltv/",
    "/output/xmltv",
    "/epg/",
    "/epg"
  ]);

  return data;
};

/**
 * Fetch recorded shows, movies, and recurring recording rules from Dispatcharr.
 */
export const fetchDispatcharrRecordings = async () => {
  const { data, serverUrl, apiKey } = await fetchDispatcharrWithFallback([
    "/api/channels/recordings/",
    "/api/channels/recurring-rules/",
    "/api/recordings/",
    "/output/m3u/recordings",
    "/recordings/"
  ]);

  return data.map((rec) => {
    const authQuery = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";
    let streamUrl = rec.stream_url || rec.url || rec.play_url || rec.file_path || "";
    if (!streamUrl && serverUrl && rec.id) {
      streamUrl = `${serverUrl}/api/channels/recordings/${rec.id}/file/${authQuery}`;
    }

    // Extract exact program name, channel title, and date
    const programName = rec.name || rec.title || rec.program_name || rec.custom_properties?.title || rec.custom_properties?.program_name || rec.channel_name || "DVR Recording";
    const channelName = rec.channel_name || rec.channel?.name || (rec.channel ? `Channel ${rec.channel}` : "");
    const startTimeStr = rec.start_time
      ? (rec.start_time.includes("T")
          ? new Date(rec.start_time).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : rec.start_time)
      : "Scheduled Recording";

    const isRecurring = !!rec.days_of_week || rec.rule_type === "recurring_slot" || rec.rule_type === "series";

    return {
      ...rec,
      title: programName,
      channel_display: channelName,
      formatted_date: startTimeStr,
      is_recurring: isRecurring,
      rule_badge: isRecurring ? (rec.rule_type === "series" ? "Series Rule" : "Recurring Time Slot") : "One-Time",
      stream_url: streamUrl
    };
  });
};

/**
 * Schedule a new recording in Dispatcharr (Supports One-Time, Recurring Time Slot & Series Rules).
 */
export const scheduleDispatcharrRecording = async (payload) => {
  const { url, apiKey } = await getDispatcharrConfigAsync();
  const cleanServerUrl = sanitizeDispatcharrUrl(url);
  const proxyBase = getProxyBase();
  const headers = getHeaders(apiKey);

  const isRecurring = payload.type === "recurring_slot" || payload.type === "series";
  const endpoint = isRecurring ? "/api/channels/recurring-rules/" : "/api/channels/recordings/";

  const targets = [
    `${proxyBase}${endpoint}`,
    `${cleanServerUrl}${endpoint}`,
    `${proxyBase}/api/recordings/`,
    `${cleanServerUrl}/api/recordings/`
  ];

  for (const target of targets) {
    if (!target.startsWith("http")) continue;
    try {
      const res = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify(payload)
      });
      if (res.ok || res.status === 201) return true;
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
