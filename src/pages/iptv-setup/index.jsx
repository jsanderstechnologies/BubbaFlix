import React, { useState, useEffect, useMemo } from "react";
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
  const [activeTab, setActiveTab] = useState("credentials"); // credentials | groups | channels

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
        if (cfg.groups) setGroupsConfig(cfg.groups);
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
    try {
      const [grps, chs] = await Promise.all([
        fetchIptvGroups(forceRefresh),
        fetchIptvChannels(true), // includeAll=true for setup screen
      ]);
      setLoadedGroups(grps);
      setLoadedChannels(chs);
    } catch (e) {
      console.error("Failed to load provider data:", e);
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
      // Auto-load provider groups and channels on successful connection
      await loadProviderData(true);
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
      setSaveStatus({
        type: "success",
        text: "IPTV settings, group visibility, and channel numbers saved successfully!",
      });
      setTimeout(() => setSaveStatus(null), 4000);
      // Refresh channels so changes take effect
      await loadProviderData(false);
    } else {
      setSaveStatus({
        type: "error",
        text: res.error || "Failed to save configuration to server.",
      });
    }
  };

  // Group toggles
  const toggleGroupVisibility = (categoryId) => {
    setGroupsConfig((prev) => {
      const current = prev[categoryId] ? prev[categoryId].enabled !== false : true;
      return {
        ...prev,
        [categoryId]: {
          ...prev[categoryId],
          enabled: !current,
        },
      };
    });
  };

  const setAllGroupsVisibility = (visible) => {
    const updated = { ...groupsConfig };
    loadedGroups.forEach((g) => {
      const cid = String(g.category_id);
      updated[cid] = {
        ...updated[cid],
        name: g.category_name,
        enabled: visible,
      };
    });
    setGroupsConfig(updated);
  };

  // Channel toggles & number assignments
  const toggleChannelVisibility = (streamId, defaultEnabled) => {
    setChannelsConfig((prev) => {
      const current = prev[streamId]?.enabled !== undefined ? prev[streamId].enabled : defaultEnabled;
      return {
        ...prev,
        [streamId]: {
          ...prev[streamId],
          enabled: !current,
        },
      };
    });
  };

  const handleChannelNumberChange = (streamId, newNumber) => {
    const cleanNum = newNumber === "" ? "" : parseInt(newNumber, 10);
    setChannelsConfig((prev) => ({
      ...prev,
      [streamId]: {
        ...prev[streamId],
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
      if (selectedCategoryFilter !== "all" && String(ch.category_id) !== String(selectedCategoryFilter)) {
        return false;
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
      const catEnabled = groupsConfig[String(ch.category_id)]?.enabled ?? true;
      const isEnabled = channelsConfig[sid]?.enabled !== undefined ? channelsConfig[sid].enabled : catEnabled;
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
            <button className="backBtn" onClick={() => navigate("/settings")}>
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
              className={`tabBtn ${activeTab === "credentials" ? "active" : ""}`}
              onClick={() => setActiveTab("credentials")}
            >
              <FiServer /> Provider & Credentials
            </button>
            <button
              className={`tabBtn ${activeTab === "groups" ? "active" : ""}`}
              onClick={() => setActiveTab("groups")}
            >
              <FiLayers /> Category & Group Visibility ({loadedGroups.length})
            </button>
            <button
              className={`tabBtn ${activeTab === "channels" ? "active" : ""}`}
              onClick={() => setActiveTab("channels")}
            >
              <FiHash /> Channels & Manual Numbering ({loadedChannels.length})
            </button>
          </div>

          {/* Status Message */}
          {saveStatus && (
            <div className={`statusNotice ${saveStatus.type}`}>
              {saveStatus.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}
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
                  {loadedGroups.filter((g) => groupsConfig[String(g.category_id)]?.enabled !== false).length} of {loadedGroups.length} Visible
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

              {loadingData ? (
                <div className="loadingNotice">Fetching categories from Xtream Codes server...</div>
              ) : (
                <div className="groupsGrid">
                  {filteredGroups.map((grp) => {
                    const cid = String(grp.category_id);
                    const isEnabled = groupsConfig[cid]?.enabled !== false;
                    return (
                      <div
                        key={cid}
                        className={`groupCard ${isEnabled ? "enabled" : "disabled"}`}
                        onClick={() => toggleGroupVisibility(cid)}
                      >
                        <div className="checkbox">
                          {isEnabled ? <FiCheckCircle className="checkOn" /> : <FiX className="checkOff" />}
                        </div>
                        <div className="groupInfo">
                          <span className="groupName">{grp.category_name}</span>
                          <span className="channelCount">{grp.channel_count} channels</span>
                        </div>
                      </div>
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

              {/* Channel Table */}
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
                      const catEnabled = groupsConfig[String(ch.category_id)]?.enabled !== false;
                      const isEnabled = channelsConfig[sid]?.enabled !== undefined ? channelsConfig[sid].enabled : catEnabled;
                      const channelNumber = channelsConfig[sid]?.channelNumber !== undefined ? channelsConfig[sid].channelNumber : ch.channel_number;
                      const customName = channelsConfig[sid]?.customName || "";

                      return (
                        <tr key={sid} className={isEnabled ? "rowEnabled" : "rowDisabled"}>
                          <td>
                            <button
                              className={`visToggleBtn ${isEnabled ? "on" : "off"}`}
                              onClick={() => toggleChannelVisibility(sid, catEnabled)}
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
                            />
                          </td>
                          <td>
                            {ch.stream_icon ? (
                              <img
                                src={ch.stream_icon}
                                alt=""
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
