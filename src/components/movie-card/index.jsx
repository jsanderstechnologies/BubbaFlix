/* eslint-disable react/prop-types */
import React from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import "./index.scss";
import Img from "../lazy-load";
import CircleRating from "../circle-rating";
import PosterFallback from "../../assets/no-poster.png";

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const MovieCard = ({ data, fromSearch, mediaType }) => {
	const { url } = useSelector((state) => state.home);
	const navigate = useNavigate();
	
	const posterBase = url?.poster || DEFAULT_IMAGE_BASE;
	const posterUrl = data.poster_path
		? posterBase + data.poster_path
		: PosterFallback;

	const handleSelect = () => {
		const targetType = data.media_type || mediaType || "movie";
		const targetId = data.id;
		if (targetId) {
			navigate(`/${targetType}/${targetId}`);
		}
	};

	return (
		<div
			className="movieCard"
			tabIndex="0"
			role="button"
			onClick={handleSelect}
			onKeyDown={(e) => {
				const code = e.keyCode;
				if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
					e.preventDefault();
					handleSelect();
				}
			}}
		>
			<div className="posterBlock">
				<Img className="posterImg" src={posterUrl} />
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
	);
};

export default MovieCard;
