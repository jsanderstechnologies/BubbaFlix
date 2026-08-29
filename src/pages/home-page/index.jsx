import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../components/top-nav";
import ContentWrapper from "../../components/content-wrapper";
import Caraousel from "../../components/caraousel";
import useFetch from "../../hooks/useFetch";
import { getHomeSections, saveHomeSections } from "../../utils/homeConfig";
import { getFavoriteChannels } from "../../utils/favorites";
import { fetchDispatcharrChannels, fetchDispatcharrRecordings, getChannelStreamUrl } from "../../utils/dispatcharr";
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
} from "react-icons/fi";
import "./index.scss";

const DynamicSection = ({ section, onPlayChannel, onPlayRecording }) => {
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

  if (section.id === "favorite_channels") {
    const [favChannels, setFavChannels] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      const loadFavs = async () => {
        setLoading(true);
        const favIds = getFavoriteChannels();
        if (favIds.length === 0) {
          if (isMounted) {
            setFavChannels([]);
            setLoading(false);
          }
          return;
        }

        const res = await fetchDispatcharrChannels();
        if (res.success && Array.isArray(res.data)) {
          const matched = res.data.filter((ch) => favIds.includes(String(ch.id || ch.name)));
          if (isMounted) setFavChannels(matched);
        }
        if (isMounted) setLoading(false);
      };

      loadFavs();
      window.addEventListener("favorite-channels-updated", loadFavs);
      return () => {
        isMounted = false;
        window.removeEventListener("favorite-channels-updated", loadFavs);
      };
    }, []);

    if (!loading && favChannels.length === 0) return null;

    return (
      <div className="carouselSection favChannelsSection">
        <ContentWrapper>
          <span className="carouselTitle">
            <FiTv style={{ marginRight: 8, color: "var(--pink)" }} /> Favorite Live TV Channels
          </span>
        </ContentWrapper>
        <div className="customCarouselGrid">
          {loading ? (
            <div className="loadingText">Loading favorite channels...</div>
          ) : (
            favChannels.map((ch) => (
              <div key={ch.id || ch.name} className="channelCard" onClick={() => onPlayChannel(ch)}>
                <div className="cardBadge">
                  {ch.logo ? <img src={ch.logo} alt={ch.name} /> : <div className="chNum">{ch.number || "TV"}</div>}
                </div>
                <div className="cardDetails">
                  <span className="cardTitle">{ch.name || `Channel ${ch.number || ch.id}`}</span>
                  <button className="playBtn"><FiPlay /> Watch Live</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (section.id === "recordings") {
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let isMounted = true;
      const loadRecs = async () => {
        setLoading(true);
        const res = await fetchDispatcharrRecordings();
        if (res.success && Array.isArray(res.data) && isMounted) {
          setRecs(res.data.slice(0, 10));
        }
        if (isMounted) setLoading(false);
      };

      loadRecs();
    }, []);

    if (!loading && recs.length === 0) return null;

    return (
      <div className="carouselSection recordingsSection">
        <ContentWrapper>
          <span className="carouselTitle">
            <FiVideo style={{ marginRight: 8, color: "var(--pink)" }} /> Recent DVR Recordings
          </span>
        </ContentWrapper>
        <div className="customCarouselGrid">
          {loading ? (
            <div className="loadingText">Loading DVR recordings...</div>
          ) : (
            recs.map((rec) => (
              <div key={rec.id} className="recCard" onClick={() => onPlayRecording(rec)}>
                <div className="cardPoster">
                  {rec.poster ? <img src={rec.poster} alt={rec.title} /> : <div className="noPoster">DVR</div>}
                </div>
                <div className="cardDetails">
                  <span className="cardTitle">{rec.title || "Recorded Program"}</span>
                  <button className="playBtn"><FiPlay /> Play DVR</button>
                </div>
              </div>
            ))
          )}
        </div>
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

  const handlePlayChannel = (ch) => {
    const streamUrl = getChannelStreamUrl(ch.id);
    setActiveStreamUrl(streamUrl);
    setActiveStreamTitle(ch.name || "Live TV Channel");
    setShowPlayer(true);
  };

  const handlePlayRecording = (rec) => {
    const streamUrl = rec.file_url || rec.stream_url || `/api/dispatcharr/api/channels/recordings/${rec.id}/file/`;
    setActiveStreamUrl(streamUrl);
    setActiveStreamTitle(rec.title || "DVR Recording");
    setShowPlayer(true);
  };

  return (
    <div className="home-page">
      <TopNav />

      <ContentWrapper>
        <div className="homeCustomizeBar">
          <button
            className="customizeBtn"
            onClick={() => setShowCustomizeModal(true)}
            tabIndex={0}
            title="Customize Home Layout"
          >
            <FiSliders style={{ marginRight: 6 }} /> Customize Home Sections
          </button>
        </div>
      </ContentWrapper>

      {sections
        .filter((s) => s.enabled)
        .map((s) => (
          <DynamicSection
            key={s.id}
            section={s}
            onPlayChannel={handlePlayChannel}
            onPlayRecording={handlePlayRecording}
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
