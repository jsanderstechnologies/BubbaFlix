// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Fluid 2D Spatial Navigation (Unrestricted directional traversal across all grids and layouts)

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex="0"]:not([tabindex="-1"])',
  ".logo",
  ".menuItem",
  ".headerIconBtn",
  ".movieCard",
  ".carouselItem",
  ".themeCard",
  ".tabItem",
  ".resOption",
  ".presetBtn",
  ".zoomBtn",
  ".episodeItem",
  ".seasonCard",
  ".actionBtn",
].join(", ");

const getFocusableElements = () => {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
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

export const initDpadNavigation = () => {
  if (typeof window === "undefined") return;

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

    // If no valid active element, focus the first available item
    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      focusAndScroll(focusables[0]);
      return;
    }

    // 1. CAROUSEL HORIZONTAL DIRECT SIBLING NAVIGATION
    const inCarousel = activeEl.closest(".carouselItems") || activeEl.closest(".menuItems");
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

    // 2. UNRESTRICTED 2D SPATIAL NAVIGATION (No rigid grid-locks)
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

      if (direction === "ArrowDown") {
        if (c2.y > c1.y + 2 || r2.top >= r1.top + 5) {
          isValidDirection = true;
          primaryDist = Math.max(0, dy);
          secondaryDist = Math.abs(dx);
        }
      } else if (direction === "ArrowUp") {
        if (c2.y < c1.y - 2 || r2.bottom <= r1.bottom - 5) {
          isValidDirection = true;
          primaryDist = Math.max(0, -dy);
          secondaryDist = Math.abs(dx);
        }
      } else if (direction === "ArrowRight") {
        if (c2.x > c1.x + 2 || r2.left >= r1.left + 5) {
          isValidDirection = true;
          primaryDist = Math.max(0, dx);
          secondaryDist = Math.abs(dy);
        }
      } else if (direction === "ArrowLeft") {
        if (c2.x < c1.x - 2 || r2.right <= r1.right - 5) {
          isValidDirection = true;
          primaryDist = Math.max(0, -dx);
          secondaryDist = Math.abs(dy);
        }
      }

      if (isValidDirection) {
        // Weighted 2D spatial distance score: primary vector + 0.8x secondary projection
        const score = primaryDist + secondaryDist * 0.8;
        if (score < minScore) {
          minScore = score;
          bestCandidate = candidate;
        }
      }
    }

    // 3. FALLBACK FOR SECTION EDGES & NON-ALIGNED LAYOUTS
    if (!bestCandidate) {
      if (direction === "ArrowDown") {
        const belowCandidates = focusables.filter((el) => el.getBoundingClientRect().top >= r1.bottom - 5);
        if (belowCandidates.length > 0) {
          belowCandidates.sort((a, b) => {
            const dA = Math.hypot(a.getBoundingClientRect().left - c1.x, a.getBoundingClientRect().top - c1.y);
            const dB = Math.hypot(b.getBoundingClientRect().left - c1.x, b.getBoundingClientRect().top - c1.y);
            return dA - dB;
          });
          bestCandidate = belowCandidates[0];
        }
      } else if (direction === "ArrowUp") {
        const aboveCandidates = focusables.filter((el) => el.getBoundingClientRect().bottom <= r1.top + 5);
        if (aboveCandidates.length > 0) {
          aboveCandidates.sort((a, b) => {
            const dA = Math.hypot(a.getBoundingClientRect().left - c1.x, a.getBoundingClientRect().top - c1.y);
            const dB = Math.hypot(b.getBoundingClientRect().left - c1.x, b.getBoundingClientRect().top - c1.y);
            return dA - dB;
          });
          bestCandidate = aboveCandidates[0];
        }
      } else if (direction === "ArrowRight") {
        // Wrap to first element of section below if at far right edge
        const belowCandidates = focusables.filter((el) => el.getBoundingClientRect().top >= r1.bottom + 5);
        if (belowCandidates.length > 0) {
          belowCandidates.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          bestCandidate = belowCandidates[0];
        }
      } else if (direction === "ArrowLeft") {
        // Wrap to last element of section above if at far left edge
        const aboveCandidates = focusables.filter((el) => el.getBoundingClientRect().top <= r1.top - 5);
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
  };
};
