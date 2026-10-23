import React, { useState, useEffect, useMemo, useRef } from "react";
import ContentWrapper from "../../components/content-wrapper";
import TopNav from "../../components/top-nav";
import {
  fetchIptvConfig,
  saveIptvConfig,
  testIptvConnection,
  fetchIptvGroups,
  fetchIptvChannels,
} from "../../utils/iptv";
import {
  FiTv,
  FiServer,
  FiCheck,
  FiX,
  FiCheckCircle,
  FiAlertCircle,
  FiSave,
  FiRefreshCw,
  FiEye,
  FiEyeOff,
  FiSearch,
  FiFilter,
  FiHash,
  FiLayers,
  FiSliders,
  FiArrowLeft,
  FiList,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import "./index.scss";

const IptvSetupPage = () => {
  const navigate = useNavigate();

  // Read ?tab= from URL or default to credentials
  const getInitialTab = () => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t === "groups" || t === "channels" || t === "credentials") return t;
    }
    return "credentials";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync activeTab if URL query param changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (t && (t === "groups" || t === "channels" || t === "credentials")) {
        setActiveTab(t);
      }
    }
  }, [window.location.search]);

  // Config State
  const [credentials, setCredentials] = useState({
    serverUrl: "",
    username: "",
    password: "",
    epgUrl: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [groupsConfig, setGroupsConfig] = useState({}); // category_id -> { enabled, name }
  const [channelsConfig, setChannelsConfig] = useState({}); // stream_id -> { enabled, channelNumber, customName }
  const [autoNumberStrategy, setAutoNumberStrategy] = useState("manual");

  // Loaded Provider Data
  const [loadedGroups, setLoadedGroups] = useState([]);
  const [loadedChannels, setLoadedChannels] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [groupSearch, setGroupSearch] = useState("");
  const [channelSearch, setChannelSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [channelVisibilityFilter, setChannelVisibilityFilter] = useState("all"); // all | visible | hidden
  const [batchStartNumber, setBatchStartNumber] = useState(1);

  // Debounce refs to prevent double-activations from TV remotes
  const lastGroupToggleRef = useRef({ id: null, time: 0 });
  const lastChannelToggleRef = useRef({ id: null, time: 0 });

  // Window-level Smart TV Back Button handler -> Always exits cleanly to Settings
  useEffect(() => {
    const handleBackPress = (e) => {
      const key = e.key;
      const code = e.keyCode;
      if (key === "Escape" || key === "Back" || code === 27 || code === 10009 || code === 461 || code === 4) {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
          if (active.getAttribute("data-editing-active") === "true") {
            active.removeAttribute("data-editing-active");
            active.blur();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
        e.preventDefault();
        e.stopPropagation();
        navigate("/settings");
      }
    };

    window.addEventListener("keydown", handleBackPress, true);
    return () => {
      window.removeEventListener("keydown", handleBackPress, true);
    };
  }, [navigate]);

  // Auto-focus first interactive element when switching tabs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "groups") {
        const firstCard = document.querySelector(".groupsGrid .groupCard, .groupToolbar .toolBtn");
        if (firstCard && typeof firstCard.focus === "function") {
          firstCard.focus({ preventScroll: true });
        }
      } else if (activeTab === "channels") {
        const firstChannelToggle = document.querySelector(".channelsTable .visToggleBtn, .channelsToolbar .toolBtn");
        if (firstChannelToggle && typeof firstChannelToggle.focus === "function") {
          firstChannelToggle.focus({ preventScroll: true });
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // Load initial config from server
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoadingData(true);
      const cfg = await fetchIptvConfig();
      if (isMounted && cfg) {
        if (cfg.credentials) {
          setCredentials({
            serverUrl: cfg.credentials.serverUrl || "",
            username: cfg.credentials.username || "",
            password: cfg.credentials.password || "",
            epgUrl: cfg.credentials.epgUrl || "",
          });
        }
        if (cfg.groups && Object.keys(cfg.groups).length > 0) {
          setGroupsConfig(cfg.groups);
          // Immediately populate loadedGroups so categories appear instantly without network delay
          const initialGroups = [];
          const seen = new Set();
          for (const [key, val] of Object.entries(cfg.groups)) {
            const name = typeof val === "object" ? val.name || key : key;
            if (!seen.has(name)) {
              seen.add(name);
              initialGroups.push({
                category_id: key,
                category_name: name,
                channel_count: 0,
                enabled: typeof val === "object" ? val.enabled !== false : Boolean(val),
              });
            }
          }
          if (initialGroups.length > 0) {
            setLoadedGroups(initialGroups);
          }
        } else if (cfg.groups) {
          setGroupsConfig(cfg.groups);
        }
        if (cfg.channels) setChannelsConfig(cfg.channels);
        if (cfg.autoNumberStrategy) setAutoNumberStrategy(cfg.autoNumberStrategy);

        // If credentials exist, fetch groups and channels
        if (cfg.credentials?.serverUrl && cfg.credentials?.username) {
          await loadProviderData();
        }
      }
      if (isMounted) setLoadingData(false);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadProviderData = async (forceRefresh = false) => {
    setLoadingData(true);
    if (forceRefresh) {
      setSaveStatus({
        type: "info",
        text: "Refreshing categories and channels from IPTV provider, please wait...",
      });
    }
    try {
      // Sequential loading ensures we never open concurrent streams that trip provider connection limits
      let grps = await fetchIptvGroups(forceRefresh);
      const chs = await fetchIptvChannels(true);

      // Resilient fallback: if groups list is empty but channels loaded, extract unique categories
      if ((!grps || grps.length === 0) && chs && chs.length > 0) {
        const derivedMap = new Map();
        chs.forEach((c) => {
          const cid = String(c.category_id || c.category_name || "General");
          const cname = c.category_name || "General";
          if (!derivedMap.has(cid)) {
            derivedMap.set(cid, {
              category_id: cid,
              category_name: cname,
              channel_count: 0,
            });
          }
          derivedMap.get(cid).channel_count++;
        });
        grps = Array.from(derivedMap.values());
      }

      setLoadedGroups(grps || []);
      setLoadedChannels(chs || []);

      // Pre-populate groupsConfig with existing server rules or defaults so they are never lost
      if (grps && grps.length > 0) {
        setGroupsConfig((prev) => {
          const merged = { ...prev };
          grps.forEach((g) => {
            const cid = String(g.category_id);
            const cname = g.category_name;
            if (merged[cid] === undefined && merged[cname] === undefined) {
              merged[cid] = { name: cname, enabled: g.enabled !== false };
              if (cname) merged[cname] = { id: cid, enabled: g.enabled !== false };
            }
          });
          return merged;
        });
      }

      // Retain existing channelsConfig customizations without generating 20,000 dummy keys


      if (forceRefresh) {
        const groupCount = grps ? grps.length : 0;
        const channelCount = chs ? chs.length : 0;
        setSaveStatus({
          type: "success",
          text: `Refreshed successfully! Loaded ${groupCount} categories and ${channelCount} channels from IPTV provider.`,
        });
        setTimeout(() => setSaveStatus(null), 6000);
      }
    } catch (e) {
      console.error("Failed to load provider data:", e);
      if (forceRefresh) {
        setSaveStatus({
          type: "error",
          text: `Failed to refresh from IPTV provider: ${e.message || "Network request failed"}`,
        });
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleTestConnection = async () => {
    if (!credentials.serverUrl || !credentials.username || !credentials.password) {
      setTestResult({
        success: false,
        message: "Please fill out the Server URL, Username, and Password.",
      });
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    const res = await testIptvConnection(credentials);
    setTestingConnection(false);
    if (res.success) {
      setTestResult({
        success: true,
        message: res.message || `Connected successfully! Found ${res.channelCount || 0} channels across ${res.groupCount || 0} categories.`,
      });
      // Auto-load provider groups and channels smoothly on successful connection
      await loadProviderData(false);
    } else {
      setTestResult({
        success: false,
        message: res.error || "Failed to authenticate with IPTV provider.",
      });
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveStatus(null);
    const payload = {
      credentials,
      groups: groupsConfig,
      channels: channelsConfig,
      autoNumberStrategy,
    };
    const res = await saveIptvConfig(payload);
    setSaving(false);
    if (res.success) {
      if (res.config?.groups) {
        setGroupsConfig(res.config.groups);
      }
      if (res.config?.channels) {
        setChannelsConfig(res.config.channels);
      }
      setSaveStatus({
        type: "success",
        text: "IPTV settings, group visibility, and channel numbers saved successfully!",
      });
      setTimeout(() => setSaveStatus(null), 4000);
      // Reload provider data to reflect saved changes
      await loadProviderData(false);
    } else {
      setSaveStatus({
        type: "error",
        text: res.error || "Failed to save configuration to server.",
      });
    }
  };

  // Helper to check group enabled state reliably across id/name maps and boolean/object representations
  const checkGroupEnabled = (cfgMap, grp) => {
    if (!grp) return true;
    const cid = String(grp.category_id || "");
    const cname = grp.category_name || "";
    let rule = undefined;
    if (cfgMap) {
      if (cid && cfgMap[cid] !== undefined) {
        rule = cfgMap[cid];
      } else if (cname && cfgMap[cname] !== undefined) {
        rule = cfgMap[cname];
      }
    }
    if (rule === undefined) {
      return grp.enabled !== false;
    }
    if (typeof rule === "boolean") {
      return rule;
    }
    if (typeof rule === "object" && rule !== null) {
      return rule.enabled !== false;
    }
    return true;
  };

  // Group toggles (bidirectional: category_id and category_name)
  const toggleGroupVisibility = (categoryId) => {
    const now = Date.now();
    const cid = String(categoryId);
    // Ignore rapid double-activations on the same category within 250ms
    if (lastGroupToggleRef.current.id === cid && now - lastGroupToggleRef.current.time < 250) {
      return;
    }
    lastGroupToggleRef.current = { id: cid, time: now };

    const grp = loadedGroups.find((g) => String(g.category_id) === cid || g.category_name === cid);
    const cname = grp?.category_name || cid;

    setGroupsConfig((prev) => {
      const isCurrentlyEnabled = checkGroupEnabled(prev, grp || { category_id: cid, category_name: cname });
      const nextState = !isCurrentlyEnabled;
      const updated = {
        ...prev,
        [cid]: { name: cname, enabled: nextState },
      };
      if (cname && cname !== cid) {
        updated[cname] = { id: cid, enabled: nextState };
      }
      return updated;
    });
  };

  const setAllGroupsVisibility = (visible) => {
    setGroupsConfig((prev) => {
      const updated = { ...prev };
      loadedGroups.forEach((g) => {
        const cid = String(g.category_id);
        const cname = g.category_name;
        updated[cid] = { name: cname, enabled: visible };
        if (cname && cname !== cid) {
          updated[cname] = { id: cid, enabled: visible };
        }
      });
      return updated;
    });
  };

  // Channel toggles & number assignments
  const toggleChannelVisibility = (streamId, defaultEnabled) => {
    const now = Date.now();
    const sid = String(streamId);
    // Ignore rapid double-activations on the same stream within 250ms
    if (lastChannelToggleRef.current.id === sid && now - lastChannelToggleRef.current.time < 250) {
      return;
    }
    lastChannelToggleRef.current = { id: sid, time: now };

    const currentIndex = filteredChannels.findIndex((c) => String(c.stream_id) === sid);

    setChannelsConfig((prev) => {
      const current = prev[sid]?.enabled !== undefined ? prev[sid].enabled : defaultEnabled;
      return {
        ...prev,
        [sid]: {
          ...prev[sid],
          enabled: !current,
        },
      };
    });

    // Keep focus firmly inside the channels container on this channel or its immediate sibling
    setTimeout(() => {
      const sameBtn = document.getElementById(`vis-btn-${sid}`);
      if (sameBtn) {
        sameBtn.focus({ preventScroll: true });
      } else if (currentIndex >= 0) {
        const nextChannel = filteredChannels[currentIndex + 1] || filteredChannels[currentIndex - 1] || filteredChannels[0];
        if (nextChannel) {
          const nextBtn = document.getElementById(`vis-btn-${nextChannel.stream_id}`);
          if (nextBtn) nextBtn.focus({ preventScroll: true });
        }
      }
    }, 40);
  };

  const handleChannelNumberChange = (streamId, newNumber) => {
    const sid = String(streamId);
    const cleanNum = newNumber === "" ? "" : parseInt(newNumber, 10);
    setChannelsConfig((prev) => ({
      ...prev,
      [sid]: {
        ...prev[sid],
        channelNumber: isNaN(cleanNum) ? "" : cleanNum,
      },
    }));
  };

  const handleCustomNameChange = (streamId, newName) => {
    setChannelsConfig((prev) => ({
      ...prev,
      [streamId]: {
        ...prev[streamId],
        customName: newName,
      },
    }));
  };

  // Batch Auto-numbering
  const applyBatchAutoNumbering = () => {
    const start = parseInt(batchStartNumber, 10) || 1;
    let currentNumber = start;
    const updated = { ...channelsConfig };

    filteredChannels.forEach((ch) => {
      const sid = String(ch.stream_id);
      updated[sid] = {
        ...updated[sid],
        channelNumber: currentNumber++,
      };
    });
    setChannelsConfig(updated);
  };

  // Filtered Groups
  const filteredGroups = useMemo(() => {
    return loadedGroups.filter((g) =>
      g.category_name.toLowerCase().includes(groupSearch.toLowerCase())
    );
  }, [loadedGroups, groupSearch]);

  // Filtered Channels
  const filteredChannels = useMemo(() => {
    return loadedChannels.filter((ch) => {
      // Category match
      if (selectedCategoryFilter !== "all") {
        const matchId = String(ch.category_id) === String(selectedCategoryFilter);
        const matchName = ch.category_name && String(ch.category_name) === String(selectedCategoryFilter);
        if (!matchId && !matchName) {
          return false;
        }
      }
      // Search match
      const sid = String(ch.stream_id);
      const customName = channelsConfig[sid]?.customName || ch.name;
      const chNum = channelsConfig[sid]?.channelNumber ?? ch.channel_number;
      if (
        channelSearch &&
        !customName.toLowerCase().includes(channelSearch.toLowerCase()) &&
        !String(chNum).includes(channelSearch)
      ) {
        return false;
      }
      // Visibility match
      const catEnabled = checkGroupEnabled(groupsConfig, {
        category_id: ch.category_id,
        category_name: ch.category_name,
        enabled: ch.group_enabled,
      });

      const chCfg = channelsConfig[sid];
      const isEnabled = chCfg?.enabled !== undefined ? chCfg.enabled : (ch.enabled !== undefined ? ch.enabled : catEnabled);
      if (channelVisibilityFilter === "visible" && !isEnabled) return false;
      if (channelVisibilityFilter === "hidden" && isEnabled) return false;

      return true;
    });
  }, [loadedChannels, selectedCategoryFilter, channelSearch, channelVisibilityFilter, channelsConfig, groupsConfig]);

  return (
    <div className="iptvSetupPage">
      <TopNav />
      <ContentWrapper>
        <div className="setupContainer">
          {/* Header */}
          <div className="setupHeader">
            <button
              type="button"
              className="backBtn iptvBackBtn"
              tabIndex={0}
              onClick={() => navigate("/settings")}
            >
              <FiArrowLeft /> Settings
            </button>
            <div className="headerText">
              <h1 className="title">
                <FiTv className="titleIcon" /> IPTV Setup & Channel Numbering
              </h1>
              <p className="subtitle">
                Configure your Xtream Codes subscription, choose visible groups, toggle individual channels, and assign custom channel numbers.
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tabBar">
            <button
              type="button"
              tabIndex={0}
              className={`tabBtn ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => setActiveTab("credentials")}
            >
              <FiServer /> Provider & Credentials
            </button>
            <button
              type="button"
              tabIndex={0}
              className={`tabBtn ${activeTab === "groups" ? "active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              <FiLayers /> Category & Group Visibility ({loadedGroups.length})
            </button>
            <button
              type="button"
              tabIndex={0}
              className={`tabBtn ${activeTab === "channels" ? "active" : ""}`}
              onClick={() => setActiveTab("channels")}
            >
              <FiHash /> Channels & Manual Numbering ({loadedChannels.length})
            </button>
          </div>

          {/* Status Message */}
          {saveStatus && (
            <div className={`statusNotice ${saveStatus.type}`}>
              {saveStatus.type === "success" ? (
                <FiCheckCircle className="statusIcon" />
              ) : saveStatus.type === "info" ? (
                <FiRefreshCw className="statusIcon spinning" />
              ) : (
                <FiAlertCircle className="statusIcon" />
              )}
              <span>{saveStatus.text}</span>
            </div>
          )}

          {/* TAB 1: Credentials & Connection */}
          {activeTab === "credentials" && (
            <div className="setupCard">
              <div className="cardHeader">
                <h2>Xtream Codes Provider Details</h2>
                <span className="badge">M3U8 / Live Streams</span>
              </div>
              <p className="description">
                Enter your IPTV provider's Xtream Codes server URL (including port, e.g. <code>http://provider.net:8080</code>), username, and password.
              </p>

              <div className="formGrid">
                <div className="inputGroup">
                  <label>Server URL (Host & Port)</label>
                  <input
                    type="text"
                    placeholder="http://your-provider-url.com:8080"
                    value={credentials.serverUrl}
                    onChange={(e) => setCredentials({ ...credentials, serverUrl: e.target.value })}
                  />
                </div>
                <div className="inputGroup">
                  <label>Username</label>
                  <input
                    type="text"
                    placeholder="Enter Xtream username"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  />
                </div>
                <div className="inputGroup">
                  <label>Password</label>
                  <div className="passwordWrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter Xtream password"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    />
                    <button
                      type="button"
                      className="eyeBtn"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div className="inputGroup fullWidth">
                  <label>EPG URL (XMLTV Guide - Optional)</label>
                  <input
                    type="text"
                    placeholder={
                      credentials.serverUrl && credentials.username
                        ? `${credentials.serverUrl.replace(/\/+$/, "")}/xmltv.php?username=${credentials.username}&password=...`
                        : "http://your-provider.com:8080/xmltv.php?username=...&password=..."
                    }
                    value={credentials.epgUrl}
                    onChange={(e) => setCredentials({ ...credentials, epgUrl: e.target.value })}
                  />
                  <span className="fieldHint" style={{ fontSize: "12px", color: "var(--text-secondary, #a0aec0)", marginTop: "4px" }}>
                    Leave blank to automatically load from <code>/xmltv.php</code>.
                  </span>
                </div>
              </div>

              {/* Test Result Notice */}
              {testResult && (
                <div className={`testNotice ${testResult.success ? "success" : "error"}`}>
                  {testResult.success ? <FiCheckCircle /> : <FiAlertCircle />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="actionRow">
                <button
                  className="testBtn"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                >
                  <FiRefreshCw className={testingConnection ? "spinning" : ""} />
                  {testingConnection ? "Testing Connection..." : "Test Connection"}
                </button>
                <button
                  className="saveBtn"
                  onClick={handleSaveConfig}
                  disabled={saving}
                >
                  <FiSave /> {saving ? "Saving..." : "Save Provider Credentials"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Group / Category Visibility */}
          {activeTab === "groups" && (
            <div className="setupCard">
              <div className="cardHeader">
                <h2>Category & Group Visibility</h2>
                <span className="badge">
                  {loadedGroups.filter((g) => checkGroupEnabled(groupsConfig, g)).length} of {loadedGroups.length} Visible
                </span>
              </div>
              <p className="description">
                Toggle categories on or off. Hiding a category will automatically hide all of its channels from the Live TV guide and Projectivy home screen.
              </p>

              <div className="groupToolbar">
                <div className="searchBox">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search categories (e.g. Sports, USA, News)..."
                    value={groupSearch}
                    onChange={(e) => setGroupSearch(e.target.value)}
                  />
                </div>
                <div className="btnGroup">
                  <button className="toolBtn" onClick={() => setAllGroupsVisibility(true)}>
                    <FiCheck /> Select All
                  </button>
                  <button className="toolBtn" onClick={() => setAllGroupsVisibility(false)}>
                    <FiX /> Deselect All
                  </button>
                  <button className="toolBtn" onClick={() => loadProviderData(true)} title="Refresh from provider">
                    <FiRefreshCw className={loadingData ? "spinning" : ""} /> Refresh
                  </button>
                </div>
              </div>

              {loadingData && loadedGroups.length > 0 && (
                <div style={{ fontSize: "13px", color: "var(--pink)", display: "flex", alignItems: "center", gap: 6, margin: "4px 0 8px 4px" }}>
                  <FiRefreshCw className="spinner" /> <span>Syncing latest categories in background...</span>
                </div>
              )}

              {loadingData && loadedGroups.length === 0 ? (
                <div className="loadingNotice">
                  <FiRefreshCw className="spinner" />
                  <span>Fetching and refreshing categories from IPTV server...</span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="emptyNotice">
                  <FiAlertCircle />
                  <span>
                    {groupSearch
                      ? `No categories match "${groupSearch}".`
                      : "No categories loaded yet. Please verify your provider credentials in Tab 1, or click Refresh above."}
                  </span>
                </div>
              ) : (
                <div className="groupsGrid">
                  {filteredGroups.map((grp) => {
                    const cid = String(grp.category_id);
                    const isEnabled = checkGroupEnabled(groupsConfig, grp);
                    return (
                      <button
                        key={cid}
                        type="button"
                        tabIndex={0}
                        className={`groupCard ${isEnabled ? "enabled" : "disabled"}`}
                        onClick={() => toggleGroupVisibility(cid)}
                        aria-pressed={isEnabled}
                        title={`${grp.category_name}: ${isEnabled ? "Visible (click to hide)" : "Hidden (click to show)"}`}
                      >
                        <div className="checkbox">
                          {isEnabled ? <FiCheckCircle className="checkOn" /> : <FiX className="checkOff" />}
                        </div>
                        <div className="groupInfo">
                          <span className="groupName">{grp.category_name}</span>
                          <span className="channelCount">{grp.channel_count} channels</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="actionRow stickyFooter">
                <button className="saveBtn" onClick={handleSaveConfig} disabled={saving}>
                  <FiSave /> {saving ? "Saving Changes..." : "Save Group Changes"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Channels & Manual Channel Numbering */}
          {activeTab === "channels" && (
            <div className="setupCard">
              <div className="cardHeader">
                <h2>Channel Visibility & Numbering Workbench</h2>
                <span className="badge">
                  {filteredChannels.length} Channels Displayed
                </span>
              </div>
              <p className="description">
                Assign manual channel numbers (e.g. Channel 1, 2, 100, 206) and toggle individual channel visibility. Remote controls with number pads can jump straight to these channel numbers!
              </p>

              {/* Filters & Tools */}
              <div className="channelToolbar">
                <div className="filterRow">
                  <div className="selectWrapper">
                    <label>Category Filter:</label>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    >
                      <option value="all">All Categories ({loadedGroups.length})</option>
                      {loadedGroups.map((g) => (
                        <option key={g.category_id} value={g.category_id}>
                          {g.category_name} ({g.channel_count})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="selectWrapper">
                    <label>Visibility:</label>
                    <select
                      value={channelVisibilityFilter}
                      onChange={(e) => setChannelVisibilityFilter(e.target.value)}
                    >
                      <option value="all">All Channels</option>
                      <option value="visible">Visible Only</option>
                      <option value="hidden">Hidden Only</option>
                    </select>
                  </div>

                  <div className="searchBox channelSearch">
                    <FiSearch />
                    <input
                      type="text"
                      placeholder="Search by name or channel #..."
                      value={channelSearch}
                      onChange={(e) => setChannelSearch(e.target.value)}
                    />
                  </div>

                  <button className="toolBtn refreshBtn" onClick={() => loadProviderData(true)} title="Refresh channels from provider">
                    <FiRefreshCw className={loadingData ? "spinning" : ""} /> Refresh
                  </button>
                </div>

                {/* Batch Numbering Helper */}
                <div className="batchNumberRow">
                  <div className="batchInput">
                    <span>Batch Number: Start at</span>
                    <input
                      type="number"
                      min="1"
                      value={batchStartNumber}
                      onChange={(e) => setBatchStartNumber(e.target.value)}
                    />
                    <button className="batchBtn" onClick={applyBatchAutoNumbering}>
                      Auto-Number Current Filtered ({filteredChannels.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Channel Table / Loading / Empty */}
              {loadingData && loadedChannels.length > 0 && (
                <div style={{ fontSize: "13px", color: "var(--pink)", display: "flex", alignItems: "center", gap: 6, margin: "4px 0 8px 4px" }}>
                  <FiRefreshCw className="spinner" /> <span>Syncing latest channels in background...</span>
                </div>
              )}

              {loadingData && loadedChannels.length === 0 ? (
                <div className="loadingNotice">
                  <FiRefreshCw className="spinner" />
                  <span>Fetching and loading channels from IPTV server...</span>
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="emptyNotice">
                  <FiAlertCircle />
                  <span>
                    {channelSearch
                      ? `No channels match "${channelSearch}".`
                      : "No channels found. Check your category visibility in Tab 2, or click Refresh."}
                  </span>
                </div>
              ) : (
                <div className="channelsTableWrapper">
                  <table className="channelsTable">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Visible</th>
                      <th style={{ width: 110 }}>Ch. #</th>
                      <th style={{ width: 60 }}>Logo</th>
                      <th>Channel Name</th>
                      <th>Category</th>
                      <th>Custom Alias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChannels.slice(0, 300).map((ch) => {
                      const sid = String(ch.stream_id);
                      const isCatEnabled = checkGroupEnabled(groupsConfig, {
                        category_id: ch.category_id,
                        category_name: ch.category_name,
                        enabled: ch.group_enabled,
                      });

                      const chCfg = channelsConfig[sid];
                      const isEnabled = chCfg?.enabled !== undefined ? chCfg.enabled : (ch.enabled !== undefined ? ch.enabled : isCatEnabled);
                      const channelNumber = chCfg?.channelNumber !== undefined ? chCfg.channelNumber : ch.channel_number;
                      const customName = chCfg?.customName !== undefined ? chCfg.customName : (ch.name !== ch.original_name ? ch.name : "");

                      return (
                        <tr
                          key={sid}
                          className={`channelRow ${isEnabled ? "rowEnabled" : "rowDisabled"}`}
                          data-stream-id={sid}
                          onClick={(e) => {
                            if (e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON") {
                              e.preventDefault();
                              toggleChannelVisibility(sid, isCatEnabled);
                            }
                          }}
                        >
                          <td>
                            <button
                              type="button"
                              id={`vis-btn-${sid}`}
                              data-stream-id={sid}
                              tabIndex={0}
                              className={`visToggleBtn ${isEnabled ? "on" : "off"}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleChannelVisibility(sid, isCatEnabled);
                              }}
                              title={isEnabled ? "Click to hide" : "Click to show"}
                            >
                              {isEnabled ? <FiCheck /> : <FiX />}
                            </button>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="channelNumberInput"
                              value={channelNumber}
                              placeholder={String(ch.channel_number || "")}
                              onChange={(e) => handleChannelNumberChange(sid, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
                                  e.currentTarget.blur();
                                  const btn = document.getElementById(`vis-btn-${sid}`);
                                  if (btn) btn.focus({ preventScroll: true });
                                }
                              }}
                            />
                          </td>
                          <td>
                            {ch.stream_icon ? (
                              <img
                                src={ch.stream_icon}
                                alt=""
                                loading="lazy"
                                className="channelLogoThumb"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <FiTv className="fallbackLogoIcon" />
                            )}
                          </td>
                          <td className="originalNameCell">{ch.original_name || ch.name}</td>
                          <td className="categoryCell">{ch.category_name}</td>
                          <td>
                            <input
                              type="text"
                              className="customAliasInput"
                              placeholder={ch.original_name || ch.name}
                              value={customName}
                              onChange={(e) => handleCustomNameChange(sid, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
                                  e.currentTarget.blur();
                                  const btn = document.getElementById(`vis-btn-${sid}`);
                                  if (btn) btn.focus({ preventScroll: true });
                                }
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredChannels.length > 300 && (
                  <div className="paginationNotice">
                    Showing top 300 of {filteredChannels.length} channels. Use the category filter or search above to refine.
                  </div>
                )}
              </div>
            )}

              <div className="actionRow stickyFooter">
                <button className="saveBtn" onClick={handleSaveConfig} disabled={saving}>
                  <FiSave /> {saving ? "Saving Changes..." : "Save Channels & Numbering"}
                </button>
              </div>
            </div>
          )}
        </div>
      </ContentWrapper>
    </div>
  );
};

export default IptvSetupPage;
