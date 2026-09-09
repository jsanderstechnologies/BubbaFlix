import React, { createContext, useState, useEffect } from "react";
import axios from "axios";
import { getServerUrl } from "../utils/serverSettings";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("bubbaflix_token") || null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const baseUrl = getServerUrl();
        const statusRes = await axios.get(`${baseUrl}/api/auth/status`);
        
        if (statusRes.data.setupRequired) {
          setSetupRequired(true);
          setLoading(false);
          return;
        }

        if (token) {
          axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const res = await axios.get(`${baseUrl}/api/auth/me`);
          setUser(res.data.user);
          localStorage.setItem("bubbaflix_token", token);
          
          // Apply user preferences locally if present
          if (res.data.user.preferences) {
            const prefs = res.data.user.preferences;
            if (prefs.simkl_access_token) {
              localStorage.setItem("simkl_access_token", prefs.simkl_access_token);
            }
            if (prefs.theme) {
              localStorage.setItem("app_theme", prefs.theme);
            }
            if (prefs.homeSections) {
              localStorage.setItem("bubbaflix_home_sections", JSON.stringify(prefs.homeSections));
            }
            if (prefs.watchProgress) {
              localStorage.setItem("bubbaflix_watch_progress", JSON.stringify(prefs.watchProgress));
            }
            if (prefs.allowedResolutions) {
              // Usually managed via serverSettings, but let's sync locally if we want
            }
            window.dispatchEvent(new CustomEvent("user-preferences-loaded", { detail: prefs }));
          }
          }
        }
      } catch (err) {
        console.error("Auth check failed", err);
        setUser(null);
        setToken(null);
        localStorage.removeItem("bubbaflix_token");
        localStorage.removeItem("simkl_access_token");
        delete axios.defaults.headers.common["Authorization"];
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [token]);

  const login = async (username, password) => {
    const baseUrl = getServerUrl();
    const res = await axios.post(`${baseUrl}/api/auth/login`, { username, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem("bubbaflix_token", res.data.token);
    if (res.data.user.preferences) {
      const prefs = res.data.user.preferences;
      if (prefs.simkl_access_token) localStorage.setItem("simkl_access_token", prefs.simkl_access_token);
      if (prefs.theme) localStorage.setItem("app_theme", prefs.theme);
      if (prefs.homeSections) localStorage.setItem("bubbaflix_home_sections", JSON.stringify(prefs.homeSections));
      if (prefs.watchProgress) localStorage.setItem("bubbaflix_watch_progress", JSON.stringify(prefs.watchProgress));
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
  };

  const logout = async () => {
    try {
      const baseUrl = getServerUrl();
      await axios.post(`${baseUrl}/api/auth/logout`);
    } catch(e) {}
    setToken(null);
    setUser(null);
    localStorage.removeItem("bubbaflix_token");
    localStorage.removeItem("simkl_access_token");
    delete axios.defaults.headers.common["Authorization"];
  };
  
  const updatePreferences = async (newPrefs) => {
    if (!user) return;
    try {
      const baseUrl = getServerUrl();
      const res = await axios.put(`${baseUrl}/api/users/preferences`, newPrefs);
      setUser(prev => ({ ...prev, preferences: res.data.preferences }));
    } catch(e) {
      console.error("Failed to sync preferences", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, setupRequired, setSetupRequired, login, logout, updatePreferences, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};
