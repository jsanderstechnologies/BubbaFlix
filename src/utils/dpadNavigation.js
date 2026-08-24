// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Completely Unlocked, Predictable 2D Spatial Navigation with Top-Left Poster Auto-Focus

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

  // Watch for page route changes
  const handleRouteChange = () => {
    focusTopLeftPoster();
  };

  window.addEventListener("popstate", handleRouteChange);

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

    // 1. CAROUSEL & ROW HORIZONTAL NAVIGATION (Left & Right)
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

    // 2. UNLOCKED SPATIAL NAVIGATION (Up, Down, Left, Right)
    const r1 = activeEl.getBoundingClientRect();
    const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };

    let candidates = [];

    if (direction === "ArrowDown") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.top >= r1.top + 10;
      });
    } else if (direction === "ArrowUp") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.bottom <= r1.bottom - 10;
      });
    } else if (direction === "ArrowRight") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.left >= r1.left + 10;
      });
    } else if (direction === "ArrowLeft") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.right <= r1.right - 10;
      });
    }

    if (candidates.length > 0) {
      // Sort candidates by spatial distance favoring primary axis movement
      candidates.sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        const cA = { x: rA.left + rA.width / 2, y: rA.top + rA.height / 2 };
        const cB = { x: rB.left + rB.width / 2, y: rB.top + rB.height / 2 };

        let scoreA = 0;
        let scoreB = 0;

        if (direction === "ArrowDown") {
          scoreA = (cA.y - c1.y) + Math.abs(cA.x - c1.x) * 0.5;
          scoreB = (cB.y - c1.y) + Math.abs(cB.x - c1.x) * 0.5;
        } else if (direction === "ArrowUp") {
          scoreA = (c1.y - cA.y) + Math.abs(cA.x - c1.x) * 0.5;
          scoreB = (c1.y - cB.y) + Math.abs(cB.x - c1.x) * 0.5;
        } else if (direction === "ArrowRight") {
          scoreA = (cA.x - c1.x) + Math.abs(cA.y - c1.y) * 0.5;
          scoreB = (cB.x - c1.x) + Math.abs(cB.y - c1.y) * 0.5;
        } else if (direction === "ArrowLeft") {
          scoreA = (c1.x - cA.x) + Math.abs(cA.y - c1.y) * 0.5;
          scoreB = (c1.x - cB.x) + Math.abs(cB.y - c1.y) * 0.5;
        }

        return scoreA - scoreB;
      });

      focusAndScroll(candidates[0]);
      return;
    }

    // 3. TOP NAVIGATION MENU FALLBACK ON ARROW-UP FROM TOP CONTENT ROW
    if (direction === "ArrowUp") {
      const navButtons = focusables.filter((el) => el.closest(".topNav") || el.closest(".header") || el.classList.contains("navBtn") || el.classList.contains("menuItem"));
      if (navButtons.length > 0) {
        navButtons.sort((a, b) => {
          const rA = a.getBoundingClientRect();
          const rB = b.getBoundingClientRect();
          return Math.abs(rA.left - c1.x) - Math.abs(rB.left - c1.x);
        });
        focusAndScroll(navButtons[0]);
      }
    }
  };

  window.addEventListener("keydown", handleKeyDown, true);

  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("popstate", handleRouteChange);
  };
};
