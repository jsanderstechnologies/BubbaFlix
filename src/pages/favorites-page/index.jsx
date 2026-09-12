import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AiFillStar } from "react-icons/ai";
import { FiFilm, FiTv, FiLayers } from "react-icons/fi";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import CollectionCard from "../../components/collection-card";
import TopNav from "../../components/top-nav";
import SortModal from "../../components/sort-modal";
import { FiSliders } from "react-icons/fi";
import { getFavorites, getFavoriteCollections } from "../../utils/favorites";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import "./index.scss";

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [favCollections, setFavCollections] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // "all", "movie", "tv", "collection"
  const [sortby, setSortby] = useState("added.desc");
  const [showSortModal, setShowSortModal] = useState(false);
  
  const FAV_SORT_OPTIONS = [
    { value: "added.desc", label: "Date Added (Newest)" },
    { value: "added.asc", label: "Date Added (Oldest)" },
    { value: "title.asc", label: "Title (A-Z)" },
    { value: "title.desc", label: "Title (Z-A)" },
    { value: "rating.desc", label: "Rating (High to Low)" },
    { value: "release.desc", label: "Release Date (Newest)" },
    { value: "release.asc", label: "Release Date (Oldest)" }
  ];

  const sortItems = (items) => {
    let sorted = [...items];
    switch (sortby) {
        case "added.desc":
            break;
        case "added.asc":
            sorted.reverse();
            break;
        case "title.asc":
            sorted.sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));
            break;
        case "title.desc":
            sorted.sort((a, b) => (b.title || b.name || "").localeCompare(a.title || a.name || ""));
            break;
        case "rating.desc":
            sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            break;
        case "release.desc":
            sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0));
            break;
        case "release.asc":
            sorted.sort((a, b) => new Date(a.release_date || a.first_air_date || 0) - new Date(b.release_date || b.first_air_date || 0));
            break;
    }
    return sorted;
  };
  const navigate = useNavigate();

  const loadFavs = () => {
    const list = getFavorites();
    const colList = getFavoriteCollections();
    setFavorites(list);
    setFavCollections(colList);
  };

  useEffect(() => {
    loadFavs();

    const handleUpdate = () => {
      loadFavs();
    };

    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  useEffect(() => {
    restoreLastFocusedPoster();
  }, [favorites, favCollections, activeTab]);

  const movieFavs = favorites.filter(
    (item) => (item.media_type || item.mediaType || "movie") === "movie"
  );
  const tvFavs = favorites.filter(
    (item) => (item.media_type || item.mediaType) === "tv" || (item.media_type || item.mediaType) === "series"
  );

  const totalCount = favorites.length + favCollections.length;

  const displayedItems = sortItems(
    activeTab === "movie"
      ? movieFavs
      : activeTab === "tv"
      ? tvFavs
      : favorites
  );
  
  const displayedCollections = sortItems(favCollections);

  return (
    <div className="favoritesPage">
      <TopNav />

      <ContentWrapper>
        <div className="pageHeader">
          <div className="pageTitle">
            <AiFillStar className="titleIcon" style={{ color: "#ffd700" }} />
            <h1>My Favorites</h1>
            <span className="countBadge">{totalCount} Saved</span>
          </div>
          
          <div className="headerControls">
              <button 
                  className="tvSortBtn" 
                  tabIndex="0" 
                  onClick={() => setShowSortModal(true)}
                  onKeyDown={(e) => {
                      const code = e.keyCode;
                      if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                          e.preventDefault();
                          setShowSortModal(true);
                      }
                  }}
              >
                  <FiSliders className="selectIcon" style={{ marginRight: '8px' }} />
                  Sort Options
              </button>
              
              <div className="tabSelector">
            <button
              className={`tabItem ${activeTab === "all" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("all")}
            >
              All ({totalCount})
            </button>
            <button
              className={`tabItem ${activeTab === "movie" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("movie")}
            >
              <FiFilm style={{ marginRight: 6 }} /> Movies ({movieFavs.length})
            </button>
            <button
              className={`tabItem ${activeTab === "tv" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("tv")}
            >
              <FiTv style={{ marginRight: 6 }} /> TV Series ({tvFavs.length})
            </button>
            <button
              className={`tabItem ${activeTab === "collection" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("collection")}
            >
              <FiLayers style={{ marginRight: 6 }} /> Collections ({favCollections.length})
            </button>
          </div>
          </div>
        </div>

        {activeTab === "collection" ? (
          favCollections.length > 0 ? (
            <div className="content">
              {displayedCollections.map((col) => (
                <CollectionCard key={`fav-col-${col.id}`} data={col} />
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <AiFillStar style={{ fontSize: 64, color: "rgba(255, 215, 0, 0.4)", marginBottom: 16 }} />
              <h2>No Favorite Collections Found</h2>
              <p>Save franchise collections to your favorites to view them here anytime.</p>
            </div>
          )
        ) : (
          displayedItems.length > 0 || (activeTab === "all" && favCollections.length > 0) ? (
            <div className="content">
              {activeTab === "all" && favCollections.map((col) => (
                <CollectionCard key={`fav-col-${col.id}`} data={col} />
              ))}
              {displayedItems.map((item) => (
                <MovieCard
                  key={`${item.media_type || item.mediaType || "movie"}-${item.id}`}
                  data={item}
                  mediaType={item.media_type || item.mediaType || "movie"}
                />
              ))}
            </div>
          ) : (
            <div className="emptyState">
              <AiFillStar style={{ fontSize: 64, color: "rgba(255, 215, 0, 0.4)", marginBottom: 16 }} />
              <h2>No Favorites Found</h2>
              <p>
                {activeTab === "movie"
                  ? "You haven't saved any movies to your favorites yet."
                  : activeTab === "tv"
                  ? "You haven't saved any TV series to your favorites yet."
                  : "Star movies, TV shows, or franchise collections to add them to your favorites."}
              </p>
              <button
                className="exploreBtn"
                tabIndex="0"
                onClick={() => navigate("/")}
              >
                Browse Content
              </button>
            </div>
          )
        )}
      </ContentWrapper>
      <SortModal 
          show={showSortModal} 
          setShow={setShowSortModal} 
          options={FAV_SORT_OPTIONS}
          selectedValue={sortby}
          onSelect={(val) => setSortby(val)}
      />
    </div>
  );
};

export default FavoritesPage;
