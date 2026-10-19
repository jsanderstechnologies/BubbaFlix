import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import CircleRating from "../circle-rating";
import PosterActionModal from "../poster-action-modal";
import { saveLastClickedPoster, restoreLastFocusedPoster } from "../../utils/focusManager";

import "./index.scss";

const CarouselItem = ({ item, endpoint, url, sectionId }) => {
	const navigate = useNavigate();
	const [showActionModal, setShowActionModal] = useState(false);
	const timerRef = useRef(null);
	const keyTimerRef = useRef(null);
	const pressStartTimeRef = useRef(0);
	const isLongPressRef = useRef(false);

	const touchStartPosRef = useRef(null);
	const touchMovedRef = useRef(false);
	const isTouchActiveRef = useRef(false);
	const touchResetTimerRef = useRef(null);
	const mouseStartPosRef = useRef(null);
	const mouseMovedRef = useRef(false);

	const posterBase = url?.poster || "https://image.tmdb.org/t/p/w500";
	const posterUrl = item.poster_path ? posterBase + item.poster_path : PosterFallback;
	const targetType = item.media_type || endpoint || (item.name ? "tv" : "movie");
	const posterKey = sectionId ? `poster-${sectionId}-${targetType}-${item.id}` : `poster-${targetType}-${item.id}`;

	useEffect(() => {
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
			if (touchResetTimerRef.current) clearTimeout(touchResetTimerRef.current);
		};
	}, []);

	const handleSelect = () => {
		saveLastClickedPoster(item.id, targetType, sectionId);
		navigate(`/${targetType}/${item.id}`);
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

		// If user was scrolling the carousel, do NOT open details screen or modal!
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

	const handleContextMenu = (e) => {
		e.preventDefault();
		e.stopPropagation();
		if (timerRef.current) clearTimeout(timerRef.current);
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
		if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
			e.preventDefault();
			e.stopPropagation();
			if (e.repeat) {
				if (!isLongPressRef.current) {
					isLongPressRef.current = true;
					if (timerRef.current) clearTimeout(timerRef.current);
					setShowActionModal(true);
				}
				return;
			}
			isLongPressRef.current = false;
			pressStartTimeRef.current = Date.now();
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				isLongPressRef.current = true;
				setShowActionModal(true);
			}, 500);
		}
	};

	const handleKeyUp = (e) => {
		const code = e.keyCode;
		if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
			e.preventDefault();
			e.stopPropagation();
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			if (!isLongPressRef.current && pressStartTimeRef.current > 0) {
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
				className="carouselItem"
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
					<Img src={posterUrl} />
					<CircleRating rating={Number(item.vote_average || 0).toFixed(1)} />
				</div>
				<div className="textBlock">
					<span className="title">{item.title || item.name}</span>
					<span className="date">
						{dayjs(item.release_date || item.first_air_date).format("MMM D, YYYY")}
					</span>
				</div>
			</div>

			<PosterActionModal
				isOpen={showActionModal}
				onClose={() => setShowActionModal(false)}
				item={item}
				mediaType={targetType}
				sectionId={sectionId}
			/>
		</>
	);
};

const Carousel = ({ data, loading, endpoint, title, sectionId }) => {
	const { url } = useSelector((state) => state.home);

	useEffect(() => {
		if (!loading && Array.isArray(data) && data.length > 0) {
			restoreLastFocusedPoster();
		}
	}, [data, loading]);

	const skItem = () => {
		return (
			<div className="skeletonItem">
				<div className="posterBlock skeleton"></div>
				<div className="textBlock">
					<div className="title skeleton"></div>
					<div className="date skeleton"></div>
				</div>
			</div>
		);
	};

	return (
		<div className="carousel" data-section-id={sectionId || undefined}>
			<ContentWrapper>
				{title && <div className="carouselTitle">{title}</div>}
				{!loading ? (
					<div className="carouselItems">
						{data?.map((item) => (
							<CarouselItem key={item.id} item={item} endpoint={endpoint} url={url} sectionId={sectionId} />
						))}
					</div>
				) : (
					<div className="loadingSkeleton">
						{skItem()}
						{skItem()}
						{skItem()}
						{skItem()}
						{skItem()}
					</div>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Carousel;
