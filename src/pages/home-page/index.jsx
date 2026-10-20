import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../components/top-nav";
import ContentWrapper from "../../components/content-wrapper";
import Caraousel from "../../components/caraousel";
import useFetch from "../../hooks/useFetch";
import { fetchDataFromAPI } from "../../utils/api";
import { getHomeSections, saveHomeSections } from "../../utils/homeConfig";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import { getAllWatchProgress, getStreamUrl } from "../../utils/watchProgress";
import VideoPlayerModal from "../../components/video-player-modal";
import ContinueWatchingCarousel from "../../components/continue-watching-carousel";
import {
  FiSliders,
  FiCheck,
  FiChevronUp,
  FiChevronDown,
  FiX,
  FiPlay,
  FiTv,
  FiVideo,
  FiStar,
  FiCalendar,
  FiClock,
  FiTrash2,
} from "react-icons/fi";
import "./index.scss";

const TrendingSection = ({ section }) => {
  const [endPoint, setEndPoint] = useState("day");
  const { data, loading } = useFetch(`/trending/all/${endPoint}`);
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContentWrapper>
        <span className="carouselTitle">Trending Content</span>
      </ContentWrapper>
      <Caraousel data={data?.results} loading={loading} sectionId={section.id} />
    </div>
  );
};

const NewMoviesSection = ({ section }) => {
  const { data, loading } = useFetch("/movie/now_playing");
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContentWrapper>
        <span className="carouselTitle">New Release Movies</span>
      </ContentWrapper>
      <Caraousel data={data?.results} loading={loading} endpoint="movie" sectionId={section.id} />
    </div>
  );
};

const OnTheAirSection = ({ section }) => {
  const { data, loading } = useFetch("/tv/on_the_air", 12);
  const sortedResults = useMemo(() => {
    if (!Array.isArray(data?.results)) return [];
    return [...data.results].sort((a, b) => {
      const yearA = parseInt((a.first_air_date || "2000").slice(0, 4), 10) || 2000;
      const yearB = parseInt((b.first_air_date || "2000").slice(0, 4), 10) || 2000;
      const scoreA = (yearA >= 2022 ? 50 : 0) + (a.vote_average || 0) * 6 + Math.min(a.popularity || 0, 80);
      const scoreB = (yearB >= 2022 ? 50 : 0) + (b.vote_average || 0) * 6 + Math.min(b.popularity || 0, 80);
      return scoreB - scoreA;
    });
  }, [data?.results]);

  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContentWrapper>
        <span className="carouselTitle">On The Air</span>
      </ContentWrapper>
      <Caraousel data={sortedResults} loading={loading} endpoint="tv" sectionId={section.id} />
    </div>
  );
};

const CurrentTvSection = ({ section }) => {
  const { data, loading } = useFetch("/tv/airing_today", 6);
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContentWrapper>
        <span className="carouselTitle">Current TV Episodes</span>
      </ContentWrapper>
      <Caraousel data={data?.results} loading={loading} endpoint="tv" sectionId={section.id} />
    </div>
  );
};

const PopularMoviesSection = ({ section }) => {
  const { data, loading } = useFetch("/movie/popular");
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContentWrapper>
        <span className="carouselTitle">Popular Movies</span>
      </ContentWrapper>
      <Caraousel data={data?.results} loading={loading} endpoint="movie" sectionId={section.id} />
    </div>
  );
};

const PopularTvSection = ({ section }) => {
  const { data, loading } = useFetch("/tv/popular");
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContentWrapper>
        <span className="carouselTitle">Popular TV Shows</span>
      </ContentWrapper>
      <Caraousel data={data?.results} loading={loading} endpoint="tv" sectionId={section.id} />
    </div>
  );
};

const ContinueMoviesSection = ({ section, onPlayResume }) => {
  const all = getAllWatchProgress();
  const items = useMemo(() => {
    return Object.values(all)
      .filter((p) => p.mediaType === "movie")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [all]);

  if (items.length === 0) return null;
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContinueWatchingCarousel
        items={items}
        title="Continue Watching: Movies"
        onPlayResume={onPlayResume}
        sectionId={section.id}
      />
    </div>
  );
};

