import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import ContentWrapper from "../../components/content-wrapper";
import { fetchDataFromAPI, getActiveTmdbToken } from "../../utils/api";
import { getBitsearchApiKey } from "../../utils/bitsearch";
import { getApiConfiguration } from "../../store/homeSlice";
import { FiKey, FiCheckCircle, FiXCircle, FiSave, FiRefreshCw, FiEye, FiEyeOff } from "react-icons/fi";
import "./index.scss";

const SettingsPage = () => {
  // TMDB Key State
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [testing, setTesting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Bitsearch Key State
  const [bitsearchKey, setBitsearchKey] = useState("");
  const [showBitsearchKey, setShowBitsearchKey] = useState(false);
  const [bitsearchStatus, setBitsearchStatus] = useState(null);
  const [hasBitsearchCustom, setHasBitsearchCustom] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    // TMDB
    const savedToken = localStorage.getItem("tmdb_token");
    const active = getActiveTmdbToken();
    setToken(savedToken || active || "");
    setIsCustom(!!savedToken);

    // Bitsearch
    const savedBitsearch = getBitsearchApiKey();
    setBitsearchKey(savedBitsearch || "");
    setHasBitsearchCustom(!!savedBitsearch);
  }, []);

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
      text: "Bitsearch API Key saved successfully! Magnet link searches will use your API Key.",
    });
  };

  const handleClearBitsearch = () => {
    localStorage.removeItem("bitsearch_api_key");
    setBitsearchKey("");
    setHasBitsearchCustom(false);
    setBitsearchStatus({
      type: "info",
      text: "Bitsearch API Key cleared. Public search fallback will be used.",
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
              Manage your TMDB (The Movie Database) and Bitsearch API Access Keys.
            </p>
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
              <h2>Bitsearch API Key 🧲</h2>
              <span className={`badge ${hasBitsearchCustom ? "custom" : "default"}`}>
                {hasBitsearchCustom ? "API Key Configured" : "Public Mode Active"}
              </span>
            </div>

            <p className="description">
              Used on Movie & TV detail pages to search and fetch torrent magnet links via Bitsearch API.
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

          {/* Help Instructions */}
          <div className="helpCard">
            <h3>How to get API Keys?</h3>
            <ol>
              <li>
                <strong>TMDB API Token</strong>: Register at <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB</a> &gt; Settings &gt; API &gt; API Read Access Token (v4).
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
