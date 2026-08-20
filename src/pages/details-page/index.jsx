import useFetch from "../../hooks/useFetch";
import Cast from "./cast-section";
import DetailsBanner from "./details-banner";
import VideosSection from "./videos-section";
import SeasonsSection from "./seasons-section";
import "./index.scss";
import { useParams } from "react-router-dom";

const DetailsPage = () => {
	const { mediaType, id } = useParams();
	const { data: detailsData } = useFetch(`/${mediaType}/${id}`);
	const { data, loading } = useFetch(`/${mediaType}/${id}/videos`);
	const { data: credits, loading: creditsLoading } = useFetch(
		`/${mediaType}/${id}/credits`
	);

	const title = detailsData?.title || detailsData?.name;

	return (
		<div className="details-page">
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
