import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";
import { FiSliders } from "react-icons/fi";

let filters = {};

const SORT_OPTIONS = [
	{ value: "popularity.desc", label: "Sort by Popularity (High to Low)" },
	{ value: "vote_average.desc", label: "Sort by Rating (Top Rated)" },
	{ value: "primary_release_date.desc", label: "Sort by Release Date (Newest)" },
	{ value: "original_title.asc", label: "Sort by Title (A-Z)" },
	{ value: "popularity.asc", label: "Sort by Popularity (Low to High)" },
	{ value: "vote_average.asc", label: "Sort by Rating (Lowest)" },
	{ value: "primary_release_date.asc", label: "Sort by Release Date (Oldest)" },
];

const Explore = () => {
	const [data, setData] = useState(null);
	const [pageNum, setPageNum] = useState(1);
	const [loading, setLoading] = useState(false);
	const [sortby, setSortby] = useState("popularity.desc");
	const { mediaType } = useParams();

	const fetchInitialData = () => {
		setLoading(true);
		fetchDataFromAPI(`/discover/${mediaType}`, filters).then((res) => {
			setData(res);
			setPageNum((prev) => prev + 1);
			setLoading(false);
		});
	};

	const fetchNextPageData = () => {
		fetchDataFromAPI(
			`/discover/${mediaType}?page=${pageNum}`,
			filters
		).then((res) => {
			if (data?.results) {
				setData({
					...data,
					results: [...data.results, ...res.results],
				});
			} else {
				setData(res);
			}
			setPageNum((prev) => prev + 1);
		});
	};

	useEffect(() => {
		filters = { sort_by: "popularity.desc" };
		setData(null);
		setPageNum(1);
		setSortby("popularity.desc");
		fetchInitialData();
	}, [mediaType]);

	const handleSortChange = (e) => {
		const val = e.target.value;
		setSortby(val);
		if (val) {
			filters.sort_by = val;
		} else {
			delete filters.sort_by;
		}
		setPageNum(1);
		fetchInitialData();
	};

	return (
		<div className="explorePage">
			<TopNav />
			<ContentWrapper>
				<div className="pageHeader">
					<div className="pageTitle">
						{mediaType === "tv"
							? "Explore TV Series"
							: "Explore Movies"}
					</div>
					<div className="filters">
						<div className="selectWrapper">
							<FiSliders className="selectIcon" />
							<select
								className="tvSortSelect"
								value={sortby}
								onChange={handleSortChange}
								tabIndex="0"
							>
								{SORT_OPTIONS.map((opt) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{loading && <Spinner initial={true} />}
				{!loading && (
					<>
						{data?.results?.length > 0 ? (
							<InfiniteScroll
								className="content"
								dataLength={data?.results?.length || 0}
								next={fetchNextPageData}
								hasMore={pageNum <= data?.total_pages}
								loader={<Spinner />}
							>
								{data?.results?.map((item, index) => {
									if (item.media_type === "person") return null;
									return (
										<MovieCard
											key={`${item.id}-${index}`}
											data={item}
											mediaType={mediaType}
										/>
									);
								})}
							</InfiniteScroll>
						) : (
							<span className="resultNotFound">
								Sorry, no media titles found matching your request.
							</span>
						)}
					</>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Explore;
