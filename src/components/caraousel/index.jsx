import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import CircleRating from "../circle-rating";
import PosterActionModal from "../poster-action-modal";

import "./index.scss";

const CarouselItem = ({ item, endpoint, url }) => {
	const navigate = useNavigate();
	const [showActionModal, setShowActionModal] = useState(false);
	const timerRef = useRef(null);
	const isLongPressRef = useRef(false);

	const posterBase = url?.poster || "https://image.tmdb.org/t/p/original";
	const posterUrl = item.poster_path ? posterBase + item.poster_path : PosterFallback;
	const targetType = item.media_type || endpoint || (item.name ? "tv" : "movie");

	const handleSelect = () => {
		navigate(`/${targetType}/${item.id}`);
	};

	const startPress = () => {
		isLongPressRef.current = false;
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(() => {
			isLongPressRef.current = true;
			setShowActionModal(true);
		}, 500);
	};

	const cancelPress = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const handleClick = (e) => {
		if (isLongPressRef.current) {
			e.preventDefault();
			e.stopPropagation();
			isLongPressRef.current = false;
			return;
		}
		handleSelect();
	};

	const handleContextMenu = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setShowActionModal(true);
	};

	const handleKeyDown = (e) => {
		const code = e.keyCode;
		if (e.key === "ContextMenu" || code === 93 || code === 461 || code === 10009) {
			e.preventDefault();
			setShowActionModal(true);
			return;
		}
		if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
			if (e.repeat) {
				e.preventDefault();
				setShowActionModal(true);
				return;
			}
			e.preventDefault();
			handleSelect();
		}
	};

	return (
		<>
			<div
				className="carouselItem"
				tabIndex="0"
				role="button"
				onClick={handleClick}
				onContextMenu={handleContextMenu}
				onMouseDown={startPress}
				onMouseUp={cancelPress}
				onMouseLeave={cancelPress}
				onTouchStart={startPress}
				onTouchEnd={cancelPress}
				onTouchCancel={cancelPress}
				onKeyDown={handleKeyDown}
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
			/>
		</>
	);
};

const Carousel = ({ data, loading, endpoint, title }) => {
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
							<CarouselItem key={item.id} item={item} endpoint={endpoint} url={url} />
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
