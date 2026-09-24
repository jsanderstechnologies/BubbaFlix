// Utility to preserve and restore poster D-pad focus & scroll position when returning from detail screens

export const saveLastClickedPoster = (id, type = "movie") => {
  if (!id) return;
  const key = `poster-${type}-${id}`;
  sessionStorage.setItem("last_clicked_poster_id", key);
  if (typeof window !== "undefined") {
    sessionStorage.setItem("last_clicked_scroll_y", String(window.scrollY || 0));
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
      if (typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
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
