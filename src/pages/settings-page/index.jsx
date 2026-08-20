import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import ContentWrapper from "../../components/content-wrapper";
import { fetchDataFromAPI, getActiveTmdbToken } from "../../utils/api";
import { getBitsearchApiKey } from "../../utils/bitsearch";
import { getGroqApiKey } from "../../utils/groqFilter";
import { getPremiumizeApiKey, testPremiumizeAccount } from "../../utils/premiumize";
import { getApiConfiguration } from "../../store/homeSlice";
import { THEMES, getSavedTheme, applyTheme } from "../../utils/theme";
import { FiKey, FiCheckCircle, FiXCircle, FiSave, FiRefreshCw, FiEye, FiEyeOff, FiSliders, FiSun, FiCpu, FiCloudLightning } from "react-icons/fi";
import "./index.scss";

const ALL_RESOLUTIONS = [
  { id: "2160p", label: "4K / 2160p (UHD)" },
  { id: "1080p", label: "1080p (Full HD)" },
  { id: "720p", label: "720p (HD)" },
  { id: "480p", label: "480p / SD" },
];

const ALL_CODECS = [
  { id: "x265", label: "x265 / HEVC" },
  { id: "x264", label: "x264 / H.264" },
  { id: "av1", label: "AV1" },
  { id: "xvid", label: "XviD / DivX" },
];

