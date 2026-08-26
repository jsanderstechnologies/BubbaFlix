import { useState } from "react";
import {
  FiInfo,
  FiGithub,
  FiDownload,
  FiRefreshCw,
  FiCheckCircle,
  FiTv,
  FiCpu,
  FiExternalLink
} from "react-icons/fi";
import ContentWrapper from "../../components/content-wrapper";
import "./index.scss";

const APP_VERSION = "v1.0.3";
const DOWNLOADER_CODE = "7862216";
const GITHUB_REPO_URL = "https://github.com/jsanderstechnologies/BubbaFlix";

const AboutPage = () => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState(null);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateResult(null);

    try {
      const timestamp = Date.now();
      const res = await fetch(`https://raw.githubusercontent.com/jsanderstechnologies/BubbaFlix/master/version.json?t=${timestamp}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });

      if (!res.ok) throw new Error("Failed to reach update server");

      const remoteData = await res.json();
      const remoteVersionCode = remoteData.versionCode || 13;
      const currentVersionCode = 13;

      if (remoteVersionCode > currentVersionCode) {
        setUpdateResult({
          hasUpdate: true,
          remoteVersion: remoteData.versionName || "1.0.4",
          apkUrl: remoteData.apkUrl || `${GITHUB_REPO_URL}/raw/master/BubbaFlixTV.apk`,
          releaseNotes: remoteData.releaseNotes || "New features and performance improvements available."
        });
      } else {
        setUpdateResult({
          hasUpdate: false,
          message: `You are running the latest version of BubbaFlix TV (${APP_VERSION})!`
        });
      }
    } catch (err) {
      setUpdateResult({
        hasUpdate: false,
        error: "Unable to check for updates. Please check your internet connection."
      });
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="aboutPage">
      <ContentWrapper>
        <div className="aboutContainer">
          <div className="appHeaderCard">
            <div className="logoBlock">
              <FiTv className="appLogoIcon" />
            </div>
            <h1 className="appName">BubbaFlix TV</h1>
            <span className="appBadge">{APP_VERSION} (Android TV & Web Client)</span>
            <p className="appTagline">
              The ultimate high-performance media streaming client for Movies, TV Shows, and Live TV.
            </p>
          </div>

          <div className="aboutGrid">
            {/* Version & Update Card */}
            <div className="infoCard" tabIndex="0">
              <div className="cardHeader">
                <FiRefreshCw className="cardIcon" />
                <h3>App Version & Updates</h3>
              </div>
              <div className="cardBody">
                <div className="detailRow">
                  <span className="label">Installed Version:</span>
                  <span className="value highlight">{APP_VERSION}</span>
                </div>
                <div className="detailRow">
                  <span className="label">Downloader App Code:</span>
                  <span className="value code">{DOWNLOADER_CODE}</span>
                </div>

                <div className="updateActionArea">
                  <button
                    className="checkUpdateBtn"
                    onClick={handleCheckForUpdates}
                    disabled={checkingUpdate}
                    tabIndex="0"
                  >
                    {checkingUpdate ? (
                      <React.Fragment><FiRefreshCw className="spinIcon" /> Checking GitHub...</React.Fragment>
                    ) : (
                      <React.Fragment><FiRefreshCw /> Check for Updates</React.Fragment>
                    )}
                  </button>

                  {updateResult && (
                    <div className={`updateStatusBox ${updateResult.hasUpdate ? "hasUpdate" : "latest"}`}>
                      {updateResult.hasUpdate ? (
                        <div>
                          <div className="statusTitle">🚀 New Update Available ({updateResult.remoteVersion})</div>
                          <p>{updateResult.releaseNotes}</p>
                          <a
                            href={updateResult.apkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="downloadApkBtn"
                            tabIndex="0"
                          >
                            <FiDownload /> Download BubbaFlixTV.apk
                          </a>
                        </div>
                      ) : updateResult.error ? (
                        <div className="statusError">{updateResult.error}</div>
                      ) : (
                        <div className="statusLatest">
                          <FiCheckCircle className="checkIcon" /> {updateResult.message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GitHub & Open Source Info */}
            <div className="infoCard" tabIndex="0">
              <div className="cardHeader">
                <FiGithub className="cardIcon" />
                <h3>GitHub Repository & Source</h3>
              </div>
              <div className="cardBody">
                <p className="description">
                  BubbaFlix is open-source. Inspect code, contribute features, report issues, or download the latest release builds directly on GitHub.
                </p>

                <div className="linkGroup">
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="githubRepoLink"
                    tabIndex="0"
                  >
                    <FiGithub /> GitHub Repository <FiExternalLink />
                  </a>
                </div>
              </div>
            </div>

            {/* Tech Stack & Specs */}
            <div className="infoCard fullWidth" tabIndex="0">
              <div className="cardHeader">
                <FiCpu className="cardIcon" />
                <h3>Client & Server Specifications</h3>
              </div>
              <div className="cardBody specGrid">
                <div className="specItem">
                  <span className="specLabel">Universal Native Player</span>
                  <span className="specValue">Android ExoPlayer + LoudnessEnhancer (v1.0.2+)</span>
                </div>
                <div className="specItem">
                  <span className="specLabel">Audio Normalization</span>
                  <span className="specValue">Active (+1.5 dB Loudness DSP)</span>
                </div>
                <div className="specItem">
                  <span className="specLabel">Live TV & DVR</span>
                  <span className="specValue">Dispatcharr API Integration</span>
                </div>
                <div className="specItem">
                  <span className="specLabel">OTA Updater</span>
                  <span className="specValue">Cache-Bypassing GitHub CDN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContentWrapper>
    </div>
  );
};

export default AboutPage;
