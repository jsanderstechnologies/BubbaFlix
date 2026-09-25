// Utility to preserve and restore poster D-pad focus & scroll position when returning from detail screens

export const saveLastClickedPoster = (id, type = "movie", sectionId = "") => {
  if (!id) return;
  const sectionPrefix = sectionId ? `${sectionId}-` : "";
  const key = `poster-${sectionPrefix}${type}-${id}`;
  sessionStorage.setItem("last_clicked_poster_id", key);
  if (typeof window !== "undefined") {
    sessionStorage.setItem("last_clicked_scroll_y", String(window.scrollY || 0));
    const currentPath = window.location.pathname + window.location.search;
    // Don't overwrite source path if clicking an item inside a detail page (e.g. cast or collection part inside details)
    if (!currentPath.startsWith("/movie/") && !currentPath.startsWith("/tv/")) {
      sessionStorage.setItem("last_clicked_source_path", currentPath);
    }
  }
};

export const goBackToSource = (navigate) => {
  const sourcePath = typeof window !== "undefined" ? sessionStorage.getItem("last_clicked_source_path") : null;
  if (sourcePath && typeof window !== "undefined" && sourcePath !== (window.location.pathname + window.location.search)) {
    sessionStorage.removeItem("last_clicked_source_path");
    navigate(sourcePath);
  } else if (navigate) {
    navigate(-1);
  }
};

export const restoreLastFocusedPoster = () => {
  const lastId = sessionStorage.getItem("last_clicked_poster_id");
  const savedScrollY = sessionStorage.getItem("last_clicked_scroll_y");

  if (!lastId && !savedScrollY) return;

  const attemptFocus = (retries = 35) => {
    const el = document.getElementById(lastId) || document.querySelector(`[data-poster-id="${lastId}"]`);
    if (el) {
      el.focus({ preventScroll: false });

      // Horizontal carousel scroll
      const parentCarousel = el.closest(".carouselItems") || el.closest(".continueCarouselItems");
      if (parentCarousel) {
        const itemLeft = el.offsetLeft;
        const itemWidth = el.offsetWidth;
        const containerWidth = parentCarousel.offsetWidth;
        parentCarousel.scrollTo({
          left: Math.max(0, itemLeft - containerWidth / 2 + itemWidth / 2),
          behavior: "smooth",
        });
      }

      // Vertical window scroll
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      } else if (savedScrollY) {
        const y = parseInt(savedScrollY, 10);
        if (!isNaN(y) && y > 0) {
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }

      sessionStorage.removeItem("last_clicked_poster_id");
      sessionStorage.removeItem("last_clicked_scroll_y");
    } else if (savedScrollY && retries === 0) {
      const y = parseInt(savedScrollY, 10);
      if (!isNaN(y) && y > 0) {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      sessionStorage.removeItem("last_clicked_poster_id");
      sessionStorage.removeItem("last_clicked_scroll_y");
    } else if (retries > 0) {
      setTimeout(() => attemptFocus(retries - 1), 150);
    } else {
      sessionStorage.removeItem("last_clicked_poster_id");
      sessionStorage.removeItem("last_clicked_scroll_y");
    }
  };

  attemptFocus();
};
