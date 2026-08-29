import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import { filterEnglishMedia, filterEnglishCollections } from "../../utils/filterUtils";
import { filterCollectionsWithGroq } from "../../utils/groqFilter";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import CollectionCard from "../../components/collection-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";
import { FiSliders, FiLayers, FiFilm } from "react-icons/fi";

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

const COLLECTION_KEYWORDS = [
	"marvel", "avengers", "star", "dark", "harry", "potter", "fast", "furious", "dragon", 
	"spider", "batman", "godzilla", "jurassic", "disney", "pixar", "x-men", "matrix", "rings", 
	"chronicles", "dead", "alien", "predator", "terminator", "pirates", "transformers", "star trek", 
	"dune", "indiana", "bond", "shrek", "toy", "despicable", "ice", "hunger", "twilight", "divergent", 
	"maze", "blade", "resident", "underworld", "saw", "scream", "conjuring", "insidious", "annabelle", 
	"purge", "destination", "halloween", "friday", "elm", "chucky", "psycho", "jaws", "rocky", "creed", 
	"rambo", "hard", "lethal", "weapon", "bad boys", "rush hour", "beverly hills", "men in black", 
	"ghostbusters", "back future", "karate kid", "ocean", "the", "a", "o"
];

const Explore = () => {
	const [data, setData] = useState(null);
	const [pageNum, setPageNum] = useState(1);
	const [loading, setLoading] = useState(false);
	const [sortby, setSortby] = useState("popularity.desc");
	
	// Movies vs Collections Sub-Tabs
	const [movieTab, setMovieTab] = useState("movies"); // "movies" | "collections"
	
	// Collections Infinite Scroll State
	const [collectionsList, setCollectionsList] = useState([]);
	const [colKeywordIndex, setColKeywordIndex] = useState(0);
	const [colSubPage, setColSubPage] = useState(1);
	const [colLoading, setColLoading] = useState(false);
	const [colHasMore, setColHasMore] = useState(true);

	const { mediaType } = useParams();

	const fetchInitialData = () => {
		setLoading(true);
		fetchDataFromAPI(`/discover/${mediaType}`, filters).then((res) => {
			const filtered = filterEnglishMedia(res?.results || []);
			setData({ ...res, results: filtered });
			setPageNum((prev) => prev + 1);
			setLoading(false);
		});
	};

	const fetchNextPageData = () => {
		fetchDataFromAPI(
			`/discover/${mediaType}?page=${pageNum}`,
			filters
		).then((res) => {
			const filteredNext = filterEnglishMedia(res?.results || []);
			if (data?.results) {
				setData({
					...data,
					results: [...data.results, ...filteredNext],
				});
			} else {
				setData({ ...res, results: filteredNext });
			}
			setPageNum((prev) => prev + 1);
		});
	};

const filterEnglishCollections = (items) => {
	if (!Array.isArray(items)) return [];

	const adultKeywords = [
		"xxx", "adult", "erotic", "porn", "hentai", "nude", "sex", "uncensored", 
		"striptease", "playboy", "penthouse", "softcore", "hardcore", "erotica", "sensual"
	];

	const foreignScriptRegex = /[\u0400-\u04FF\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uac00-\ud7af\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u0370-\u03FF]/;

	return items.filter((col) => {
		if (!col) return false;
		if (col.adult === true) return false;

		const name = (col.name || col.title || "").toLowerCase();
		const words = name.split(/\s+/);
		if (words.some((w) => adultKeywords.includes(w))) return false;
		if (adultKeywords.some((kw) => name.includes(kw))) return false;

		if (foreignScriptRegex.test(col.name || col.title || "")) return false;

		if (col.original_language) {
			const lang = col.original_language.toLowerCase();
			if (lang !== "en" && lang !== "eng") return false;
		}

		return true;
	});
};

	const fetchNextCollectionsPage = () => {
		if (colLoading || !colHasMore) return;
		setColLoading(true);

		const currentKw = COLLECTION_KEYWORDS[colKeywordIndex] || "movie";

		fetchDataFromAPI(`/search/collection?query=${encodeURIComponent(currentKw)}&page=${colSubPage}`)
			.then(async (res) => {
				let fetchedCols = filterEnglishCollections(res?.results || []);
				fetchedCols = await filterCollectionsWithGroq(fetchedCols);

				setCollectionsList((prev) => {
					const existingIds = new Set(prev.map((c) => c.id));
					const uniqueNew = fetchedCols.filter((c) => !existingIds.has(c.id));
					return [...prev, ...uniqueNew];
				});

				if (colSubPage < (res?.total_pages || 1) && colSubPage < 3) {
					setColSubPage((prev) => prev + 1);
				} else {
					setColSubPage(1);
					if (colKeywordIndex + 1 < COLLECTION_KEYWORDS.length) {
						setColKeywordIndex((prev) => prev + 1);
					} else {
						setColHasMore(false);
					}
				}
				setColLoading(false);
			})
			.catch(() => {
				setColLoading(false);
			});
	};

	useEffect(() => {
		filters = { sort_by: "popularity.desc" };
		setData(null);
		setPageNum(1);
		setSortby("popularity.desc");
		setMovieTab("movies");
		fetchInitialData();

		if (mediaType === "movie") {
			setCollectionsList([]);
			setColKeywordIndex(0);
			setColSubPage(1);
			setColHasMore(true);

			// Initial batch load for Collections (fill entire viewport initially)
			const initialTopColIds = [
				86311, 263, 10, 1241, 2344, 9485, 328, 645,
				528, 295, 131292, 8650, 119, 87096, 403374, 84,
				2150, 86066, 422834, 2602, 1570, 2562, 2980, 33514,
				1771, 748, 531241, 9125
			];
			Promise.all(initialTopColIds.map((id) => fetchDataFromAPI(`/collection/${id}`).catch(() => null)))
				.then((list) => {
					setCollectionsList(filterEnglishCollections(list.filter(Boolean)));
				});
		}
	}, [mediaType]);

	useEffect(() => {
		if (movieTab === "collections" && collectionsList.length <= 20) {
			fetchNextCollectionsPage();
		}
	}, [movieTab]);

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
							: movieTab === "collections"
							? "Explore Movie Collections & Franchises"
							: "Explore Movies"}
					</div>

					{mediaType === "movie" ? (
						<div className="exploreTabSwitcher">
							<button
								className={`tabBtn ${movieTab === "movies" ? "active" : ""}`}
								onClick={() => setMovieTab("movies")}
								tabIndex="0"
							>
								<FiFilm /> Movies
							</button>
							<button
								className={`tabBtn ${movieTab === "collections" ? "active" : ""}`}
								onClick={() => setMovieTab("collections")}
								tabIndex="0"
							>
								<FiLayers /> Collections & Franchises
							</button>
						</div>
					) : (
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
					)}
				</div>

				{/* Collections Tab Content with Infinite Scroll */}
				{mediaType === "movie" && movieTab === "collections" ? (
					<InfiniteScroll
						className="content"
						dataLength={collectionsList.length}
						next={fetchNextCollectionsPage}
						hasMore={colHasMore}
						loader={<Spinner />}
					>
						{collectionsList.map((col, idx) => (
							<CollectionCard key={`col-${col.id}-${idx}`} data={col} />
						))}
					</InfiniteScroll>
				) : (
					/* Movies / TV Tab Content with Infinite Scroll */
					<>
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
					</>
				)}
			</ContentWrapper>
		</div>
	);
};

export default Explore;
