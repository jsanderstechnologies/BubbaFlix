import axios from "axios";
import { fetchImdbId } from "./aiostreams";

export const convertSrtToVtt = (srtText) => {
  if (!srtText) return "";
  let vtt = "WEBVTT\n\n";
  vtt += srtText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return vtt;
};

export const fetchOpenSubtitles = async ({ tmdbId, imdbId, mediaType = "movie", seasonNum, episodeNum }) => {
  let targetImdbId = imdbId;
  if (!targetImdbId && tmdbId) {
    targetImdbId = await fetchImdbId(tmdbId, mediaType);
  }

  if (!targetImdbId) return [];

  // Strip 'tt' prefix if present for OpenSubtitles API
  const cleanImdbNum = targetImdbId.replace(/^tt/, "");

  try {
    let endpoint = `https://rest.opensubtitles.org/search/imdbid-${cleanImdbNum}`;
    if (mediaType === "tv" || mediaType === "series" || seasonNum !== undefined) {
      const s = seasonNum !== undefined ? seasonNum : 1;
      const e = episodeNum !== undefined ? episodeNum : 1;
      endpoint += `/season-${s}/episode-${e}`;
    }
    endpoint += `/sublanguageid-eng,spa,fre,ger,por`;

    console.log(`[OpenSubtitles API] Fetching subtitles from: ${endpoint}`);
    const response = await axios.get(endpoint, {
      headers: {
        "User-Agent": "TemporaryUserAgent v1.0",
      },
      timeout: 8000,
    });

    const rawList = Array.isArray(response.data) ? response.data : [];

    // Deduplicate and format subtitle tracks
    const formattedList = rawList
      .filter((item) => item && (item.SubDownloadLink || item.ZipDownloadLink))
      .map((item, idx) => ({
        id: item.IDSubtitleFile || idx,
        language: item.LanguageName || item.SubLanguageID || "English",
        langCode: item.SubLanguageID || "en",
        fileName: item.SubFileName || item.MovieReleaseName || `Subtitle #${idx + 1}`,
        downloadLink: item.SubDownloadLink,
        format: item.SubFormat || "srt",
        encoding: item.SubEncoding || "UTF-8",
      }));

    return formattedList;
  } catch (err) {
    console.warn("[OpenSubtitles Fetch Error]:", err.message);
    return [];
  }
};

export const downloadAndConvertSubtitle = async (downloadUrl) => {
  if (!downloadUrl) return null;
  try {
    const res = await axios.get(downloadUrl, {
      headers: { "User-Agent": "TemporaryUserAgent v1.0" },
      responseType: "arraybuffer",
      timeout: 10000,
    });

    let srtText = "";

    // Decompress if gzip format (.gz)
    if (downloadUrl.endsWith(".gz") || (res.data[0] === 0x1f && res.data[1] === 0x8b)) {
      const pako = await import("pako");
      const decompressed = pako.ungzip(new Uint8Array(res.data), { to: "string" });
      srtText = decompressed;
    } else {
      const decoder = new TextDecoder("utf-8");
      srtText = decoder.decode(res.data);
    }

    const vttText = convertSrtToVtt(srtText);
    const blob = new Blob([vttText], { type: "text/vtt" });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn("[Subtitle Download/Convert Error]:", err.message);
    return null;
  }
};
