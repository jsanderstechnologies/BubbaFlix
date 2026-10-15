/**
 * Device detection and hardware capability utility for BubbaFlix
 * Specifically identifies Amazon Fire tablets and other devices with known hardware decoder constraints.
 */

export const isFireTabletDevice = () => {
  if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.isFireTablet === "function") {
    try {
      return Boolean(window.AndroidPlayer.isFireTablet());
    } catch (e) {
      console.warn("[deviceDetection] Bridge isFireTablet check failed:", e);
    }
  }

  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";

  // 1. Amazon Kindle Fire tablet model identifiers (all start with KF)
  // e.g. KFTRWI (HD 10 11th Gen), KFTUWI (HD 10 13th Gen), KFMAWI (HD 10 9th Gen), etc.
  const isKfModel = /\bKF[A-Z]{2,4}\b/i.test(ua);

  // 2. Explicit Fire tablet / Kindle Fire brand strings
  const isFireTabName = /Fire\s*(HD|Tab|Phone)/i.test(ua) || /Kindle\s*Fire/i.test(ua);

  // 3. Amazon Silk / Android environment that is NOT a Fire TV (Fire TVs use AFT model prefix)
  const isAmazon = /Amazon|Silk/i.test(ua);
  const isFireTv = /AFT[A-Z0-9]+/i.test(ua) || /FireTV/i.test(ua) || /SmartTV/i.test(ua);

  return isKfModel || isFireTabName || (isAmazon && !isFireTv);
};

export const getDeviceModelName = () => {
  if (typeof window !== "undefined" && window.AndroidPlayer && typeof window.AndroidPlayer.getDeviceModel === "function") {
    try {
      const model = window.AndroidPlayer.getDeviceModel();
      if (model && model.trim().length > 0) {
        if (/KFTRWI|KFONWI/i.test(model)) return "Amazon Fire HD 10 (11th Gen)";
        if (/KFTUWI/i.test(model)) return "Amazon Fire HD 10 (13th Gen)";
        if (/KFMAWI/i.test(model)) return "Amazon Fire HD 10 (9th Gen)";
        if (/KFDOWI/i.test(model)) return "Amazon Fire HD 10 (7th Gen)";
        if (/KFTBWI/i.test(model)) return "Amazon Fire HD 10 (5th Gen)";
        if (/KFSUWI|KFKAWI|KFMUWI/i.test(model)) return "Amazon Fire HD 8";
        if (/KFSNWI/i.test(model)) return "Amazon Fire Max 11";
        if (/KFQUWI|KFAUWI/i.test(model)) return "Amazon Fire 7";
        if (/KF/i.test(model)) return `Amazon Fire Tablet (${model.trim()})`;
        return model.trim();
      }
    } catch (e) {}
  }

  if (typeof navigator === "undefined") return "Standard Device";
  const ua = navigator.userAgent || "";

  if (/\b(KFTRWI|KFONWI)\b/i.test(ua)) return "Amazon Fire HD 10 (11th Gen)";
  if (/\bKFTUWI\b/i.test(ua)) return "Amazon Fire HD 10 (13th Gen)";
  if (/\bKFMAWI\b/i.test(ua)) return "Amazon Fire HD 10 (9th Gen)";
  if (/\bKFDOWI\b/i.test(ua)) return "Amazon Fire HD 10 (7th Gen)";
  if (/\bKFTBWI\b/i.test(ua)) return "Amazon Fire HD 10 (5th Gen)";
  if (/\b(KFSUWI|KFKAWI|KFMUWI)\b/i.test(ua)) return "Amazon Fire HD 8";
  if (/\bKFSNWI\b/i.test(ua)) return "Amazon Fire Max 11";
  if (/\b(KFQUWI|KFAUWI)\b/i.test(ua)) return "Amazon Fire 7";
  if (/\bKF[A-Z]{2,4}\b/i.test(ua)) return "Amazon Fire Tablet";
  if (/Fire\s*HD\s*10/i.test(ua)) return "Amazon Fire HD 10";

  return "Standard Device";
};

/**
 * Determines whether 10-bit HEVC stream filtering should be active.
 * Defaults to true if running on an Amazon Fire tablet.
 */
export const isHevc10BitExclusionActive = () => {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("stream_exclude_10bit_hevc");
  if (saved !== null) {
    try {
      return Boolean(JSON.parse(saved));
    } catch (e) {
      return Boolean(saved === "true");
    }
  }
  // Default to true on Amazon Fire tablets
  return isFireTabletDevice();
};
