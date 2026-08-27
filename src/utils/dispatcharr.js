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
    if (!parsed.port && (parsed.hostname === "localhost" || /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname))) {
      url = `${parsed.protocol}//${parsed.hostname}:9191`;
    }
  } catch (e) {}
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
  return `${backend.replace(/\/$/, "")}/api/dispatcharr`;
};

/**
 * Get direct stream URL for channel or proxy stream
 */
export const getDispatcharrStreamUrl = (channelOrId) => {
  const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const { apiKey } = getDispatcharrConfig();

  let chIdentifier = "";
  if (typeof channelOrId === "object" && channelOrId !== null) {
    chIdentifier = channelOrId.uuid || channelOrId.stream_id || channelOrId.id || channelOrId.channel_id || channelOrId.number || "";
  } else {
    chIdentifier = channelOrId;
  }

  const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";
  const directProxyUrl = `${backend}/api/dispatcharr/proxy/ts/stream/${chIdentifier}${authQuery}`;

  // On Native Android TV app, ExoPlayer handles raw MPEG-TS natively
  if (typeof window !== "undefined" && window.AndroidPlayer) {
    return directProxyUrl;
  }

  // On Web Browsers, route through /api/transcode for instant HTML5 MP4 playback
  return `${backend}/api/transcode?url=${encodeURIComponent(directProxyUrl)}`;
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

/**
 * Fetch helper with strict AbortController timeout to prevent hanging requests
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
};

/**
 * Robust Multi-Endpoint Dispatcharr Fetcher (Direct + Backend Proxy Fallback)
 */
const fetchDispatcharrWithFallback = async (endpointPaths) => {
  const { url, apiKey } = await getDispatcharrConfigAsync();
  const cleanServerUrl = sanitizeDispatcharrUrl(url);
  const proxyBase = getProxyBase();
  const headers = getHeaders(apiKey);

  // Guarantee fresh data by disabling HTTP caching in WebView & browsers
  headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  headers["Pragma"] = "no-cache";
  headers["Expires"] = "0";

  const timeStampParam = `_t=${Date.now()}`;
  const authQuery = apiKey
    ? `?api_key=${encodeURIComponent(apiKey)}&${timeStampParam}`
    : `?${timeStampParam}`;

  const isHttpsPage = typeof window !== "undefined" && window.location.protocol === "https:";
  const isHttpTarget = cleanServerUrl.startsWith("http://");
  const skipDirectFetch = isHttpsPage && isHttpTarget;

  // Strategy A: Direct fetch to user's Dispatcharr IP/URL (Skip on HTTPS origins calling HTTP targets to prevent Mixed Content Block)
  if (cleanServerUrl && !skipDirectFetch) {
    let directServerReachable = true;
    for (const path of endpointPaths) {
      if (!directServerReachable) break;
      try {
        const fullUrl = `${cleanServerUrl}${path}${authQuery}`;
        const res = await fetchWithTimeout(fullUrl, { method: "GET", headers, cache: "no-store" }, 2500);
        if (res.ok) {
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json") || contentType.includes("text/json")) {
            const json = await res.json();
            const normalized = normalizeArray(json);
            if (Array.isArray(normalized) && normalized.length > 0) {
              return { data: normalized, serverUrl: cleanServerUrl, apiKey };
            }
          }
        }
      } catch (err) {
        // Direct fetch failed or network error, server is unreachable directly from client. Break Strategy A immediately!
        directServerReachable = false;
        break;
      }
    }
  }

  // Strategy B: Proxy fetch via Node backend server /api/dispatcharr proxy
  for (const path of endpointPaths) {
    try {
      const cleanPath = path.startsWith("/") ? path : `/${path}`;
      const proxyUrl = `${proxyBase}${cleanPath}${authQuery}`;
      const res = await fetchWithTimeout(proxyUrl, { method: "GET", headers, cache: "no-store" }, 5000);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json") || contentType.includes("text/json")) {
          const json = await res.json();
          const normalized = normalizeArray(json);
          if (Array.isArray(normalized)) {
            return { data: normalized, serverUrl: cleanServerUrl, apiKey };
          }
        }
      }
    } catch (err) {
      // Proxy fetch error
    }
  }

  return { data: [], serverUrl: cleanServerUrl, apiKey };
};

