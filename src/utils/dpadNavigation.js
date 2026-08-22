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
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== "hidden"
  );
};

const getDirectionFromEvent = (e) => {
  const key = e.key;
  const code = e.keyCode;

  // Standard Keyboard & Android TV D-Pad KeyCodes
  if (key === "ArrowUp" || code === 38 || code === 19) return "ArrowUp";
  if (key === "ArrowDown" || code === 40 || code === 20) return "ArrowDown";
  if (key === "ArrowLeft" || code === 37 || code === 21) return "ArrowLeft";
  if (key === "ArrowRight" || code === 39 || code === 22) return "ArrowRight";

  return null;
};

const getDistance = (activeEl, candidateEl, direction) => {
  const rect1 = activeEl.getBoundingClientRect();
  const rect2 = candidateEl.getBoundingClientRect();

  const c1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
  const c2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  const inCarousel = !!activeEl.closest(".carouselItems");

  // In horizontal carousels (home page), keep left/right locked to the carousel row
  if (inCarousel && (direction === "ArrowLeft" || direction === "ArrowRight")) {
    if (Math.abs(dy) > 80) return Infinity;
    if (direction === "ArrowLeft" && dx >= -5) return Infinity;
    if (direction === "ArrowRight" && dx <= 5) return Infinity;
    return Math.abs(dx) + Math.abs(dy) * 4;
  }

  // Grid Navigation (Explore Movies, Explore TV Shows, Search Results)
  if (direction === "ArrowRight") {
    // 1. Prefer items directly to the right on the same row
    if (dx > 5 && Math.abs(dy) < rect1.height * 0.8) {
      return dx + Math.abs(dy) * 2;
    }
    // 2. Wrap to start of next row if at end of current row
    if (dy > 20 && dx < 0) {
      return dy * 2 + Math.abs(dx);
    }
    return Infinity;
  }

  if (direction === "ArrowLeft") {
    // 1. Prefer items directly to the left on the same row
    if (dx < -5 && Math.abs(dy) < rect1.height * 0.8) {
      return Math.abs(dx) + Math.abs(dy) * 2;
    }
    // 2. Wrap to end of previous row if at start of current row
    if (dy < -20 && dx > 0) {
      return Math.abs(dy) * 2 + dx;
    }
    return Infinity;
  }

  if (direction === "ArrowDown") {
    if (dy <= 5) return Infinity;
    // Weight horizontal distance to keep focus in the closest grid column
    return dy + Math.abs(dx) * 2.5;
  }

  if (direction === "ArrowUp") {
    if (dy >= -5) return Infinity;
    return Math.abs(dy) + Math.abs(dx) * 2.5;
  }

  return Infinity;
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

    // Handle Smart TV Back Button (Escape = 27, Samsung = 10009, LG = 461, Android Back = 4)
    if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
      if (window.location.pathname !== "/") {
        e.preventDefault();
        window.history.back();
        return;
      }
    }

    // Android TV Center / OK / Select button simulation on focused non-buttons
    if (key === "Select" || code === 23 || code === 66) {
      if (activeEl && activeEl !== document.body) {
        if (activeEl.tagName !== "BUTTON" && activeEl.tagName !== "A" && activeEl.tagName !== "INPUT" && activeEl.tagName !== "SELECT") {
          e.preventDefault();
          activeEl.click();
          return;
        }
      }
    }

    // D-Pad Navigation Direction
    const direction = getDirectionFromEvent(e);
    if (!direction) return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    // Function to safely focus & scroll candidate element into view
    const focusAndScroll = (el) => {
      el.focus();

      // If item is inside a horizontal carousel container, scroll container to keep item centered
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

    // If no valid active element, focus the first available item
    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      e.preventDefault();
      focusAndScroll(focusables[0]);
      return;
    }

    let bestCandidate = null;
    let minDistance = Infinity;

    for (const candidate of focusables) {
      if (candidate === activeEl) continue;
      const dist = getDistance(activeEl, candidate, direction);

      if (dist < minDistance) {
        minDistance = dist;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      e.preventDefault();
      focusAndScroll(bestCandidate);
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
};
