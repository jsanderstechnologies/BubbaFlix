/* eslint-disable react/prop-types */
import { useRef } from "react";
import {
	BsFillArrowLeftCircleFill,
	BsFillArrowRightCircleFill,
} from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import CircleRating from "../circle-rating";

import "./index.scss";

const Carousel = ({ data, loading, endpoint, title }) => {
	const carouselContainer = useRef();
	const { url } = useSelector((state) => state.home);
	const navigate = useNavigate();

	const navigation = (direction) => {
		console.log(direction);
		const container = carouselContainer.current;
		console.log(container);

		const scrollAmount =
			direction === "left"
				? container.scrollLeft - (container.offsetWidth + 20)
				: container.scrollLeft + (container.offsetWidth + 20);

		container.scrollTo({
			left: scrollAmount,
			behavior: "smooth",
		});
	};

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
				<BsFillArrowLeftCircleFill
					className="carouselLeftNav arrow"
					onClick={() => navigation("left")}
				/>
				<BsFillArrowRightCircleFill
					className="carouselRightNav arrow"
					onClick={() => navigation("right")}
				/>
				{!loading ? (
					<div className="carouselItems" ref={carouselContainer}>
						{data?.map((item) => {
							const posterBase = url?.poster || "https://image.tmdb.org/t/p/original";
							const posterUrl = item.poster_path
								? posterBase + item.poster_path
								: PosterFallback;
							return (
								<div
									key={item.id}
									className="carouselItem"
									onClick={() =>
										navigate(
											`/${item.media_type || endpoint}/${
												item.id
											}`
										)
									}
								>
									<div className="posterBlock">
										<Img src={posterUrl} />
										<CircleRating
											rating={item.vote_average.toFixed(
												1
											)}
										/>
									</div>
									<div className="textBlock">
										<span className="title">
											{item.title || item.name}
										</span>
										<span className="date">
											{dayjs(
												item.release_date ||
													item.first_air_date
											).format("MMM D, YYYY")}
										</span>
									</div>
								</div>
							);
						})}
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
