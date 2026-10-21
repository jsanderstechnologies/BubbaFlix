import { useState, useEffect, useRef, useMemo } from "react";
import useFetch from "../../../hooks/useFetch";
import ContentWrapper from "../../../components/content-wrapper";
import MagnetSection from "../magnet-section";
import Img from "../../../components/lazy-load";
import PosterFallback from "../../../assets/no-poster.png";
import Spinner from "../../../components/spinner";
import WatchCheckmark from "../../../components/watch-checkmark";
import { isSimklWatched } from "../../../utils/simkl";
import { getAllWatchProgress } from "../../../utils/watchProgress";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { FiTv, FiCalendar, FiClock, FiAlertCircle } from "react-icons/fi";
import "./index.scss";

export const getFirstUnwatchedInfo = (tvId, seasonsList) => {
  if (!tvId) return { seasonNumber: 1, episodeNumber: 1 };

  // 1. Check in-progress watch history first (started, but not yet completed)
  const allProgress = getAllWatchProgress();
  const showProgress = Object.values(allProgress)
    .filter((p) => String(p.tmdbId) === String(tvId) && (p.mediaType === "tv" || p.seasonNum))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  if (showProgress.length > 0) {
    const latest = showProgress[0];
    if (latest.seasonNum && latest.episodeNum) {
      const isWatched = isSimklWatched({
        tmdbId: tvId,
        mediaType: "tv",
        seasonNum: Number(latest.seasonNum),
        episodeNum: Number(latest.episodeNum),
      });
      if (!isWatched) {
        return {
          seasonNumber: Number(latest.seasonNum),
          episodeNumber: Number(latest.episodeNum),
          isInProgress: true,
        };
      }
    }
  }

  const validSeasons = Array.isArray(seasonsList)
    ? seasonsList.filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number)
    : [];

  if (validSeasons.length === 0) {
    return { seasonNumber: 1, episodeNumber: 1 };
  }

  // 2. If the entire show is marked watched, default to first episode of first season
  if (isSimklWatched({ tmdbId: tvId, mediaType: "tv" })) {
    return { seasonNumber: validSeasons[0].season_number, episodeNumber: 1 };
  }

  // 3. Iterate through seasons in chronological order
  for (const s of validSeasons) {
    const sNum = s.season_number;
    const epCount = s.episode_count || 1;

    // Check if season is marked watched (either whole season or all episodes)
    const isSeasonWatched = isSimklWatched({
      tmdbId: tvId,
      mediaType: "tv",
      seasonNum: sNum,
      episodeCount: epCount,
    });

    if (isSeasonWatched) {
      continue;
    }

    // Season is not fully watched, find the first unwatched episode in this season
    for (let ep = 1; ep <= epCount; ep++) {
      const isEpWatched = isSimklWatched({
        tmdbId: tvId,
        mediaType: "tv",
        seasonNum: sNum,
        episodeNum: ep,
      });

      if (!isEpWatched) {
        return { seasonNumber: sNum, episodeNumber: ep };
      }
    }
  }

  // Fallback to first valid season, episode 1
  return { seasonNumber: validSeasons[0].season_number, episodeNumber: 1 };
};

