import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''            <div className="headerControls">
                <button 
                    className="tvSortBtn" 
                    tabIndex="0" 
                    onClick={() => setShowSortModal(true)}
                    onKeyDown={(e) => {
                        const code = e.keyCode;
                        if (e.key === "Enter" || e.key === " " || code === 13 || code === 23 || code === 66) {
                            e.preventDefault();
                            setShowSortModal(true);
                        }
                    }}
                >
                    <FiSliders className="selectIcon" style={{ marginRight: '8px' }} />
                    Sort Options
                </button>'''

replacement = '''            <div className="headerControls" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                <div className="tabItem selectContainer" style={{ padding: 0, position: "relative", overflow: "hidden", border: "none", cursor: "pointer" }}>
                  <div style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                    <FiSliders style={{ marginRight: "6px" }}/> Sort:
                  </div>
                  <select
                    className="tvSortSelect"
                    value={sortby}
                    onChange={(e) => setSortby(e.target.value)}
                    tabIndex="0"
                    style={{ 
                      appearance: "none", 
                      background: "transparent", 
                      border: "none", 
                      color: "rgba(255, 255, 255, 0.7)", 
                      padding: "10px 40px 10px 90px", 
                      fontSize: "14px", 
                      fontWeight: 600, 
                      cursor: "pointer", 
                      outline: "none", 
                      width: "100%",
                      height: "100%"
                    }}
                  >
                    {FAV_SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} style={{ background: "#04152d", color: "#fff" }}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <div style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                    <FiChevronDown />
                  </div>
                </div>'''

code = code.replace(target, replacement)

# Also remove SortModal imports and render to clean up
code = re.sub(r'import SortModal.*?;', '', code)
code = re.sub(r'const \[showSortModal, setShowSortModal\] = useState\(false\);', '', code)
code = re.sub(r'<SortModal.*?/>', '', code, flags=re.DOTALL)

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Favorites Sort UI patched")
