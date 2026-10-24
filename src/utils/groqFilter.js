import axios from "axios";
import { fetchServerSettings, updateServerSettings, getServerUrl } from "./serverSettings";

export const getGroqApiKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("groq_api_key");
    if (saved) return saved;
  }
  return import.meta.env.VITE_GROQ_API_KEY || "";
};

export const filterWithGroqAI = async (results, expectedTitle, seasonNum = null, episodeNum = null) => {
  let apiKey = getGroqApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.groqKey) {
      apiKey = serverSettings.groqKey;
      localStorage.setItem("groq_api_key", apiKey);
    }
  }

  if (!apiKey || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const titlesList = results.map((r, i) => `${i + 1}. ${r.title}`).join("\n");
  const isTvEpisode = seasonNum != null && episodeNum != null;
  const tvExcludeClause = isTvEpisode
    ? `\n- Any full season packs, entire season torrents, series packs, or multi-episode batches (e.g. exclude "Complete Season", "Season Complete", "S01 Complete", "Season ${seasonNum}", "S${String(seasonNum).padStart(2, "0")}-S", "Episodes 1-10"). You MUST ONLY include releases for this specific episode: Season ${seasonNum}, Episode ${episodeNum}.`
    : "";

  const prompt = `You are a stream safety, language & quality classifier for media title: "${expectedTitle}"${isTvEpisode ? ` (Season ${seasonNum}, Episode ${episodeNum})` : ""}.
Review the following list of torrent/stream file titles and return ONLY the numbers of titles that are legitimate, English-language video releases (movies or TV episodes) specifically for "${expectedTitle}".
STRICTLY EXCLUDE:
- Any file where the movie or TV show title does NOT match "${expectedTitle}".
- Any file where the filename or title is in a non-English foreign language (e.g. Russian, French, German, Spanish, Italian, Hindi, Japanese, Chinese, etc.) or dubbed in a foreign language without English audio.${tvExcludeClause}
- Any low quality or theater recordings such as CAM, CAMRIP, HDCAM, TS, TELESYNC, TELECINE, TC, WORKPRINT, HD-TS, SCREENER, DVDSCR, or line audio.
- Any unrelated movies, documentaries, sports specials, or spin-offs that happen to contain matching words in their title (e.g. exclude "The Bus: A French Football Mutiny" when searching for "Mutiny").
- Any porn, adult content, XXX, or erotica.
- Standalone audio, MP3, FLAC, soundtracks, or music albums.
- Games, software, or unrelated files.

Input List:
${titlesList}

Respond ONLY with a JSON array of matching line numbers, like: [1, 3, 5]`;

  try {
    const baseUrl = getServerUrl();
    console.log(`[Groq AI Proxy] Classifying ${results.length} streams via backend server...`);
    const response = await axios.post(
      `${baseUrl}/api/groq/chat/completions`,
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\d,\s]*\]/);
    if (match) {
      const allowedIndices = JSON.parse(match[0]);
      if (Array.isArray(allowedIndices) && allowedIndices.length > 0) {
        const filtered = results.filter((_, idx) => allowedIndices.includes(idx + 1));
        console.log(`[Groq AI Filtered] Reduced stream results from ${results.length} to ${filtered.length}.`);
        return filtered;
      }
    }
  } catch (err) {
    console.warn("[Groq AI Filter Warning]:", err.message || err);
  }

  return results;
};

