// Global Filtering Utility to exclude Anime, Foreign Content, and Adult Material

export const isAnime = (item) => {
  if (!item) return false;

  // 1. Japanese language check
  if (item.original_language) {
    const lang = item.original_language.toLowerCase();
    if (lang === "ja" || lang === "jpn" || lang === "japanese") return true;
  }

  // 2. Origin country check (Japan)
  if (Array.isArray(item.origin_country) && item.origin_country.includes("JP")) {
    return true;
  }

  // 3. Known Anime keywords in title or overview
  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();

  const animeKeywords = [
    "anime", "manga", "hentai", "otaku", "studio ghibli", "dragon ball", "naruto", 
    "one piece", "bleach", "attack on titan", "demon slayer", "my hero academia", 
    "jujutsu kaisen", "death note", "tokyo ghoul", "pokemon", "pokémon", "yu-gi-oh", 
    "digimon", "sailor moon", "gundam", "evangelion", "fullmetal alchemist", 
    "hunter x hunter", "sword art online", "fairy tail", "boruto", "chainsaw man", 
    "spy x family", "solo leveling", "jojo's bizarre", "berserk", "cowboy bebop", 
    "code geass", "inuyasha", "steins;gate", "one punch man", "mob psycho", "blue lock",
    "slayer", "isakai", "isekai", "inuyasha", "overlord", "crunchyroll"
  ];

  if (animeKeywords.some((kw) => title.includes(kw) || overview.includes(kw))) {
    return true;
  }

  return false;
};

export const filterEnglishMedia = (items) => {
  if (!Array.isArray(items)) return [];

  const foreignScriptRegex = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF]/;

  return items.filter((item) => {
    if (!item) return false;

    // Filter out explicit adult
    if (item.adult === true) return false;

    // Filter out Anime
    if (isAnime(item)) return false;

    // Retain Person entries in search
    if (item.media_type === "person") return true;

    // Non-Latin title check
    const title = item.title || item.name || "";
    if (foreignScriptRegex.test(title)) return false;

    // Language check if present
    if (item.original_language) {
      const lang = item.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") return false;
    }

    return true;
  });
};

export const filterEnglishCollections = (items) => {
  if (!Array.isArray(items)) return [];

  const adultKeywords = [
    "xxx", "adult", "erotic", "porn", "hentai", "nude", "sex", "uncensored", 
    "striptease", "playboy", "penthouse", "softcore", "hardcore", "erotica", "sensual"
  ];

  const foreignScriptRegex = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF]/;

  return items.filter((col) => {
    if (!col) return false;
    if (col.adult === true) return false;

    // Filter out Anime collections
    if (isAnime(col)) return false;

    const name = (col.name || col.title || "").toLowerCase();
    const words = name.split(/\s+/);
    if (words.some((w) => adultKeywords.includes(w))) return false;
    if (adultKeywords.some((kw) => name.includes(kw))) return false;

    if (foreignScriptRegex.test(col.name || col.title || "")) return false;

    if (col.original_language) {
      const lang = col.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") return false;
    }

    return true;
  });
};