const SettingsPage = () => {
  // Theme State
  const [activeTheme, setActiveTheme] = useState("dark-red");

  // TMDB Key State
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [testing, setTesting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Premiumize Key State
  const [premiumizeKey, setPremiumizeKey] = useState("");
  const [showPremiumizeKey, setShowPremiumizeKey] = useState(false);
  const [premiumizeStatus, setPremiumizeStatus] = useState(null);
  const [hasPremiumizeCustom, setHasPremiumizeCustom] = useState(false);
  const [testingPremiumize, setTestingPremiumize] = useState(false);

  // Bitsearch Key State
  const [bitsearchKey, setBitsearchKey] = useState("");
  const [showBitsearchKey, setShowBitsearchKey] = useState(false);
  const [bitsearchStatus, setBitsearchStatus] = useState(null);
  const [hasBitsearchCustom, setHasBitsearchCustom] = useState(false);

  // Groq AI Key State
  const [groqKey, setGroqKey] = useState("");
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [groqStatus, setGroqStatus] = useState(null);
  const [hasGroqCustom, setHasGroqCustom] = useState(false);

  // Stream Resolution & Codec Filter State
  const [selectedResolutions, setSelectedResolutions] = useState(["2160p", "1080p", "720p", "480p"]);
  const [selectedCodecs, setSelectedCodecs] = useState(["x265", "x264", "av1", "xvid"]);
  const [excludeLowQuality, setExcludeLowQuality] = useState(true);
  const [filterStatus, setFilterStatus] = useState(null);

  const dispatch = useDispatch();

  useEffect(() => {
    // Theme
    const currentTheme = getSavedTheme();
    setActiveTheme(currentTheme);

    // TMDB
    const savedToken = localStorage.getItem("tmdb_token");
    const active = getActiveTmdbToken();
    setToken(savedToken || active || "");
    setIsCustom(!!savedToken);

    // Premiumize
    const savedPrem = getPremiumizeApiKey();
    setPremiumizeKey(savedPrem || "");
    setHasPremiumizeCustom(!!savedPrem);

    // Bitsearch
    const savedBitsearch = getBitsearchApiKey();
    setBitsearchKey(savedBitsearch || "");
    setHasBitsearchCustom(!!savedBitsearch);

    // Groq AI
    const savedGroq = getGroqApiKey();
    setGroqKey(savedGroq || "");
    setHasGroqCustom(!!savedGroq);

    // Stream Filters
    const savedRes = localStorage.getItem("stream_resolutions");
    const savedCodecs = localStorage.getItem("stream_codecs");
    const savedExcludeLow = localStorage.getItem("stream_exclude_low_quality");
    if (savedRes) setSelectedResolutions(JSON.parse(savedRes));
    if (savedCodecs) setSelectedCodecs(JSON.parse(savedCodecs));
    if (savedExcludeLow !== null) setExcludeLowQuality(JSON.parse(savedExcludeLow));
  }, []);

  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    applyTheme(themeId);
  };

  const refreshConfig = async () => {
    try {
      const res = await fetchDataFromAPI("/configuration");
      if (res && res.images && res.images.secure_base_url) {
        dispatch(
          getApiConfiguration({
            backdrop: res.images.secure_base_url + "original",
            profile: res.images.secure_base_url + "original",
            poster: res.images.secure_base_url + "original",
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
    await refreshConfig();
    setStatusMessage({
      type: "success",
      text: "TMDB Access Token saved successfully!",
    });
  };

  const handleClearTmdb = async () => {
    localStorage.removeItem("tmdb_token");
    const defaultToken = import.meta.env.VITE_APP_TMDB_KEY || "";
    setToken(defaultToken);
    setIsCustom(false);
    await refreshConfig();
    setStatusMessage({
      type: "info",
      text: "Custom TMDB token cleared. Reverted to default application token.",
    });
  };

  const handleSavePremiumize = async (e) => {
    e.preventDefault();
    const cleanKey = premiumizeKey.trim();
    if (!cleanKey) {
      setPremiumizeStatus({ type: "error", text: "Premiumize API Key cannot be empty." });
      return;
    }
    localStorage.setItem("premiumize_api_key", cleanKey);
    setHasPremiumizeCustom(true);

    setTestingPremiumize(true);
    const testRes = await testPremiumizeAccount(cleanKey);
    setTestingPremiumize(false);

    if (testRes.success) {
      setPremiumizeStatus({ type: "success", text: testRes.message });
    } else {
      setPremiumizeStatus({ type: "error", text: testRes.message });
    }
  };

  const handleClearPremiumize = () => {
    localStorage.removeItem("premiumize_api_key");
    setPremiumizeKey("");
    setHasPremiumizeCustom(false);
    setPremiumizeStatus({ type: "info", text: "Premiumize API Key cleared." });
  };

  const handleSaveBitsearch = (e) => {
    e.preventDefault();
    const cleanKey = bitsearchKey.trim();
    if (!cleanKey) {
      setBitsearchStatus({ type: "error", text: "Bitsearch API Key cannot be empty." });
      return;
    }
    localStorage.setItem("bitsearch_api_key", cleanKey);
    setHasBitsearchCustom(true);
    setBitsearchStatus({
      type: "success",
      text: "Bitsearch API Key saved successfully!",
    });
  };

  const handleClearBitsearch = () => {
    localStorage.removeItem("bitsearch_api_key");
    setBitsearchKey("");
    setHasBitsearchCustom(false);
    setBitsearchStatus({
      type: "info",
      text: "Bitsearch API Key cleared.",
    });
  };

  const handleSaveGroq = (e) => {
    e.preventDefault();
    const cleanKey = groqKey.trim();
    if (!cleanKey) {
      setGroqStatus({ type: "error", text: "Groq API Key cannot be empty." });
      return;
    }
    localStorage.setItem("groq_api_key", cleanKey);
    setHasGroqCustom(true);
    setGroqStatus({
      type: "success",
      text: "Groq AI Key saved successfully! AI stream filtering is active.",
    });
  };

  const handleClearGroq = () => {
    localStorage.removeItem("groq_api_key");
    setGroqKey("");
    setHasGroqCustom(false);
    setGroqStatus({
      type: "info",
      text: "Groq API Key cleared.",
    });
  };

  const handleToggleResolution = (resId) => {
    setSelectedResolutions((prev) =>
      prev.includes(resId) ? prev.filter((id) => id !== resId) : [...prev, resId]
    );
  };

  const handleToggleCodec = (codecId) => {
    setSelectedCodecs((prev) =>
      prev.includes(codecId) ? prev.filter((id) => id !== codecId) : [...prev, codecId]
    );
  };

  const handleSaveStreamFilters = (e) => {
    e.preventDefault();
    localStorage.setItem("stream_resolutions", JSON.stringify(selectedResolutions));
    localStorage.setItem("stream_codecs", JSON.stringify(selectedCodecs));
    localStorage.setItem("stream_exclude_low_quality", JSON.stringify(excludeLowQuality));
    setFilterStatus({
      type: "success",
      text: "Stream resolution, codec, and CAM/HDTS exclusion preferences saved!",
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

  return (
    <div className="settingsPage">
      <ContentWrapper>
        <div className="settingsContainer">
          <div className="settingsHeader">
            <h1 className="title">
              <FiKey className="icon" /> API & System Settings
            </h1>
            <p className="subtitle">
              Manage Premiumize streaming, color themes, API keys, Groq AI filtering, resolution preferences, and codec filters.
            </p>
          </div>

          {/* Color Theme Selector Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSun style={{ marginRight: 8 }} /> Application Color Theme</h2>
              <span className="badge custom">
                {THEMES.find((t) => t.id === activeTheme)?.name || "Active"}
              </span>
            </div>

            <p className="description">
              Select your preferred color theme for BubbaFlix, including Dark Red (Netflix Style).
            </p>

            <div className="themeGrid">
              {THEMES.map((theme) => (
                <div
                  key={theme.id}
                  className={`themeCard ${activeTheme === theme.id ? "active" : ""}`}
                  onClick={() => handleSelectTheme(theme.id)}
                >
                  <div
                    className="themePreview"
                    style={{
                      background: theme.bg,
                      borderColor: activeTheme === theme.id ? theme.primary : "rgba(255,255,255,0.1)",
                    }}
                  >
                    <div
                      className="previewHeader"
                      style={{ background: theme.bg2 }}
                    >
                      <div
                        className="previewBadge"
                        style={{ background: theme.gradient }}
                      />
                    </div>
                    <div className="previewBody">
                      <div
                        className="previewDot"
                        style={{ background: theme.primary }}
                      />
                      <div
                        className="previewDot"
                        style={{ background: theme.secondary }}
                      />
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

          {/* Premiumize.me API Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCloudLightning style={{ marginRight: 8 }} /> Premiumize.me Streaming API Key</h2>
              <span className={`badge ${hasPremiumizeCustom ? "custom" : "default"}`}>
                {hasPremiumizeCustom ? "Premiumize Stream Active" : "Key Required to Play Streams"}
              </span>
            </div>

            <p className="description">
              Required to instantly stream magnet torrent links directly inside the BubbaFlix video player without downloading.
            </p>

            <form onSubmit={handleSavePremiumize} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="premiumizeKey">PREMIUMIZE_API_KEY</label>
                <div className="inputWrapper">
                  <input
                    id="premiumizeKey"
                    type={showPremiumizeKey ? "text" : "password"}
                    value={premiumizeKey}
                    onChange={(e) => setPremiumizeKey(e.target.value)}
                    placeholder="Enter your Premiumize.me API key..."
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
                <button type="submit" className="saveBtn" disabled={testingPremiumize}>
                  <FiSave /> {testingPremiumize ? "Verifying..." : "Save Premiumize Key"}
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

          {/* Groq AI Key Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiCpu style={{ marginRight: 8 }} /> Groq AI Stream Filter Key</h2>
              <span className={`badge ${hasGroqCustom ? "custom" : "default"}`}>
                {hasGroqCustom ? "Groq AI Active" : "Regex Filter Mode"}
              </span>
            </div>

            <p className="description">
              Used to intelligently classify stream titles using fast Llama 3 AI inference, filtering out adult content, music audio files, and unrelated software.
            </p>

            <form onSubmit={handleSaveGroq} className="tokenForm">
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

          {/* TMDB API Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2>TMDB Read Access Token</h2>
              <span className={`badge ${isCustom ? "custom" : "default"}`}>
                {isCustom ? "Custom Token Active" : "Default Token Active"}
              </span>
            </div>

            <p className="description">
              Used to fetch live movies, TV shows, backdrop banners, and poster images.
            </p>

            <form onSubmit={handleSaveTmdb} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="tmdbToken">VITE_APP_TMDB_KEY</label>
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
                    title={showToken ? "Hide Key" : "Show Key"}
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
                  <FiSave /> Save TMDB Key
                </button>
                <button
                  type="button"
                  className="testBtn"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  <FiRefreshCw className={testing ? "spinning" : ""} />
                  {testing ? "Testing..." : "Test Connection"}
                </button>
                {isCustom && (
                  <button
                    type="button"
                    className="clearBtn"
                    onClick={handleClearTmdb}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Bitsearch API Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2>Bitsearch API Key</h2>
              <span className={`badge ${hasBitsearchCustom ? "custom" : "default"}`}>
                {hasBitsearchCustom ? "API Key Configured" : "Public Mode Active"}
              </span>
            </div>

            <p className="description">
              Used on Movie & TV detail pages to search and fetch stream magnet links via Bitsearch API.
            </p>

            <form onSubmit={handleSaveBitsearch} className="tokenForm">
              <div className="inputGroup">
                <label htmlFor="bitsearchKey">BITSEARCH_API_KEY</label>
                <div className="inputWrapper">
                  <input
                    id="bitsearchKey"
                    type={showBitsearchKey ? "text" : "password"}
                    value={bitsearchKey}
                    onChange={(e) => setBitsearchKey(e.target.value)}
                    placeholder="Enter your Bitsearch API key..."
                  />
                  <button
                    type="button"
                    className="toggleVisibility"
                    onClick={() => setShowBitsearchKey(!showBitsearchKey)}
                    title={showBitsearchKey ? "Hide Key" : "Show Key"}
                  >
                    {showBitsearchKey ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {bitsearchStatus && (
                <div className={`statusBanner ${bitsearchStatus.type}`}>
                  {bitsearchStatus.type === "success" && <FiCheckCircle />}
                  {bitsearchStatus.type === "error" && <FiXCircle />}
                  <span>{bitsearchStatus.text}</span>
                </div>
              )}

              <div className="buttonGroup">
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Bitsearch Key
                </button>
                {hasBitsearchCustom && (
                  <button
                    type="button"
                    className="clearBtn"
                    onClick={handleClearBitsearch}
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Stream Filter Preferences Card */}
          <div className="settingsCard">
            <div className="cardHeader">
              <h2><FiSliders style={{ marginRight: 8 }} /> Stream Resolution & Codec Filters</h2>
            </div>

            <p className="description">
              Select which video resolutions, codecs, and release qualities to return when searching Available Streams.
            </p>

            <form onSubmit={handleSaveStreamFilters} className="tokenForm">
              <div className="filterGroup">
                <label className="groupLabel">Allowed Resolutions</label>
                <div className="checkboxGrid">
                  {ALL_RESOLUTIONS.map((res) => (
                    <label key={res.id} className="checkboxOption">
                      <input
                        type="checkbox"
                        checked={selectedResolutions.includes(res.id)}
                        onChange={() => handleToggleResolution(res.id)}
                      />
                      <span>{res.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filterGroup">
                <label className="groupLabel">Allowed Codecs</label>
                <div className="checkboxGrid">
                  {ALL_CODECS.map((codec) => (
                    <label key={codec.id} className="checkboxOption">
                      <input
                        type="checkbox"
                        checked={selectedCodecs.includes(codec.id)}
                        onChange={() => handleToggleCodec(codec.id)}
                      />
                      <span>{codec.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="filterGroup">
                <label className="groupLabel">Quality Exclusions</label>
                <div className="checkboxGrid">
                  <label className="checkboxOption">
                    <input
                      type="checkbox"
                      checked={excludeLowQuality}
                      onChange={(e) => setExcludeLowQuality(e.target.checked)}
                    />
                    <span>Exclude CAM, Telesync (HDTS), & TC Videos</span>
                  </label>
                </div>
              </div>

              {filterStatus && (
                <div className={`statusBanner ${filterStatus.type}`}>
                  <FiCheckCircle />
                  <span>{filterStatus.text}</span>
                </div>
              )}

              <div className="buttonGroup">
                <button type="submit" className="saveBtn">
                  <FiSave /> Save Stream Preferences
                </button>
              </div>
            </form>
          </div>

          {/* Help Instructions */}
          <div className="helpCard">
            <h3>How to get API Keys?</h3>
            <ol>
              <li>
                <strong>Premiumize.me Key</strong>: Log in at <a href="https://www.premiumize.me/" target="_blank" rel="noreferrer">Premiumize.me</a> &gt; Account &gt; API Key.
              </li>
              <li>
                <strong>TMDB API Token</strong>: Register at <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a> &gt; Settings &gt; API &gt; API Read Access Token (v4).
              </li>
              <li>
                <strong>Groq AI Key</strong>: Register at <a href="https://console.groq.com/" target="_blank" rel="noreferrer">console.groq.com</a> &gt; API Keys to get your free key.
              </li>
              <li>
                <strong>Bitsearch API Key</strong>: Obtain your API key from <a href="https://bitsearch.to" target="_blank" rel="noreferrer">Bitsearch.to</a> to search torrent magnet links.
              </li>
            </ol>
          </div>
        </div>
      </ContentWrapper>
    </div>
  );
};

export default SettingsPage;
