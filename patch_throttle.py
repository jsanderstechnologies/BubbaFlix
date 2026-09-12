import re

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''let syncTimeout = null;
const syncProgressToServer = () => {
  if (syncTimeout) return;
  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    try {
      const baseUrl = getServerUrl();
      const token = localStorage.getItem("bubbaflix_token");
      if (token) {
        // Always grab the latest state from localStorage to ensure we don't sync stale closure data
        const all = JSON.parse(localStorage.getItem("bubbaflix_watch_progress") || "{}");
        await axios.put(
          ${baseUrl}/api/users/preferences, 
          { watchProgress: all },
          { headers: { Authorization: Bearer  } }
        );
      }
    } catch (e) {
      console.error("Failed to sync watch progress to server", e);
    }
  }, 5000); // Throttle to 1 sync per 5 seconds
};'''

code = re.sub(r'let syncTimeout = null;.*?const STORAGE_KEY', replacement + '\n\nconst STORAGE_KEY', code, flags=re.DOTALL)

# Remove 'all' arguments from syncProgressToServer calls
code = code.replace('syncProgressToServer(all)', 'syncProgressToServer()')

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched syncProgressToServer")
