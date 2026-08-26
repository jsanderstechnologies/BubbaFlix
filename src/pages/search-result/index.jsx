import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { HiOutlineSearch, HiX } from "react-icons/hi";
import { FiFilm, FiTv, FiGrid } from "react-icons/fi";

import "./index.scss";

import { fetchDataFromAPI } from "../../utils/api";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import Spinner from "../../components/spinner";
import TopNav from "../../components/top-nav";

const POPULAR_TAGS = ["Action", "Comedy", "Marvel", "Sci-Fi", "Horror", "Drama", "Animation", "Thriller"];

const SearchResult = () => {
  const { query: urlQuery } = useParams();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState(urlQuery || "");
  const [activeFilter, setActiveFilter] = useState("all"); // "all", "movie", "tv"
  const [data, setData] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const inputRef = useRef(null);

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
    }

    fetchDataFromAPI(endpoint).then((res) => {
      setData(res);
      setPageNum(2);
      setLoading(false);
    }).catch(() => {
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
    }

    fetchDataFromAPI(endpoint).then((res) => {
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

  const handleKeySubmit = (e) => {
    const code = e.keyCode;
    if (e.key === "Enter" || code === 13 || code === 23 || code === 66) {
      if (isReadOnly) {
        e.preventDefault();
        setIsReadOnly(false);
      }
    }
  };

  return (
    <div className="searchResultsPage">
      <TopNav />
      <ContentWrapper>
        {/* Dedicated Search Header & Input Box */}
        <div className="searchHeaderSection">
          <div className="searchTitleBlock">
            <h1>Search Movies & TV Shows</h1>
            <p>Find thousands of movies, TV series, actors, and genres</p>
          </div>

          <div className="searchInputWrapper" tabIndex="0">
            <HiOutlineSearch className="searchIcon" />
            <input
              ref={inputRef}
              type="text"
              className="mainSearchInput"
              placeholder="Type movie or TV show title..."
              value={searchQuery}
              readOnly={isReadOnly}
              onChange={handleInputChange}
              onClick={() => setIsReadOnly(false)}
              onBlur={() => setIsReadOnly(true)}
              onKeyDown={handleKeySubmit}
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
              <FiFilm /> Movies Only
            </button>
            <button
              className={`chip ${activeFilter === "tv" ? "active" : ""}`}
              onClick={() => setActiveFilter("tv")}
              tabIndex="0"
            >
              <FiTv /> TV Series Only
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
        {loading && <Spinner initial={true} />}

        {!loading && searchQuery.trim().length > 0 && (
          <>
            {data?.results?.length > 0 ? (
              <>
                <div className="resultsSummary">
                  Found {data?.total_results} {data?.total_results === 1 ? "result" : "results"} for &quot;{searchQuery}&quot;
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
              <div className="noResultsBox">
                <h3>No titles found for &quot;{searchQuery}&quot;</h3>
                <p>Try searching for a different keyword, title, or genre.</p>
              </div>
            )}
          </>
        )}
      </ContentWrapper>
    </div>
  );
};

export default SearchResult;
