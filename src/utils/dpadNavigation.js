// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Compatible with Android TV, Fire TV, Apple TV, LG webOS, Samsung Tizen, and D-Pad remote controls.

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  ".logo",
  ".menuItem",
  ".headerIconBtn",
  ".movieCard",
  ".carouselItem",
  ".themeCard",
  ".tabItem",
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

const getDistance = (rect1, rect2, direction) => {
  const c1 = { x: rect1.left + rect1.width / 2, y: rect1.top + rect1.height / 2 };
  const c2 = { x: rect2.left + rect2.width / 2, y: rect2.top + rect2.height / 2 };

  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;

  // Enforce direction constraints
  if (direction === "ArrowUp" && dy >= -5) return Infinity;
  if (direction === "ArrowDown" && dy <= 5) return Infinity;
  if (direction === "ArrowLeft" && dx >= -5) return Infinity;
  if (direction === "ArrowRight" && dx <= 5) return Infinity;

  // Weight perpendicular distance higher to prefer straight-line navigation
  if (direction === "ArrowUp" || direction === "ArrowDown") {
    return Math.abs(dy) + Math.abs(dx) * 2;
  } else {
    return Math.abs(dx) + Math.abs(dy) * 2;
  }
};

export const initDpadNavigation = () => {
  if (typeof window === "undefined") return;

  const handleKeyDown = (e) => {
    const key = e.key || e.keyCode;
    const code = e.keyCode;

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
      const active = document.activeElement;
      if (active && active !== document.body) {
        if (active.tagName !== "BUTTON" && active.tagName !== "A" && active.tagName !== "INPUT" && active.tagName !== "SELECT") {
          e.preventDefault();
          active.click();
          return;
        }
      }
    }

    // D-Pad Navigation Direction
    const direction = getDirectionFromEvent(e);
    if (!direction) return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    const activeEl = document.activeElement;

    // If active element is an input and user presses left/right inside text, don't hijack unless empty
    if (activeEl && activeEl.tagName === "INPUT") {
      if (direction === "ArrowLeft" && activeEl.selectionStart !== 0) return;
      if (direction === "ArrowRight" && activeEl.selectionEnd !== activeEl.value.length) return;
    }

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
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    };

    // If no valid active element, focus the first available item
    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      e.preventDefault();
      focusAndScroll(focusables[0]);
      return;
    }

    const activeRect = activeEl.getBoundingClientRect();
    let bestCandidate = null;
    let minDistance = Infinity;

    for (const candidate of focusables) {
      if (candidate === activeEl) continue;
      const candRect = candidate.getBoundingClientRect();
      const dist = getDistance(activeRect, candRect, direction);

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
