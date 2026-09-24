import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./index.scss";

const VideoModal = ({ show, setShow, videoId, setVideoId }) => {
	const hidePopup = () => {
		setShow(false);
		setVideoId(null);
	};

	useEffect(() => {
		if (!show) return;

		document.body.classList.add("videoPlayerActive");

		const handleKeyDown = (e) => {
			const key = e.key;
			const code = e.keyCode;
			if (key === "Escape" || key === "Back" || code === 27 || code === 8 || code === 4 || code === 10009 || code === 461) {
				e.preventDefault();
				e.stopPropagation();
				hidePopup();
			}
		};

		window.addEventListener("keydown", handleKeyDown, true);

		return () => {
			document.body.classList.remove("videoPlayerActive");
			window.removeEventListener("keydown", handleKeyDown, true);
		};
	}, [show]);

	if (!show) return null;

	return createPortal(
		<div className={`videoPopup ${show ? "visible" : ""}`}>
			<div className="opacityLayer" onClick={hidePopup}></div>
			<div className="videoPlayer">
				<span
					className="closeBtn"
					tabIndex="0"
					role="button"
					onClick={hidePopup}
					onKeyDown={(e) => {
						const code = e.keyCode;
						if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
							e.preventDefault();
							hidePopup();
						}
					}}
				>
					Close
				</span>
				{videoId && (
					<iframe
						src={`https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&controls=1&rel=0`}
						title="Trailer"
						width="100%"
						height="100%"
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
