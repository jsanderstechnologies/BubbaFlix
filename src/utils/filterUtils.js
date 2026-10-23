// Global Filtering Utility to exclude Anime, Non-English Foreign Content, Adult Material, and API/Axios Errors

export const isAxiosError = (item) => {
  if (!item || typeof item !== "object") return true;
  if (item instanceof Error) return true;
  if (item.isAxiosError || item.response || item.config || item.code === "ERR_BAD_REQUEST" || item.message) return true;
  return false;
};

// Non-English language & non-Latin script detection
const FOREIGN_SCRIPT_REGEX = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF\u0590-\u05FF\u1EA0-\u1EF9]/;

const FOREIGN_TITLE_TERMS = [
  "coleccion", "colección", "trilogie", "trilogía", "trilogia", "tetralogia", "pentalogia",
  "filmreihe", "série", "serie", "película", "pelicula", "peliculas", "películas",
  "collection (fr)", "collection (french)", "collection (es)", "collection (spanish)",
  "collection (de)", "collection (german)", "collection (it)", "collection (italian)",
  "collection (ru)", "collection (russian)", "collection (ja)", "collection (japanese)",
  "collection (ko)", "collection (korean)", "collection (zh)", "collection (chinese)",
  "subbed", "dubbed", "subtitulado", "subtitulada", "version fr", "version es", "vf", "vostfr",
  "cinéma", "cine", "filme", "filmes", "volumen", "bilingual", "subs"
];

const NON_ENGLISH_COUNTRIES = [
  "JP", "CN", "KR", "RU", "FR", "DE", "ES", "IT", "IN", "TR", "TH", "MX", "BR", "AR", "PL", "NL", "SE", "DK", "NO", "FI", "GR", "CZ", "HU", "RO"
];

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

const PORN_TITLE_KEYWORDS = [
  "xxx", "porn", "hentai", "striptease", "playboy", "penthouse", 
  "softcore", "hardcore", "erotica", "brazzers", "gangbang", "orgy", 
  "suicidegirls", "playmate", "hustler", "bdsm"
];

const PORN_OVERVIEW_REGEX = /\b(pornography|hardcore porn|softcore porn|adult film|xxx video|gangbang|erotic sex)\b/i;

export const isAdult = (item) => {
  if (!item || isAxiosError(item)) return false;
  if (item.adult === true) return true;

  const title = (item.title || item.name || item.original_title || item.original_name || "").toLowerCase();

  // Allow mainstream exceptions like the xXx franchise
  if ((item.vote_count || 0) > 200 && (title.includes("xander cage") || title.includes("state of the union"))) {
    return false;
  }

  // Check whole words in title for explicit porn terms
  const titleWords = title.split(/[\s,._\-:;!?/]+/);
  if (titleWords.some((w) => PORN_TITLE_KEYWORDS.includes(w))) return true;

  // Overview explicit phrase check (whole word pattern, never substring match on "adult" or "sex")
  const overview = (item.overview || "").toLowerCase();
  if (overview && PORN_OVERVIEW_REGEX.test(overview)) return true;

  return false;
};

export const filterEnglishMedia = (items) => {
  if (!Array.isArray(items)) return [];

  return items.filter((item) => {
    if (!item || typeof item !== "object") return false;
    if (isAxiosError(item)) return false;

    // Filter out explicit adult and softcore
    if (isAdult(item)) return false;

    // Filter out Anime
    if (isAnime(item)) return false;

    // Filter out unreleased/junk media with 0.0 rating
    if (item.vote_average === 0 || item.vote_average === 0.0) return false;

    // Retain Person entries in search
    if (item.media_type === "person") return true;

    // 1. Primary Rule: Enforce English, BUT allow universally popular international hits (like The Fifth Element, Parasite)
    if (item.original_language) {
      const lang = item.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") {
        if (!item.vote_count || item.vote_count < 1500) {
          return false;
        }
      }
    }

    // 2. Non-Latin character script check (Cyrillic, CJK, Arabic, Hindi, etc.)
    const title = item.title || item.name || item.original_title || item.original_name || "";
    if (!title || FOREIGN_SCRIPT_REGEX.test(title)) return false;

    // 3. Foreign title descriptor terms check (e.g. "coleccin", "trilogie", "pelcula")
    const titleLower = title.toLowerCase();
    if (FOREIGN_TITLE_TERMS.some((term) => titleLower.includes(term))) {
      return false;
    }

    // 4. Country check ONLY if original_language is not explicitly English
    if (!item.original_language && Array.isArray(item.origin_country) && item.origin_country.length > 0) {
      const hasEnglishCountry = item.origin_country.some((c) => ["US", "GB", "CA", "AU", "NZ", "IE"].includes(c));
      if (!hasEnglishCountry && item.origin_country.some((c) => NON_ENGLISH_COUNTRIES.includes(c))) {
        return false;
      }
    }

    return true;
  });
};

