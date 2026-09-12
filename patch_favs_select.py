import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_sort_tabs = '''              <div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", marginRight: "5px", fontSize: "14px" }}>
                      <FiSliders style={{ marginRight: "6px" }}/> Sort By:
                  </div>
                  {FAV_SORT_OPTIONS.map((opt) => (
                      <button
                          key={opt.value}
                          className={`tabItem ${sortby === opt.value ? "active" : ""}`}
                          onClick={() => setSortby(opt.value)}
                          tabIndex="0"
                          style={{ padding: "6px 14px", fontSize: "13px", borderRadius: "20px" }}
                      >
                          {opt.label.replace("Date Added", "Added").replace("Release Date", "Released")}
                      </button>
                  ))}
              </div>'''

new_sort_tabs = '''              <div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <div className="tabItem selectContainer" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
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
                              <option key={opt.value} value={opt.value} style={{ background: '#222', color: 'white' }}>
                                  {opt.label}
                              </option>
                          ))}
                      </select>
                      <div style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                          ▼
                      </div>
                  </div>
              </div>'''

code = code.replace(old_sort_tabs, new_sort_tabs)

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched FavoritesPage select")
