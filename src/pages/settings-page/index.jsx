import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import { fetchDataFromAPI, getActiveTmdbToken } from "../../utils/api";
import { getSimklConfig, testSimklConnection } from "../../utils/simkl";
import { getGroqApiKey } from "../../utils/groqFilter";
import { getPremiumizeKey, savePremiumizeKey } from "../../utils/premiumize";
import { updateServerSettings, fetchServerSettings, getServerUrl, saveServerUrl, testBackendServerHealth } from "../../utils/serverSettings";
import { getApiConfiguration } from "../../store/homeSlice";
import { THEMES, getSavedTheme, applyTheme } from "../../utils/theme";
import { getHomeSections, saveHomeSections, DEFAULT_HOME_SECTIONS } from "../../utils/homeConfig";
import { FiKey, FiCheckCircle, FiXCircle, FiSave, FiRefreshCw, FiEye, FiEyeOff, FiSliders, FiSun, FiCpu, FiCloudLightning, FiCheckSquare, FiTv, FiPlus, FiMinus, FiServer, FiInfo, FiExternalLink, FiCloud, FiChevronUp, FiChevronDown, FiRotateCcw } from "react-icons/fi";
import "./index.scss";

const ALL_RESOLUTIONS = [
  { id: "2160p", label: "4K / 2160p (UHD)" },
  { id: "1080p", label: "1080p (Full HD)" },
  { id: "720p", label: "720p (HD)" },
  { id: "480p", label: "480p / SD" },
];

