import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./index.scss";

const VideoModal = ({ show, setShow, videoId, setVideoId }) => {
	const containerRef = useRef(null);
	const iframeRef = useRef(null);
	const previousFocusRef = useRef(null);

	const hidePopup = (syncHistory = true) => {
		if (typeof window !== "undefined") {
			window.__lastModalClosedAt = Date.now();
			if (syncHistory && window.history?.state?.bubbaflixModal === "trailer") {
				window.history.back();
			}
		}
		if (typeof document !== "undefined" && (document.fullscreenElement || document.webkitFullscreenElement)) {
			if (document.exitFullscreen) {
				document.exitFullscreen().catch(() => {});
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen().catch?.(() => {});
			}
		}
		setShow(false);
		setVideoId(null);
	};

	useEffect(() => {
		if (!show) return;

		previousFocusRef.current = document.activeElement;
		document.body.classList.add("videoPlayerActive");

		// Global helper so host Activity, dpadNavigation, and back handlers can close the trailer directly
		if (typeof window !== "undefined") {
			window.__closeTrailerModal = () => hidePopup(true);
		}

		// Push history state so that browser / hardware back button closes the modal instead of navigating back in router history
		if (typeof window !== "undefined" && window.history && window.history.state?.bubbaflixModal !== "trailer") {
			window.history.pushState({ ...(window.history.state || {}), bubbaflixModal: "trailer" }, "");
		}

		// Focus trailer window initially
		const timer = setTimeout(() => {
			if (iframeRef.current && typeof iframeRef.current.focus === "function") {
				iframeRef.current.focus();
			} else if (containerRef.current && typeof containerRef.current.focus === "function") {
				containerRef.current.focus();
			}
		}, 80);

		// Global focus trap: ensure focus never escapes the trailer modal to background elements
		const handleFocusTrap = (e) => {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				e.preventDefault();
				e.stopPropagation();
				if (iframeRef.current && typeof iframeRef.current.focus === "function") {
					iframeRef.current.focus();
				} else if (containerRef.current && typeof containerRef.current.focus === "function") {
					containerRef.current.focus();
				}
			}
		};

		const handleKeyDown = (e) => {
			const key = e.key;
			const code = e.keyCode || e.which;

			// Handle Back / Escape keys across all TV remotes
			if (
				key === "Escape" ||
				key === "Back" ||
				key === "BrowserBack" ||
				key === "GoBack" ||
				code === 27 ||
				code === 8 ||
				code === 4 ||
				code === 10009 ||
				code === 461
			) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				hidePopup(true);
				return;
			}

			// Keep focus strictly within trailer window
			if (
				key === "Tab" ||
				key === "ArrowDown" ||
				key === "ArrowUp" ||
				key === "ArrowLeft" ||
				key === "ArrowRight"
			) {
				e.preventDefault();
				e.stopPropagation();
				if (iframeRef.current && typeof iframeRef.current.focus === "function") {
					iframeRef.current.focus();
				} else if (containerRef.current && typeof containerRef.current.focus === "function") {
					containerRef.current.focus();
				}
				return;
			}
		};

		const handleKeyUp = (e) => {
			const key = e.key;
			const code = e.keyCode || e.which;
			if (
				key === "Escape" ||
				key === "Back" ||
				key === "BrowserBack" ||
				key === "GoBack" ||
				code === 27 ||
				code === 8 ||
				code === 4 ||
				code === 10009 ||
				code === 461
			) {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			}
		};

		const handlePopState = () => {
			hidePopup(false);
		};

		const handleFullscreenChange = () => {
			if (!document.fullscreenElement && !document.webkitFullscreenElement) {
				hidePopup(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);
		window.addEventListener("popstate", handlePopState);
		document.addEventListener("focusin", handleFocusTrap, true);
		document.addEventListener("fullscreenchange", handleFullscreenChange);
		document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

		return () => {
			clearTimeout(timer);
			if (typeof window !== "undefined") {
				window.__lastModalClosedAt = Date.now();
				window.__closeTrailerModal = null;
			}
			document.body.classList.remove("videoPlayerActive");
			window.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
			window.removeEventListener("popstate", handlePopState);
			document.removeEventListener("focusin", handleFocusTrap, true);
			document.removeEventListener("fullscreenchange", handleFullscreenChange);
			document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);

			if (typeof document !== "undefined" && (document.fullscreenElement || document.webkitFullscreenElement)) {
				if (document.exitFullscreen) {
					document.exitFullscreen().catch(() => {});
				} else if (document.webkitExitFullscreen) {
					document.webkitExitFullscreen().catch?.(() => {});
				}
			}

			if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
				previousFocusRef.current.focus();
			} else {
				const playBtn = document.querySelector(".detailsBanner .playbtn");
				if (playBtn && typeof playBtn.focus === "function") {
					playBtn.focus();
				}
			}
		};
	}, [show]);

	if (!show) return null;

	return createPortal(
		<div ref={containerRef} className={`videoPopup ${show ? "visible" : ""}`} tabIndex="-1">
			<div className="opacityLayer" onClick={() => hidePopup(true)}></div>
			<div className="videoPlayer">
				{videoId && (
					<iframe
						ref={iframeRef}
						src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1&rel=0&enablejsapi=1&iv_load_policy=3&modestbranding=1`}
						title="Trailer"
						width="100%"
						height="100%"
						tabIndex="0"
						style={{ border: "none" }}
						allow="autoplay; encrypted-media; fullscreen"
						allowFullScreen
					/>
				)}
			</div>
		</div>,
		document.body
	);
};

export default VideoModal;