export const filterCollectionsWithGroq = async (collections) => {
  let apiKey = getGroqApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.groqKey) {
      apiKey = serverSettings.groqKey;
      localStorage.setItem("groq_api_key", apiKey);
    }
  }

  if (!apiKey || !Array.isArray(collections) || collections.length === 0) {
    return collections;
  }

  const titlesList = collections.map((c, i) => `${i + 1}. ${c.name || c.title}`).join("\n");

  const prompt = `You are a movie collection safety classifier for an English family video app.
Review the following list of movie collections and return ONLY the line numbers of legitimate, English-language, non-anime, non-adult movie collections (e.g. Marvel Cinematic Universe, Dark Knight, Star Wars, James Bond, Harry Potter).

STRICTLY EXCLUDE:
- Any Japanese Anime / Manga / Hentai collections (e.g. Naruto, Dragon Ball, One Piece, Studio Ghibli, Sailor Moon, Gundam, Pokemon).
- Any porn, XXX, adult content, erotica, or NSFW collections.
- Any non-English or foreign language movie collections.

Input List:
${titlesList}

Respond ONLY with a JSON array of allowed line numbers, like: [1, 2, 4, 7]`;

  try {
    const baseUrl = getServerUrl();
    const response = await axios.post(
      `${baseUrl}/api/groq/chat/completions`,
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\d,\s]*\]/);
    if (match) {
      const allowedIndices = JSON.parse(match[0]);
      if (Array.isArray(allowedIndices) && allowedIndices.length > 0) {
        const filtered = collections.filter((_, idx) => allowedIndices.includes(idx + 1));
        console.log(`[Groq AI Collection Filter]: Reduced collections from ${collections.length} to ${filtered.length}`);
        return filtered;
      }
    }
  } catch (err) {
    console.warn("[Groq AI Collection Filter Warning]:", err.message || err);
  }

  return collections;
};

export const filterExploreMediaWithGroq = async (results, mediaType) => {
  let apiKey = getGroqApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.groqKey) {
      apiKey = serverSettings.groqKey;
      localStorage.setItem("groq_api_key", apiKey);
    }
  }

  if (!apiKey || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const titlesList = results.map((r, i) => `${i + 1}. ${r.title || r.name} (Rating: ${r.vote_average})`).join("\n");

  const prompt = `You are a media safety and quality classifier for an English video app.
Review the following list of ${mediaType === "tv" ? "TV shows" : "movies"} and return ONLY the line numbers of legitimate, English-language, non-anime, non-adult media that have a valid user rating above 0.0.

STRICTLY EXCLUDE:
- Any non-English or foreign language media.
- Any media with a Rating of 0.0 or 0 (it usually means it's unreleased or junk).
- Any Japanese Anime / Manga / Hentai (e.g. Naruto, Dragon Ball, One Piece, Studio Ghibli, Sailor Moon).
- Any porn, XXX, adult content, erotica, or NSFW media.

Input List:
${titlesList}

Respond ONLY with a JSON array of allowed line numbers, like: [1, 2, 4, 7]`;

  try {
    const baseUrl = getServerUrl();
    const response = await axios.post(
      `${baseUrl}/api/groq/chat/completions`,
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const match = content.match(/\[[\d,\s]*\]/);
    if (match) {
      const allowedIndices = JSON.parse(match[0]);
      if (Array.isArray(allowedIndices)) {
        const filtered = results.filter((_, idx) => allowedIndices.includes(idx + 1));
        console.log(`[Groq AI Explore Filter]: Reduced items from ${results.length} to ${filtered.length}`);
        return filtered;
      }
    }
  } catch (err) {
    console.warn("[Groq AI Explore Filter Warning]:", err.message || err);
  }

  return results;
};

/**
 * Save user-provided Groq API key both locally and to server settings
 */
export const saveGroqApiKey = async (apiKey) => {
  const cleanKey = (apiKey || "").trim();
  if (typeof window !== "undefined") {
    if (cleanKey) {
      localStorage.setItem("groq_api_key", cleanKey);
    } else {
      localStorage.removeItem("groq_api_key");
    }
  }
  try {
    await updateServerSettings({ groqKey: cleanKey });
  } catch (e) {
    console.warn("[Groq AI] Failed to persist key to server settings:", e.message);
  }
  return cleanKey;
};

/**
 * Clean common IPTV playlist noise from channel titles to isolate the channel/network name.
 * e.g. "|US| HBO EAST FHD 1080P" -> "HBO East"
 *      "US: ESPN 2 HD 60FPS" -> "ESPN 2"
 *      "CA: TSN 1 HD" -> "TSN 1"
 *      "ABC (WABC) New York (720p)" -> "ABC WABC New York"
 */
export const cleanChannelTitle = (name) => {
  if (!name || typeof name !== "string") return "";
  let clean = name.trim();

  // Strip country / regional prefixes
  clean = clean.replace(/^(US|USA|CA|CAN|UK|GB|ES|FR|DE|IT|MX|LATIN|AU|NZ|EU|NA)\s*[:|\-]\s*/i, "");
  clean = clean.replace(/^\|[A-Z0-9\s-]+\|\s*/i, "");
  clean = clean.replace(/^\[[A-Z0-9\s-]+\]\s*/i, "");

  // Strip resolution & technical tags
  clean = clean.replace(/\b(FHD|UHD|QHD|HD|SD|4K|8K|1080P|720P|480P|60FPS|50FPS|HEVC|H\.?264|H\.?265|RAW|DIRECT|HDR|VIP|PRO)\b/gi, "");

  // Strip bracketed words like (BACKUP), (ALT), [BACKUP], (LIVE), etc.
  clean = clean.replace(/\((BACKUP|ALT|EXTRA|FEED|TEST|NEW|OLD|MAIN|SD|HD|LIVE)\)/gi, "");
  clean = clean.replace(/\[(BACKUP|ALT|EXTRA|FEED|TEST|NEW|OLD|MAIN|SD|HD|LIVE)\]/gi, "");

  // Strip emojis and decorative symbols
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}⚡🔴⭐🔥📺]/gu, "");

  // Normalize punctuation and whitespace
  clean = clean.replace(/[()[\]{}]/g, " ");
  clean = clean.replace(/[:|\-]+$/, "").trim();
  clean = clean.replace(/\s{2,}/g, " ");

  return clean || name.trim();
};

