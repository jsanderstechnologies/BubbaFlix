import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import { FiFilm, FiTv, FiGrid, FiUser } from "react-icons/fi";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";

const POPULAR_TAGS = ["Action", "Comedy", "Marvel", "Sci-Fi", "Horror", "Drama", "Animation", "Thriller"];

const PersonCard = ({ person }) => {
  const navigate = useNavigate();
  const avatarUrl = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : "/assets/avatar.png";

  return (
    <div
      className="personCard"
      tabIndex={0}
      role="button"
      aria-label={person.name}
      onClick={() => navigate(`/search/${encodeURIComponent(person.name)}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/search/${encodeURIComponent(person.name)}`);
        }
      }}
    >
      <div className="personPoster">
        <img src={avatarUrl} alt={person.name} />
      </div>
      <div className="personDetails">
        <span className="personName">{person.name}</span>
        <span className="personRole">{person.known_for_department || "Actor / Cast"}</span>
      </div>
    </div>
  );
};

const SearchResult = () => {
  const { query: urlQuery } = useParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(urlQuery || "");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "movie", "tv", "person"
  const [data, setData] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Filter helper: Enforce English language for Movies & TV Shows and retain Persons
  const filterEnglishResults = (items) => {
    if (!Array.isArray(items)) return [];
    return items.filter((item) => {
      if (item.media_type === "person" || activeFilter === "person") return true;
      if (!item.original_language) return true;
      const lang = item.original_language.toLowerCase();
      return lang === "en" || lang === "eng";
    });
  };

  useEffect(() => {
    if (urlQuery !== undefined && urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
  }, [urlQuery]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setPageNum(1);
      fetchSearchResults(searchQuery.trim(), 1, activeFilter);
    } else {
      setData(null);
    }
  }, [searchQuery, activeFilter]);

  const fetchSearchResults = (queryStr, page, filterType) => {
    if (!queryStr) return;
    setLoading(true);

    let endpoint = `/search/multi?query=${encodeURIComponent(queryStr)}&page=${page}`;
    if (filterType === "movie") {
      endpoint = `/search/movie?query=${encodeURIComponent(queryStr)}&page=${page}`;
    } else if (filterType === "tv") {
      endpoint = `/search/tv?query=${encodeURIComponent(queryStr)}&page=${page}`;
    } else if (filterType === "person") {
      endpoint = `/search/person?query=${encodeURIComponent(queryStr)}&page=${page}`;
    }

    fetchDataFromAPI(endpoint)
      .then((res) => {
        const filtered = {
          ...res,
          results: filterEnglishResults(res?.results || []),
        };
        setData(filtered);
        setPageNum(2);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const fetchNextPageData = () => {
    const queryStr = searchQuery.trim();
    if (!queryStr) return;

    let endpoint = `/search/multi?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    if (activeFilter === "movie") {
      endpoint = `/search/movie?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    } else if (activeFilter === "tv") {
      endpoint = `/search/tv?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    } else if (activeFilter === "person") {
      endpoint = `/search/person?query=${encodeURIComponent(queryStr)}&page=${pageNum}`;
    }

    fetchDataFromAPI(endpoint).then((res) => {
      const filteredNext = filterEnglishResults(res?.results || []);
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0) {
      navigate(`/search/${encodeURIComponent(val.trim())}`, { replace: true });
    } else {
      navigate(`/search`, { replace: true });
    }
  };

  const handleClear = () => {
    setSearchQuery("");
    setData(null);
    navigate(`/search`, { replace: true });
    if (inputRef.current) inputRef.current.focus();
  };

  const handleTagClick = (tag) => {
    setSearchQuery(tag);
    navigate(`/search/${encodeURIComponent(tag)}`, { replace: true });
  };

  // Group filtered results into Movies, TV Shows, and Actors
  const moviesList = data?.results?.filter((item) => item.media_type === "movie" || activeFilter === "movie") || [];
  const tvList = data?.results?.filter((item) => item.media_type === "tv" || activeFilter === "tv") || [];
  const peopleList = data?.results?.filter((item) => item.media_type === "person" || activeFilter === "person") || [];

  return (
    <div className="searchResultsPage">
      <TopNav />
      <ContentWrapper>
        {/* Dedicated Search Header & Input Box */}
        <div className="searchHeaderSection">
          <div className="searchTitleBlock">
            <h1>Search Movies, TV Shows & Actors</h1>
            <p>Find English language movies, TV series, actors, and directors</p>
          </div>

          <div className="searchInputWrapper">
            <HiOutlineSearch className="searchIcon" />
            <input
              ref={inputRef}
              type="text"
              className="mainSearchInput"
              placeholder="Type movie, TV show, or actor name..."
              value={searchQuery}
              onChange={handleInputChange}
              tabIndex="0"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <button
                className="clearSearchBtn"
                onClick={handleClear}
                tabIndex="0"
                aria-label="Clear Search"
              >
                <HiX />
              </button>
            )}
          </div>

          {/* Filter Type Chips */}
          <div className="searchFilterChips">
            <button
              className={`chip ${activeFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveFilter("all")}
              tabIndex="0"
            >
              <FiGrid /> All Results
            </button>
            <button
              className={`chip ${activeFilter === "movie" ? "active" : ""}`}
              onClick={() => setActiveFilter("movie")}
              tabIndex="0"
            >
              <FiFilm /> Movies ({moviesList.length})
            </button>
            <button
              className={`chip ${activeFilter === "tv" ? "active" : ""}`}
              onClick={() => setActiveFilter("tv")}
              tabIndex="0"
            >
              <FiTv /> TV Series ({tvList.length})
            </button>
            <button
              className={`chip ${activeFilter === "person" ? "active" : ""}`}
              onClick={() => setActiveFilter("person")}
              tabIndex="0"
            >
              <FiUser /> Actors & Cast ({peopleList.length})
            </button>
          </div>

          {/* Popular Tag Quick Suggestions */}
          {!searchQuery && (
            <div className="popularTagsBlock">
              <span className="tagsLabel">POPULAR SEARCHES:</span>
              <div className="tagsRow">
                {POPULAR_TAGS.map((tag) => (
                  <button
                    key={tag}
                    className="tagBtn"
                    onClick={() => handleTagClick(tag)}
                    tabIndex="0"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Results Display Area */}
        {searchQuery.trim().length > 0 && (
          <>
            {loading && !data ? (
              <Spinner initial={true} />
            ) : data?.results?.length > 0 ? (
              <InfiniteScroll
                className="infiniteScrollContainer"
                dataLength={data?.results?.length || 0}
                next={fetchNextPageData}
                hasMore={pageNum <= data?.total_pages}
                loader={<Spinner />}
              >
                {/* 1. Movies Category Section */}
                {(activeFilter === "all" || activeFilter === "movie") && moviesList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle"><FiFilm style={{ marginRight: 8, color: "var(--pink)" }} /> Movies</h2>
                    <div className="contentGrid">
                      {moviesList.map((item, idx) => (
                        <MovieCard key={`movie-${item.id}-${idx}`} data={item} fromSearch={true} mediaType="movie" />
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. TV Shows Category Section */}
                {(activeFilter === "all" || activeFilter === "tv") && tvList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle"><FiTv style={{ marginRight: 8, color: "var(--pink)" }} /> TV Shows & Series</h2>
                    <div className="contentGrid">
                      {tvList.map((item, idx) => (
                        <MovieCard key={`tv-${item.id}-${idx}`} data={item} fromSearch={true} mediaType="tv" />
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Actors & Cast Category Section */}
                {(activeFilter === "all" || activeFilter === "person") && peopleList.length > 0 && (
                  <div className="searchCategorySection">
                    <h2 className="categoryTitle"><FiUser style={{ marginRight: 8, color: "var(--pink)" }} /> Actors & Cast</h2>
                    <div className="contentGrid">
                      {peopleList.map((person, idx) => (
                        <PersonCard key={`person-${person.id}-${idx}`} person={person} />
                      ))}
                    </div>
                  </div>
                )}
              </InfiniteScroll>
            ) : (
              !loading && (
                <div className="noResultsBox">
                  <h3>No English titles or actors found for &quot;{searchQuery}&quot;</h3>
                  <p>Try searching for another movie, TV series, or actor name.</p>
                </div>
              )
            )}
          </>
        )}
      </ContentWrapper>
    </div>
  );
};

export default SearchResult;
