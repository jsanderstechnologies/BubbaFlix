// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Predictable 2D Spatial Navigation with Top-Left Poster Auto-Focus on Page Change

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex="0"]:not([tabindex="-1"])',
  ".menuItem",
  ".headerIconBtn",
  ".movieCard",
  ".posterBlock",
  ".carouselItem",
  ".themeCard",
  ".tabItem",
  ".resOption",
  ".presetBtn",
  ".zoomBtn",
  ".episodeItem",
  ".seasonCard",
  ".actionBtn",
  ".navBtn",
].join(", ");

const getFocusableElements = () => {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    // Exclude logo elements from D-Pad spatial navigation focus
    if (el.classList.contains("logo") || el.classList.contains("navLogo") || el.closest(".logo") || el.closest(".navLogo")) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
  });
};

const focusAndScroll = (el) => {
  if (!el) return;
  el.focus();

  const parentCarousel = el.closest(".carouselItems");
  if (parentCarousel) {
    const itemLeft = el.offsetLeft;
    const itemWidth = el.offsetWidth;
    const containerWidth = parentCarousel.offsetWidth;
    parentCarousel.scrollTo({
      left: itemLeft - containerWidth / 2 + itemWidth / 2,
      behavior: "smooth",
    });
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
};

// Focus the top-leftmost poster element when changing pages
export const focusTopLeftPoster = () => {
  setTimeout(() => {
    // Prioritize poster elements on screen
    const posters = Array.from(
      document.querySelectorAll(".movieCard, .posterBlock, .carouselItem, .seasonCard, .episodeItem")
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none" && rect.top >= 0 && rect.top < window.innerHeight;
    });

    if (posters.length > 0) {
      // Sort by top coordinate first (topmost), then by left (leftmost)
      posters.sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        const topDiff = rA.top - rB.top;
        if (Math.abs(topDiff) > 50) return topDiff;
        return rA.left - rB.left;
      });

      focusAndScroll(posters[0]);
      return;
    }

    // Fallback to first focusable interactive element
    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusAndScroll(focusables[0]);
    }
  }, 300);
};

