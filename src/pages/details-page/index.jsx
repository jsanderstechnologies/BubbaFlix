import useFetch from "../../hooks/useFetch";
import Cast from "./cast-section";
import DetailsBanner from "./details-banner";
import VideosSection from "./videos-section";
import MagnetSection from "./magnet-section";
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
	const releaseYear = (detailsData?.release_date || detailsData?.first_air_date || "").substring(0, 4);

	return (
		<div className="details-page">
			<DetailsBanner video={data?.results?.[0]} crew={credits?.crew} />
			<MagnetSection title={title} year={releaseYear} />
			<Cast data={credits?.cast} loading={creditsLoading} />
			<VideosSection data={data} loading={loading} />
		</div>
	);
};

export default DetailsPage;
