import re

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix the triple syncProgressToServer bug
code = code.replace(
'''      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer(all);
    syncProgressToServer(all);
      syncProgressToServer(all);''', 
'''      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer(all);''')

# Fix saveWatchProgress
code = code.replace(
'''  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (e) {
    console.error("[saveWatchProgress Error]:", e);
  }''', 
'''  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    syncProgressToServer(all);
  } catch (e) {
    console.error("[saveWatchProgress Error]:", e);
  }''')

# Fix clearWatchProgress
code = code.replace(
'''    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
      console.error("[clearWatchProgress Error]:", e);
    }''', 
'''    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      syncProgressToServer(all);
    } catch (e) {
      console.error("[clearWatchProgress Error]:", e);
    }''')

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed watchProgress.js")