export const filterEnglishCollections = (items) => {
  if (!Array.isArray(items)) return [];

  return items.filter((col) => {
    if (!col || typeof col !== "object") return false;
    if (isAxiosError(col)) return false;
    
    // Filter out explicit adult and softcore
    if (isAdult(col)) return false;

    // Filter out Anime collections
    if (isAnime(col)) return false;

    // Primary Rule: If original_language is present, enforce English ("en" or "eng")
    if (col.original_language) {
      const lang = col.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") return false;
    }

    const name = (col.name || col.title || col.original_name || "").toLowerCase();
    if (!name) return false;

    // Foreign character script check
    if (FOREIGN_SCRIPT_REGEX.test(col.name || col.title || col.original_name || "")) return false;

    // Foreign title descriptor terms check
    if (FOREIGN_TITLE_TERMS.some((term) => name.includes(term))) {
      return false;
    }

    return true;
  });
};

const EXPLICIT_NON_ENGLISH_AUDIO_REGEX = /\b(truefrench|vostfr|french|vf|castellano|latino|spanish|spa|german|deutsch|ger|ita|italian|italiano|russian|rus|pol|polish|hindi|hin|telugu|tamil|punjabi|japanese|jpn|chinese|chi|korean|kor|dubbed|dublado)\b/i;
const ENGLISH_AUDIO_KEYWORDS = /\b(eng|english|multi|dual|subs?|subbed)\b/i;

export const isEnglishStreamTitle = (stream) => {
  if (!stream) return false;
  const titleText = `${stream.title || ""} ${stream.name || ""} ${stream.metaText || ""}`;

  // 1. Reject non-Latin foreign character scripts
  if (FOREIGN_SCRIPT_REGEX.test(titleText)) {
    return false;
  }

  // 2. Reject explicit non-English audio/dub tags unless English audio is explicitly listed
  if (EXPLICIT_NON_ENGLISH_AUDIO_REGEX.test(titleText)) {
    if (!ENGLISH_AUDIO_KEYWORDS.test(titleText)) {
      return false;
    }
  }

  return true;
};

/**
 * Detects if a torrent stream represents an entire season, series pack, or multi-episode batch
 * instead of a specific single episode.
 *
 * @param {object|string} stream Stream object or title string
 * @param {number|string} [seasonNum] Requested season number
 * @param {number|string} [episodeNum] Requested episode number
 * @returns {boolean} True if the stream is a season pack / entire season, false if it is a specific episode
 */
