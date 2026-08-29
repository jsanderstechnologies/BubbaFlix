const STORAGE_KEY = "bubbaflix_watch_progress";

/**
 * Generate a unique key for movies or TV episodes.
 */
export const getMediaProgressKey = (tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) => {
  if (!tmdbId) return null;
  if (mediaType === "tv" || mediaType === "episode" || (seasonNum != null && episodeNum != null)) {
    return `tv_${tmdbId}_s${seasonNum || 1}_e${episodeNum || 1}`;
  }
  return `movie_${tmdbId}`;
};

/**
 * Get all stored watch progress items.
 */
export const getAllWatchProgress = () => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error("[getAllWatchProgress Error]:", err);
    return {};
  }
};

/**
 * Get watch progress for a specific media item.
 */
export const getWatchProgress = (tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key) return null;
  const all = getAllWatchProgress();
  return all[key] || null;
};

/**
 * Save current playback position for a media item.
 */
export const saveWatchProgress = ({
  tmdbId,
  mediaType = "movie",
  seasonNum = null,
  episodeNum = null,
  currentTime = 0,
  duration = 0,
  title = "",
  posterPath = "",
  backdropPath = ""
}) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key || !duration || duration <= 0) return;

  const all = getAllWatchProgress();

  // If watched less than 10s, don't record yet
  if (currentTime < 10) return;

  const progressPercent = (currentTime / duration) * 100;

  // Only mark movie or episode as completed/watched when 95% has been watched
  if (progressPercent >= 95) {
    delete all[key];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("[watchProgress] Error clearing progress:", e);
    }
    return;
  }

  all[key] = {
    key,
    tmdbId,
    mediaType,
    seasonNum,
    episodeNum,
    currentTime,
    duration,
    progressPercent: Math.min(100, Math.max(0, progressPercent)),
    title,
    posterPath,
    backdropPath,
    updatedAt: Date.now()
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("[saveWatchProgress Error]:", e);
  }
};

/**
 * Clear watch progress for a specific media item.
 */
export const clearWatchProgress = (tmdbId, mediaType = "movie", seasonNum = null, episodeNum = null) => {
  const key = getMediaProgressKey(tmdbId, mediaType, seasonNum, episodeNum);
  if (!key) return;
  const all = getAllWatchProgress();
  if (all[key]) {
    delete all[key];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("[clearWatchProgress Error]:", e);
    }
  }
};

/**
 * Format seconds into HH:MM:SS or MM:SS string.
 */
export const formatTimeDisplay = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
  const secNum = parseInt(totalSeconds, 10);
  const hours = Math.floor(secNum / 3600);
  const minutes = Math.floor((secNum - hours * 3600) / 60);
  const seconds = secNum - hours * 3600 - minutes * 60;

  if (hours > 0) {
    return `${hours}:${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};
