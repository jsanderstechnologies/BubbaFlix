import React, { useEffect } from "react";
import useFetch from "../../hooks/useFetch";
import Cast from "./cast-section";
import DetailsBanner from "./details-banner";
import SeasonsSection from "./seasons-section";
import TopNav from "../../components/top-nav";
import { FiArrowLeft } from "react-icons/fi";
import "./index.scss";
import { useParams, useNavigate } from "react-router-dom";
import { restoreLastFocusedPoster, goBackToSource } from "../../utils/focusManager";
import { getOfficialTrailer } from "../../utils/filterUtils";

const DetailsPage = () => {
	const { mediaType, id } = useParams();
	const navigate = useNavigate();
	const { data: detailsData } = useFetch(`/${mediaType}/${id}`);
	const { data: videosData } = useFetch(`/${mediaType}/${id}/videos?include_video_language=en,null`);
	const { data: credits, loading: creditsLoading } = useFetch(
		`/${mediaType}/${id}/credits`
	);

	const title = detailsData?.title || detailsData?.name;
	const officialTrailer = getOfficialTrailer(videosData?.results);

	useEffect(() => {
		window.scrollTo(0, 0);
		if (document.documentElement) document.documentElement.scrollTop = 0;
		if (document.body) document.body.scrollTop = 0;
	}, [id, mediaType]);

	useEffect(() => {
		document.body.classList.add("detailsPageActive");
		const handleDetailsKeyDown = (e) => {
			const key = e.key;
			const code = e.keyCode;
			if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
				// Don't navigate away if trailer modal or video player is currently active
				if (
					document.body.classList.contains("videoPlayerActive") ||
					document.querySelector(".videoPopup, .videoPlayerModal, .videoModalOverlay")
				) {
					return;
				}
				// Don't navigate away if a modal was closed within the last 600ms (prevent double-back)
				if (window.__lastModalClosedAt && Date.now() - window.__lastModalClosedAt < 600) {
					e.preventDefault();
					e.stopPropagation();
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				goBackToSource(navigate);
			}
		};
		window.addEventListener("keydown", handleDetailsKeyDown, true);
		return () => {
			document.body.classList.remove("detailsPageActive");
			window.removeEventListener("keydown", handleDetailsKeyDown, true);
		};
	}, [navigate]);



	return (
		<div className="details-page">
			<button
				className="detailsPageBackBtn"
				onClick={() => goBackToSource(navigate)}
				tabIndex="0"
				aria-label="Go Back"
				title="Go Back"
			>
				<FiArrowLeft />
			</button>
			<TopNav />
			<DetailsBanner video={officialTrailer} crew={credits?.crew} />

			{/* Show season dropdown & episode magnet streams ONLY for TV series */}
			{mediaType === "tv" && (
				<SeasonsSection
					tvId={id}
					seasons={detailsData?.seasons}
					showTitle={title}
					posterPath={detailsData?.poster_path}
				/>
			)}

			<Cast data={credits?.cast} loading={creditsLoading} />
					</div>
	);
};

export default DetailsPage;
