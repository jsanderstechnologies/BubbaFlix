import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AiFillStar } from "react-icons/ai";
import { FiFilm, FiTv } from "react-icons/fi";
import ContentWrapper from "../../components/content-wrapper";
import MovieCard from "../../components/movie-card";
import TopNav from "../../components/top-nav";
import Header from "../../components/header";
import { getFavorites } from "../../utils/favorites";
import { isTvDevice } from "../../utils/dpadNavigation";
import "./index.scss";

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState("all"); // "all", "movie", "tv"
  const navigate = useNavigate();

  const loadFavs = () => {
    const list = getFavorites();
    setFavorites(list);
  };

  useEffect(() => {
    loadFavs();

    const handleUpdate = () => {
      loadFavs();
    };

    window.addEventListener("bubbaflix_favorites_updated", handleUpdate);
    return () => {
      window.removeEventListener("bubbaflix_favorites_updated", handleUpdate);
    };
  }, []);

  const movieFavs = favorites.filter(
    (item) => (item.media_type || item.mediaType || "movie") === "movie"
  );
  const tvFavs = favorites.filter(
    (item) => (item.media_type || item.mediaType) === "tv" || (item.media_type || item.mediaType) === "series"
  );

  const displayedItems =
    activeTab === "movie"
      ? movieFavs
      : activeTab === "tv"
      ? tvFavs
      : favorites;

  const isTv = isTvDevice();

  return (
    <div className="favoritesPage">
      {isTv ? <TopNav /> : <Header />}

      <ContentWrapper>
        <div className="pageHeader">
          <div className="pageTitle">
            <AiFillStar className="titleIcon" style={{ color: "#ffd700" }} />
            <h1>My Favorites</h1>
            <span className="countBadge">{favorites.length} Saved</span>
          </div>

          <div className="tabSelector">
            <button
              className={`tabItem ${activeTab === "all" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("all")}
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  setActiveTab("all");
                }
              }}
            >
              All ({favorites.length})
            </button>
            <button
              className={`tabItem ${activeTab === "movie" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("movie")}
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  setActiveTab("movie");
                }
              }}
            >
              <FiFilm style={{ marginRight: 6 }} /> Movies ({movieFavs.length})
            </button>
            <button
              className={`tabItem ${activeTab === "tv" ? "active" : ""}`}
              tabIndex="0"
              onClick={() => setActiveTab("tv")}
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  setActiveTab("tv");
                }
              }}
            >
              <FiTv style={{ marginRight: 6 }} /> TV Series ({tvFavs.length})
            </button>
          </div>
        </div>

        {displayedItems.length > 0 ? (
          <div className="contentGrid">
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
                : "Star movies and TV shows on their details screen to add them to your favorites."}
            </p>
            <button
              className="exploreBtn"
              tabIndex="0"
              onClick={() => navigate("/")}
              onKeyDown={(e) => {
                const code = e.keyCode;
                if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                  e.preventDefault();
                  navigate("/");
                }
              }}
            >
              Browse Content
            </button>
          </div>
        )}
      </ContentWrapper>
    </div>
  );
};

export default FavoritesPage;