export const isSeasonPackStream = (stream, seasonNum, episodeNum) => {
  // If neither season nor episode is specified, this is a movie or unspecific media — don't block
  if (seasonNum == null && episodeNum == null) return false;

  const rawTitle = typeof stream === "string" 
    ? stream 
    : `${stream?.title || ""} ${stream?.name || ""} ${stream?.cleanTitle || ""} ${stream?.metaText || ""}`;
  const text = (rawTitle || "").trim();
  if (!text) return true;

  const s = parseInt(seasonNum, 10);
  const e = parseInt(episodeNum, 10);

  // 1. Explicit Full Season / Series / Collection / Boxset pack markers
  const explicitPackRegex = /\b(complete[\s._-]*(?:season|series|collection|boxset|pack)?|full[\s._-]*(?:season|series|pack)?|season[\s._-]*(?:complete|full|pack|boxset)|series[\s._-]*(?:complete|full|pack|boxset)|entire[\s._-]*(?:season|series)|all[\s._-]*episodes?|season[\s._-]*box[\s._-]*set|box[\s._-]*set|temporada[\s._-]*(?:completa)?|сезон[\s._-]*\d+[\s._-]*сери[ия])\b/i;
  if (explicitPackRegex.test(text)) return true;

  // 2. Multi-season ranges (e.g. S01-S05, S1-5, Season 1-5, Seasons 1 to 4, Season 1 - 2, S01-S02-S03)
  const multiSeasonRegex = /\b(s\d{1,2}[\s._-]*[\-–—~to]+[\s._-]*s?\d{1,2}|seasons?[\s._-]*\d{1,2}[\s._-]*[\-–—~to]+[\s._-]*\d{1,2}|s\d{1,2}(?:[\s._-]+s\d{1,2}){1,})\b/i;
  if (multiSeasonRegex.test(text)) return true;

  // 3. Multi-episode ranges / batches (e.g. S01E01-E10, S01E01-10, E01-E08, 1x01-08)
  const rangeMatch = text.match(/\b(?:s\d{1,2}[\s._-]*)?(?:e|ep|episode|\b)(\d{1,4})[\s._-]*[\-–—~to]+[\s._-]*(?:e|ep|episode|\b)(\d{1,4})\b/i) ||
                     text.match(/\b\d{1,2}x(\d{1,4})[\s._-]*[\-–—~to]+[\s._-]*(?:\d{1,2}x)?(\d{1,4})\b/i);

  if (rangeMatch) {
    const startEp = parseInt(rangeMatch[1], 10);
    const endEp = parseInt(rangeMatch[2], 10);
    if (!isNaN(startEp) && !isNaN(endEp) && endEp >= startEp) {
      const span = endEp - startEp;
      // If batch is 3 or more episodes (e.g. E01-E04, E01-E10), treat as multi-episode season batch pack
      if (span >= 2) {
        return true;
      }
      // If span is 0 or 1 (e.g. E01-E01 or 2-part double episode E01-E02):
      // Verify requested episode e is within [startEp, endEp]
      if (!isNaN(e) && (e < startEp || e > endEp)) {
        return true;
      }
    }
  }

  // 4. Season-only indicator without ANY episode marker (e.g. "Show.Name.S01.1080p.BluRay" or "Show Season 1 1080p")
  const hasSeasonMarker = /\b(s0*(\d{1,2})|season[\s._-]*0*(\d{1,2}))\b/i.test(text);
  const hasAnyEpisodeMarker = /\b(s\d{1,2}[\s._-]*e\d{1,4}|\d{1,2}x\d{1,4}|(?:ep|episode|e)[\s._-]*\d{1,4}|cap\.?\s*\d{3,4})\b/i.test(text);

  if (hasSeasonMarker && !hasAnyEpisodeMarker) {
    return true; // Blocked: Season-only pack (no episode specified)
  }

  // 5. If specific season and episode numbers are provided, verify the release matches this specific episode
  if (!isNaN(s)) {
    const sMatch = text.match(/\b(?:s|season[\s._-]*)0*(\d{1,2})\b/i);
    if (sMatch && parseInt(sMatch[1], 10) !== s) {
      return true; // Blocked: Different season
    }
  }

  if (!isNaN(s) && !isNaN(e)) {
    // Check Cap.XYZ (e.g. Cap.101 -> s=1, e=1)
    const capMatch = text.match(/\bcap\.?\s*(\d)(\d{2})\b/i);
    if (capMatch) {
      const capS = parseInt(capMatch[1], 10);
      const capE = parseInt(capMatch[2], 10);
      if (capS !== s || capE !== e) {
        return true;
      }
      return false; // Valid Cap.XYZ
    }

    const exactPatterns = [
      new RegExp('\\b[sS]0*' + s + '[\\s._-]*[eE]0*' + e + '\\b', 'i'),
      new RegExp('\\b0*' + s + '[xX]0*' + e + '\\b', 'i'),
      new RegExp('\\bseason[\\s._-]*0*' + s + '[\\s._-]*(?:episode|ep)[\\s._-]*0*' + e + '\\b', 'i'),
      new RegExp('\\b[sS]0*' + s + '\\b.*\\b(?:ep|episode|e)[\\s._-]*0*' + e + '\\b', 'i'),
      new RegExp('\\b(?:ep|episode)[\\s._-]*0*' + e + '\\b.*\\b[sS]0*' + s + '\\b', 'i'),
      ...(s === 1 ? [new RegExp('\\b(?:ep|episode)[\\s._-]*0*' + e + '\\b', 'i')] : [])
    ];

    const matchesExact = exactPatterns.some((p) => p.test(text));
    if (!matchesExact && !rangeMatch) {
      return true; // Blocked: Does not match requested episode
    }
  }

  return false;
};