const ContinueTvSection = ({ section, onPlayResume }) => {
  const all = getAllWatchProgress();
  const items = useMemo(() => {
    return Object.values(all)
      .filter((p) => p.mediaType === "tv")
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [all]);

  if (items.length === 0) return null;
  return (
    <div className="carouselSection" data-section-id={section.id}>
      <ContinueWatchingCarousel
        items={items}
        title="Continue Watching: TV Episodes"
        onPlayResume={onPlayResume}
        sectionId={section.id}
      />
    </div>
  );
};

const DynamicSection = ({ section, onPlayResume }) => {
  switch (section.id) {
    case "trending":
      return <TrendingSection section={section} />;
    case "new_movies":
      return <NewMoviesSection section={section} />;
    case "on_the_air":
      return <OnTheAirSection section={section} />;
    case "current_tv":
      return <CurrentTvSection section={section} />;
    case "popular_movies":
      return <PopularMoviesSection section={section} />;
    case "popular_tv":
      return <PopularTvSection section={section} />;
    case "continue_movies":
      return <ContinueMoviesSection section={section} onPlayResume={onPlayResume} />;
    case "continue_tv":
      return <ContinueTvSection section={section} onPlayResume={onPlayResume} />;
    default:
      return null;
  }
};

const HomePage = () => {
  const [sections, setSections] = useState(getHomeSections());
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Video player modal state
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState("");
  const [activeStreamTitle, setActiveStreamTitle] = useState("");
  const [activeStreamMeta, setActiveStreamMeta] = useState(null);

  const handlePlayResume = (item) => {
    const savedUrl = getStreamUrl(item.tmdbId, item.mediaType, item.seasonNum, item.episodeNum);
    if (savedUrl) {
      setActiveStreamUrl(savedUrl);
      setActiveStreamTitle(item.title || "Continue Watching");
      setActiveStreamMeta(item);
      setShowPlayer(true);
    }
  };

  useEffect(() => {
    const handleUpdate = () => {
      setSections(getHomeSections());
    };
    window.addEventListener("home-sections-updated", handleUpdate);
    return () => window.removeEventListener("home-sections-updated", handleUpdate);
  }, []);

  useEffect(() => {
    restoreLastFocusedPoster();
  }, [sections]);

  const toggleSection = (id) => {
    const updated = sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setSections(updated);
  };

  const moveSection = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setSections(updated);
  };

  const handleSaveConfig = () => {
    saveHomeSections(sections);
    setShowCustomizeModal(false);
  };

  return (
    <div className="home-page">
      <TopNav />

      {sections
        .filter((s) => s.enabled)
        .map((s) => (
          <DynamicSection
            key={s.id}
            section={s}
            onPlayResume={handlePlayResume}
          />
        ))}

      {showCustomizeModal && (
        <div className="customizeModalOverlay">
          <div className="customizeCard">
            <div className="modalHeader">
              <h3><FiSliders style={{ marginRight: 8 }} /> Customize Home Layout</h3>
              <button className="closeBtn" onClick={() => setShowCustomizeModal(false)}>
                <FiX />
              </button>
            </div>
            <p className="modalSub">Select and reorder which categories appear on your home screen.</p>
            <div className="sectionList">
              {sections.map((sec, idx) => (
                <div key={sec.id} className="sectionRow">
                  <button
                    type="button"
                    className="checkboxLabel"
                    onClick={() => toggleSection(sec.id)}
                    style={{ background: "transparent", border: "none", padding: 0, color: "inherit", font: "inherit", textAlign: "left", width: "100%", justifyContent: "flex-start" }}
                  >
                    <div style={{ width: 18, height: 18, border: "2px solid var(--pink)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: sec.enabled ? "var(--pink)" : "transparent", flexShrink: 0 }}>
                      {sec.enabled && <FiCheck size={14} color="#fff" />}
                    </div>
                    <span>{sec.title}</span>
                  </button>
                  <div className="rowActions">
                    <button
                      className="arrowBtn"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, -1)}
                      title="Move Up"
                    >
                      <FiChevronUp />
                    </button>
                    <button
                      className="arrowBtn"
                      disabled={idx === sections.length - 1}
                      onClick={() => moveSection(idx, 1)}
                      title="Move Down"
                    >
                      <FiChevronDown />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="modalActions">
              <button className="saveBtn" onClick={handleSaveConfig}>
                <FiCheck style={{ marginRight: 6 }} /> Save Layout
              </button>
            </div>
          </div>
        </div>
      )}

      <VideoPlayerModal
        show={showPlayer}
        setShow={setShowPlayer}
        videoUrl={activeStreamUrl}
        title={activeStreamTitle}
        tmdbId={activeStreamMeta?.tmdbId}
        mediaType={activeStreamMeta?.mediaType}
        seasonNum={activeStreamMeta?.seasonNum}
        episodeNum={activeStreamMeta?.episodeNum}
        posterPath={activeStreamMeta?.posterPath}
      />
    </div>
  );
};

export default HomePage;
