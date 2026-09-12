import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove SortModal import
code = code.replace('import SortModal from "../../components/sort-modal";\n', '')
code = code.replace('  const [showSortModal, setShowSortModal] = useState(false);\n', '')

# Replace headerControls
old_header_controls = '''          <div className="headerControls">
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
              </button>
              
              <div className="tabSelector">
              <button
                className={`tabItem ${activeTab === "all" ? "active" : ""}`}
                tabIndex="0"
                onClick={() => setActiveTab("all")}
              >
                All ({totalCount})
              </button>
              <button
                className={`tabItem ${activeTab === "movie" ? "active" : ""}`}
                tabIndex="0"
                onClick={() => setActiveTab("movie")}
              >
                <FiFilm style={{ marginRight: 6 }} /> Movies ({movieFavs.length})
              </button>
              <button
                className={`tabItem ${activeTab === "tv" ? "active" : ""}`}
                tabIndex="0"
                onClick={() => setActiveTab("tv")}
              >
                <FiTv style={{ marginRight: 6 }} /> TV Series ({tvFavs.length})
              </button>
              <button
                className={`tabItem ${activeTab === "collection" ? "active" : ""}`}
                tabIndex="0"
                onClick={() => setActiveTab("collection")}
              >
                <FiLayers style={{ marginRight: 6 }} /> Collections ({favCollections.length})
              </button>
            </div>
          </div>
        </div>'''

new_header_controls = '''          <div className="headerControls" style={{ display: "flex", flexDirection: "column", gap: "15px", width: "100%" }}>
              <div className="tabSelector">
                  <button
                    className={`tabItem ${activeTab === "all" ? "active" : ""}`}
                    tabIndex="0"
                    onClick={() => setActiveTab("all")}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    className={`tabItem ${activeTab === "movie" ? "active" : ""}`}
                    tabIndex="0"
                    onClick={() => setActiveTab("movie")}
                  >
                    <FiFilm style={{ marginRight: 6 }} /> Movies ({movieFavs.length})
                  </button>
                  <button
                    className={`tabItem ${activeTab === "tv" ? "active" : ""}`}
                    tabIndex="0"
                    onClick={() => setActiveTab("tv")}
                  >
                    <FiTv style={{ marginRight: 6 }} /> TV Series ({tvFavs.length})
                  </button>
                  <button
                    className={`tabItem ${activeTab === "collection" ? "active" : ""}`}
                    tabIndex="0"
                    onClick={() => setActiveTab("collection")}
                  >
                    <FiLayers style={{ marginRight: 6 }} /> Collections ({favCollections.length})
                  </button>
              </div>
              
              <div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
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
              </div>
          </div>
        </div>'''

code = code.replace(old_header_controls, new_header_controls)

# Remove modal usage
old_modal_usage = '''      </ContentWrapper>
      <SortModal 
          show={showSortModal} 
          setShow={setShowSortModal} 
          options={FAV_SORT_OPTIONS}
          selectedValue={sortby}
          onSelect={(val) => setSortby(val)}
      />
    </div>'''

new_modal_usage = '''      </ContentWrapper>
    </div>'''

code = code.replace(old_modal_usage, new_modal_usage)

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched FavoritesPage buttons")
