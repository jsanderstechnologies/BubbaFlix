import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import CircleRating from "../circle-rating";
import PosterActionModal from "../poster-action-modal";
import { saveLastClickedPoster } from "../../utils/focusManager";

import "./index.scss";

const CarouselItem = ({ item, endpoint, url, sectionId }) => {
	const navigate = useNavigate();
	const [showActionModal, setShowActionModal] = useState(false);
	const timerRef = useRef(null);
	const keyTimerRef = useRef(null);
	const pressStartTimeRef = useRef(0);
	const isLongPressRef = useRef(false);

	const posterBase = url?.poster || "https://image.tmdb.org/t/p/original";
	const posterUrl = item.poster_path ? posterBase + item.poster_path : PosterFallback;
	const targetType = item.media_type || endpoint || (item.name ? "tv" : "movie");
	const posterKey = sectionId ? `poster-${sectionId}-${targetType}-${item.id}` : `poster-${targetType}-${item.id}`;

	const handleSelect = () => {
		saveLastClickedPoster(item.id, targetType, sectionId);
		navigate(`/${targetType}/${item.id}`);
	};

	const startPress = () => {
		isLongPressRef.current = false;
		pressStartTimeRef.current = Date.now();
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			isLongPressRef.current = true;
			setShowActionModal(true);
		}, 380);
	};

	const endPress = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
		const pressDuration = pressStartTimeRef.current > 0 ? Date.now() - pressStartTimeRef.current : 0;
		if (!isLongPressRef.current && pressDuration > 0 && pressDuration < 380) {
			handleSelect();
		}
		isLongPressRef.current = false;
		pressStartTimeRef.current = 0;
	};

	const cancelPress = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
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
			startPress();
		}
	};

	const handleKeyUp = (e) => {
		const code = e.keyCode;
		if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
			e.preventDefault();
			e.stopPropagation();
			endPress();
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
				onMouseDown={startPress}
				onMouseUp={endPress}
				onMouseLeave={cancelPress}
				onTouchStart={startPress}
				onTouchEnd={endPress}
				onTouchCancel={cancelPress}
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
		<div className="carousel">
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
