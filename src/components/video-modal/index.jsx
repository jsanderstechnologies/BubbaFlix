import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import "./index.scss";

const VideoModal = ({ show, setShow, videoId, setVideoId }) => {
	const containerRef = useRef(null);
	const closeBtnRef = useRef(null);
	const iframeRef = useRef(null);
	const previousFocusRef = useRef(null);

	const hidePopup = (syncHistory = true) => {
		if (typeof window !== "undefined") {
			window.__lastModalClosedAt = Date.now();
			if (syncHistory && window.history?.state?.bubbaflixModal === "trailer") {
				window.history.back();
			}
		}
		if (typeof document !== "undefined" && document.fullscreenElement) {
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

		// Request native fullscreen if available
		if (typeof document !== "undefined" && !document.fullscreenElement) {
			const targetEl = containerRef.current || document.documentElement;
			if (targetEl) {
				if (targetEl.requestFullscreen) {
					targetEl.requestFullscreen().catch(() => {});
				} else if (targetEl.webkitRequestFullscreen) {
					targetEl.webkitRequestFullscreen().catch?.(() => {});
				}
			}
		}

		// Push history state so that browser / hardware back button closes the modal instead of navigating back in router history
		if (typeof window !== "undefined" && window.history && window.history.state?.bubbaflixModal !== "trailer") {
			window.history.pushState({ ...(window.history.state || {}), bubbaflixModal: "trailer" }, "");
		}

		// Focus close button initially
		const timer = setTimeout(() => {
			if (closeBtnRef.current) {
				closeBtnRef.current.focus();
			}
		}, 60);

		// Global focus trap: ensure focus never escapes the trailer modal to background elements
		const handleFocusTrap = (e) => {
			if (containerRef.current && !containerRef.current.contains(e.target)) {
				e.preventDefault();
				e.stopPropagation();
				if (closeBtnRef.current) {
					closeBtnRef.current.focus();
				}
			}
		};

		const handleKeyDown = (e) => {
			const key = e.key;
			const code = e.keyCode;

			// Handle Back / Escape keys across all TV remotes
			if (
				key === "Escape" ||
				key === "Back" ||
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

			// Tab trap between close button and iframe
			if (key === "Tab") {
				e.preventDefault();
				e.stopPropagation();
				if (document.activeElement === closeBtnRef.current) {
					iframeRef.current?.focus();
				} else {
					closeBtnRef.current?.focus();
				}
				return;
			}

			// D-pad navigation trap strictly inside trailer window
			if (key === "ArrowDown" || key === "ArrowRight") {
				if (document.activeElement === closeBtnRef.current) {
					e.preventDefault();
					e.stopPropagation();
					iframeRef.current?.focus();
					return;
				}
			}

			if (key === "ArrowUp" || key === "ArrowLeft") {
				if (document.activeElement !== closeBtnRef.current) {
					e.preventDefault();
					e.stopPropagation();
					closeBtnRef.current?.focus();
					return;
				}
			}
		};

		const handleKeyUp = (e) => {
			const key = e.key;
			const code = e.keyCode;
			if (
				key === "Escape" ||
				key === "Back" ||
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

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);
		window.addEventListener("popstate", handlePopState);
		document.addEventListener("focusin", handleFocusTrap, true);

		return () => {
			clearTimeout(timer);
			if (typeof window !== "undefined") {
				window.__lastModalClosedAt = Date.now();
			}
			document.body.classList.remove("videoPlayerActive");
			window.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
			window.removeEventListener("popstate", handlePopState);
			document.removeEventListener("focusin", handleFocusTrap, true);

			if (typeof document !== "undefined" && document.fullscreenElement) {
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
				<button
					ref={closeBtnRef}
					type="button"
					className="closeBtn"
					tabIndex="0"
					onClick={() => hidePopup(true)}
					onKeyDown={(e) => {
						const code = e.keyCode;
						if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
							e.preventDefault();
							e.stopPropagation();
							e.stopImmediatePropagation();
							hidePopup(true);
						}
					}}
				>
					<FiX size={18} />
					<span>Close Trailer</span>
				</button>
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
