import re

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add getHash helper
get_hash_helper = '''const isHevcOrX265Stream = (item) => {
  if (!item) return false;
  const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""} ${item.url || ""}`;
  return /\b(hevc|x265|h265|h\.265)\b/i.test(fullStr);
};

const getHash = (url) => {
  if (!url) return null;
  const match = url.match(/urn:btih:([a-zA-Z0-9]+)/i);
  return match ? match[1].toLowerCase() : null;
};
'''

code = code.replace('''const isHevcOrX265Stream = (item) => {
  if (!item) return false;
  const fullStr = `${item.title || ""} ${item.name || ""} ${item.metaText || ""} ${item.url || ""}`;
  return /\\b(hevc|x265|h265|h\\.265)\\b/i.test(fullStr);
};''', get_hash_helper)

# Add state and useEffect for polling
polling_effect = '''  const [unconfigured, setUnconfigured] = useState(false);
  const [streamStatuses, setStreamStatuses] = useState({});

  // Streaming state
'''

code = code.replace('  const [unconfigured, setUnconfigured] = useState(false);\n\n  // Streaming state', polling_effect)

use_effect_code = '''  useEffect(() => {
    let interval;
    if (isOpen && streams.length > 0) {
      const updateStatuses = async () => {
        try {
          const hashes = streams.map(s => getHash(s.url)).filter(Boolean);
          if (hashes.length === 0) return;

          const [{ checkPremiumizeCache, getPremiumizeTransfers }] = await Promise.all([
             import("../../../utils/premiumize")
          ]);

          const [cacheRes, transfersRes] = await Promise.all([
            checkPremiumizeCache(hashes),
            getPremiumizeTransfers()
          ]);

          const newStatuses = {};
          hashes.forEach((hash, idx) => {
            const isCached = cacheRes[idx];
            let transferStatus = null;
            
            if (Array.isArray(transfersRes)) {
              const activeTransfer = transfersRes.find(t => 
                (t.src && t.src.toLowerCase().includes(hash)) || 
                (t.hash && t.hash.toLowerCase() === hash) ||
                (t.id && t.id.toLowerCase() === hash)
              );

              if (activeTransfer) {
                transferStatus = {
                  progress: activeTransfer.progress,
                  status: activeTransfer.status,
                  message: activeTransfer.message
                };
              }
            }

            newStatuses[hash] = { isCached, transferStatus };
          });

          setStreamStatuses(newStatuses);
        } catch (err) {
          console.error("[MagnetSection] Status check failed", err);
        }
      };

      updateStatuses();
      interval = setInterval(updateStatuses, 10000); // Poll every 10 seconds
    }
    return () => clearInterval(interval);
  }, [isOpen, streams]);
  
  useEffect(() => {
'''

code = code.replace('  useEffect(() => {\n    if (title || tmdbId) {', use_effect_code + '    if (title || tmdbId) {')


# Add UI elements
old_item_meta = '''                      <div className="itemInfo">
                        <span className="itemTitle" title={item.title}>
                          {item.title}
                        </span>
                        <div className="itemMeta">
                          <span className="metaBadge provider">🚀 {item.name}</span>
                          {item.metaText && (
                            <span className="metaBadge info">{item.metaText}</span>
                          )}
                        </div>
                      </div>'''

new_item_meta = '''                      <div className="itemInfo">
                        <span className="itemTitle" title={item.title}>
                          {item.title}
                        </span>
                        <div className="itemMeta">
                          <span className="metaBadge provider">🚀 {item.name}</span>
                          {item.metaText && (
                            <span className="metaBadge info">{item.metaText}</span>
                          )}
                          
                          {(() => {
                            const h = getHash(item.url);
                            const stat = h ? streamStatuses[h] : null;
                            if (!stat) return null;
                            
                            const badges = [];
                            if (stat.transferStatus && stat.transferStatus.status === "downloading") {
                                badges.push(<span key="dl" className="metaBadge info" style={{ background: '#ffc107', color: '#000', fontWeight: 'bold' }}>Downloading: {Math.round((stat.transferStatus.progress || 0) * 100)}%</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "finished") {
                                badges.push(<span key="fin" className="metaBadge success" style={{ background: '#28a745', color: '#fff', fontWeight: 'bold' }}>Finished / Cached</span>);
                            } else if (stat.isCached) {
                                badges.push(<span key="cached" className="metaBadge success" style={{ background: '#28a745', color: '#fff', fontWeight: 'bold' }}>Cached</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "error") {
                                badges.push(<span key="err" className="metaBadge error" style={{ background: '#dc3545', color: '#fff', fontWeight: 'bold' }}>Transfer Error</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "waiting") {
                                badges.push(<span key="wait" className="metaBadge info" style={{ background: '#17a2b8', color: '#fff', fontWeight: 'bold' }}>Waiting to start...</span>);
                            }
                            
                            return badges;
                          })()}
                        </div>
                      </div>'''

code = code.replace(old_item_meta, new_item_meta)

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched magnet-section with caching logic")
