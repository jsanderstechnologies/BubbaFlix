import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_btn = '''<div className="headerControls" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
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
                  style={{ background: "rgba(255, 255, 255, 0.1)", border: "2px solid transparent", borderRadius: "8px", padding: "10px 16px", color: "white", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.2s" }}
              >
                  <FiSliders className="selectIcon" style={{ marginRight: '8px', fontSize: "18px" }} />
                  Sort Options
              </button>'''

new_btn = '''<div className="headerControls">
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

code = code.replace(old_btn, new_btn)

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed inline styles")
