import re

with open(r'f:\Cyberflix\src\utils\groqFilter.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_func = '''export const filterExploreMediaWithGroq = async (results, mediaType) => {
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

  const titlesList = results.map((r, i) => `${i + 1}. ${r.title || r.name} (Rating: ${r.vote_average})`).join("\\n");

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
    const match = content.match(/\\[[\\d,\\s]*\\]/);
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
'''

code = code + '\n' + new_func

with open(r'f:\Cyberflix\src\utils\groqFilter.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Added filterExploreMediaWithGroq safely")
