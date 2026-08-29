import axios from "axios";
import { fetchServerSettings, getServerUrl } from "./serverSettings";

export const getGroqApiKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("groq_api_key");
    if (saved) return saved;
  }
  return import.meta.env.VITE_GROQ_API_KEY || "";
};

export const filterWithGroqAI = async (results, expectedTitle) => {
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

  const prompt = `You are a stream safety & title classifier for media title: "${expectedTitle}".
Review the following list of torrent/stream file titles and return ONLY the numbers of titles that are legitimate video releases (movies or TV episodes) specifically for "${expectedTitle}".
STRICTLY EXCLUDE:
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
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 6000,
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
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
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
