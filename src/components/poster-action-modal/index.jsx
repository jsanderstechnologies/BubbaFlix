/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isFavorite, toggleFavorite } from "../../utils/favorites";
import { isSimklWatched, toggleSimklWatched } from "../../utils/simkl";
import { FiStar, FiCheckCircle, FiCircle, FiPlay, FiX } from "react-icons/fi";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import "./index.scss";

const PosterActionModal = ({ isOpen, onClose, item, mediaType = "movie" }) => {
  const navigate = useNavigate();
  const [favStatus, setFavStatus] = useState(false);
  const [watchedStatus, setWatchedStatus] = useState(false);
  const [loading, setLoading] = useState(false);

  const targetType = item?.media_type || mediaType || (item?.name ? "tv" : "movie");
  const posterPath = item?.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : PosterFallback;
  const title = item?.title || item?.name || "Media Item";

  useEffect(() => {
    if (isOpen && item?.id) {
      setFavStatus(isFavorite(item.id, targetType));
      setWatchedStatus(isSimklWatched({ tmdbId: item.id, mediaType: targetType }));
    }
  }, [isOpen, item, targetType]);

  if (!isOpen || !item) return null;

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    const newFav = toggleFavorite({ ...item, media_type: targetType });
    setFavStatus(newFav);
  };

  const handleToggleWatched = async (e) => {
    e.stopPropagation();
    setLoading(true);
    const newWatched = await toggleSimklWatched({
      tmdbId: item.id,
      title,
      mediaType: targetType,
    });
    setWatchedStatus(newWatched);
    setLoading(false);
  };

  const handleViewDetails = (e) => {
    e.stopPropagation();
    onClose();
    navigate(`/${targetType}/${item.id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape" || e.keyCode === 27 || e.keyCode === 10009 || e.keyCode === 461 || e.keyCode === 4) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div className="posterActionModalOverlay" onClick={onClose} onKeyDown={handleKeyDown} tabIndex="-1">
      <div className="posterActionModalContent" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="closeBtn" onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <div className="modalHeader">
          <Img className="modalPoster" src={posterPath} />
          <div className="modalHeaderInfo">
            <h3 className="modalTitle">{title}</h3>
            <span className="modalMeta">{targetType.toUpperCase()} • {item.release_date || item.first_air_date || ""}</span>
          </div>
        </div>

        <div className="modalActions">
          <button
            type="button"
            className={`actionBtn favBtn ${favStatus ? "active" : ""}`}
            onClick={handleToggleFavorite}
            autoFocus
          >
            <FiStar className="btnIcon" />
            <span>{favStatus ? "Remove from Favorites" : "Add to Favorites"}</span>
          </button>

          <button
            type="button"
            className={`actionBtn watchBtn ${watchedStatus ? "active" : ""} ${loading ? "loading" : ""}`}
            onClick={handleToggleWatched}
            disabled={loading}
          >
            {watchedStatus ? <FiCheckCircle className="btnIcon" /> : <FiCircle className="btnIcon" />}
            <span>{watchedStatus ? "Mark as Unwatched" : "Mark as Watched"}</span>
          </button>

          <button type="button" className="actionBtn viewBtn" onClick={handleViewDetails}>
            <FiPlay className="btnIcon" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosterActionModal;
