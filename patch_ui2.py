import re

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''                        <div className="itemMeta">
                          <span className="metaBadge provider">🚀 {item.name}</span>
                          {item.metaText && (
                            <span className="metaBadge info">{item.metaText}</span>
                          )}
                        </div>'''

# Fallback in case of emoji encoding issues
target_alt = '''                          {item.metaText && (
                            <span className="metaBadge info">{item.metaText}</span>
                          )}
                        </div>'''

new_code = '''                          {item.metaText && (
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
                        </div>'''

code = code.replace(target_alt, new_code)

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Replaced UI block successfully")