const SeasonsSection = ({ tvId, seasons, showTitle, posterPath }) => {
  const { url } = useSelector((state) => state.home);

  const validSeasons = useMemo(() => {
    return Array.isArray(seasons) && seasons.length > 0
      ? seasons.filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number)
      : [{ id: 1, season_number: 1, name: "Season 1", episode_count: 8 }];
  }, [seasons]);

  // Determine initial target season & episode based on watch history
  const unwatchedTarget = useMemo(() => {
    return getFirstUnwatchedInfo(tvId, validSeasons);
  }, [tvId, validSeasons]);

  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState(unwatchedTarget.seasonNumber);
  const targetEpisodeNumRef = useRef(unwatchedTarget.episodeNumber);
  const hasAutoNavigated = useRef(false);

  // Sync selectedSeasonNumber on initial load when seasons data arrives
  useEffect(() => {
    if (!hasAutoNavigated.current && unwatchedTarget?.seasonNumber) {
      setSelectedSeasonNumber(unwatchedTarget.seasonNumber);
      targetEpisodeNumRef.current = unwatchedTarget.episodeNumber;
    }
  }, [unwatchedTarget]);

  // Fetch season data for the selected season (pagesCount=1)
  const { data: seasonData, loading, error } = useFetch(
    `/tv/${tvId}/season/${selectedSeasonNumber}`,
    1
  );

  // Auto-scroll & focus the first unwatched episode in the selected season
  useEffect(() => {
    if (loading || !seasonData?.episodes || seasonData.episodes.length === 0) return;

    // Find the target episode in this season
    const targetEp =
      seasonData.episodes.find((ep) => ep.episode_number === targetEpisodeNumRef.current) ||
      seasonData.episodes.find((ep) => {
        return !isSimklWatched({
          tmdbId: tvId,
          mediaType: "tv",
          seasonNum: selectedSeasonNumber,
          episodeNum: ep.episode_number,
        });
      }) ||
      seasonData.episodes[0];

    const targetEpNum = targetEp.episode_number;

    if (hasAutoNavigated.current) return;
    hasAutoNavigated.current = true;

    let attempts = 0;
    const scrollAndFocusEpisode = () => {
      if (document.querySelector(".videoPopup, .videoPlayerModal")) {
        return;
      }
      const epId = `episode-card-${tvId}-s${selectedSeasonNumber}-e${targetEpNum}`;
      const epElement = document.getElementById(epId);

      if (epElement) {
        // Bring episode card into clear center view
        epElement.scrollIntoView({ behavior: "smooth", block: "center" });

        // Highlight/focus the Available Streams button or primary action of this episode
        const streamHeader = epElement.querySelector(".sectionHeader");
        const actionBtn =
          streamHeader ||
          epElement.querySelector(".refreshStreamsBtn") ||
          epElement.querySelector("button, [tabindex='0']");

        if (actionBtn && typeof actionBtn.focus === "function") {
          actionBtn.focus({ preventScroll: true });
        }
        return;
      }

      attempts++;
      if (attempts < 20) {
        setTimeout(scrollAndFocusEpisode, 80);
      }
    };

    const timer = setTimeout(scrollAndFocusEpisode, 120);
    return () => clearTimeout(timer);
  }, [loading, seasonData, selectedSeasonNumber, tvId]);

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

          <div className="seasonControls">
            <div className="seasonPicker">
              <label htmlFor="seasonSelect">Select Season:</label>
              <select
                id="seasonSelect"
                className="seasonSelect"
                tabIndex="0"
                value={selectedSeasonNumber}
                onChange={(e) => {
                  hasAutoNavigated.current = false;
                  targetEpisodeNumRef.current = null;
                  setSelectedSeasonNumber(Number(e.target.value));
                }}
              >
                {validSeasons.map((s) => {
                  const year = s.air_date ? s.air_date.substring(0, 4) : "";
                  const yearText = year ? ` (${year})` : "";
                  const countText = s.episode_count ? ` — ${s.episode_count} Episodes` : "";
                  return (
                    <option key={s.id || s.season_number} value={s.season_number} style={{ background: '#222', color: 'white' }}>
                      Season {s.season_number}{yearText}{countText}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Season Level Watched Checkmark */}
            <WatchCheckmark
              tmdbId={tvId}
              title={showTitle}
              mediaType="tv"
              seasonNum={selectedSeasonNumber}
              label={`Mark Season ${selectedSeasonNumber} Watched`}
              size="md"
              onToggle={(newStatus) => {
                if (newStatus === true) {
                  const currentIndex = validSeasons.findIndex(s => s.season_number === selectedSeasonNumber);
                  if (currentIndex !== -1 && currentIndex < validSeasons.length - 1) {
                    const nextSeasonNum = validSeasons[currentIndex + 1].season_number;
                    hasAutoNavigated.current = false;
                    targetEpisodeNumRef.current = null;
                    setSelectedSeasonNumber(nextSeasonNum);
                    setTimeout(() => {
                      const btn = document.querySelector('.seasonControls .watchCheckmark');
                      if (btn) btn.focus();
                    }, 100);
                  }
                }
              }}
            />
          </div>
        </div>

        {loading && (
          <div className="episodesLoading">
            <Spinner />
          </div>
        )}

        {!loading && (error || !seasonData?.episodes || seasonData.episodes.length === 0) && (
          <div className="noEpisodesNotice">
            <FiAlertCircle className="icon" />
            <span>No episode data returned for Season {selectedSeasonNumber}. Please select another season or try again.</span>
          </div>
        )}

        {!loading && seasonData?.episodes && seasonData.episodes.length > 0 && (
          <div className="episodesList">
            {seasonData.episodes.map((ep) => {
              const stillBase = "https://image.tmdb.org/t/p/w300";
              const stillUrl = ep.still_path ? stillBase + ep.still_path : PosterFallback;
              const formattedDate = ep.air_date
                ? dayjs(ep.air_date).format("MMM D, YYYY")
                : "Air Date N/A";

              const isReleased = ep.air_date
                ? !dayjs(ep.air_date).isAfter(today, "day")
                : false;

              return (
                <div
                  key={ep.id}
                  id={`episode-card-${tvId}-s${selectedSeasonNumber}-e${ep.episode_number}`}
                  className="episodeCard"
                >
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

                        {/* Episode Level Watched Checkmark */}
                        <WatchCheckmark
                          tmdbId={tvId}
                          title={showTitle}
                          mediaType="tv"
                          seasonNum={selectedSeasonNumber}
                          episodeNum={ep.episode_number}
                          label="Watched"
                          size="sm"
                        />
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
                        posterPath={posterPath}
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
