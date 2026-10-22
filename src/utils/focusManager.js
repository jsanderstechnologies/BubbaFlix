// Utility to preserve and restore poster D-pad focus & scroll position when returning from detail screens

let restoreTimer = null;
let restoreAttempts = 0;
const MAX_ATTEMPTS = 60; // 60 attempts * 100ms = up to 6 seconds wait for page to reload

export const saveLastClickedPoster = (id, type = "movie", sectionId = "") => {
  if (!id) return;
  const sectionPrefix = sectionId ? `${sectionId}-` : "";
  const key = `poster-${sectionPrefix}${type}-${id}`;
  sessionStorage.setItem("last_clicked_poster_id", key);
  sessionStorage.setItem("last_clicked_tmdb_id", String(id));
  sessionStorage.setItem("last_clicked_section_id", String(sectionId || ""));
  sessionStorage.setItem("last_clicked_media_type", String(type || "movie"));
  sessionStorage.setItem("poster_restore_pending", "true");

  if (typeof window !== "undefined") {
    sessionStorage.setItem("last_clicked_scroll_y", String(window.scrollY || 0));
    const currentPath = window.location.pathname + window.location.search;
    // Don't overwrite source path if clicking an item inside a detail page (e.g. cast or collection part inside details)
    if (!currentPath.startsWith("/movie/") && !currentPath.startsWith("/tv/") && !currentPath.startsWith("/person/")) {
      sessionStorage.setItem("last_clicked_source_path", currentPath);
    }
  }
};

export const goBackToSource = (navigate) => {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("poster_restore_pending", "true");
  }

  const nav = navigate || (typeof window !== "undefined" ? window.__routerNavigate : null);
  const sourcePath = typeof window !== "undefined" ? sessionStorage.getItem("last_clicked_source_path") : null;

  if (sourcePath && typeof window !== "undefined" && sourcePath !== (window.location.pathname + window.location.search)) {
    if (typeof nav === "function") {
      nav(sourcePath);
    } else if (typeof window !== "undefined" && window.history) {
      window.history.back();
    }
  } else if (typeof nav === "function") {
    if (typeof window !== "undefined" && window.history && window.history.length <= 1) {
      nav("/");
    } else {
      nav(-1);
    }
  } else if (typeof window !== "undefined" && window.history) {
    if (window.history.length <= 1 && typeof nav === "function") {
      nav("/");
    } else {
      window.history.back();
    }
  }

  // Trigger restore process which will poll until the reloaded page finishes rendering
  restoreLastFocusedPoster();
};

export const cancelPosterRestore = () => {
  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
  }
  restoreAttempts = 0;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("poster_restore_pending");
    sessionStorage.removeItem("last_clicked_poster_id");
    sessionStorage.removeItem("last_clicked_scroll_y");
    sessionStorage.removeItem("last_clicked_source_path");
    sessionStorage.removeItem("last_clicked_section_id");
    sessionStorage.removeItem("last_clicked_tmdb_id");
    sessionStorage.removeItem("last_clicked_media_type");
  }
};

