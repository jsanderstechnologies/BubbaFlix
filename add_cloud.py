import re

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

if 'FiCloud' not in code:
    code = code.replace('import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle, FiExternalLink } from "react-icons/fi";', 
                        'import { FiPlay, FiChevronDown, FiChevronUp, FiAlertCircle, FiExternalLink, FiCloud } from "react-icons/fi";')

target = '''} else if (stat.isCached) {
                                badges.push(<span key="cached" className="metaBadge success" style={{ background: '#28a745', color: '#fff', fontWeight: 'bold' }}>Cached</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "error") {'''

new_target = '''} else if (stat.isCached) {
                                badges.push(<span key="cached" className="metaBadge success" style={{ background: '#28a745', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}><FiCloud /> Cached</span>);
                            } else if (stat.transferStatus && stat.transferStatus.status === "error") {'''

code = code.replace(target, new_target)

with open(r'f:\Cyberflix\src\pages\details-page\magnet-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Added FiCloud icon")
