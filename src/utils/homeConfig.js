export const DEFAULT_HOME_SECTIONS = [
  { id: "trending", title: "Trending Content", enabled: true },
  { id: "new_movies", title: "New Release Movies", enabled: true },
  { id: "current_tv", title: "Current TV Episodes", enabled: true },
  { id: "popular_movies", title: "Popular Movies", enabled: true },
  { id: "popular_tv", title: "Popular TV Shows", enabled: true },
];

export const getHomeSections = () => {
  if (typeof window === "undefined") return DEFAULT_HOME_SECTIONS;
  try {
    const raw = localStorage.getItem("bubbaflix_home_sections");
    if (!raw) return DEFAULT_HOME_SECTIONS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_HOME_SECTIONS;

    const map = new Map(parsed.map((s) => [s.id, s]));
    DEFAULT_HOME_SECTIONS.forEach((def) => {
      if (!map.has(def.id)) {
        map.set(def.id, def);
      }
    });
    return Array.from(map.values());
  } catch (e) {
    return DEFAULT_HOME_SECTIONS;
  }
};

export const saveHomeSections = (sections) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("bubbaflix_home_sections", JSON.stringify(sections));
  window.dispatchEvent(new Event("home-sections-updated"));
};
