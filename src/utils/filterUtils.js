// Global Filtering Utility to exclude Anime, Foreign Content, Adult Material, and API/Axios Errors

export const isAxiosError = (item) => {
  if (!item || typeof item !== "object") return true;
  if (item instanceof Error) return true;
  if (item.isAxiosError || item.response || item.config || item.code === "ERR_BAD_REQUEST" || item.message) return true;
  return false;
};

export const isAnime = (item) => {
  if (!item || isAxiosError(item)) return false;

  // 1. Japanese language check
  if (item.original_language) {
    const lang = item.original_language.toLowerCase();
    if (lang === "ja" || lang === "jpn" || lang === "japanese") return true;
  }

  // 2. Origin country check (Japan)
  if (Array.isArray(item.origin_country) && item.origin_country.includes("JP")) {
    return true;
  }

  // 3. Known Anime titles & terms in title, name, original_name, or overview
  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();
  const overview = (item.overview || "").toLowerCase();

  const animeKeywords = [
    "anime", "manga", "hentai", "otaku", "studio ghibli", "ghibli", "dragon ball", "dragonball",
    "naruto", "one piece", "bleach", "attack on titan", "shingeki", "demon slayer", "kimetsu",
    "my hero academia", "boku no hero", "jujutsu kaisen", "death note", "tokyo ghoul", "pokemon",
    "pokémon", "yu-gi-oh", "yugioh", "digimon", "sailor moon", "gundam", "evangelion",
    "fullmetal alchemist", "hunter x hunter", "hunter hunter", "sword art online", "fairy tail",
    "boruto", "chainsaw man", "spy x family", "solo leveling", "jojo's bizarre", "berserk",
    "cowboy bebop", "code geass", "inuyasha", "steins;gate", "one punch", "mob psycho", "blue lock",
    "slayer", "isakai", "isekai", "overlord", "crunchyroll", "fate/stay", "monogatari", "re:zero",
    "re zero", "ecchi", "waifu", "senpai", "doraemon", "shin-chan", "detective conan", "lupin",
    "beyblade", "bakugan", "saint seiya", "inazuma", "yo-kai", "haikyuu", "kuroko", "toriko",
    "gintama", "ranma", "astro boy", "macross", "voltron", "speed racer", "rurouni", "kenshin",
    "yu yu hakusho", "initial d", "cardcaptor", "trigun", "hellsing", "claymore", "elfen lied",
    "black clover", "fire force", "dr. stone", "promised neverland", "tokyo revengers", "vinland",
    "golden kamuy", "baki", "kengan", "mashle", "frieren", "dungeon meshi", "apothecary",
    "classroom of the elite", "bungo stray", "sound! euphonium", "violet evergarden", "anohana",
    "clannad", "your name", "weathering with you", "suzume", "silent voice", "spirited away",
    "my neighbor totoro", "princess mononoke", "howl's moving", "castle in the sky", "nausicaa",
    "kiki's delivery", "porco rosso", "ponyo", "wind rises", "boy and the heron"
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
    if (!item || typeof item !== "object") return false;
    if (isAxiosError(item)) return false;

    // Filter out explicit adult
    if (item.adult === true) return false;

    // Filter out Anime
    if (isAnime(item)) return false;

    // Retain Person entries in search
    if (item.media_type === "person") return true;

    // Non-Latin title check
    const title = item.title || item.name || item.original_title || item.original_name || "";
    if (!title || foreignScriptRegex.test(title)) return false;

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
    "striptease", "playboy", "penthouse", "softcore", "hardcore", "erotica", "sensual",
    "taboo", "fetish", "babe", "vixen", "desire", "passion", "lust", "naughty", "explicit",
    "18+", "snuff", "escort", "swingers", "playmate", "hustler", "suicidegirls", "brazzers"
  ];

  const foreignScriptRegex = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF]/;

  return items.filter((col) => {
    if (!col || typeof col !== "object") return false;
    if (isAxiosError(col)) return false;
    if (col.adult === true) return false;

    // Filter out Anime collections
    if (isAnime(col)) return false;

    const name = (col.name || col.title || col.original_name || "").toLowerCase();
    if (!name) return false;

    const overview = (col.overview || "").toLowerCase();

    // Check adult words
    const words = name.split(/[\s,._\-:;]+/);
    if (words.some((w) => adultKeywords.includes(w))) return false;
    if (adultKeywords.some((kw) => name.includes(kw) || overview.includes(kw))) return false;

    // Foreign character script check
    if (foreignScriptRegex.test(col.name || col.title || col.original_name || "")) return false;

    // Language check if present
    if (col.original_language) {
      const lang = col.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") return false;
    }

    return true;
  });
};
