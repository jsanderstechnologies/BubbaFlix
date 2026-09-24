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

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const MovieCard = ({ data, fromSearch, mediaType }) => {
	const { url } = useSelector((state) => state.home);
	const navigate = useNavigate();
	const [showActionModal, setShowActionModal] = React.useState(false);
	const timerRef = React.useRef(null);
	const isLongPressRef = React.useRef(false);
	
	const posterBase = url?.poster || DEFAULT_IMAGE_BASE;
	const posterUrl = data.poster_path
		? posterBase + data.poster_path
		: PosterFallback;

	const prog = getWatchProgress(data.id, data.media_type || mediaType);
	const progressPercent = prog?.progressPercent || 0;

	const targetType = data.media_type || mediaType || (data.name ? "tv" : "movie");
	const posterKey = `poster-${targetType}-${data.id}`;

	const handleSelect = () => {
		saveLastClickedPoster(data.id, targetType);
		navigate(`/${targetType}/${data.id}`);
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
				id={posterKey}
				data-poster-id={posterKey}
				className="movieCard"
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
			/>
		</>
	);
};

export default MovieCard;
