/* eslint-disable react/prop-types */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isFavorite, toggleFavorite } from "../../utils/favorites";
import { isSimklWatched, toggleSimklWatched } from "../../utils/simkl";
import { saveLastClickedPoster } from "../../utils/focusManager";
import { FiStar, FiCheckCircle, FiCircle, FiPlay, FiX } from "react-icons/fi";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import "./index.scss";

const PosterActionModal = ({ isOpen, onClose, item, mediaType = "movie", sectionId = "" }) => {
  const navigate = useNavigate();
  const firstBtnRef = useRef(null);
  const previousFocusRef = useRef(null);
  const [favStatus, setFavStatus] = useState(false);
  const [watchedStatus, setWatchedStatus] = useState(false);
  const [loading, setLoading] = useState(false);

  const targetType = item?.media_type || mediaType || (item?.name ? "tv" : "movie");
  const posterPath = item?.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : PosterFallback;
  const title = item?.title || item?.name || "Media Item";

  const openTimeRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;

    openTimeRef.current = Date.now();
    previousFocusRef.current = document.activeElement;
    document.body.classList.add("posterActionModalActive");

    if (item?.id) {
      setFavStatus(isFavorite(item.id, targetType));
      setWatchedStatus(isSimklWatched({ tmdbId: item.id, mediaType: targetType }));
    }

    const timer = setTimeout(() => {
      if (firstBtnRef.current) {
        firstBtnRef.current.focus();
      }
    }, 80);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove("posterActionModalActive");
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, item, targetType]);

  if (!isOpen || !item) return null;

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    if (Date.now() - openTimeRef.current < 250) return;
    const newFav = toggleFavorite({ ...item, media_type: targetType });
    setFavStatus(newFav);
  };

  const handleToggleWatched = async (e) => {
    e.stopPropagation();
    if (Date.now() - openTimeRef.current < 250) return;
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
    if (Date.now() - openTimeRef.current < 250) return;
    onClose();
    saveLastClickedPoster(item.id, targetType, sectionId);
    navigate(`/${targetType}/${item.id}`);
  };

  const handleOverlayClick = (e) => {
    if (Date.now() - openTimeRef.current < 250) return;
    onClose();
  };

  const handleKeyDown = (e) => {
    const code = e.keyCode;
    if (e.key === "Escape" || code === 27 || code === 10009 || code === 461 || code === 4) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowDown" || code === 40 || code === 20) {
      e.preventDefault();
      e.stopPropagation();
      const btns = Array.from(document.querySelectorAll(".posterActionModalContent button"));
      const idx = btns.indexOf(document.activeElement);
      const next = (idx + 1) % btns.length;
      btns[next]?.focus();
      return;
    }
    if (e.key === "ArrowUp" || code === 38 || code === 19) {
      e.preventDefault();
      e.stopPropagation();
      const btns = Array.from(document.querySelectorAll(".posterActionModalContent button"));
      const idx = btns.indexOf(document.activeElement);
      const prev = idx <= 0 ? btns.length - 1 : idx - 1;
      btns[prev]?.focus();
      return;
    }
  };

  return (
    <div className="posterActionModalOverlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex="-1">
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
            ref={firstBtnRef}
            type="button"
            className={`actionBtn favBtn ${favStatus ? "active" : ""}`}
            onClick={handleToggleFavorite}
            tabIndex="0"
          >
            <FiStar className="btnIcon" />
            <span>{favStatus ? "Remove from Favorites" : "Add to Favorites"}</span>
          </button>

          <button
            type="button"
            className={`actionBtn watchBtn ${watchedStatus ? "active" : ""} ${loading ? "loading" : ""}`}
            onClick={handleToggleWatched}
            disabled={loading}
            tabIndex="0"
          >
            {watchedStatus ? <FiCheckCircle className="btnIcon" /> : <FiCircle className="btnIcon" />}
            <span>{watchedStatus ? "Mark as Unwatched" : "Mark as Watched"}</span>
          </button>

          <button type="button" className="actionBtn viewBtn" onClick={handleViewDetails} tabIndex="0">
            <FiPlay className="btnIcon" />
            <span>View Details</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PosterActionModal;
