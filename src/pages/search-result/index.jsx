import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";

const SearchResult = () => {
	const [data, setData] = useState(null);
	const [pageNum, setPageNum] = useState(1);
	const [loading, setLoading] = useState(false);
	const { query } = useParams();

	const fetchInitialData = () => {
		setLoading(true);
		fetchDataFromAPI(`/search/multi?query=${query}&page=${pageNum}`).then(
			(res) => {
				setData(res);
				setPageNum((prev) => prev + 1);
				setLoading(false);
			}
		);
	};

	const fetchNextPageData = () => {
		fetchDataFromAPI(`/search/multi?query=${query}&page=${pageNum}`).then(
			(res) => {
				if (data?.results) {
					setData({
						...data,
						results: [...data.results, ...res.results],
					});
				} else {
					setData(res);
				}
				setPageNum((prev) => prev + 1);
			}
		);
	};

	useEffect(() => {
		setPageNum(1);
		fetchInitialData();
	}, [query]);

	return (
		<div className="searchResultsPage">
			<TopNav />
			{loading && <Spinner initial={true} />}
			{!loading && (
				<ContentWrapper>
					{data?.results?.length > 0 ? (
						<>
							<div className="pageTitle">
								{`Search ${
									data?.total_results > 1
										? "results"
										: "result"
								} for '${query}'`}
							</div>
							<InfiniteScroll
								className="content"
								dataLength={data?.results?.length || 0}
								next={fetchNextPageData}
								hasMore={pageNum <= data?.total_pages}
								loader={<Spinner />}
							>
								{data?.results.map((item, index) => {
									if (item.media_type === "person") return null;
									return (
										<MovieCard
											key={`${item.id}-${index}`}
											data={item}
											fromSearch={true}
										/>
									);
								})}
							</InfiniteScroll>
						</>
					) : (
						<span className="resultNotFound">
							Sorry, no results found for &apos;{query}&apos;.
						</span>
					)}
				</ContentWrapper>
			)}
		</div>
	);
};

export default SearchResult;
