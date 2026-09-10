/* eslint-disable react/prop-types */
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiPlay } from "react-icons/fi";
import ContentWrapper from "../content-wrapper";
import Img from "../lazy-load";
import PosterFallback from "../../assets/no-poster.png";
import { saveLastClickedPoster } from "../../utils/focusManager";
import "./index.scss";

const DEFAULT_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

const ContinueWatchingCarousel = ({ items, title }) => {
  const navigate = useNavigate();
  const { url } = useSelector((state) => state.home);
  const posterBase = url?.poster || DEFAULT_IMAGE_BASE;

  if (!items || items.length === 0) return null;

  const handleSelect = (item) => {
    const type = item.mediaType === "tv" ? "tv" : "movie";
    saveLastClickedPoster(item.tmdbId, type);
    navigate(//);
  };

  return (
    <div className="carouselSection continueWatchingSection">
      <ContentWrapper>
        <span className="carouselTitle">{title}</span>
      </ContentWrapper>
      <ContentWrapper>
        <div className="continueCarouselItems">
          {items.map((item) => {
            const posterUrl = item.posterPath
              ? posterBase + item.posterPath
              : PosterFallback;

            const subtitle =
              item.mediaType === "tv" && item.seasonNum != null && item.episodeNum != null
                ? S E
                : null;

            const posterKey = poster--;

            return (
              <div
                key={item.key}
                id={posterKey}
                data-poster-id={posterKey}
                className="continueItem"
                tabIndex="0"
                role="button"
                onClick={() => handleSelect(item)}
                onKeyDown={(e) => {
                  const code = e.keyCode;
                  if (
                    e.key === "Enter" ||
                    e.key === " " ||
                    code === 13 ||
                    code === 23 ||
                    code === 66
                  ) {
                    e.preventDefault();
                    handleSelect(item);
                  }
                }}
              >
                <div className="continuePosterBlock">
                  <Img className="continuePosterImg" src={posterUrl} />
                  <div className="resumeOverlay">
                    <FiPlay className="resumeIcon" />
                    <span className="resumeLabel">Resume</span>
                  </div>
                  <div className="continueProgressBar">
                    <div
                      className="continueProgressFill"
                      style={{ width: ${item.progressPercent || 0}% }}
                    />
                  </div>
                </div>
                <div className="continueTextBlock">
                  <span className="continueTitle">{item.title}</span>
                  {subtitle && <span className="continueSubtitle">{subtitle}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </ContentWrapper>
    </div>
  );
};

export default ContinueWatchingCarousel;
