import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../components/top-nav";
import ContentWrapper from "../../components/content-wrapper";
import Caraousel from "../../components/caraousel";
import useFetch from "../../hooks/useFetch";
import { fetchDataFromAPI } from "../../utils/api";
import { getHomeSections, saveHomeSections } from "../../utils/homeConfig";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import VideoPlayerModal from "../../components/video-player-modal";
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

const DynamicSection = ({ section }) => {
  const navigate = useNavigate();

  // Endpoints for TMDB queries
  if (section.id === "trending") {
    const [endPoint, setEndPoint] = useState("day");
    const { data, loading } = useFetch(`/trending/all/${endPoint}`);
    return (
      <div className="carouselSection">
        <ContentWrapper>
          <span className="carouselTitle">Trending Content</span>
        </ContentWrapper>
        <Caraousel data={data?.results} loading={loading} />
      </div>
    );
  }

  if (section.id === "new_movies") {
    const { data, loading } = useFetch("/movie/now_playing");
    return (
      <div className="carouselSection">
        <ContentWrapper>
          <span className="carouselTitle">New Release Movies</span>
        </ContentWrapper>
        <Caraousel data={data?.results} loading={loading} endpoint="movie" />
      </div>
    );
  }

  if (section.id === "current_tv") {
    const { data, loading } = useFetch("/tv/on_the_air");
    return (
      <div className="carouselSection">
        <ContentWrapper>
          <span className="carouselTitle">Current TV Episodes</span>
        </ContentWrapper>
        <Caraousel data={data?.results} loading={loading} endpoint="tv" />
      </div>
    );
  }

  if (section.id === "popular_movies") {
    const { data, loading } = useFetch("/movie/popular");
    return (
      <div className="carouselSection">
        <ContentWrapper>
          <span className="carouselTitle">Popular Movies</span>
        </ContentWrapper>
        <Caraousel data={data?.results} loading={loading} endpoint="movie" />
      </div>
    );
  }

  if (section.id === "popular_tv") {
    const { data, loading } = useFetch("/tv/popular");
    return (
      <div className="carouselSection">
        <ContentWrapper>
          <span className="carouselTitle">Popular TV Shows</span>
        </ContentWrapper>
        <Caraousel data={data?.results} loading={loading} endpoint="tv" />
      </div>
    );
  }




  return null;
};

const HomePage = () => {
  const [sections, setSections] = useState(getHomeSections());
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  // Video player modal state
  const [showPlayer, setShowPlayer] = useState(false);
  const [activeStreamUrl, setActiveStreamUrl] = useState("");
  const [activeStreamTitle, setActiveStreamTitle] = useState("");

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
                  <label className="checkboxLabel">
                    <input
                      type="checkbox"
                      checked={sec.enabled}
                      onChange={() => toggleSection(sec.id)}
                    />
                    <span>{sec.title}</span>
                  </label>
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
      />
    </div>
  );
};

export default HomePage;
