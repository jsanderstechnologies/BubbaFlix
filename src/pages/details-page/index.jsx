import React, { useEffect } from "react";
import useFetch from "../../hooks/useFetch";
import Cast from "./cast-section";
import DetailsBanner from "./details-banner";
import VideosSection from "./videos-section";
import SeasonsSection from "./seasons-section";
import TopNav from "../../components/top-nav";
import { FiArrowLeft } from "react-icons/fi";
import "./index.scss";
import { useParams, useNavigate } from "react-router-dom";

const DetailsPage = () => {
	const { mediaType, id } = useParams();
	const navigate = useNavigate();
	const { data: detailsData } = useFetch(`/${mediaType}/${id}`);
	const { data, loading } = useFetch(`/${mediaType}/${id}/videos`);
	const { data: credits, loading: creditsLoading } = useFetch(
		`/${mediaType}/${id}/credits`
	);

	const title = detailsData?.title || detailsData?.name;

	useEffect(() => {
		document.body.classList.add("detailsPageActive");
		const handleDetailsKeyDown = (e) => {
			const key = e.key;
			const code = e.keyCode;
			if (key === "Escape" || key === "Back" || code === 27 || code === 4 || code === 10009 || code === 461) {
				e.preventDefault();
				e.stopPropagation();
				navigate(-1);
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
				onClick={() => navigate(-1)}
				tabIndex="0"
				aria-label="Go Back"
				title="Go Back"
			>
				<FiArrowLeft />
			</button>
			<TopNav />
			<DetailsBanner video={data?.results?.[0]} crew={credits?.crew} />

			{/* Show season dropdown & episode magnet streams ONLY for TV series */}
			{mediaType === "tv" && (
				<SeasonsSection
					tvId={id}
					seasons={detailsData?.seasons}
					showTitle={title}
				/>
			)}

			<Cast data={credits?.cast} loading={creditsLoading} />
			<VideosSection data={data} loading={loading} />
		</div>
	);
};

export default DetailsPage;
