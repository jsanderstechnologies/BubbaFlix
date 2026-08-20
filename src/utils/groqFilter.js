import axios from "axios";

export const getGroqApiKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("groq_api_key");
    if (saved) return saved;
  }
  return import.meta.env.VITE_GROQ_API_KEY || "";
};

export const filterWithGroqAI = async (results, expectedTitle) => {
  const apiKey = getGroqApiKey();
  if (!apiKey || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  const titlesList = results.map((r, i) => `${i + 1}. ${r.title}`).join("\n");

  const prompt = `You are a stream safety & quality classifier for media title: "${expectedTitle}".
Review the following list of torrent/stream file titles and return ONLY the numbers of titles that are legitimate video releases (movies or TV episodes) for "${expectedTitle}".
STRICTLY EXCLUDE:
- Any porn, adult content, XXX, or erotica.
- Standalone audio, MP3, FLAC, soundtracks, or music albums.
- Games, software, or unrelated files.

Input List:
${titlesList}

Respond ONLY with a JSON array of matching line numbers, like: [1, 3, 5]`;

  try {
    console.log(`[Groq AI Proxy] Classifying ${results.length} streams via Nginx container...`);
    const response = await axios.post(
      "/api/groq/chat/completions",
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
