// D-Pad / Smart TV Remote Spatial Navigation Engine for BubbaFlix
// Section-Based 2D Spatial Navigation with Top-Left Poster Auto-Focus

export const isTvDevice = () => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return (
    (window.AndroidPlayer && typeof window.AndroidPlayer.playStream === "function") ||
    /TV|AndroidTV|GoogleTV|SmartTV|SMART-TV|NETTV|WebOS|Tizen|BraveTV/i.test(ua) ||
    window.innerWidth <= 1280
  );
};

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
    const posters = Array.from(
      document.querySelectorAll(".movieCard, .posterBlock, .carouselItem, .seasonCard, .episodeItem")
    ).filter((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = getComputedStyle(el);
      return style.visibility !== "hidden" && style.display !== "none" && rect.top >= 0 && rect.top < window.innerHeight;
    });

    if (posters.length > 0) {
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

    const focusables = getFocusableElements();
    if (focusables.length > 0) {
      focusAndScroll(focusables[0]);
    }
  }, 300);
};

export const initDpadNavigation = () => {
  if (typeof window === "undefined") return;

  focusTopLeftPoster();

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

    if (
      document.body.classList.contains("videoPlayerActive") ||
      (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") && activeEl.type === "text")
    ) {
      return;
    }

    if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
      if (window.location.pathname !== "/") {
        e.preventDefault();
        window.history.back();
        return;
      }
    }

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

    e.preventDefault();

    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    if (!activeEl || activeEl === document.body || !focusables.includes(activeEl)) {
      focusTopLeftPoster();
      return;
    }

    const r1 = activeEl.getBoundingClientRect();
    const c1 = { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 };

    // 1. CAROUSEL & ROW DIRECT SIBLING NAVIGATION (Left & Right)
    const inRowContainer = activeEl.closest(".carouselItems") || activeEl.closest(".menuItems") || activeEl.closest(".navLinks");
    if (inRowContainer) {
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

    // 2. UNLOCKED SECTION-BASED UP/DOWN/LEFT/RIGHT SPATIAL MOVEMENT
    let candidates = [];

    if (direction === "ArrowDown") {
      // Filter candidates distinctly lower than current item's center/top
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.top >= r1.top + 35 || (r2.top >= r1.bottom - 10 && el !== activeEl);
      });
    } else if (direction === "ArrowUp") {
      // Filter candidates distinctly higher than current item's center/bottom
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.bottom <= r1.bottom - 35 || (r2.bottom <= r1.top + 10 && el !== activeEl);
      });
    } else if (direction === "ArrowRight") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.left >= r1.left + 20 && el !== activeEl;
      });
    } else if (direction === "ArrowLeft") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.right <= r1.right - 20 && el !== activeEl;
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
          scoreA = (cA.y - c1.y) * 2.0 + Math.abs(cA.x - c1.x);
          scoreB = (cB.y - c1.y) * 2.0 + Math.abs(cB.x - c1.x);
        } else if (direction === "ArrowUp") {
          scoreA = (c1.y - cA.y) * 2.0 + Math.abs(cA.x - c1.x);
          scoreB = (c1.y - cB.y) * 2.0 + Math.abs(cB.x - c1.x);
        } else if (direction === "ArrowRight") {
          scoreA = (cA.x - c1.x) * 2.0 + Math.abs(cA.y - c1.y);
          scoreB = (cB.x - c1.x) * 2.0 + Math.abs(cB.y - c1.y);
        } else if (direction === "ArrowLeft") {
          scoreA = (c1.x - cA.x) * 2.0 + Math.abs(cA.y - c1.y);
          scoreB = (c1.x - cB.x) * 2.0 + Math.abs(cB.y - c1.y);
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
