/* eslint-disable react/prop-types */
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";

import "./index.scss";

import ContentWrapper from "../../../components/content-wrapper";
import useFetch from "../../../hooks/useFetch";
import PosterFallback from "../../../assets/no-poster.png";
import CircleRating from "../../../components/circle-rating";
import Img from "../../../components/lazy-load";
import { PlayIcon } from "../../../components/play-btn";
import VideoModal from "../../../components/video-modal";

const DetailsBanner = ({ video, crew }) => {
	const [show, setShow] = useState(false);
	const [videoId, setVideoId] = useState(null);

	const { mediaType, id } = useParams();
	const { data, loading } = useFetch(`/${mediaType}/${id}}`);

	const { url } = useSelector((state) => state.home);

	const director = crew?.filter((item) => item.job === "Director");
	const writer = crew?.filter(
		(item) =>
			item.job === "Screenplay" ||
			item.job === "Story" ||
			item.job === "Writer"
	);

	const toHoursAndMinutes = (totalMinutes) => {
		const hours = Math.floor(totalMinutes / 60);
		const minutes = totalMinutes % 60;
		return `${hours}h${minutes > 0 ? ` ${minutes}m` : ""}`;
	};

	return (
		<div className="detailsBanner">
			{!loading ? (
				<div>
					<div className="backdrop-img">
						<Img src={(url?.backdrop || "https://image.tmdb.org/t/p/original") + data?.backdrop_path} />
					</div>
					<div className="opacity-layer"></div>
					<ContentWrapper>
						<div className="content">
							<div className="left">
								{data?.poster_path ? (
									<Img
										classname="posterImg"
										src={(url?.poster || "https://image.tmdb.org/t/p/original") + data?.poster_path}
									/>
								) : (
									<Img
										classname="posterImg"
										src={PosterFallback}
									/>
								)}
							</div>
							<div className="right">
								<div className="title">{`${
									data?.name || data?.title
								} (${dayjs(data?.release_date).format(
									"YYYY"
								)})`}</div>

								<div className="subtitle">{data?.tagline}</div>

								<div className="row">
									<CircleRating
										rating={data?.vote_average.toFixed(1)}
									/>
									<div
										className="playbtn"
										onClick={() => {
											setShow(true);
											setVideoId(video.key);
										}}
									>
										<PlayIcon />
										<span className="text">
											Watch Trailer
										</span>
									</div>
								</div>

								<div className="overview">
									<div className="heading">Overview</div>
									<div className="description">
										{data?.overview}
									</div>
								</div>

								<div className="info">
									{data?.status && (
										<div className="infoItem">
											<span className="text bold">
												Status
											</span>
											<span className="text">
												{data?.status}
											</span>
										</div>
									)}
									{data?.release_date && (
										<div className="infoItem">
											<span className="text bold">
												Release Date
											</span>
											<span className="text">
												{dayjs(
													data?.release_date
												).format("MMM D, YYYY")}
											</span>
										</div>
									)}
									{data?.runtime && (
										<div className="infoItem">
											<span className="text bold">
												Runtime
											</span>
											<span className="text">
												{toHoursAndMinutes(
													data?.runtime
												)}
											</span>
										</div>
									)}
								</div>

								{director?.length > 0 && (
									<div className="info">
										<span className="text bold">
											Director
										</span>
										<span className="text">
											{director?.map((item, index) => (
												<span key={index}>
													{item.name}
													{director?.length - 1 !==
														index && ", "}
												</span>
											))}
										</span>
									</div>
								)}

								{writer?.length > 0 && (
									<div className="info">
										<span className="text bold">
											Writer
										</span>
										<span className="text">
											{writer?.map((item, index) => (
												<span key={index}>
													{item.name}
													{writer?.length - 1 !==
														index && ", "}
												</span>
											))}
										</span>
									</div>
								)}

								{data?.created_by?.length > 0 && (
									<div className="info">
										<span className="text bold">
											Creator
										</span>
										<span className="text">
											{data?.created_by?.map(
												(item, index) => (
													<span key={index}>
														{item.name}
														{data?.created_by
															?.length -
															1 !==
															index && ", "}
													</span>
												)
											)}
										</span>
									</div>
								)}
							</div>
						</div>

						<VideoModal
							show={show}
							setShow={setShow}
							videoId={videoId}
							setVideoId={setVideoId}
						/>
					</ContentWrapper>
				</div>
			) : (
				<div className="detailsBannerSkeleton">
					<ContentWrapper>
						<div className="left skeleton"></div>
						<div className="right">
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
							<div className="row skeleton"></div>
						</div>
					</ContentWrapper>
				</div>
			)}
		</div>
	);
};

export default DetailsBanner;