export const isMatchingStreamTitle = (stream, expectedTitle, mediaType, seasonNum, episodeNum) => {
  if (!stream || !expectedTitle) return true;
  const titleText = `${stream.title || ""} ${stream.name || ""}`.toLowerCase().replace(/[._\-\:\,\(\)\[\]]+/g, " ");

  const cleanExpected = expectedTitle.toLowerCase().replace(/[^a-z0-9\s]+/g, " ");
  const stopWords = new Set(["the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "with", "at", "by", "from"]);
  
  const expectedKeywords = cleanExpected
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  if (expectedKeywords.length === 0) return true;

  // 1. Check title keyword matching
  const matchCount = expectedKeywords.filter((kw) => titleText.includes(kw)).length;
  
  if (expectedKeywords.length <= 2) {
    if (matchCount < expectedKeywords.length) {
      return false;
    }
  } else {
    if (matchCount / expectedKeywords.length < 0.6) {
      return false;
    }
  }

  // 2. TV Season & Episode check - block season packs and verify specific episode
  if (mediaType === "tv" || seasonNum !== undefined || episodeNum !== undefined) {
    if (isSeasonPackStream(stream, seasonNum, episodeNum)) {
      return false;
    }
  }

  return true;
};

/**
 * Detects if a stream is 10-bit HEVC (x265) or HDR/Dolby Vision.
 * Amazon Fire HD 10 tablets and older SoCs lack 10-bit HEVC hardware decoders
 * and will fatal-crash the application process if fed a 10-bit HEVC bitstream.
 */
export const is10BitOrHevcStream = (stream) => {
  if (!stream) return false;
  const fullStr = `${stream.title || ""} ${stream.name || ""} ${stream.metaText || ""} ${stream.url || ""}`;

  // 1. Explicit 10-bit markers
  const has10Bit = /\b(10[\s\-_.]?bit|hi10p?|main10)\b/i.test(fullStr);

  // 2. HEVC / x265 markers
  const hasHevc = /\b(hevc|x265|h265|h\.265)\b/i.test(fullStr);

  // 3. HDR / Dolby Vision markers (HDR video is strictly 10-bit+; web torrent releases are almost exclusively HEVC Main 10)
  const hasHdr = /\b(hdr|hdr10|hdr10\+|dv|dovi|dolby[\s\-_.]?vision|hlg)\b/i.test(fullStr);

  // 4. Known release groups that encode exclusively in 10-bit HEVC
  const has10BitGroup = /\b(PSA|QxR|MeGusta|Pahe|SAMPA|UTR)\b/i.test(fullStr);

  // If stream is marked 10-bit (H.264 Hi10P or HEVC Main 10)
  if (has10Bit) return true;

  // If stream is HEVC and has HDR or known 10-bit encoding group
  if (hasHevc && (hasHdr || has10BitGroup)) return true;

  // Any HDR or Dolby Vision stream is 10-bit
  if (hasHdr) return true;

  return false;
};

export const isHevcStream = (stream) => {
  if (!stream) return false;
  const fullStr = `${stream.title || ""} ${stream.name || ""} ${stream.metaText || ""} ${stream.url || ""}`;
  return /\b(hevc|x265|h265|h\.265)\b/i.test(fullStr);
};

/**
 * Robustly selects the best official YouTube trailer from TMDB /videos results.
 * Prioritizes:
 * 1. Type: Trailer (over Teasers, Clips, Featurettes, Speeches)
 * 2. Official badge (official === true)
 * 3. Title keywords: "Official Trailer", "Main Trailer", "Final Trailer", "Theatrical Trailer"
 * 4. Language: English ("en", "en-US", "en-GB")
 * 5. Resolution & Recency
 * Penalizes: Featurettes, behind the scenes, award speeches, clips, reviews, TV spots.
 */
export const getOfficialTrailer = (results) => {
  if (!Array.isArray(results) || results.length === 0) return null;

  // Filter only items with a YouTube key
  const candidates = results.filter(
    (item) => item?.key && (!item.site || item.site.toLowerCase() === "youtube")
  );

  if (candidates.length === 0) return null;

  const scoreVideo = (v) => {
    let score = 0;
    const type = (v.type || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    const isOfficial = Boolean(v.official);
    const lang = (v.iso_639_1 || "").toLowerCase();

    // 1. Primary Video Type
    if (type === "trailer") {
      score += 5000;
    } else if (type === "teaser") {
      score += 2000;
    } else if (type === "clip") {
      score += 200;
    } else {
      score += 100;
    }

    // 2. Official Badge
    if (isOfficial) {
      score += 3000;
    }

    // 3. Title heuristics
    if (name.includes("official trailer")) {
      score += 2500;
    } else if (name.includes("main trailer") || name.includes("final trailer")) {
      score += 2000;
    } else if (name.includes("theatrical trailer")) {
      score += 1800;
    } else if (name.includes("trailer")) {
      score += 1000;
    } else if (name.includes("teaser")) {
      score += 500;
    }

    // Heavily penalize non-trailers
    if (
      name.includes("behind the scenes") ||
      name.includes("featurette") ||
      name.includes("interview") ||
      name.includes("bloopers") ||
      name.includes("speech") ||
      name.includes("wins best") ||
      name.includes("oscars") ||
      name.includes("bafta") ||
      name.includes("scene") ||
      name.includes("clip") ||
      name.includes("review") ||
      name.includes("tv spot")
    ) {
      score -= 4000;
    }

    // 4. Language preference (English)
    if (lang === "en" || lang === "en-us" || lang === "en-gb") {
      score += 500;
    }

    // 5. Resolution preference
    if (v.size >= 1080) {
      score += 100;
    } else if (v.size >= 720) {
      score += 50;
    }

    // 6. Recency bonus for newer official trailers (e.g., Final Trailer over first Teaser)
    if (v.published_at) {
      const pubTime = new Date(v.published_at).getTime();
      if (!isNaN(pubTime)) {
        score += Math.min(pubTime / 10000000000, 200);
      }
    }

    return score;
  };

  const sorted = [...candidates].sort((a, b) => scoreVideo(b) - scoreVideo(a));
  return sorted[0] || null;
};


