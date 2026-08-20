import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import ContentWrapper from "../../components/content-wrapper";
import { fetchDataFromAPI, getActiveTmdbToken } from "../../utils/api";
import { getApiConfiguration } from "../../store/homeSlice";
import { FiKey, FiCheckCircle, FiXCircle, FiSave, FiRefreshCw, FiEye, FiEyeOff } from "react-icons/fi";
import "./index.scss";

const SettingsPage = () => {
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }
  const [testing, setTesting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const savedToken = localStorage.getItem("tmdb_token");
    const active = getActiveTmdbToken();
    setToken(savedToken || active || "");
    setIsCustom(!!savedToken);
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

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanToken = token.trim();
    if (!cleanToken) {
      setStatusMessage({ type: "error", text: "Token cannot be empty." });
      return;
    }
    localStorage.setItem("tmdb_token", cleanToken);
    setIsCustom(true);
    await refreshConfig();
    setStatusMessage({
      type: "success",
      text: "TMDB Access Token saved and image configuration updated successfully!",
    });
  };

  const handleClear = async () => {
    localStorage.removeItem("tmdb_token");
    const defaultToken = import.meta.env.VITE_APP_TMDB_KEY || "";
    setToken(defaultToken);
    setIsCustom(false);
    await refreshConfig();
    setStatusMessage({
      type: "info",
      text: "Custom token cleared. Reverted to default application token.",
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
          text: "Connection test successful! Your TMDB API key is valid and posters are ready to load.",
        });
      } else {
        setStatusMessage({
          type: "error",
          text: "Connection failed. Please check that your TMDB API token is correct.",
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: "Error testing connection. Invalid API token or network issue.",
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
              Manage your TMDB (The Movie Database) API Access Token and configuration.
            </p>
          </div>

          <div className="settingsCard">
            <div className="cardHeader">
              <h2>TMDB Read Access Token</h2>
              <span className={`badge ${isCustom ? "custom" : "default"}`}>
                {isCustom ? "Custom Token Active" : "Default Token Active"}
              </span>
            </div>

            <p className="description">
              BubbaFlix uses the TMDB v4 Read Access Token (Bearer Token) to fetch live movies, TV shows, and poster assets.
            </p>

            <form onSubmit={handleSave} className="tokenForm">
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
                  <FiSave /> Save Token
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
                    onClick={handleClear}
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="helpCard">
            <h3>How to get a TMDB Read Access Token?</h3>
            <ol>
              <li>Create a free account on <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">The Movie Database (TMDB)</a>.</li>
              <li>Go to <strong>Settings</strong> &gt; <strong>API</strong>.</li>
              <li>Generate an API key and copy the <strong>API Read Access Token</strong> (v4 Bearer Token).</li>
              <li>Paste your key into the input field above and click <strong>Save Token</strong>.</li>
            </ol>
          </div>
        </div>
      </ContentWrapper>
    </div>
  );
};

export default SettingsPage;
