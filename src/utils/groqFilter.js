import axios from "axios";

export const getGroqApiKey = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("groq_api_key") || "";
  }
  return "";
};

export const filterWithGroqAI = async (results, expectedTitle) => {
  const apiKey = getGroqApiKey();
  if (!apiKey || !Array.isArray(results) || results.length === 0) {
    return results;
  }

  try {
    const titlesList = results.map((r, i) => `${i + 1}. ${r.title}`).join("\n");

    const prompt = `You are a stream safety & quality classifier for media title: "${expectedTitle}".
Review the following list of torrent/stream file titles and return ONLY the numbers of titles that are legitimate video releases (movies or TV episodes) for "${expectedTitle}".
STRICTLY EXCLUDE:
- Any porn, adult content, XXX, or erotica.
- Standalone audio, MP3, FLAC, soundtracks, or music albums.
- Games, software, or unrelated files.

Input List:
${titlesList}

Respond ONLY with a JSON array of valid index numbers, e.g. [1, 2, 4]. No explanations.`;

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 150,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\[[\d,\s]*\]/);
    if (jsonMatch) {
      const validIndexes = JSON.parse(jsonMatch[0]);
      if (Array.isArray(validIndexes) && validIndexes.length > 0) {
        const filtered = results.filter((_, idx) => validIndexes.includes(idx + 1));
        if (filtered.length > 0) {
          console.log(`[Groq AI] Filtered ${results.length} streams down to ${filtered.length} clean streams.`);
          return filtered;
        }
      }
    }
  } catch (err) {
    console.warn("[Groq AI Filtering Warning]:", err.message);
  }

  return results;
};
