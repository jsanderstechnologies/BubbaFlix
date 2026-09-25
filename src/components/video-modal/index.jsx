import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import "./index.scss";

const VideoModal = ({ show, setShow, videoId, setVideoId }) => {
	const closeBtnRef = useRef(null);
	const previousFocusRef = useRef(null);

	const hidePopup = () => {
		setShow(false);
		setVideoId(null);
	};

	useEffect(() => {
		if (!show) return;

		previousFocusRef.current = document.activeElement;
		document.body.classList.add("videoPlayerActive");

		// Focus close button after modal renders
		const timer = setTimeout(() => {
			if (closeBtnRef.current) {
				closeBtnRef.current.focus();
			}
		}, 60);

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
				hidePopup();
				return;
			}

			// Trap focus on navigation keys (Arrow keys & Tab) inside modal
			if (
				key === "Tab" ||
				key === "ArrowUp" ||
				key === "ArrowDown" ||
				key === "ArrowLeft" ||
				key === "ArrowRight" ||
				(code >= 37 && code <= 40)
			) {
				const active = document.activeElement;
				if (!active || !closeBtnRef.current || !closeBtnRef.current.contains(active)) {
					e.preventDefault();
					closeBtnRef.current?.focus();
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
			}
		};

		window.addEventListener("keydown", handleKeyDown, true);
		window.addEventListener("keyup", handleKeyUp, true);

		return () => {
			clearTimeout(timer);
			document.body.classList.remove("videoPlayerActive");
			window.removeEventListener("keydown", handleKeyDown, true);
			window.removeEventListener("keyup", handleKeyUp, true);
			if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
				previousFocusRef.current.focus();
			}
		};
	}, [show]);

	if (!show) return null;

	return createPortal(
		<div className={`videoPopup ${show ? "visible" : ""}`} tabIndex="-1">
			<div className="opacityLayer" onClick={hidePopup}></div>
			<div className="videoPlayer">
				<button
					ref={closeBtnRef}
					type="button"
					className="closeBtn"
					tabIndex="0"
					onClick={hidePopup}
					onKeyDown={(e) => {
						const code = e.keyCode;
						if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
							e.preventDefault();
							e.stopPropagation();
							hidePopup();
						}
					}}
				>
					<FiX size={18} />
					<span>Close Trailer</span>
				</button>
				{videoId && (
					<iframe
						src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1&rel=0`}
						title="Trailer"
						width="100%"
						height="100%"
						tabIndex="-1"
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
