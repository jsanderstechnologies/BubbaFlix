import axios from "axios";

export const getPremiumizeApiKey = () => {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("premiumize_api_key");
    if (saved) return saved;
  }
  return import.meta.env.VITE_PREMIUMIZE_API_KEY || "";
};

export const testPremiumizeAccount = async (apiKey) => {
  const key = apiKey || getPremiumizeApiKey();
  if (!key) return { success: false, message: "No Premiumize API Key provided." };

  try {
    const response = await axios.get(`/api/premiumize/account/info`, {
      params: { apikey: key },
      timeout: 8000,
    });

    if (response.data?.status === "success") {
      const premiumDays = response.data.premium_until
        ? Math.max(0, Math.ceil((response.data.premium_until - Date.now() / 1000) / 86400))
        : 0;
      return {
        success: true,
        message: `Account Connected! Premium Days Remaining: ${premiumDays}`,
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: response.data?.message || "Invalid Premiumize API Key.",
      };
    }
  } catch (err) {
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Failed to connect to Premiumize API.",
    };
  }
};

export const getDirectStreamUrl = async (magnetLink) => {
  const apiKey = getPremiumizeApiKey();
  if (!apiKey) {
    return {
      streamUrl: null,
      transcodeUrl: null,
      error: "No Premiumize API Key configured. Please add your Premiumize API Key in Settings.",
    };
  }

  if (!magnetLink) {
    return { streamUrl: null, transcodeUrl: null, error: "Invalid stream magnet link." };
  }

  try {
    console.log("[Premiumize API] Requesting direct stream for magnet...");
    const response = await axios.post(
      `/api/premiumize/transfer/directdl`,
      null,
      {
        params: {
          apikey: apiKey,
          src: magnetLink,
        },
        timeout: 12000,
      }
    );

    if (response.data?.status === "success") {
      const data = response.data;

      let rawUrl = data.stream_link || data.location || null;
      let transcodeUrl = data.transcode_link || null;
      let filename = data.filename || "Video Stream";
      let filesize = data.filesize || 0;

      // Check for content array (multi-file torrent)
      if (Array.isArray(data.content) && data.content.length > 0) {
        const videoFiles = data.content.filter((file) => {
          const path = (file.path || file.filename || "").toLowerCase();
          return (
            path.endsWith(".mp4") ||
            path.endsWith(".mkv") ||
            path.endsWith(".avi") ||
            path.endsWith(".mov") ||
            path.endsWith(".webm") ||
            path.endsWith(".m4v")
          );
        });

        if (videoFiles.length > 0) {
          videoFiles.sort((a, b) => (b.size || 0) - (a.size || 0));
          const bestFile = videoFiles[0];
          rawUrl = bestFile.stream_link || bestFile.link || rawUrl;
          transcodeUrl = bestFile.transcode_link || transcodeUrl;
          filename = bestFile.path || bestFile.filename || filename;
          filesize = bestFile.size || filesize;
        }
      }

      if (!rawUrl && !transcodeUrl) {
        return {
          streamUrl: null,
          transcodeUrl: null,
          error: "Torrent cached on Premiumize, but no playable video files were found.",
        };
      }

      // Default to transcodeUrl if available, otherwise fallback to rawUrl
      const primaryUrl = transcodeUrl || rawUrl;

      return {
        streamUrl: primaryUrl,
        rawUrl: rawUrl,
        transcodeUrl: transcodeUrl,
        filename,
        filesize,
        error: null,
      };
    } else {
      return {
        streamUrl: null,
        transcodeUrl: null,
        error: response.data?.message || "Torrent is not yet cached or failed on Premiumize.",
      };
    }
  } catch (err) {
    console.error("[Premiumize API Error]:", err.message);
    return {
      streamUrl: null,
      transcodeUrl: null,
      error: err.response?.data?.message || err.message || "Unable to reach Premiumize server.",
    };
  }
};
