// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Compatible with Fire TV, Android TV, Apple TV, LG webOS, Samsung Tizen, and D-Pad remote controls.

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
  ".movieCard",
  ".themeCard",
  ".menuItem",
  ".tabItem",
].join(", ");

const getFocusableElements = () => {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 && el.offsetHeight > 0 && getComputedStyle(el).visibility !== "hidden"
  );
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

    // Handle Smart TV Back Button (Escape = 27, Samsung = 10009, LG = 461)
    if (key === "Escape" || key === "Back" || key === 27 || key === 10009 || key === 461) {
      if (window.location.pathname !== "/") {
        e.preventDefault();
        window.history.back();
        return;
      }
    }

    // D-Pad Navigation Keys
    const isArrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key);
    if (!isArrow) return;

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    const activeEl = document.activeElement;

    // If active element is an input and user presses left/right inside text, don't hijack unless empty
    if (activeEl && activeEl.tagName === "INPUT") {
      if (key === "ArrowLeft" && activeEl.selectionStart !== 0) return;
      if (key === "ArrowRight" && activeEl.selectionEnd !== activeEl.value.length) return;
    }

    // If no valid active element, focus the first available item
    if (!activeEl || !focusables.includes(activeEl)) {
      e.preventDefault();
      focusables[0].focus();
      focusables[0].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      return;
    }

    const activeRect = activeEl.getBoundingClientRect();
    let bestCandidate = null;
    let minDistance = Infinity;

    for (const candidate of focusables) {
      if (candidate === activeEl) continue;
      const candRect = candidate.getBoundingClientRect();
      const dist = getDistance(activeRect, candRect, key);

      if (dist < minDistance) {
        minDistance = dist;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      e.preventDefault();
      bestCandidate.focus();
      bestCandidate.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  window.addEventListener("keydown", handleKeyDown);

  return () => {
    window.removeEventListener("keydown", handleKeyDown);
  };
};
