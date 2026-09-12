import re

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

idx = code.find('{item.metaText}</span>')
if idx != -1:
    end_idx = code.find('</div>', idx)
    if end_idx != -1:
        end_idx += 6 # include </div>
        target = code[idx-30:end_idx]
        
        new_code = target.replace('</div>', '''
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
                        </div>''')
        
        code = code[:idx-30] + new_code + code[end_idx:]
        with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'w', encoding='utf-8') as f:
            f.write(code)
        print("Replaced!")
    else:
        print("Could not find </div>")
else:
    print("Could not find {item.metaText}")
