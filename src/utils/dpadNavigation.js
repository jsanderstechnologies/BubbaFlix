// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Compatible with Android TV, Fire TV, Apple TV, LG webOS, Samsung Tizen, and D-Pad remote controls.

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
].join(", ");

const getFocusableElements = () => {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(el).visibility !== "hidden";
  });
};

const getDirectionFromEvent = (e) => {
  const key = e.key;
  const code = e.keyCode;

  if (key === "ArrowUp" || code === 38 || code === 19) return "ArrowUp";
  if (key === "ArrowDown" || code === 40 || code === 20) return "ArrowDown";
  if (key === "ArrowLeft" || code === 37 || code === 21) return "ArrowLeft";
  if (key === "ArrowRight" || code === 39 || code === 22) return "ArrowRight";

  return null;
};

// Safe focus and scroll helper
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

    // Ignore spatial navigation if video player modal is active or user is typing in input
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

    const direction = getDirectionFromEvent(e);
    if (!direction) return;

    // Always prevent native browser scroll/jump on D-Pad directional presses
    e.preventDefault();

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    // If no valid active element, focus the first available item
    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      focusAndScroll(focusables[0]);
      return;
    }

    // 1. CAROUSEL / ROW DIRECT SIBLING NAVIGATION
    const inCarousel = activeEl.closest(".carouselItems") || activeEl.closest(".menuItems");
    if (inCarousel) {
      if (direction === "ArrowRight") {
        const next = activeEl.nextElementSibling;
        if (next && focusables.includes(next)) {
          focusAndScroll(next);
          return;
        }
      }
      if (direction === "ArrowLeft") {
        const prev = activeEl.previousElementSibling;
        if (prev && focusables.includes(prev)) {
          focusAndScroll(prev);
          return;
        }
      }
    }

    // 2. STRICT SPATIAL GEOMETRIC NAVIGATION FOR GRIDS & PAGE LAYOUTS
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

      let score = Infinity;

      if (direction === "ArrowRight") {
        // Candidate must be strictly to the right
        if (r2.left >= r1.left + 5) {
          const verticalOverlap = Math.abs(dy) < r1.height * 0.7;
          if (verticalOverlap) {
            // High priority: same row items
            score = dx + Math.abs(dy) * 3;
          }
        }
      } else if (direction === "ArrowLeft") {
        // Candidate must be strictly to the left
        if (r2.right <= r1.right - 5) {
          const verticalOverlap = Math.abs(dy) < r1.height * 0.7;
          if (verticalOverlap) {
            score = Math.abs(dx) + Math.abs(dy) * 3;
          }
        }
      } else if (direction === "ArrowDown") {
        // Candidate must be strictly below
        if (r2.top >= r1.top + 5) {
          score = dy + Math.abs(dx) * 2;
        }
      } else if (direction === "ArrowUp") {
        // Candidate must be strictly above
        if (r2.bottom <= r1.bottom - 5) {
          score = Math.abs(dy) + Math.abs(dx) * 2;
        }
      }

      if (score < minScore) {
        minScore = score;
        bestCandidate = candidate;
      }
    }

    // 3. ROW WRAP FALLBACK FOR GRIDS IF AT ROW EDGE
    if (!bestCandidate) {
      if (direction === "ArrowRight") {
        // Find first item in the row directly below
        const belowCandidates = focusables.filter((el) => {
          const r2 = el.getBoundingClientRect();
          return r2.top >= r1.bottom + 5;
        });
        if (belowCandidates.length > 0) {
          // Pick the leftmost candidate below
          belowCandidates.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          bestCandidate = belowCandidates[0];
        }
      } else if (direction === "ArrowLeft") {
        // Find last item in the row directly above
        const aboveCandidates = focusables.filter((el) => {
          const r2 = el.getBoundingClientRect();
          return r2.bottom <= r1.top - 5;
        });
        if (aboveCandidates.length > 0) {
          // Pick the rightmost candidate above
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
