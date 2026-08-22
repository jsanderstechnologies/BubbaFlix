import useFetch from "../../hooks/useFetch";
import Cast from "./cast-section";
import DetailsBanner from "./details-banner";
import VideosSection from "./videos-section";
import SeasonsSection from "./seasons-section";
import TopNav from "../../components/top-nav";
import "./index.scss";
import { useParams } from "react-router-dom";

const DetailsPage = () => {
	const { mediaType, id } = useParams();
	const cleanMediaType = mediaType === "tv" || mediaType === "series" ? "tv" : "movie";

	const { data: detailsData } = useFetch(`/${cleanMediaType}/${id}`);
	const { data, loading } = useFetch(`/${cleanMediaType}/${id}/videos`);
	const { data: credits, loading: creditsLoading } = useFetch(
		`/${cleanMediaType}/${id}/credits`
	);

	const title = detailsData?.title || detailsData?.name;

	return (
		<div className="details-page">
			<TopNav />
			<DetailsBanner video={data?.results?.[0]} crew={credits?.crew} />

			{/* Show season dropdown & episode magnet streams ONLY for TV series */}
			{cleanMediaType === "tv" && (
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
