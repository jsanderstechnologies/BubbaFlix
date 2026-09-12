import re

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''
      // Auto-resolve magnet link via Premiumize Cloud API (adds to 7-day cloud retention)
      let premErrorMsg = "Magnet streams require a Premiumize API key to instantly resolve to HTTP.\\n\\nPlease save your Premiumize API Key in Settings to play this stream.";
      if (targetUrl.startsWith("magnet:")) {
        console.log("[MagnetSection] Resolving magnet via Premiumize Cloud API...");
        const premRes = await resolveMagnetWithPremiumize(targetUrl, null, seasonNum, episodeNum);
        if (premRes.success && premRes.streamUrl) {
          targetUrl = premRes.streamUrl;
          console.log("[MagnetSection] Successfully resolved Premiumize HTTP CDN stream URL:", targetUrl);
        } else if (premRes.message) {
          console.warn("[MagnetSection Premiumize Notice]:", premRes.message);
          premErrorMsg = premRes.message;
        }
      }

      if (targetUrl.startsWith("magnet:")) {
        alert(premErrorMsg);
        return;
      }
'''

code = re.sub(
    r'// Auto-resolve magnet link via Premiumize Cloud API.*?(?:if\s*\(targetUrl\.startsWith\("magnet:"\)\)\s*\{\s*alert\([^)]+\);\s*return;\s*\})',
    replacement.strip(),
    code,
    flags=re.DOTALL
)

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched magnet-section/index.jsx")