export const restoreLastFocusedPoster = () => {
  if (typeof window === "undefined") return;

  const isPending = sessionStorage.getItem("poster_restore_pending") === "true";
  const lastId = sessionStorage.getItem("last_clicked_poster_id");
  const savedScrollY = sessionStorage.getItem("last_clicked_scroll_y");

  // Only restore if a return from details page is explicitly pending
  if (!isPending || (!lastId && !savedScrollY)) return;

  // Clear any existing poll timer so we don't run multiple concurrent timers
  if (restoreTimer) {
    clearTimeout(restoreTimer);
    restoreTimer = null;
  }
  restoreAttempts = 0;

  const idParts = lastId ? lastId.split("-") : [];
  const idOnly = idParts.length > 0 ? idParts[idParts.length - 1] : "";
  const sectionId = sessionStorage.getItem("last_clicked_section_id") || "";

  const checkAndRestore = () => {
    // 0. Do not steal focus if the user is actively focused on an input or search box
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    if (
      activeEl &&
      (activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.classList?.contains("mainSearchInput") ||
        activeEl.closest?.(".searchInputWrapper"))
    ) {
      return;
    }

    // 1. If still transitioning out of details page, wait for route to change
    const currentPath = window.location.pathname;
    const isDetailsPage =
      currentPath.startsWith("/movie/") ||
      currentPath.startsWith("/tv/") ||
      currentPath.startsWith("/person/") ||
      document.body.classList.contains("detailsPageActive") ||
      document.body.classList.contains("collectionDetailsActive");

    if (isDetailsPage) {
      restoreAttempts++;
      if (restoreAttempts < MAX_ATTEMPTS) {
        restoreTimer = setTimeout(checkAndRestore, 60);
      }
      return;
    }

    // 2. Search for the target poster element with exact ID first
    let el = null;
    if (lastId) {
      el = document.getElementById(lastId) || document.querySelector(`[data-poster-id="${lastId}"]`);
    }

    // If sectionId was provided, look inside that specific section container
    if (!el && sectionId && idOnly) {
      const secContainer = document.querySelector(`[data-section-id="${sectionId}"]`);
      if (secContainer) {
        el = secContainer.querySelector(`[data-poster-id$="-${idOnly}"]`) ||
             secContainer.querySelector(`[id$="-${idOnly}"]`);
      }
    }

    // 3. Check for any active loading skeletons / spinners on the page
    const skeletons = Array.from(
      document.querySelectorAll(".loadingSkeleton, .skeletonItem, .skeleton, .spinner, .loading-spinner")
    );

    // If target element is not in DOM yet, the page is definitely still reloading!
    if (!el) {
      restoreAttempts++;
      if (restoreAttempts < MAX_ATTEMPTS) {
        restoreTimer = setTimeout(checkAndRestore, 100);
        return;
      }
      // Safety timeout fallback: try flexible suffix match only if all loading skeletons have completed
      if (idOnly && skeletons.length === 0) {
        el = document.querySelector(`[data-poster-id$="-${idOnly}"]`) ||
             document.querySelector(`[id$="-${idOnly}"]`);
      }
      if (!el) {
        // Element not found after timeout; cleanup to unblock normal navigation
        sessionStorage.removeItem("poster_restore_pending");
        sessionStorage.removeItem("last_clicked_poster_id");
        sessionStorage.removeItem("last_clicked_scroll_y");
        sessionStorage.removeItem("last_clicked_source_path");
        sessionStorage.removeItem("last_clicked_section_id");
        sessionStorage.removeItem("last_clicked_tmdb_id");
        sessionStorage.removeItem("last_clicked_media_type");
        return;
      }
    }

    // 4. Element was located: verify that sections above it and its parent container have finished reloading
    const elRect = el.getBoundingClientRect();
    const hasSkeletonsAbove = skeletons.some((sk) => {
      const skRect = sk.getBoundingClientRect();
      return skRect.top < elRect.top && skRect.height > 0;
    });

    const parentSection = el.closest(".carousel, .carouselSection, .continueWatchingSection, .explorePage, .collectionPage");
    const parentIsLoading = parentSection && parentSection.querySelector(".loadingSkeleton, .skeletonItem");

    // Wait if content above this poster is still loading (to avoid layout shift after scroll) or element has not laid out
    if ((hasSkeletonsAbove || parentIsLoading || el.offsetWidth <= 0 || el.offsetHeight <= 0) && restoreAttempts < MAX_ATTEMPTS) {
      restoreAttempts++;
      restoreTimer = setTimeout(checkAndRestore, 100);
      return;
    }

    // 5. THE PAGE HAS RELOADED! Restore horizontal carousel scroll, vertical scroll, and D-pad focus.

    // A. Center poster horizontally within carousel
    const parentCarousel = el.closest(".carouselItems, .continueCarouselItems");
    if (parentCarousel) {
      const itemLeft = el.offsetLeft;
      const itemWidth = el.offsetWidth;
      const containerWidth = parentCarousel.offsetWidth;
      const targetScrollLeft = Math.max(0, itemLeft - containerWidth / 2 + itemWidth / 2);
      parentCarousel.scrollTo({
        left: targetScrollLeft,
        behavior: "smooth",
      });
    }

    // B. Vertical page scroll
    const targetY = savedScrollY ? parseInt(savedScrollY, 10) : NaN;
    if (!isNaN(targetY) && targetY > 0) {
      window.scrollTo({
        top: targetY,
        behavior: "smooth",
      });
    } else {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }

    // C. Focus the exact poster element if user hasn't focused an input
    const currentActive = typeof document !== "undefined" ? document.activeElement : null;
    const isInputActive =
      currentActive &&
      (currentActive.tagName === "INPUT" ||
        currentActive.tagName === "TEXTAREA" ||
        currentActive.classList?.contains("mainSearchInput") ||
        currentActive.closest?.(".searchInputWrapper"));

    if (!isInputActive) {
      el.focus({ preventScroll: true });
    }

    // Clear session storage flags immediately once restoration is complete
    sessionStorage.removeItem("poster_restore_pending");
    sessionStorage.removeItem("last_clicked_poster_id");
    sessionStorage.removeItem("last_clicked_scroll_y");
    sessionStorage.removeItem("last_clicked_source_path");
    sessionStorage.removeItem("last_clicked_section_id");
    sessionStorage.removeItem("last_clicked_tmdb_id");
    sessionStorage.removeItem("last_clicked_media_type");
  };

  checkAndRestore();
};
