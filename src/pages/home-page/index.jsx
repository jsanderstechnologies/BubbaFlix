import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TopNav from "../../components/top-nav";
import ContentWrapper from "../../components/content-wrapper";
import Caraousel from "../../components/caraousel";
import useFetch from "../../hooks/useFetch";
import { fetchDataFromAPI } from "../../utils/api";
import { getHomeSections, saveHomeSections } from "../../utils/homeConfig";
import { getFavoriteChannels } from "../../utils/favorites";
import { restoreLastFocusedPoster } from "../../utils/focusManager";
import {
  fetchDispatcharrChannels,
  fetchDispatcharrRecordings,
  deleteDispatcharrRecording,
  getChannelStreamUrl,
  getRecordingStreamUrl,
  getProxyBaseUrl
} from "../../utils/dispatcharr";
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

        const rawChannels = await fetchDispatcharrChannels();
        const validChannels = Array.isArray(rawChannels) ? rawChannels : (rawChannels && Array.isArray(rawChannels.data) ? rawChannels.data : []);
        if (validChannels.length > 0) {
          const matched = validChannels.filter((ch) =>
            favIds.includes(String(ch.id)) ||
            favIds.includes(String(ch.name)) ||
            favIds.includes(String(ch.tvg_id)) ||
            favIds.includes(String(ch.channel_number))
          );
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
            favChannels.map((ch) => {
              const baseUrl = getProxyBaseUrl();
              const logoPath = ch.logo || ch.effective_logo_id;
              const logoUrl = logoPath ? (logoPath.startsWith("http") ? logoPath : `${baseUrl}${logoPath.startsWith("/") ? "" : "/"}${logoPath}`) : "";
              return (
                <div key={ch.id || ch.name} className="channelCard" tabIndex="0" onClick={() => onPlayChannel(ch)}>
                  <div className="cardBadge">
                    {logoUrl ? <img src={logoUrl} alt={ch.name} /> : <div className="chNum">{ch.number || ch.channel_number || "TV"}</div>}
                  </div>
                  <div className="cardDetails">
                    <span className="cardTitle">{ch.name || `Channel ${ch.number || ch.id}`}</span>
                    <button className="playBtn"><FiPlay /> Watch Live</button>
                  </div>
                </div>
              );
            })
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
        const list = await fetchDispatcharrRecordings();
        const validRecs = Array.isArray(list) ? list : (list && Array.isArray(list.data) ? list.data : []);
        
        const enriched = await Promise.all(
          (validRecs || []).slice(0, 10).map(async (rec) => {
            if (!rec) return rec;
            const rawTitle = (rec.title && rec.title !== "DVR Recording" ? rec.title : (rec.filename || rec.name || "")).trim();
            if (!rawTitle) return rec;

            try {
              const cleanTitle = rawTitle
                .replace(/\([^)]*\)/g, "")
                .replace(/S\d+E\d+/i, "")
                .replace(/[\-_]/g, " ")
                .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
                .trim();

              if (cleanTitle) {
                const searchRes = await fetchDataFromAPI(`/search/multi`, { query: cleanTitle });
                if (searchRes && Array.isArray(searchRes.results) && searchRes.results.length > 0) {
                  const match = searchRes.results.find((r) => r.media_type === "movie" || r.media_type === "tv") || searchRes.results[0];
                  if (match) {
                    const poster = match.poster_path ? `https://image.tmdb.org/t/p/w500${match.poster_path}` : null;
                    const backdrop = match.backdrop_path ? `https://image.tmdb.org/t/p/w500${match.backdrop_path}` : null;
                    return {
                      ...rec,
                      title: rec.title && rec.title !== "DVR Recording" ? rec.title : (match.title || match.name || cleanTitle),
                      tmdbId: match.id,
                      mediaType: match.media_type,
                      poster: poster || rec.poster || rec.artwork,
                      backdrop: backdrop || rec.backdrop,
                      overview: match.overview || rec.description || rec.overview || "No description available.",
                      vote_average: match.vote_average ? match.vote_average.toFixed(1) : null,
                      release_date: (match.release_date || match.first_air_date || "").substring(0, 4),
                    };
                  }
                }
              }
            } catch (e) {
              console.warn("[HomePage] TMDB metadata fetch error:", e.message);
            }
            return rec;
          })
        );

        if (isMounted) {
          setRecs(enriched);
          setLoading(false);
        }
      };

      loadRecs();
    }, []);

    const handleDeleteRec = async (recId, e) => {
      e.stopPropagation();
      if (!window.confirm("Are you sure you want to delete this recording?")) return;
      const res = await deleteDispatcharrRecording(recId);
      if (res.success) {
        setRecs((prev) => prev.filter((r) => r.id !== recId));
      } else {
        alert(res.message || "Failed to delete recording.");
      }
    };

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
            recs.map((rec) => {
              const isCompleted = rec.status === "completed" || rec.file_url;
              const isRecording = rec.status === "recording" || rec.status === "in_progress";
              const baseUrl = getProxyBaseUrl();
              const rawPoster = rec.poster || rec.artwork || rec.thumbnail || rec.image_url || rec.channelObj?.logo;
              const posterUrl = rawPoster ? (rawPoster.startsWith("http") ? rawPoster : `${baseUrl}${rawPoster.startsWith("/") ? "" : "/"}${rawPoster}`) : "";
              const displayDate = rec.start_time || rec.created_at ? new Date(rec.start_time || rec.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
              const channelName = rec.channel_name || rec.channel || rec.channelObj?.name || "";

              return (
                <div key={rec.id} className="recordingCard" tabIndex="0" onClick={() => onPlayRecording(rec)}>
                  <div className="cardThumbnail">
                    {posterUrl ? (
                      <img src={posterUrl} alt={rec.title} className="recPosterImg" />
                    ) : (
                      <div className="thumbPlaceholder">
                        <FiVideo />
                      </div>
                    )}

                    {isCompleted && (
                      <button className="playOverlayBtn" onClick={(e) => { e.stopPropagation(); onPlayRecording(rec); }}>
                        <FiPlay />
                      </button>
                    )}

                    <span className={`statusTag ${rec.status || "completed"}`}>
                      {isRecording ? "REC NOW" : rec.status || "Ready"}
                    </span>
                  </div>

                  <div className="cardContent">
                    <h3 className="recTitle" title={rec.title}>
                      {rec.title || "Untitled Recording"}
                    </h3>

                    <div className="recMeta">
                      <span className="channelName">{channelName}</span>
                      {rec.vote_average && (
                        <span className="ratingBadge">
                          <FiStar style={{ fill: "#ffc107", color: "#ffc107", marginRight: 3 }} />
                          {rec.vote_average}
                        </span>
                      )}
                      {rec.release_date && (
                        <span className="yearBadge">
                          <FiCalendar style={{ marginRight: 3 }} />
                          {rec.release_date}
                        </span>
                      )}
                      {displayDate && (
                        <span className="recTime">
                          <FiClock style={{ marginRight: 4 }} /> {displayDate}
                        </span>
                      )}
                    </div>

                    {rec.overview && (
                      <p className="recOverview" title={rec.overview}>
                        {rec.overview}
                      </p>
                    )}

                    <div className="cardActions">
                      {(isCompleted || isRecording) && (
                        <button className="actionBtn play" onClick={(e) => { e.stopPropagation(); onPlayRecording(rec); }}>
                          <FiPlay /> Play
                        </button>
                      )}
                      <button className="actionBtn delete" onClick={(e) => handleDeleteRec(rec.id, e)} title="Delete Recording">
                        <FiTrash2 /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
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

  const handlePlayChannel = (ch) => {
    const streamUrl = getChannelStreamUrl(ch.id);
    setActiveStreamUrl(streamUrl);
    setActiveStreamTitle(ch.name || "Live TV Channel");
    setShowPlayer(true);
  };

  const handlePlayRecording = (rec) => {
    const streamUrl = getRecordingStreamUrl(rec);
    if (!streamUrl) {
      alert("Stream URL not available for this recording.");
      return;
    }
    setActiveStreamUrl(streamUrl);
    setActiveStreamTitle(rec.title || "DVR Recording");
    setShowPlayer(true);
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
