// D-Pad / Smart TV Remote Spatial Navigation & Keyboard Control Engine for BubbaFlix

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
    // Exclude logo elements and carousel arrows from D-Pad spatial navigation focus
    if (
      el.classList.contains("logo") ||
      el.classList.contains("navLogo") ||
      el.closest(".logo") ||
      el.closest(".navLogo") ||
      el.classList.contains("arrow") ||
      el.classList.contains("carouselLeftNav") ||
      el.classList.contains("carouselRightNav")
    ) {
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
    const containerLeft = parentCarousel.scrollLeft;
    const containerWidth = parentCarousel.offsetWidth;

    // Edge-aware carousel scrolling: prevent jumping to middle items
    if (itemLeft + itemWidth > containerLeft + containerWidth - 40) {
      parentCarousel.scrollTo({
        left: itemLeft + itemWidth - containerWidth + 60,
        behavior: "smooth",
      });
    } else if (itemLeft < containerLeft + 40) {
      parentCarousel.scrollTo({
        left: Math.max(0, itemLeft - 60),
        behavior: "smooth",
      });
    }
  } else {
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }
};

// Global TV Soft Keyboard Suppressor
if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        if (!target.getAttribute("data-editing-active")) {
          target.setAttribute("inputmode", "none");
          target.setAttribute("readonly", "readonly");
        }
      }
    },
    true
  );

  document.addEventListener(
    "focusout",
    (e) => {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        target.removeAttribute("data-editing-active");
        target.setAttribute("inputmode", "none");
        target.setAttribute("readonly", "readonly");
      }
    },
    true
  );
}

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

    // Ignore spatial navigation if video player modal is active or if user is actively typing with open soft keyboard
    if (
      document.body.classList.contains("videoPlayerActive") ||
      (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") && activeEl.getAttribute("data-editing-active") === "true")
    ) {
      if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
        if (activeEl) {
          activeEl.removeAttribute("data-editing-active");
          activeEl.setAttribute("readonly", "readonly");
          activeEl.blur();
        }
      }
      return;
    }

    // Handle Smart TV Back Button
    if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
      if (document.body.classList.contains("videoPlayerActive")) {
        return;
      }
      if (window.location.pathname !== "/") {
        e.preventDefault();
        window.history.back();
        return;
      }
      e.preventDefault();
      if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.promptExitApp === "function") {
        window.AndroidPlayer.promptExitApp();
      }
      return;
    }

    // D-Pad Action (Select / OK / Enter) Button Press
    if (key === "Select" || code === 23 || code === 66 || (key === "Enter" && activeEl && activeEl.tagName === "INPUT")) {
      if (activeEl && activeEl !== document.body) {
        if (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") {
          e.preventDefault();
          activeEl.setAttribute("data-editing-active", "true");
          activeEl.removeAttribute("readonly");
          activeEl.setAttribute("inputmode", "text");
          activeEl.focus();
          if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.showKeyboard === "function") {
            window.AndroidPlayer.showKeyboard();
          }
          return;
        }

        if (activeEl.tagName !== "BUTTON" && activeEl.tagName !== "A" && activeEl.tagName !== "SELECT") {
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
    const inRowContainer = activeEl.closest(".carouselItems") || activeEl.closest(".menuItems") || activeEl.closest(".navLinks") || activeEl.closest(".content");
    if (inRowContainer) {
      if (direction === "ArrowRight" && activeEl.nextElementSibling) {
        if (focusables.includes(activeEl.nextElementSibling)) {
          const rNext = activeEl.nextElementSibling.getBoundingClientRect();
          if (Math.abs(rNext.top - r1.top) < r1.height * 0.7) {
            focusAndScroll(activeEl.nextElementSibling);
            return;
          }
        }
      }
      if (direction === "ArrowLeft" && activeEl.previousElementSibling) {
        if (focusables.includes(activeEl.previousElementSibling)) {
          const rPrev = activeEl.previousElementSibling.getBoundingClientRect();
          if (Math.abs(rPrev.top - r1.top) < r1.height * 0.7) {
            focusAndScroll(activeEl.previousElementSibling);
            return;
          }
        }
      }
    }

    // 2. ROW-BOUNDARY VERTICAL & HORIZONTAL NAVIGATION ENGINE
    let candidates = [];
    const inTopNav = activeEl.closest(".topNav") || activeEl.closest(".header") || activeEl.closest(".navLinks") || activeEl.closest(".navSearch");

    if (direction === "ArrowDown") {
      if (inTopNav) {
        candidates = focusables.filter((el) => {
          return !el.closest(".topNav") && !el.closest(".header") && !el.closest(".navLinks") && !el.closest(".navSearch");
        });
      } else {
        candidates = focusables.filter((el) => {
          const r2 = el.getBoundingClientRect();
          return r2.top >= r1.bottom - 15 || (r2.top > r1.top + r1.height * 0.5 && el !== activeEl);
        });
      }
    } else if (direction === "ArrowUp") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.bottom <= r1.top + 15 || (r2.bottom < r1.bottom - r1.height * 0.5 && el !== activeEl);
      });
    } else if (direction === "ArrowRight") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.left >= r1.right - 15 && el !== activeEl;
      });
    } else if (direction === "ArrowLeft") {
      candidates = focusables.filter((el) => {
        const r2 = el.getBoundingClientRect();
        return r2.right <= r1.left + 15 && el !== activeEl;
      });
    }

    if (candidates.length > 0) {
      if (direction === "ArrowDown") {
        const minTop = Math.min(...candidates.map((el) => el.getBoundingClientRect().top));
        const rowCandidates = candidates.filter((el) => el.getBoundingClientRect().top <= minTop + 60);

        rowCandidates.sort((a, b) => {
          const rA = a.getBoundingClientRect();
          const rB = b.getBoundingClientRect();
          const cAX = rA.left + rA.width / 2;
          const cBX = rB.left + rB.width / 2;
          return Math.abs(cAX - c1.x) - Math.abs(cBX - c1.x);
        });

        focusAndScroll(rowCandidates[0]);
        return;
      } else if (direction === "ArrowUp") {
        const maxBottom = Math.max(...candidates.map((el) => el.getBoundingClientRect().bottom));
        const rowCandidates = candidates.filter((el) => el.getBoundingClientRect().bottom >= maxBottom - 60);

        rowCandidates.sort((a, b) => {
          const rA = a.getBoundingClientRect();
          const rB = b.getBoundingClientRect();
          const cAX = rA.left + rA.width / 2;
          const cBX = rB.left + rB.width / 2;
          return Math.abs(cAX - c1.x) - Math.abs(cBX - c1.x);
        });

        focusAndScroll(rowCandidates[0]);
        return;
      } else {
        candidates.sort((a, b) => {
          const rA = a.getBoundingClientRect();
          const rB = b.getBoundingClientRect();
          const cA = { x: rA.left + rA.width / 2, y: rA.top + rA.height / 2 };
          const cB = { x: rB.left + rB.width / 2, y: rB.top + rB.height / 2 };
          const distA = Math.hypot(cA.x - c1.x, (cA.y - c1.y) * 2);
          const distB = Math.hypot(cB.x - c1.x, (cB.y - c1.y) * 2);
          return distA - distB;
        });

        focusAndScroll(candidates[0]);
        return;
      }
    }

    // 3. TOP NAVIGATION MENU FALLBACK ON ARROW-UP FROM TOP ROW
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