export const initDpadNavigation = () => {
  if (typeof window === "undefined") return;

  // Auto-focus top-left poster on initial page load
  focusTopLeftPoster();

  // Watch for page route changes (URL popstate & history push state)
  const handleRouteChange = () => {
    focusTopLeftPoster();
  };

  window.addEventListener("popstate", handleRouteChange);

  // Intercept history.pushState & replaceState to detect React Router navigation
  const origPush = window.history.pushState;
  const origReplace = window.history.replaceState;

  window.history.pushState = function (...args) {
    origPush.apply(this, args);
    handleRouteChange();
  };

  window.history.replaceState = function (...args) {
    origReplace.apply(this, args);
    handleRouteChange();
  };

  const handleKeyDown = (e) => {
    const key = e.key || e.keyCode;
    const code = e.keyCode;
    const activeEl = document.activeElement;

    // Ignore spatial navigation if video player modal is active or user is typing in text input
    if (
      document.body.classList.contains("videoPlayerActive") ||
      (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") && activeEl.type === "text")
    ) {
      return;
    }

    // Handle Smart TV Back Button
    if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
      if (window.location.pathname !== "/") {
        e.preventDefault();
        window.history.back();
        return;
      }
    }

    // Android TV Center / OK / Select button simulation
    if (key === "Select" || code === 23 || code === 66) {
      if (activeEl && activeEl !== document.body) {
        if (activeEl.tagName !== "BUTTON" && activeEl.tagName !== "A" && activeEl.tagName !== "INPUT" && activeEl.tagName !== "SELECT") {
          e.preventDefault();
          activeEl.click();
          return;
        }
      }
    }

    let direction = null;
    if (key === "ArrowUp" || code === 38 || code === 19) direction = "ArrowUp";
    else if (key === "ArrowDown" || code === 40 || code === 20) direction = "ArrowDown";
    else if (key === "ArrowLeft" || code === 37 || code === 21) direction = "ArrowLeft";
    else if (key === "ArrowRight" || code === 39 || code === 22) direction = "ArrowRight";

    if (!direction) return;

    // Always prevent native browser scroll on D-Pad directional presses
    e.preventDefault();

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    // If no valid active element, focus the top-left poster item
    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      focusTopLeftPoster();
      return;
    }

    // 1. CAROUSEL & ROW DIRECT SIBLING NAVIGATION
    const inCarousel = activeEl.closest(".carouselItems") || activeEl.closest(".menuItems") || activeEl.closest(".navLinks");
    if (inCarousel) {
      if (direction === "ArrowRight" && activeEl.nextElementSibling) {
        if (focusables.includes(activeEl.nextElementSibling)) {
          focusAndScroll(activeEl.nextElementSibling);
          return;
        }
      }
      if (direction === "ArrowLeft" && activeEl.previousElementSibling) {
        if (focusables.includes(activeEl.previousElementSibling)) {
          focusAndScroll(activeEl.previousElementSibling);
          return;
        }
      }
    }

    // 2. PREDICTABLE SPATIAL NAVIGATION (Row & Column Alignment Lock)
    const r1 = activeEl.getBoundingClientRect();
    const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };

    let bestCandidate = null;
    let minScore = Infinity;

    for (const candidate of focusables) {
      if (candidate === activeEl) continue;

      const r2 = candidate.getBoundingClientRect();
      const c2 = { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;

      let primaryDist = 0;
      let secondaryDist = 0;
      let isValidDirection = false;
      let alignmentPenalty = 1.0;

      if (direction === "ArrowDown") {
        if (r2.top >= r1.bottom - 10 || c2.y > c1.y + 10) {
          isValidDirection = true;
          primaryDist = Math.max(0, dy);
          secondaryDist = Math.abs(dx);

          const isAligned = r2.left < r1.right && r2.right > r1.left;
          if (isAligned) alignmentPenalty = 0.5;
        }
      } else if (direction === "ArrowUp") {
        if (r2.bottom <= r1.top + 10 || c2.y < c1.y - 10) {
          isValidDirection = true;
          primaryDist = Math.max(0, -dy);
          secondaryDist = Math.abs(dx);

          const isAligned = r2.left < r1.right && r2.right > r1.left;
          if (isAligned) alignmentPenalty = 0.5;
        }
      } else if (direction === "ArrowRight") {
        if (r2.left >= r1.right - 10 || c2.x > c1.x + 10) {
          isValidDirection = true;
          primaryDist = Math.max(0, dx);
          secondaryDist = Math.abs(dy);

          const isAligned = r2.top < r1.bottom && r2.bottom > r1.top;
          if (isAligned) alignmentPenalty = 0.5;
        }
      } else if (direction === "ArrowLeft") {
        if (r2.right <= r1.left + 10 || c2.x < c1.x - 10) {
          isValidDirection = true;
          primaryDist = Math.max(0, -dx);
          secondaryDist = Math.abs(dy);

          const isAligned = r2.top < r1.bottom && r2.bottom > r1.top;
          if (isAligned) alignmentPenalty = 0.5;
        }
      }

      if (isValidDirection) {
        // Weighted 2D spatial distance score favoring aligned row/column items
        const score = (primaryDist + secondaryDist * 3.0) * alignmentPenalty;
        if (score < minScore) {
          minScore = score;
          bestCandidate = candidate;
        }
      }
    }

    // 3. FALLBACK FOR SECTION BOUNDARIES
    if (!bestCandidate) {
      if (direction === "ArrowDown") {
        const belowCandidates = focusables.filter((el) => el.getBoundingClientRect().top >= r1.bottom - 5);
        if (belowCandidates.length > 0) {
          belowCandidates.sort((a, b) => {
            const rA = a.getBoundingClientRect();
            const rB = b.getBoundingClientRect();
            const topDiff = rA.top - rB.top;
            if (Math.abs(topDiff) > 50) return topDiff;
            return Math.abs(rA.left - c1.x) - Math.abs(rB.left - c1.x);
          });
          bestCandidate = belowCandidates[0];
        }
      } else if (direction === "ArrowUp") {
        const aboveCandidates = focusables.filter((el) => el.getBoundingClientRect().bottom <= r1.top + 5);
        if (aboveCandidates.length > 0) {
          aboveCandidates.sort((a, b) => {
            const rA = a.getBoundingClientRect();
            const rB = b.getBoundingClientRect();
            const bottomDiff = rB.bottom - rA.bottom;
            if (Math.abs(bottomDiff) > 50) return bottomDiff;
            return Math.abs(rA.left - c1.x) - Math.abs(rB.left - c1.x);
          });
          bestCandidate = aboveCandidates[0];
        }
      } else if (direction === "ArrowRight") {
        const belowCandidates = focusables.filter((el) => el.getBoundingClientRect().top >= r1.bottom + 5);
        if (belowCandidates.length > 0) {
          belowCandidates.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          bestCandidate = belowCandidates[0];
        }
      } else if (direction === "ArrowLeft") {
        const aboveCandidates = focusables.filter((el) => el.getBoundingClientRect().bottom <= r1.top - 5);
        if (aboveCandidates.length > 0) {
          aboveCandidates.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right);
          bestCandidate = aboveCandidates[0];
        }
      }
    }

    if (bestCandidate) {
      focusAndScroll(bestCandidate);
    }
  };

  window.addEventListener("keydown", handleKeyDown, true);

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("popstate", handleRouteChange);
  };
};
