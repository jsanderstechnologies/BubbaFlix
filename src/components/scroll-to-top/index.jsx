import { useState, useEffect, useCallback, useRef } from "react";
import { FiArrowUp } from "react-icons/fi";
import "./index.scss";

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const rafIdRef = useRef(null);

  const checkScroll = useCallback(() => {
    if (rafIdRef.current) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const isVideoActive =
        document.body.classList.contains("videoPlayerActive") ||
        Boolean(document.querySelector(".videoPlayerModal.visible, .videoPopup"));

      setIsVisible(scrollY > 400 && !isVideoActive);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [checkScroll]);

  const handleScrollToTop = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    // Provide D-pad focus recovery on TV
    setTimeout(() => {
      const topTarget = document.querySelector(".topNav .navBtn.active, .topNav .navBtn, .detailsPageBackBtn");
      if (topTarget && typeof topTarget.focus === "function") {
        topTarget.focus();
      }
    }, 250);
  };

  const handleKeyDown = (e) => {
    const code = e.keyCode;
    if (
      e.key === "Enter" ||
      e.key === " " ||
      e.key === "Select" ||
      e.key === "Ok" ||
      code === 13 ||
      code === 23 ||
      code === 32 ||
      (code === 66 && e.key !== "b" && e.key !== "B")
    ) {
      handleScrollToTop(e);
    }
  };

  return (
    <button
      type="button"
      className={`scrollToTopBtn ${isVisible ? "visible" : ""}`}
      onClick={handleScrollToTop}
      onKeyDown={handleKeyDown}
      tabIndex={isVisible ? 0 : -1}
      aria-label="Back to top"
      title="Back to top"
    >
      <FiArrowUp className="arrowIcon" />
    </button>
  );
};

export default ScrollToTop;