/**
 * Filter and score candidate EPG channels from the available database for a target channel.
 */
export const findCandidateEpgChannels = (targetChannel, availableEpgChannels, maxCandidates = 20) => {
  if (!availableEpgChannels || availableEpgChannels.length === 0) return [];

  const rawName = typeof targetChannel === "string" ? targetChannel : (targetChannel?.name || targetChannel?.original_name || "");
  const cleanTarget = cleanChannelTitle(rawName).toLowerCase();
  const rawTargetLower = rawName.toLowerCase();
  const categoryLower = ((typeof targetChannel === "object" && targetChannel?.category_name) || "").toLowerCase();

  // Words from clean target (length >= 2)
  const stopWords = new Set(["the", "and", "channel", "network", "tv", "live"]);
  const targetWords = cleanTarget
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w));

  // If no words survived stop words, use all tokens
  const wordsToMatch = targetWords.length > 0 ? targetWords : cleanTarget.split(/\s+/).filter(Boolean);

  const scored = [];

  for (const cand of availableEpgChannels) {
    if (!cand.id) continue;
    const candName = (cand.name || "").toLowerCase();
    const candClean = cleanChannelTitle(candName).toLowerCase();
    const candId = (cand.id || "").toLowerCase();

    let score = 0;

    // Exact name match
    if (candClean === cleanTarget || candName === rawTargetLower) {
      score += 120;
    } else if (candId === cleanTarget.replace(/\s+/g, "") || candId === cleanTarget.replace(/\s+/g, ".")) {
      score += 110;
    }

    // Prefix match
    if (candClean.startsWith(cleanTarget) || cleanTarget.startsWith(candClean)) {
      score += 45;
    }

    // Word token matching
    let matchedWordCount = 0;
    for (const w of wordsToMatch) {
      const inClean = candClean.includes(w);
      const inId = candId.includes(w);
      if (inClean || inId) {
        matchedWordCount++;
        score += inClean ? 25 : 15;
        // Word boundary bonus
        const regex = new RegExp(`\\b${w}\\b`, "i");
        if (regex.test(candClean)) score += 15;
      }
    }

    // High bonus if all significant words matched
    if (wordsToMatch.length > 0 && matchedWordCount === wordsToMatch.length) {
      score += 40;
    }

    // Coast / Regional alignment (East vs West)
    const hasEastTarget = /\beast\b/i.test(rawTargetLower);
    const hasWestTarget = /\bwest\b/i.test(rawTargetLower);
    const hasEastCand = /\beast\b/i.test(candName) || candId.includes(".east") || candId.includes("east.");
    const hasWestCand = /\bwest\b/i.test(candName) || candId.includes(".west") || candId.includes("west.");

    if (hasEastTarget && hasEastCand) score += 25;
    if (hasWestTarget && hasWestCand) score += 25;
    if (hasEastTarget && hasWestCand) score -= 30; // penalize wrong coast
    if (hasWestTarget && hasEastCand) score -= 30;

    // Category synergy
    if (categoryLower && (candName.includes(categoryLower) || candId.includes(categoryLower))) {
      score += 10;
    }

    if (score > 0) {
      scored.push({ item: cand, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCandidates).map((s) => s.item);
};

/**
 * Match a single live TV channel to the best EPG channel using Groq AI.
 */
export const matchChannelWithGroq = async (targetChannel, availableEpgChannels) => {
  let apiKey = getGroqApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.groqKey) {
      apiKey = serverSettings.groqKey;
      localStorage.setItem("groq_api_key", apiKey);
    }
  }

  const rawName = targetChannel.name || targetChannel.original_name || "";
  const cleanName = cleanChannelTitle(rawName);
  const category = targetChannel.category_name || "General";

  // Pre-filter candidates
  const candidates = findCandidateEpgChannels(targetChannel, availableEpgChannels, 20);

  if (!candidates || candidates.length === 0) {
    return {
      success: false,
      matched_epg_id: null,
      confidence: 0,
      reason: "No candidate EPG channels found in the database.",
    };
  }

  const candidatesList = candidates
    .map((c, i) => `${i + 1}. ID: "${c.id}" | Name: "${c.name}" | Source: "${c.source || "XMLTV"}"`)
    .join("\n");

  const prompt = `You are an expert TV guide and EPG (Electronic Program Guide) channel matching assistant.
Match the following live TV channel to the single best matching EPG candidate from the list.

Target Channel:
- Name: "${rawName}"
- Cleaned Name: "${cleanName}"
- Category: "${category}"

Candidate EPG Channels:
${candidatesList}

Instructions:
1. Select the candidate whose programming schedule corresponds to the target channel.
2. Consider network abbreviations, call signs (e.g. WABC = ABC), regional feeds (East / West), sports feeds, and channel variants.
3. If no candidate is a plausible match, return matched_epg_id: null with confidence: 0.
4. Return a JSON object with:
   - "matched_epg_id": string (the exact candidate "id") or null
   - "confidence": integer from 0 to 100
   - "reason": string (brief explanation of why this candidate was chosen, max 15 words)

Respond ONLY with valid JSON:
{"matched_epg_id": "...", "confidence": 95, "reason": "..."}`;

  try {
    const baseUrl = getServerUrl();
    const response = await axios.post(
      `${baseUrl}/api/groq/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" },
      },
      {
        headers: {
          Authorization: apiKey ? `Bearer ${apiKey}` : "",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    let parsed = null;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (parsed && (parsed.matched_epg_id || parsed.matched_epg_id === null)) {
      const matchedCand = candidates.find((c) => c.id === parsed.matched_epg_id);
      return {
        success: Boolean(parsed.matched_epg_id),
        matched_epg_id: parsed.matched_epg_id,
        matched_name: matchedCand?.name || parsed.matched_epg_id || "",
        matched_icon: matchedCand?.icon || "",
        matched_source: matchedCand?.source || "XMLTV",
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0,
        reason: parsed.reason || "",
      };
    }
  } catch (err) {
    console.warn("[Groq AI Match Channel Warning]:", err.message || err);
    return {
      success: false,
      error: err.response?.data?.error || err.message,
      confidence: 0,
      reason: err.message,
    };
  }

  return {
    success: false,
    matched_epg_id: null,
    confidence: 0,
    reason: "Failed to parse AI matching response.",
  };
};

/**
 * Batch match multiple live TV channels to EPG channels using Groq AI.
 * Processes in chunks of batchSize channels per LLM request for fast performance.
 */
export const batchMatchChannelsWithGroq = async (
  channels,
  availableEpgChannels,
  options = {}
) => {
  const {
    onProgress,
    batchSize = 6,
    signal,
  } = options;

  let apiKey = getGroqApiKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    if (serverSettings?.groqKey) {
      apiKey = serverSettings.groqKey;
      localStorage.setItem("groq_api_key", apiKey);
    }
  }

  const results = [];
  const total = channels.length;

  for (let i = 0; i < total; i += batchSize) {
    if (signal && signal.aborted) {
      break;
    }

    const batch = channels.slice(i, i + batchSize);

    // Build payload for this batch
    const batchChannelsPayload = batch.map((ch, idx) => {
      const rawName = ch.name || ch.original_name || "";
      const cleanName = cleanChannelTitle(rawName);
      const candidates = findCandidateEpgChannels(ch, availableEpgChannels, 12);
      return {
        index: idx + 1,
        stream_id: String(ch.stream_id),
        name: rawName,
        clean_name: cleanName,
        category: ch.category_name || "General",
        candidates: candidates.map((c) => ({ id: c.id, name: c.name })),
        candidate_objects: candidates,
      };
    });

    const promptChannelsJson = batchChannelsPayload.map((b) => ({
      index: b.index,
      stream_id: b.stream_id,
      channel_name: b.name,
      cleaned_name: b.clean_name,
      category: b.category,
      candidates: b.candidates,
    }));

    const prompt = `You are an expert TV guide and EPG (Electronic Program Guide) channel matching assistant.
Match each live TV channel to the single best matching candidate from its candidate list.

Channels to Match:
${JSON.stringify(promptChannelsJson, null, 2)}

Instructions:
1. For each channel, find the candidate whose programming corresponds to the target channel.
2. Consider network abbreviations, call signs (e.g. WABC = ABC), regional feeds (East / West), sports feeds, and channel variants.
3. If no candidate is a plausible match, return matched_epg_id: null and confidence: 0.
4. Return a JSON object with a "results" array:
{
  "results": [
    {
      "index": 1,
      "stream_id": "...",
      "matched_epg_id": "ExactCandidateId" or null,
      "confidence": integer 0-100,
      "reason": "Brief explanation max 12 words"
    }
  ]
}

Respond ONLY with valid JSON.`;

    try {
      const baseUrl = getServerUrl();
      const response = await axios.post(
        `${baseUrl}/api/groq/chat/completions`,
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
          response_format: { type: "json_object" },
        },
        {
          headers: {
            Authorization: apiKey ? `Bearer ${apiKey}` : "",
            "Content-Type": "application/json",
          },
          timeout: 20000,
          signal,
        }
      );

      const content = response.data?.choices?.[0]?.message?.content || "";
      let parsed = null;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      }

      const matchArray = parsed?.results || parsed?.matches || (Array.isArray(parsed) ? parsed : []);
      const matchMap = new Map();
      for (const m of matchArray) {
        const key = String(m.stream_id || m.index);
        matchMap.set(key, m);
      }

      for (const b of batchChannelsPayload) {
        const matchData = matchMap.get(b.stream_id) || matchMap.get(String(b.index));
        const matchedId = matchData?.matched_epg_id || null;
        const candObj = b.candidate_objects.find((c) => c.id === matchedId);

        const ch = batch.find((c) => String(c.stream_id) === b.stream_id);
        const resultItem = {
          stream_id: b.stream_id,
          channel_number: ch?.channel_number || "",
          name: b.name,
          clean_name: b.clean_name,
          category_name: b.category,
          stream_icon: ch?.stream_icon || "",
          current_epg_id: ch?.epg_channel_id || ch?.tvg_id || "",
          matched_epg_id: matchedId,
          matched_name: candObj?.name || matchedId || "",
          matched_icon: candObj?.icon || "",
          matched_source: candObj?.source || "XMLTV",
          confidence: typeof matchData?.confidence === "number" ? matchData.confidence : (matchedId ? 80 : 0),
          reason: matchData?.reason || (matchedId ? "AI matched candidate" : "No confident match"),
        };

        results.push(resultItem);
      }
    } catch (err) {
      if (signal && signal.aborted) break;
      console.warn(`[Groq AI Batch Match] Error on batch ${i / batchSize + 1}:`, err.message);
      // Fallback: add items with null match
      for (const ch of batch) {
        results.push({
          stream_id: String(ch.stream_id),
          channel_number: ch.channel_number || "",
          name: ch.name || ch.original_name || "",
          clean_name: cleanChannelTitle(ch.name || ch.original_name || ""),
          category_name: ch.category_name || "General",
          stream_icon: ch.stream_icon || "",
          current_epg_id: ch.epg_channel_id || ch.tvg_id || "",
          matched_epg_id: null,
          matched_name: "",
          matched_icon: "",
          confidence: 0,
          reason: `AI query error: ${err.message}`,
        });
      }
    }

    if (typeof onProgress === "function") {
      onProgress({
        current: Math.min(i + batch.length, total),
        total,
        percentage: Math.round((Math.min(i + batch.length, total) / total) * 100),
        matchesSoFar: results.filter((r) => r.matched_epg_id).length,
      });
    }
  }

  return results;
};