const normalizeChannel = (ch, serverUrl, apiKey) => {
  if (typeof ch !== "object" || ch === null) {
    return { id: String(ch), name: `Channel ${ch}`, stream_url: "" };
  }

  const backend = getServerUrl() || (typeof window !== "undefined" ? window.location.origin : "");
  const authQuery = apiKey ? `?token=${encodeURIComponent(apiKey)}` : "";
  const streamIdentifier = ch.uuid || ch.stream_id || ch.id || ch.channel_id || ch.number || Math.random().toString(36).substring(7);
  const id = ch.id || ch.uuid || ch.channel_id || ch.number || streamIdentifier;
  const name = ch.name || ch.title || ch.display_name || ch.channel_name || ch.callsign || `Channel ${ch.number || id}`;

  let logo = ch.logo || ch.icon || ch.tvg_logo || ch.logo_url || ch.image || ch.icon_url || "";
  if (!logo && ch.logo_id) {
    logo = `${backend}/api/dispatcharr/api/channels/logos/${ch.logo_id}/cache/`;
  } else if (logo && !logo.startsWith("http://") && !logo.startsWith("https://") && !logo.startsWith("data:")) {
    const cleanLogo = logo.startsWith("/") ? logo : `/${logo}`;
    logo = `${backend}/api/dispatcharr${cleanLogo}`;
  }

  let streamUrl = ch.stream_url || ch.url || ch.play_url || ch.m3u8 || ch.hls_url || ch.stream || ch.link || ch.stream_path || "";
  if (!streamUrl && streamIdentifier) {
    streamUrl = `${backend}/api/dispatcharr/proxy/ts/stream/${streamIdentifier}${authQuery}`;
  }

  const program = ch.current_program || ch.now_playing || ch.epg_now || ch.program || ch.title || ch.event || null;
  const programTitle = typeof program === "object" ? program?.title || program?.name || "Live Broadcast" : (typeof program === "string" ? program : "Live Broadcast");
  const programDesc = typeof program === "object" ? program?.description || program?.summary || "No guide detail available" : "No guide detail available";

  return {
    ...ch,
    id,
    uuid: ch.uuid || streamIdentifier,
    name,
    number: ch.number || ch.channel_number || ch.ch_number || "",
    logo,
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
 * Fetch EPG Guide data from Dispatcharr.
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

  if (!Array.isArray(data)) return [];

  // Flatten programs if nested inside channel objects (e.g. from /api/epg/grid/)
  const flatPrograms = [];
  data.forEach((item) => {
    if (!item) return;
    if (Array.isArray(item.programs)) {
      item.programs.forEach((p) => {
        flatPrograms.push({
          ...p,
          channel: p.channel || item.id || item.channel_id || item.number,
          channel_id: p.channel_id || p.channel || item.id || item.channel_id,
          channel_number: p.channel_number || item.number || item.channel_number,
          channel_name: item.name || item.title || ""
        });
      });
    } else if (item.title || item.name || item.start_time || item.start || item.channel || item.channel_id) {
      flatPrograms.push(item);
    }
  });

  return flatPrograms.length > 0 ? flatPrograms : data;
};

/**
 * Fetch recorded shows, movies, and recurring recording rules from Dispatcharr.
 */
export const fetchDispatcharrRecordings = async () => {
  const { data: recData, serverUrl, apiKey } = await fetchDispatcharrWithFallback([
    "/api/channels/recordings/",
    "/api/recordings/",
    "/output/m3u/recordings",
    "/recordings/"
  ]);

  const { data: ruleData } = await fetchDispatcharrWithFallback([
    "/api/channels/recurring-rules/"
  ]);

  const combined = [...(recData || []), ...(ruleData || [])];

  const seenIds = new Set();
  const uniqueItems = combined.filter((item) => {
    if (!item || !item.id) return true;
    if (seenIds.has(item.id)) return false;
    seenIds.add(item.id);
    return true;
  });

  return uniqueItems.map((rec) => {
    const authQuery = apiKey ? `?api_key=${encodeURIComponent(apiKey)}` : "";
    let streamUrl = rec.stream_url || rec.url || rec.play_url || rec.file_path || "";
    if (!streamUrl && serverUrl && rec.id) {
      streamUrl = `${serverUrl}/api/channels/recordings/${rec.id}/file/${authQuery}`;
    }

    const customProps = rec.custom_properties || {};
    const program = customProps.program || {};

    const programName = rec.title || program.title || customProps.title || rec.name || rec.program_name || rec.channel_name || "DVR Recording";
    const subTitle = program.sub_title || rec.sub_title || rec.episode_title || "";
    const channelName = rec.channel_display || rec.channel_name || rec.channel?.name || customProps.channel_name || (rec.channel ? `Channel ${rec.channel}` : "TV Channel");

    const startTimeStr = rec.start_time
      ? (rec.start_time.includes("T")
          ? new Date(rec.start_time).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : rec.start_time)
      : "Scheduled Recording";

    const isRecurring = !!rec.days_of_week || rec.rule_type === "recurring_slot" || rec.rule_type === "series" || customProps?.rule?.type === "recurring";

    return {
      ...rec,
      title: programName,
      sub_title: subTitle,
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
