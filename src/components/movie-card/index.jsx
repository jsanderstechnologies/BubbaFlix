/* eslint-disable react/prop-types */
import React from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import { getWatchProgress } from "../../utils/watchProgress";
import { saveLastClickedPoster } from "../../utils/focusManager";
import "./index.scss";
import Img from "../lazy-load";
import CircleRating from "../circle-rating";
import PosterFallback from "../../assets/no-poster.png";

import PosterActionModal from "../poster-action-modal";

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const MovieCard = ({ data, fromSearch, mediaType, sectionId = "" }) => {
	const { url } = useSelector((state) => state.home);
	const navigate = useNavigate();
	const [showActionModal, setShowActionModal] = React.useState(false);
	const timerRef = React.useRef(null);
	const keyTimerRef = React.useRef(null);
	const pressStartTimeRef = React.useRef(0);
	const isLongPressRef = React.useRef(false);
	
	const touchStartPosRef = React.useRef(null);
	const touchMovedRef = React.useRef(false);
	const isTouchActiveRef = React.useRef(false);
	const touchResetTimerRef = React.useRef(null);
	const mouseStartPosRef = React.useRef(null);
	const mouseMovedRef = React.useRef(false);
	
	const posterBase = url?.poster || DEFAULT_IMAGE_BASE;
	const posterUrl = data.poster_path
		? posterBase + data.poster_path
		: PosterFallback;

	const prog = getWatchProgress(data.id, data.media_type || mediaType);
	const progressPercent = prog?.progressPercent || 0;

	const targetType = data.media_type || mediaType || (data.name ? "tv" : "movie");
	const posterKey = sectionId ? `poster-${sectionId}-${targetType}-${data.id}` : `poster-${targetType}-${data.id}`;

	React.useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			if (touchResetTimerRef.current) clearTimeout(touchResetTimerRef.current);
		};
	}, []);

	const handleSelect = () => {
		saveLastClickedPoster(data.id, targetType, sectionId);
		navigate(`/${targetType}/${data.id}`);
	};

	// Touch handlers (Phone / Tablet touchscreens)
	const handleTouchStart = (e) => {
		isTouchActiveRef.current = true;
		if (touchResetTimerRef.current) clearTimeout(touchResetTimerRef.current);

		const touch = e.touches[0];
		touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
		touchMovedRef.current = false;
		isLongPressRef.current = false;
		pressStartTimeRef.current = Date.now();

		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			if (!touchMovedRef.current) {
				isLongPressRef.current = true;
				setShowActionModal(true);
			}
		}, 500);
	};

	const handleTouchMove = (e) => {
		if (!touchStartPosRef.current || !e.touches[0]) return;
		const touch = e.touches[0];
		const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
		const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

		// If user moves more than 8px, it is a scroll gesture -> cancel long press immediately!
		if (dx > 8 || dy > 8) {
			touchMovedRef.current = true;
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const handleTouchEnd = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		touchResetTimerRef.current = setTimeout(() => {
			isTouchActiveRef.current = false;
		}, 600);

		// If user was scrolling, do NOT open details screen or modal!
		if (touchMovedRef.current) {
			touchMovedRef.current = false;
			touchStartPosRef.current = null;
			isLongPressRef.current = false;
			pressStartTimeRef.current = 0;
			return;
		}

		// If long press triggered modal, do not navigate
		if (isLongPressRef.current) {
			isLongPressRef.current = false;
			touchStartPosRef.current = null;
			pressStartTimeRef.current = 0;
			return;
		}

		// Clean tap without moving -> open details page
		const duration = pressStartTimeRef.current > 0 ? Date.now() - pressStartTimeRef.current : 0;
		if (duration < 500) {
			handleSelect();
		}

		touchStartPosRef.current = null;
		pressStartTimeRef.current = 0;
	};

	const handleTouchCancel = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		touchMovedRef.current = false;
		touchStartPosRef.current = null;
		isLongPressRef.current = false;
		pressStartTimeRef.current = 0;
		touchResetTimerRef.current = setTimeout(() => {
			isTouchActiveRef.current = false;
		}, 600);
	};

	// Mouse handlers (Desktop PC)
	const handleMouseDown = (e) => {
		if (isTouchActiveRef.current) return;
		if (e.button !== 0) return;

		mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
		mouseMovedRef.current = false;
		isLongPressRef.current = false;
		pressStartTimeRef.current = Date.now();

		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			if (!mouseMovedRef.current) {
				isLongPressRef.current = true;
				setShowActionModal(true);
			}
		}, 500);
	};

	const handleMouseMove = (e) => {
		if (!mouseStartPosRef.current) return;
		const dx = Math.abs(e.clientX - mouseStartPosRef.current.x);
		const dy = Math.abs(e.clientY - mouseStartPosRef.current.y);
		if (dx > 8 || dy > 8) {
			mouseMovedRef.current = true;
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		}
	};

	const handleMouseUp = (e) => {
		if (isTouchActiveRef.current) return;
		if (e.button !== 0) return;

		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		if (mouseMovedRef.current) {
			mouseMovedRef.current = false;
			mouseStartPosRef.current = null;
			isLongPressRef.current = false;
			pressStartTimeRef.current = 0;
			return;
		}

		if (isLongPressRef.current) {
			isLongPressRef.current = false;
			mouseStartPosRef.current = null;
			pressStartTimeRef.current = 0;
			return;
		}

		const duration = pressStartTimeRef.current > 0 ? Date.now() - pressStartTimeRef.current : 0;
		if (duration < 500) {
			handleSelect();
		}

		mouseStartPosRef.current = null;
		pressStartTimeRef.current = 0;
	};

	const handleMouseLeave = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		mouseStartPosRef.current = null;
		mouseMovedRef.current = false;
		isLongPressRef.current = false;
		pressStartTimeRef.current = 0;
	};

	const handleClick = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const isEnterOrDpad = (e) => {
		const code = e.keyCode;
		const key = e.key;
		return (
			key === "Enter" ||
			key === " " ||
			key === "Select" ||
			key === "Ok" ||
			key === "Accept" ||
			code === 13 ||
			code === 23 ||
			code === 66 ||
			code === 32
		);
	};

	const handleContextMenu = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (timerRef.current) clearTimeout(timerRef.current);
		if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
		isLongPressRef.current = true;
		setShowActionModal(true);
	};

	const handleKeyDown = (e) => {
		const code = e.keyCode;
		if (e.key === "ContextMenu" || code === 93 || code === 461 || code === 10009) {
			e.preventDefault();
			e.stopPropagation();
			handleContextMenu(e);
			return;
		}
		if (isEnterOrDpad(e)) {
			e.preventDefault();
			e.stopPropagation();
			if (e.repeat) {
				if (!isLongPressRef.current) {
					isLongPressRef.current = true;
					if (timerRef.current) clearTimeout(timerRef.current);
					if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
					setShowActionModal(true);
				}
				return;
			}
			isLongPressRef.current = false;
			pressStartTimeRef.current = Date.now();
			if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
			keyTimerRef.current = setTimeout(() => {
				isLongPressRef.current = true;
				setShowActionModal(true);
			}, 400);
		}
	};

	const handleKeyUp = (e) => {
		if (isEnterOrDpad(e)) {
			e.preventDefault();
			e.stopPropagation();
			if (keyTimerRef.current) {
				clearTimeout(keyTimerRef.current);
				keyTimerRef.current = null;
			}
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			const duration = pressStartTimeRef.current > 0 ? Date.now() - pressStartTimeRef.current : 0;
			if (!isLongPressRef.current && pressStartTimeRef.current > 0 && duration < 400) {
				handleSelect();
			}
			isLongPressRef.current = false;
			pressStartTimeRef.current = 0;
		}
	};

	return (
		<>
			<div
				id={posterKey}
				data-poster-id={posterKey}
				className="movieCard"
				tabIndex="0"
				role="button"
				onClick={handleClick}
				onContextMenu={handleContextMenu}
				onMouseDown={handleMouseDown}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onMouseLeave={handleMouseLeave}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
				onTouchCancel={handleTouchCancel}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
			>
				<div className="posterBlock">
					<Img className="posterImg" src={posterUrl} />
					{progressPercent > 0 && (
						<div className="cardProgressBar">
							<div
								className="cardProgressFill"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>
					)}
					{!fromSearch && data.vote_average !== undefined && (
						<React.Fragment>
							<CircleRating rating={Number(data.vote_average).toFixed(1)} />
						</React.Fragment>
					)}
				</div>
				<div className="textBlock">
					<span className="title">{data.title || data.name}</span>
					<span className="date">
						{dayjs(data.release_date || data.first_air_date).format("MMM D, YYYY")}
					</span>
				</div>
			</div>

			<PosterActionModal
				isOpen={showActionModal}
				onClose={() => setShowActionModal(false)}
				item={data}
				mediaType={targetType}
				sectionId={sectionId}
			/>
		</>
	);
};

export default MovieCard;
