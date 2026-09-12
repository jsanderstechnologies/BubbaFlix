import re

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'r', encoding='utf-8') as f:
    code = f.read()

helper = '''export const clearAllShowProgress = (tmdbId) => {
  if (!tmdbId) return;
  const all = getAllWatchProgress();
  let modified = false;
  const prefix = `tv_${tmdbId}_`;
  Object.keys(all).forEach(k => {
    if (k.startsWith(prefix)) {
      delete all[k];
      modified = true;
    }
  });
  if (modified) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer();
    } catch (e) {
      console.error("[clearAllShowProgress Error]:", e);
    }
  }
};'''

if 'clearAllShowProgress' not in code:
    code = code.replace('export const clearWatchProgress = ', helper + '\n\nexport const clearWatchProgress = ')
    with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Added clearAllShowProgress")
else:
    print("clearAllShowProgress already exists")
