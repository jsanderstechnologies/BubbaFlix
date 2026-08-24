// Favorites Persistence Engine for BubbaFlix
const STORAGE_KEY = "bubbaflix_favorites";

export const getFavorites = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("[Favorites] Error reading favorites:", e);
    return [];
  }
};

export const isFavorite = (id, mediaType) => {
  if (!id) return false;
  const list = getFavorites();
  const targetId = String(id);
  const targetType = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";
  return list.some((item) => String(item.id) === targetId && (item.media_type || item.mediaType || "movie") === targetType);
};

export const toggleFavorite = (item) => {
  if (!item || !item.id) return false;
  const list = getFavorites();
  const targetId = String(item.id);
  const targetType = item.media_type || item.mediaType || (item.name || item.first_air_date ? "tv" : "movie");

  const existingIndex = list.findIndex(
    (fav) => String(fav.id) === targetId && (fav.media_type || fav.mediaType || "movie") === targetType
  );

  let updatedList = [];
  let isAdded = false;

  if (existingIndex >= 0) {
    // Remove from favorites
    updatedList = list.filter((_, idx) => idx !== existingIndex);
    isAdded = false;
  } else {
    // Add to favorites
    const favObject = {
      id: item.id,
      title: item.title || item.name || item.original_title || item.original_name,
      name: item.name || item.title,
      poster_path: item.poster_path,
      backdrop_path: item.backdrop_path,
      vote_average: item.vote_average,
      release_date: item.release_date || item.first_air_date,
      first_air_date: item.first_air_date || item.release_date,
      media_type: targetType,
      mediaType: targetType,
      addedAt: new Date().toISOString(),
    };
    updatedList = [favObject, ...list];
    isAdded = true;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    window.dispatchEvent(new Event("bubbaflix_favorites_updated"));
  } catch (e) {
    console.error("[Favorites] Error saving favorites:", e);
  }

  return isAdded;
};
