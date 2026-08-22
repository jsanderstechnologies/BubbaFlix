import axios from "axios";
import { fetchServerSettings } from "./serverSettings";

export const getPremiumizeKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("premiumize_api_key");
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  }
  return "";
};

export const savePremiumizeKey = (key) => {
  if (typeof window === "undefined") return;
  if (!key || key.trim().length === 0) {
    localStorage.removeItem("premiumize_api_key");
  } else {
    localStorage.setItem("premiumize_api_key", key.trim());
  }
};

/**
 * Resolves a magnet link into a direct high-speed HTTP/HTTPS CDN video stream via Premiumize.me API
 * Automatically adds the magnet transfer to the user's Premiumize cloud storage (7-day retention)
 */
export const resolveMagnetWithPremiumize = async (magnetUrl, customApiKey = null) => {
  try {
    let apiKey = customApiKey || getPremiumizeKey();

    if (!apiKey) {
      // Fallback check server backend settings
      const serverSettings = await fetchServerSettings();
      apiKey = serverSettings?.premiumizeKey || "";
    }

    if (!apiKey) {
      return {
        success: false,
        message: "No Premiumize API Key configured. Please save your Premiumize API Key in Settings.",
      };
    }

    console.log("[Premiumize API] Submitting magnet link for 7-day cloud transfer creation...");

    // 1. Create transfer on Premiumize using x-www-form-urlencoded params
    const createParams = new URLSearchParams();
    createParams.append("src", magnetUrl);
    createParams.append("apikey", apiKey);

    const createRes = await axios.post("https://www.premiumize.me/api/transfer/create", createParams, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 12000,
    });

    if (createRes.data && createRes.data.status === "success") {
      const transferId = createRes.data.id;
      const transferName = createRes.data.name || "Media File";
      console.log(`[Premiumize API] Transfer successfully created in Cloud Transfers: ID=${transferId}, Name=${transferName}`);

      // 2. Query transfer status / file list to get direct CDN stream link
      await new Promise((r) => setTimeout(r, 1000));

      const listParams = new URLSearchParams();
      listParams.append("apikey", apiKey);

      const listRes = await axios.post("https://www.premiumize.me/api/transfer/list", listParams, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      });

      if (listRes.data && listRes.data.status === "success" && Array.isArray(listRes.data.transfers)) {
        const match = listRes.data.transfers.find((t) => t.id === transferId || t.name === transferName) || listRes.data.transfers[0];

        if (match) {
          const targetId = match.file_id || match.folder_id;
          if (targetId) {
            const itemParams = new URLSearchParams();
            itemParams.append("id", targetId);
            itemParams.append("apikey", apiKey);

            if (match.file_id) {
              const fileRes = await axios.post("https://www.premiumize.me/api/item/details", itemParams, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 10000,
              });
              if (fileRes.data && fileRes.data.link) {
                console.log(`[Premiumize API] Direct Stream CDN URL Resolved: ${fileRes.data.link}`);
                return {
                  success: true,
                  streamUrl: fileRes.data.link,
                  title: fileRes.data.name || transferName,
                };
              }
            } else if (match.folder_id) {
              const folderRes = await axios.post("https://www.premiumize.me/api/folder/list", itemParams, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                timeout: 10000,
              });
              if (folderRes.data && Array.isArray(folderRes.data.content)) {
                // Find largest video file in folder
                const videoFiles = folderRes.data.content
                  .filter((item) => item.type === "file" && item.link)
                  .sort((a, b) => (b.size || 0) - (a.size || 0));

                if (videoFiles.length > 0) {
                  const bestFile = videoFiles[0];
                  console.log(`[Premiumize API] Folder Largest Video File Resolved: ${bestFile.name} -> ${bestFile.link}`);
                  return {
                    success: true,
                    streamUrl: bestFile.stream_link || bestFile.link,
                    title: bestFile.name || transferName,
                  };
                }
              }
            }
          }
        }
      }

      // Fallback check root folder list for recent downloads
      const rootParams = new URLSearchParams();
      rootParams.append("apikey", apiKey);

      const rootFolderRes = await axios.post("https://www.premiumize.me/api/folder/list", rootParams, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      });

      if (rootFolderRes.data && Array.isArray(rootFolderRes.data.content)) {
        const videoFiles = rootFolderRes.data.content
          .filter((item) => item.type === "file" && item.link)
          .sort((a, b) => (b.size || 0) - (a.size || 0));

        if (videoFiles.length > 0) {
          const bestFile = videoFiles[0];
          return {
            success: true,
            streamUrl: bestFile.stream_link || bestFile.link,
            title: bestFile.name,
          };
        }
      }
    } else if (createRes.data && createRes.data.message) {
      console.warn("[Premiumize API Notice]:", createRes.data.message);
      return {
        success: false,
        message: createRes.data.message,
      };
    }
  } catch (err) {
    console.warn("[Premiumize API Error]:", err.message);
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to resolve magnet with Premiumize API.",
    };
  }

  return {
    success: false,
    message: "Magnet added to Premiumize Cloud. Please allow a few moments for download or select another stream.",
  };
};
