/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import useFetch from "../../../hooks/useFetch";
import ContentWrapper from "../../../components/content-wrapper";
import MagnetSection from "../magnet-section";
import Img from "../../../components/lazy-load";
import PosterFallback from "../../../assets/no-poster.png";
import Spinner from "../../../components/spinner";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { FiTv, FiCalendar, FiClock } from "react-icons/fi";
import "./index.scss";

const SeasonsSection = ({ tvId, seasons, showTitle }) => {
  const { url } = useSelector((state) => state.home);

  const validSeasons = Array.isArray(seasons)
    ? seasons.filter((s) => s.season_number > 0)
    : [];

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(
    validSeasons.length > 0 ? validSeasons[0].season_number : 1
  );

  useEffect(() => {
    if (validSeasons.length > 0 && !validSeasons.some((s) => s.season_number === selectedSeasonNumber)) {
      setSelectedSeasonNumber(validSeasons[0].season_number);
    }
  }, [seasons]);

  const { data: seasonData, loading } = useFetch(
    `/tv/${tvId}/season/${selectedSeasonNumber}`
  );

  if (!validSeasons || validSeasons.length === 0) return null;

  const today = dayjs();

  return (
    <div className="seasonsSection">
      <ContentWrapper>
        <div className="seasonsHeaderCard">
          <div className="titleArea">
            <h2 className="sectionHeading">
              <FiTv className="headingIcon" /> Seasons & Episodes
            </h2>
            <p className="subHeading">
              Select a season to view episodes and available episode streams.
            </p>
          </div>

          <div className="seasonPicker">
            <label htmlFor="seasonSelect">Select Season:</label>
            <select
              id="seasonSelect"
              className="seasonSelect"
              tabIndex="0"
              value={selectedSeasonNumber}
              onChange={(e) => setSelectedSeasonNumber(Number(e.target.value))}
            >
              {validSeasons.map((s) => {
                const year = s.air_date ? s.air_date.substring(0, 4) : "N/A";
                return (
                  <option key={s.id || s.season_number} value={s.season_number}>
                    Season {s.season_number} ({year}) — {s.episode_count || 0} Episodes
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {loading && (
          <div className="episodesLoading">
            <Spinner />
          </div>
        )}

        {!loading && seasonData?.episodes && (
          <div className="episodesList">
            {seasonData.episodes.map((ep) => {
              const stillBase = url?.profile || "https://image.tmdb.org/t/p/original";
              const stillUrl = ep.still_path ? stillBase + ep.still_path : PosterFallback;
              const formattedDate = ep.air_date
                ? dayjs(ep.air_date).format("MMM D, YYYY")
                : "Air Date N/A";

              const isReleased = ep.air_date
                ? !dayjs(ep.air_date).isAfter(today, "day")
                : false;

              return (
                <div key={ep.id} className="episodeCard">
                  <div className="episodeMain">
                    <div className="stillBlock">
                      <Img className="stillImg" src={stillUrl} />
                    </div>

                    <div className="episodeInfo">
                      <div className="epHeader">
                        <span className="epBadge">
                          E{ep.episode_number}
                        </span>
                        <h3 className="epTitle">{ep.name}</h3>
                      </div>

                      <div className="epMeta">
                        <span className="metaItem">
                          <FiCalendar /> {formattedDate}
                        </span>
                        {ep.vote_average > 0 && (
                          <span className="metaItem rating">
                            ⭐ {Number(ep.vote_average).toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="epOverview">
                        {ep.overview || "No episode summary available."}
                      </p>
                    </div>
                  </div>

                  {/* Episode-Level Available Streams Dropdown */}
                  <div className="episodeStreams">
                    {isReleased ? (
                      <MagnetSection
                        title={showTitle}
                        seasonNum={selectedSeasonNumber}
                        episodeNum={ep.episode_number}
                        tmdbId={tvId}
                        mediaType="tv"
                        compact={true}
                      />
                    ) : (
                      <div className="unreleasedNotice">
                        <FiClock className="clockIcon" />
                        <span>Unreleased Episode — Streams available after release on {formattedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ContentWrapper>
    </div>
  );
};

export default SeasonsSection;