const SettingsPage = () => {
  // Theme State
  const [activeTheme, setActiveTheme] = useState("dark-red");

  // Backend Server Address State (Per-device client side only)
  const [serverUrlState, setServerUrlState] = useState("");
  const [serverStatus, setServerStatus] = useState(null);
  const [testingServer, setTestingServer] = useState(false);
  const [hasCustomServer, setHasCustomServer] = useState(false);

  // Dispatcharr Settings State
  const [dispatcharrUrl, setDispatcharrUrl] = useState("http://192.168.10.3:9191");
  const [dispatcharrApiKey, setDispatcharrApiKey] = useState("");
  const [dispatcharrStatus, setDispatcharrStatus] = useState(null);
  const [testingDispatcharr, setTestingDispatcharr] = useState(false);

  // Premiumize.me API State
  const [premiumizeKey, setPremiumizeKey] = useState("");
  const [showPremiumizeKey, setShowPremiumizeKey] = useState(false);
  const [premiumizeStatus, setPremiumizeStatus] = useState(null);
  const [hasPremiumizeCustom, setHasPremiumizeCustom] = useState(false);

  // TMDB Key State
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [testing, setTesting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // SIMKL State
  const [simklClientId, setSimklClientId] = useState("");
  const [simklClientSecret, setSimklClientSecret] = useState("");
  const [showSimklSecret, setShowSimklSecret] = useState(false);
  const [simklStatus, setSimklStatus] = useState(null);
  const [hasSimklCustom, setHasSimklCustom] = useState(false);
  const [testingSimkl, setTestingSimkl] = useState(false);

  // Groq AI Key State
  const [groqKey, setGroqKey] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqStatus, setGroqStatus] = useState(null);
  const [hasGroqCustom, setHasGroqCustom] = useState(false);

  // Stream Resolution & Quality Filter State
  const [selectedResolutions, setSelectedResolutions] = useState(["2160p", "1080p", "720p", "480p"]);
  const [excludeLowQuality, setExcludeLowQuality] = useState(true);
  const [filterStatus, setFilterStatus] = useState(null);

  // CPU & GPU Topology State
  const [cpuInfo, setCpuInfo] = useState(null);
  const [gpuInfo, setGpuInfo] = useState(null);

  // Home Screen Layout Customization State
  const [homeSections, setHomeSections] = useState(getHomeSections());
  const [homeSectionStatus, setHomeSectionStatus] = useState(null);

  const dispatch = useDispatch();

  const loadAllSettings = async () => {
    // 1. Per-device Server Address
    const currentServer = getServerUrl();
    setServerUrlState(currentServer);
    setHasCustomServer(!!currentServer);

    // 2. Pull Centralized Backend Settings
    const serverSettings = await fetchServerSettings();

    // 3. Populate state directly from backend serverSettings
    const currentTheme = serverSettings?.theme || getSavedTheme();
    setActiveTheme(currentTheme);
    applyTheme(currentTheme);

    const activeToken = serverSettings?.tmdbToken !== undefined ? serverSettings.tmdbToken : (localStorage.getItem("tmdb_token") || getActiveTmdbToken() || "");
    setToken(activeToken);
    setIsCustom(!!activeToken);

    const activeSimkl = serverSettings?.simklClientId !== undefined ? serverSettings.simklClientId : (getSimklConfig().clientId || "");
    setSimklClientId(activeSimkl);
    const activeSimklSecret = serverSettings?.simklClientSecret !== undefined ? serverSettings.simklClientSecret : (getSimklConfig().clientSecret || "");
    setSimklClientSecret(activeSimklSecret);
    setHasSimklCustom(!!activeSimkl);

    const activeGroq = serverSettings?.groqKey !== undefined ? serverSettings.groqKey : (getGroqApiKey() || "");
    setGroqKey(activeGroq);
    setHasGroqCustom(!!activeGroq);

    const activePrem = serverSettings?.premiumizeKey !== undefined ? serverSettings.premiumizeKey : (getPremiumizeKey() || "");
    setPremiumizeKey(activePrem);
    setHasPremiumizeCustom(!!activePrem);

    const activeDispUrl = serverSettings?.dispatcharrUrl || "http://192.168.10.3:9191";
    setDispatcharrUrl(activeDispUrl);
    const activeDispKey = serverSettings?.dispatcharrApiKey || "";
    setDispatcharrApiKey(activeDispKey);

    const resConfig = serverSettings?.stream_resolutions || (localStorage.getItem("stream_resolutions") ? JSON.parse(localStorage.getItem("stream_resolutions")) : ["2160p", "1080p", "720p", "480p"]);
    setSelectedResolutions(resConfig);

    const excludeLowConfig = serverSettings?.stream_exclude_low_quality !== undefined ? serverSettings.stream_exclude_low_quality : (localStorage.getItem("stream_exclude_low_quality") !== null ? JSON.parse(localStorage.getItem("stream_exclude_low_quality")) : true);
    setExcludeLowQuality(excludeLowConfig);

    if (serverSettings?.cpuTopology) {
      setCpuInfo(serverSettings.cpuTopology);
    }
    if (serverSettings?.gpuInfo) {
      setGpuInfo(serverSettings.gpuInfo);
    }
    if (serverSettings?.home_sections && Array.isArray(serverSettings.home_sections)) {
      setHomeSections(serverSettings.home_sections);
      saveHomeSections(serverSettings.home_sections);
    } else {
      setHomeSections(getHomeSections());
    }
  };

  const handleToggleHomeSection = (id) => {
    const updated = homeSections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s));
    setHomeSections(updated);
  };

  const handleMoveHomeSection = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= homeSections.length) return;
    const updated = [...homeSections];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setHomeSections(updated);
  };

  const handleSaveHomeSections = async (e) => {
    if (e) e.preventDefault();
    saveHomeSections(homeSections);
    await updateServerSettings({ home_sections: homeSections });
    setHomeSectionStatus({ type: "success", text: "Home screen layout saved & synced to all devices." });
  };

  const handleResetHomeSections = async () => {
    setHomeSections(DEFAULT_HOME_SECTIONS);
    saveHomeSections(DEFAULT_HOME_SECTIONS);
    await updateServerSettings({ home_sections: DEFAULT_HOME_SECTIONS });
    setHomeSectionStatus({ type: "info", text: "Home screen layout reset to defaults." });
  };

  const handleSaveDispatcharr = async (e) => {
    e.preventDefault();
    setTestingDispatcharr(true);
    await updateServerSettings({
      dispatcharrUrl: dispatcharrUrl.trim(),
      dispatcharrApiKey: dispatcharrApiKey.trim(),
    });
    setTestingDispatcharr(false);
    setDispatcharrStatus({ type: "success", text: "Dispatcharr server settings saved successfully!" });
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    applyTheme(themeId);
    updateServerSettings({ theme: themeId });
  };

  const handleSaveServerUrl = async (e) => {
    e.preventDefault();
    const cleanUrl = serverUrlState.trim();
    saveServerUrl(cleanUrl);
    setHasCustomServer(!!cleanUrl);

    setTestingServer(true);
    const testRes = await testBackendServerHealth(cleanUrl);
    setTestingServer(false);

    if (testRes.success) {
      setServerStatus({ type: "success", text: testRes.message });
    } else {
      setServerStatus({ type: "error", text: testRes.message });
    }

    await loadAllSettings();
  };

  const handleClearServerUrl = async () => {
    saveServerUrl("");
    setServerUrlState("");
    setHasCustomServer(false);
    setServerStatus({ type: "info", text: "Server address reset to default relative host." });
    await loadAllSettings();
  };

  const refreshConfig = async () => {
    try {
      const res = await fetchDataFromAPI("/configuration");
      if (res && res.images && res.images.secure_base_url) {
        dispatch(
          getApiConfiguration({
            backdrop: res.images.secure_base_url + "w1280",
            poster: res.images.secure_base_url + "w500",
            profile: res.images.secure_base_url + "w185",
          })
        );
      }
    } catch (e) {
      console.error("Error refreshing configuration:", e);
    }
  };

  const handleSaveTmdb = async (e) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setStatusMessage({ type: "error", text: "TMDB Token cannot be empty." });
      return;
    }
    localStorage.setItem("tmdb_token", cleanToken);
    setIsCustom(true);
    await updateServerSettings({ tmdbToken: cleanToken });
    await refreshConfig();
    setStatusMessage({
      type: "success",
      text: "TMDB Access Token saved & synced to backend server!",
    });
  };

  const handleClearTmdb = async () => {
    localStorage.removeItem("tmdb_token");
    const defaultToken = import.meta.env.VITE_APP_TMDB_KEY || "";
    setToken(defaultToken);
    setIsCustom(false);
    await updateServerSettings({ tmdbToken: "" });
    await refreshConfig();
    setStatusMessage({
      type: "info",
      text: "Custom TMDB token cleared. Reverted to default application token.",
    });
  };

  const handleSaveSimkl = async (e) => {
    e.preventDefault();
    const cleanId = simklClientId.trim();
    const cleanSecret = simklClientSecret.trim();
    if (!cleanId) {
      setSimklStatus({ type: "error", text: "SIMKL Client ID cannot be empty." });
      return;
    }
    localStorage.setItem("simkl_client_id", cleanId);
    if (cleanSecret) {
      localStorage.setItem("simkl_client_secret", cleanSecret);
    } else {
      localStorage.removeItem("simkl_client_secret");
    }
    setHasSimklCustom(true);
    await updateServerSettings({ simklClientId: cleanId, simklClientSecret: cleanSecret });

    setTestingSimkl(true);
    const testRes = await testSimklConnection(cleanId);
    setTestingSimkl(false);

    if (testRes.success) {
      setSimklStatus({ type: "success", text: `${testRes.message} (Synced to Backend)` });
    } else {
      setSimklStatus({ type: "error", text: testRes.message });
    }
  };

  const handleClearSimkl = async () => {
    localStorage.removeItem("simkl_client_id");
    localStorage.removeItem("simkl_client_secret");
    localStorage.removeItem("simkl_access_token");
    setSimklClientId("");
    setSimklClientSecret("");
    setHasSimklCustom(false);
    await updateServerSettings({ simklClientId: "", simklClientSecret: "" });
    setSimklStatus({ type: "info", text: "SIMKL credentials cleared on server." });
  };

  const handleSaveGroq = async (e) => {
    e.preventDefault();
    const cleanKey = groqKey.trim();
    saveGroqApiKey(cleanKey);
    setHasGroqCustom(!!cleanKey);
    await updateServerSettings({ groqKey: cleanKey });
    setGroqStatus({ type: "success", text: cleanKey ? "Groq AI Stream Filter Key saved!" : "Groq AI Key cleared." });
  };

  const handleClearGroq = async () => {
    saveGroqApiKey("");
    setGroqKey("");
    setHasGroqCustom(false);
    await updateServerSettings({ groqKey: "" });
    setGroqStatus({ type: "success", text: "Groq AI Key cleared." });
  };

  const handleSavePremiumize = async (e) => {
    e.preventDefault();
    const cleanKey = premiumizeKey.trim();
    savePremiumizeKey(cleanKey);
    setHasPremiumizeCustom(!!cleanKey);
    await updateServerSettings({ premiumizeKey: cleanKey });
    setPremiumizeStatus({ type: "success", text: "Premiumize API Key saved successfully!" });
  };

  const handleClearPremiumize = async () => {
    savePremiumizeKey("");
    setPremiumizeKey("");
    setHasPremiumizeCustom(false);
    await updateServerSettings({ premiumizeKey: "" });
    setPremiumizeStatus({ type: "success", text: "Premiumize API Key cleared." });
  };

  const handleToggleResolution = (resId) => {
    setSelectedResolutions((prev) =>
      prev.includes(resId) ? prev.filter((id) => id !== resId) : [...prev, resId]
    );
  };

  const handleSaveStreamFilters = async (e) => {
    e.preventDefault();
    localStorage.setItem("stream_resolutions", JSON.stringify(selectedResolutions));
    localStorage.setItem("stream_exclude_low_quality", JSON.stringify(excludeLowQuality));
    await updateServerSettings({
      stream_resolutions: selectedResolutions,
      stream_exclude_low_quality: excludeLowQuality,
    });
    setFilterStatus({
      type: "success",
      text: "Stream resolution and CAM/HDTS quality exclusion preferences saved & synced to backend server!",
    });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await fetchDataFromAPI("/configuration");
      if (res && res.images) {
        await refreshConfig();
        setStatusMessage({
          type: "success",
          text: "TMDB connection test successful! Key is valid.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: "Connection failed. Please check your TMDB API token.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: "Error testing connection. Invalid TMDB API token.",
      });
    } finally {
      setTesting(false);
    }
  };

  const isTvClient = typeof window !== "undefined" && (
    !!window.AndroidPlayer ||
    window.Android !== undefined ||
    /TV|AndroidTV|GoogleTV|SmartTV|SMART-TV|NETTV|WebOS|Tizen|BraveTV/i.test(navigator.userAgent)
  );

  return (
    <div className="settingsPage">
      <TopNav />
      <ContentWrapper>
        <div className="settingsContainer">
          <div className="settingsHeader">
            <h1 className="title">
              <FiKey className="icon" /> Application Settings
            </h1>
            <p className="subtitle">
              {isTvClient
                ? "Configure your TV color theme, allowed stream resolutions, and quality release filters."
                : "Centralized server configuration for AIOStreams streaming, SIMKL watch tracking, color themes, and stream resolution filters."}
            </p>
          </div>

          {/* Android TV Centralized Settings Banner */}
          {isTvClient && (
            <div className="settingsCard">
              <div className="cardHeader">
                <h2><FiServer style={{ marginRight: 8, color: "var(--pink)" }} /> Centralized Server Settings Active</h2>
                <span className="badge custom">Backend Synced</span>
              </div>
              <p className="description">
                Your Android TV app is automatically configured by your central BubbaFlix server (<code>{serverUrlState || "https://bubbaflix.sanders-technologies.net"}</code>). API tokens, Dispatcharr Live TV, AIOStreams Debrid, Premiumize, SIMKL, and Groq AI settings are managed globally on the server.
              </p>
            </div>
          )}

          {/* CPU Hardware Topology & GPU Acceleration Engine Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCpu style={{ marginRight: 8, color: "var(--pink)" }} /> CPU & GPU Hardware Transcode Engine</h2>
              <span className="badge custom"><FiServer style={{ marginRight: 4 }} /> {gpuInfo?.enabled ? "GPU Acceleration Active" : "Multi-Core Hyperthreading Active"}</span>
            </div>
            <p className="description">
              BubbaFlix server auto-detects GPU hardware accelerators (NVIDIA NVENC, Intel QuickSync QSV, AMD AMF, Linux VAAPI, Apple VideoToolbox) and CPU cores to power FFmpeg streams and eliminate buffering.
            </p>
            <div className="cpuTopologyGrid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 15, marginTop: 15 }}>
              <div className="cpuStatBox" style={{ background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Auto-Detected GPU Accelerator</div>
                <div style={{ fontSize: 14, fontWeight: "bold", color: gpuInfo?.enabled ? "#4caf50" : "#fff", marginTop: 4 }}>{gpuInfo?.type || "GPU Auto-Detection Active"}</div>
              </div>
              <div className="cpuStatBox" style={{ background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>FFmpeg Hardware Encoder</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "var(--pink)", marginTop: 4 }}>{gpuInfo?.encoder || "libx264"}</div>
              </div>
              <div className="cpuStatBox" style={{ background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>CPU Logical Cores / Hyperthreads</div>
                <div style={{ fontSize: 18, fontWeight: "bold", color: "#4caf50", marginTop: 4 }}>{cpuInfo?.logicalCores || 8} Cores ({cpuInfo?.uvThreadPoolSize || 8} Threads)</div>
              </div>
              <div className="cpuStatBox" style={{ background: "rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>CPU Processor Model</div>
                <div style={{ fontSize: 13, fontWeight: "bold", color: "#ffc107", marginTop: 4 }}>{cpuInfo?.model || "Generic CPU"}</div>
              </div>
            </div>
          </div>

          {/* Home Screen Category & Layout Manager Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSliders style={{ marginRight: 8, color: "var(--pink)" }} /> Home Screen Category & Layout Manager</h2>
              <span className="badge custom"><FiServer style={{ marginRight: 4 }} /> Syncs across devices</span>
            </div>
            <p className="description">
              Select which categories appear on your home screen and customize their display order as you please.
            </p>

            {homeSectionStatus && (
              <div className={`statusNotice ${homeSectionStatus.type}`} style={{ marginBottom: 15 }}>
                {homeSectionStatus.type === "success" ? <FiCheckCircle /> : <FiInfo />}
                <span>{homeSectionStatus.text}</span>
              </div>
            )}

            <div className="homeSectionsManager" style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 15 }}>
              {homeSections.map((sec, idx) => (
                <div
                  key={sec.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", fontSize: 15, fontWeight: 500, color: "#ffffff" }}>
                    <input
                      type="checkbox"
                      checked={sec.enabled}
                      onChange={() => handleToggleHomeSection(sec.id)}
                      style={{ width: 18, height: 18, accentColor: "var(--pink)", cursor: "pointer" }}
                    />
                    <span style={{ color: "#ffffff" }}>{sec.title}</span>
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveHomeSection(idx, -1)}
                      title="Move Up"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#fff",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: idx === 0 ? "not-allowed" : "pointer",
                        opacity: idx === 0 ? 0.3 : 1,
                      }}
                    >
                      <FiChevronUp />
                    </button>
                    <button
                      type="button"
                      disabled={idx === homeSections.length - 1}
                      onClick={() => handleMoveHomeSection(idx, 1)}
                      title="Move Down"
                      style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "none",
                        color: "#fff",
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: idx === homeSections.length - 1 ? "not-allowed" : "pointer",
                        opacity: idx === homeSections.length - 1 ? 0.3 : 1,
                      }}
                    >
                      <FiChevronDown />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="buttonGroup" style={{ marginTop: 20, display: "flex", gap: 12 }}>
              <button
                type="button"
                className="saveBtn"
                onClick={handleSaveHomeSections}
                style={{ background: "var(--pink)", borderColor: "var(--pink)", color: "#ffffff", display: "flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
              >
                <FiSave /> Save Home Layout
              </button>
              <button
                type="button"
                className="clearBtn"
                onClick={handleResetHomeSections}
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 8, cursor: "pointer" }}
              >
                <FiRotateCcw /> Reset Defaults
              </button>
            </div>
          </div>

          {/* Color Theme Selector Card (Visible on ALL Clients) */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSun style={{ marginRight: 8 }} /> Application Color Theme</h2>
              <span className="badge custom"><FiServer style={{ marginRight: 4 }} /> Server Synced</span>
            </div>
            <p className="description">
              Select your preferred color theme for BubbaFlix, including Dark Red (Netflix Style). Synced across all client devices.
            </p>
            <div className="themeGrid">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={`themeCard ${activeTheme === theme.id ? "active" : ""}`}
                  onClick={() => handleSelectTheme(theme.id)}
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSelectTheme(theme.id);
                    }
                  }}
                >
                  <div
                    className="themePreview"
                    style={{
                      background: theme.bg,
                      borderColor: activeTheme === theme.id ? theme.primary : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div className="previewHeader" style={{ background: theme.bg2 }}>
                      <div className="previewBadge" style={{ background: theme.gradient }} />
                    </div>
                    <div className="previewBody">
                      <div className="previewDot" style={{ background: theme.primary }} />
                      <div className="previewDot" style={{ background: theme.secondary }} />
                    </div>
                  </div>
                  <div className="themeInfo">
                    <span className="themeName">{theme.name}</span>
                    <span className="themeDesc">{theme.description}</span>
                  </div>
                  {activeTheme === theme.id && (
                    <div className="activeCheck">
                      <FiCheckCircle />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Stream Resolution & CAM Exclusion Settings Card (Visible on ALL Clients) */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSliders style={{ marginRight: 8 }} /> Stream Resolution & Quality Filters</h2>
              <span className="badge custom"><FiServer style={{ marginRight: 4 }} /> Server Synced</span>
            </div>
            <p className="description">
              Configure allowed resolutions and toggle CAM / HDTS low-quality release exclusions across all devices.
            </p>
            <form onSubmit={handleSaveStreamFilters} className="tokenForm">
              <div className="inputGroup">
                <label>ALLOWED_STREAM_RESOLUTIONS</label>
                <div className="resolutionGrid">
                  {ALL_RESOLUTIONS.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      className={`resOption ${selectedResolutions.includes(res.id) ? "selected" : ""}`}
                      onClick={() => handleToggleResolution(res.id)}
                      tabIndex="0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleToggleResolution(res.id);
                        }
                      }}
                    >
                      <span className="checkbox">
                        {selectedResolutions.includes(res.id) ? "✓" : ""}
                      </span>
                      <span className="resLabel">{res.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="inputGroup" style={{ marginTop: 20 }}>
                <label>EXCLUDE_LOW_QUALITY_CAM_HDTS</label>
                <div
                  className={`qualityToggle ${excludeLowQuality ? "active" : ""}`}
                  onClick={() => setExcludeLowQuality(!excludeLowQuality)}
                  tabIndex="0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExcludeLowQuality(!excludeLowQuality);
                    }
                  }}
                >
                  <span className="toggleSwitch" />
                  <span className="toggleLabel">
                    {excludeLowQuality
                      ? "Strictly Exclude CAM, HDCAM, Telesync, and HDTS Releases (Recommended)"
                      : "Allow CAM and Low-Quality Releases"}
                  </span>
                </div>
              </div>
              {filterStatus && (
                <div className={`statusBanner ${filterStatus.type}`}>
                  {filterStatus.type === "success" && <FiCheckCircle />}
                  {filterStatus.type === "error" && <FiXCircle />}
                  <span>{filterStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup" style={{ marginTop: 20 }}>
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Stream Preferences
                </button>
              </div>
            </form>
          </div>

          {/* Centralized Server & API Configuration Cards (Hidden on TV Client, Only Visible on Web / Desktop) */}
          {!isTvClient && (
            <>
          {/* Backend Server Host & Address Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiServer style={{ marginRight: 8 }} /> Backend Server Address</h2>
              <span className={`badge ${hasCustomServer ? "custom" : "default"}`}>
                {hasCustomServer ? "Custom Host Active" : "Default Relative Host"}
              </span>
            </div>
            <p className="description">
              Specify a custom BubbaFlix backend server IP or URL for central settings storage and proxying (saved independently on each device).
            </p>
            <form onSubmit={handleSaveServerUrl} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="serverUrl">BACKEND_SERVER_URL</label>
                <div className="inputWrapper">
                  <input
                    id="serverUrl"
                    type="text"
                    value={serverUrlState}
                    onChange={(e) => setServerUrlState(e.target.value)}
                    placeholder="e.g. http://192.168.10.10:5150 (or leave empty for default)"
                  />
                </div>
              </div>
              {serverStatus && (
                <div className={`statusBanner ${serverStatus.type}`}>
                  {serverStatus.type === "success" && <FiCheckCircle />}
                  {serverStatus.type === "error" && <FiXCircle />}
                  <span>{serverStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup">
                <button type="submit" className="saveBtn" disabled={testingServer}>
                  <FiSave /> {testingServer ? "Connecting..." : "Save Server Address"}
                </button>
                {hasCustomServer && (
                  <button
                    type="button"
                    className="clearBtn"
                    onClick={handleClearServerUrl}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Dispatcharr Live TV & DVR Server Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiTv style={{ marginRight: 8 }} /> Dispatcharr Live TV & DVR Server</h2>
              <span className={`badge ${dispatcharrUrl ? "custom" : "default"}`}>
                <FiServer style={{ marginRight: 4 }} /> Dispatcharr Active
              </span>
            </div>
            <p className="description">
              Configure your Dispatcharr server address and API key for Live TV channel lineups, EPG guide schedules, and DVR recordings.
            </p>
            <form onSubmit={handleSaveDispatcharr} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="dispUrl">DISPATCHARR_SERVER_URL</label>
                <div className="inputWrapper">
                  <input
                    id="dispUrl"
                    type="text"
                    value={dispatcharrUrl}
                    onChange={(e) => setDispatcharrUrl(e.target.value)}
                    placeholder="http://192.168.10.3:9191"
                  />
                </div>
              </div>
              <div className="inputGroup" style={{ marginTop: 15 }}>
                <label htmlFor="dispKey">DISPATCHARR_API_KEY (Optional)</label>
                <div className="inputWrapper">
                  <input
                    id="dispKey"
                    type="password"
                    value={dispatcharrApiKey}
                    onChange={(e) => setDispatcharrApiKey(e.target.value)}
                    placeholder="API Key or Bearer Token"
                  />
                </div>
              </div>

              {dispatcharrStatus && (
                <div className={`statusBanner ${dispatcharrStatus.type}`}>
                  {dispatcharrStatus.type === "success" && <FiCheckCircle />}
                  {dispatcharrStatus.type === "error" && <FiXCircle />}
                  <span>{dispatcharrStatus.text}</span>
                </div>
              )}

              <div className="buttonGroup" style={{ marginTop: 15 }}>
                <button type="submit" className="saveBtn" disabled={testingDispatcharr}>
                  <FiSave /> {testingDispatcharr ? "Saving..." : "Save Dispatcharr Settings"}
                </button>
              </div>
            </form>
          </div>

          {/* SIMKL Watch Tracker Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCheckSquare style={{ marginRight: 8 }} /> SIMKL Watch Status Tracker</h2>
              <span className={`badge ${hasSimklCustom ? "custom" : "default"}`}>
                <FiServer style={{ marginRight: 4 }} /> {hasSimklCustom ? "SIMKL Sync Active" : "SIMKL ID Required"}
              </span>
            </div>
            <p className="description">
              Sync watched movies and TV episode playback history automatically with your SIMKL watchlist across all devices using your SIMKL Client ID.
            </p>
            <div className="apiInstruction">
              <FiInfo style={{ marginRight: 6, verticalAlign: "middle" }} />
              <strong>How to get key:</strong> Register at <a href="https://simkl.com/settings/developer/" target="_blank" rel="noreferrer">simkl.com/settings/developer/</a> &gt; Create App to get your Client ID.
            </div>
            <form onSubmit={handleSaveSimkl} className="tokenForm" style={{ marginTop: 15 }}>
              <div className="inputGroup">
                <label htmlFor="simklClientId">SIMKL_CLIENT_ID</label>
                <div className="inputWrapper">
                  <input
                    id="simklClientId"
                    type="text"
                    value={simklClientId}
                    onChange={(e) => setSimklClientId(e.target.value)}
                    placeholder="Enter your SIMKL API Client ID..."
                  />
                </div>
              </div>
              <div className="inputGroup" style={{ marginTop: 12 }}>
                <label htmlFor="simklClientSecret">SIMKL_CLIENT_SECRET (Optional)</label>
                <div className="inputWrapper">
                  <input
                    id="simklClientSecret"
                    type={showSimklSecret ? "text" : "password"}
                    value={simklClientSecret}
                    onChange={(e) => setSimklClientSecret(e.target.value)}
                    placeholder="Enter your SIMKL API Client Secret..."
                  />
                  <button
                    type="button"
                    className="toggleVisBtn"
                    onClick={() => setShowSimklSecret(!showSimklSecret)}
                  >
                    {showSimklSecret ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
              {simklStatus && (
                <div className={`statusBanner ${simklStatus.type}`}>
                  {simklStatus.type === "success" && <FiCheckCircle />}
                  {simklStatus.type === "error" && <FiXCircle />}
                  <span>{simklStatus.text}</span>
                </div>
              )}
              <div className="buttonGroup">
                <button type="submit" className="saveBtn" disabled={testingSimkl}>
                  <FiSave /> {testingSimkl ? "Verifying..." : "Save SIMKL Config"}
                </button>
                {hasSimklCustom && (
                  <button
                    type="button"
                    className="clearBtn"
                    onClick={handleClearSimkl}
                  >
                    Clear Credentials
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Global System & Stream Resolution Settings Cards */}
          {/* Groq AI Key Card */}
              <div className="settingsCard">
                <div className="cardHeader">
                  <h2><FiCpu style={{ marginRight: 8 }} /> Groq AI Stream Filter Key</h2>
                  <span className={`badge ${hasGroqCustom ? "custom" : "default"}`}>
                    <FiServer style={{ marginRight: 4 }} /> {hasGroqCustom ? "Groq AI Active" : "Regex Filter Mode"}
                  </span>
                </div>
                <p className="description">
                  Used to intelligently classify stream titles using fast Llama 3 AI inference, filtering out adult content, music audio files, and unrelated software.
                </p>
                <div className="apiInstruction">
                  <FiInfo style={{ marginRight: 6, verticalAlign: "middle" }} />
                  <strong>How to get key:</strong> Register at <a href="https://console.groq.com/" target="_blank" rel="noreferrer">console.groq.com</a> &gt; API Keys to get your free key.
                </div>
                <form onSubmit={handleSaveGroq} className="tokenForm" style={{ marginTop: 15 }}>
                  <div className="inputGroup">
                    <label htmlFor="groqKey">GROQ_API_KEY</label>
                    <div className="inputWrapper">
                      <input
                        id="groqKey"
                        type={showGroqKey ? "text" : "password"}
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        placeholder="gsk_..."
                      />
                      <button
                        type="button"
                        className="toggleVisibility"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        title={showGroqKey ? "Hide Key" : "Show Key"}
                      >
                        {showGroqKey ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {groqStatus && (
                    <div className={`statusBanner ${groqStatus.type}`}>
                      {groqStatus.type === "success" && <FiCheckCircle />}
                      {groqStatus.type === "error" && <FiXCircle />}
                      <span>{groqStatus.text}</span>
                    </div>
                  )}
                  <div className="buttonGroup">
                    <button type="submit" className="saveBtn">
                      <FiSave /> Save Groq AI Key
                    </button>
                    {hasGroqCustom && (
                      <button
                        type="button"
                        className="clearBtn"
                        onClick={handleClearGroq}
                      >
                        Clear Key
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Premiumize.me API Cloud Stream Card */}
              <div className="settingsCard">
                <div className="cardHeader">
                  <h2><FiCloudLightning style={{ marginRight: 8 }} /> Premiumize.me Cloud Stream Key</h2>
                  <span className={`badge ${hasPremiumizeCustom ? "custom" : "default"}`}>
                    <FiServer style={{ marginRight: 4 }} /> {hasPremiumizeCustom ? "Premiumize Active" : "No Key Set"}
                  </span>
                </div>
                <p className="description">
                  Automatically adds magnet torrent files to your Premiumize cloud storage for 7-day retention, resolving direct high-speed HTTP CDN video streams for instant playback across all devices.
                </p>
                <div className="apiInstruction">
                  <FiInfo style={{ marginRight: 6, verticalAlign: "middle" }} />
                  <strong>How to get key:</strong> Login at <a href="https://www.premiumize.me/account" target="_blank" rel="noreferrer">premiumize.me/account</a> &gt; API Key.
                </div>
                <form onSubmit={handleSavePremiumize} className="tokenForm" style={{ marginTop: 15 }}>
                  <div className="inputGroup">
                    <label htmlFor="premiumizeKey">PREMIUMIZE_API_KEY</label>
                    <div className="inputWrapper">
                      <input
                        id="premiumizeKey"
                        type={showPremiumizeKey ? "text" : "password"}
                        value={premiumizeKey}
                        onChange={(e) => setPremiumizeKey(e.target.value)}
                        placeholder="Enter your Premiumize Customer ID / API Key..."
                      />
                      <button
                        type="button"
                        className="toggleVisibility"
                        onClick={() => setShowPremiumizeKey(!showPremiumizeKey)}
                        title={showPremiumizeKey ? "Hide Key" : "Show Key"}
                      >
                        {showPremiumizeKey ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {premiumizeStatus && (
                    <div className={`statusBanner ${premiumizeStatus.type}`}>
                      {premiumizeStatus.type === "success" && <FiCheckCircle />}
                      {premiumizeStatus.type === "error" && <FiXCircle />}
                      <span>{premiumizeStatus.text}</span>
                    </div>
                  )}
                  <div className="buttonGroup">
                    <button type="submit" className="saveBtn">
                      <FiSave /> Save Premiumize Key
                    </button>
                    {hasPremiumizeCustom && (
                      <button
                        type="button"
                        className="clearBtn"
                        onClick={handleClearPremiumize}
                      >
                        Clear Key
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* TMDB API Card */}
              <div className="settingsCard">
                <div className="cardHeader">
                  <h2>TMDB Read Access Token</h2>
                  <span className={`badge ${isCustom ? "custom" : "default"}`}>
                    <FiServer style={{ marginRight: 4 }} /> {isCustom ? "Custom Token Active" : "Default Token Active"}
                  </span>
                </div>
                <p className="description">
                  Used to fetch live movies, TV shows, backdrop banners, and poster images.
                </p>
                <div className="apiInstruction">
                  <FiInfo style={{ marginRight: 6, verticalAlign: "middle" }} />
                  <strong>How to get key:</strong> Register at <a href="https://themoviedb.org/" target="_blank" rel="noreferrer">themoviedb.org</a> &gt; Settings &gt; API &gt; API Read Access Token (v4).
                </div>
                <form onSubmit={handleSaveTmdb} className="tokenForm" style={{ marginTop: 15 }}>
                  <div className="inputGroup">
                    <label htmlFor="tmdbToken">TMDB_READ_ACCESS_TOKEN</label>
                    <div className="inputWrapper">
                      <input
                        id="tmdbToken"
                        type={showToken ? "text" : "password"}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiJ9..."
                      />
                      <button
                        type="button"
                        className="toggleVisibility"
                        onClick={() => setShowToken(!showToken)}
                        title={showToken ? "Hide Token" : "Show Token"}
                      >
                        {showToken ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>
                  </div>
                  {statusMessage && (
                    <div className={`statusBanner ${statusMessage.type}`}>
                      {statusMessage.type === "success" && <FiCheckCircle />}
                      {statusMessage.type === "error" && <FiXCircle />}
                      <span>{statusMessage.text}</span>
                    </div>
                  )}
                  <div className="buttonGroup">
                    <button type="submit" className="saveBtn">
                      <FiSave /> Save TMDB Token
                    </button>
                    <button
                      type="button"
                      className="testBtn"
                      onClick={handleTestConnection}
                      disabled={testing}
                    >
                      <FiRefreshCw className={testing ? "spin" : ""} />
                      {testing ? "Testing..." : "Test Token Connection"}
                    </button>
                    {isCustom && (
                      <button
                        type="button"
                        className="clearBtn"
                        onClick={handleClearTmdb}
                      >
                        Clear Token
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </>
          )}
        </div>
      </ContentWrapper>
    </div>
  );
};

export default SettingsPage;
