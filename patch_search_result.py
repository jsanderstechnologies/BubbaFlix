import re

with open(r'f:\Cyberflix\src\pages\search-result\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We can completely remove the local useEffect for window.onVoiceSearchResult
old_useEffect = '''  useEffect(() => {
    window.onVoiceSearchResult = (spokenQuery) => {
      if (spokenQuery && spokenQuery.trim()) {
        const clean = spokenQuery.trim();
        setSearchQuery(clean);
        navigate(`/search/${encodeURIComponent(clean)}`, { replace: true });
      }
    };
    return () => {
      window.onVoiceSearchResult = null;
    };
  }, [navigate]);'''

code = code.replace(old_useEffect, '')

with open(r'f:\Cyberflix\src\pages\search-result\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Cleaned up local onVoiceSearchResult in SearchResult")
