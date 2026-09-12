import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

import_statement = 'import TopNav from "../../components/top-nav";\nimport SortModal from "../../components/sort-modal";\nimport { FiSliders } from "react-icons/fi";'
code = code.replace('import TopNav from "../../components/top-nav";', import_statement)

# Add sort state
state_injection = '''  const [activeTab, setActiveTab] = useState("all"); // "all", "movie", "tv", "collection"
  const [sortby, setSortby] = useState("added.desc");
  const [showSortModal, setShowSortModal] = useState(false);
  
  const FAV_SORT_OPTIONS = [
    { value: "added.desc", label: "Date Added (Newest)" },
    { value: "added.asc", label: "Date Added (Oldest)" },
    { value: "title.asc", label: "Title (A-Z)" },
    { value: "title.desc", label: "Title (Z-A)" },
    { value: "rating.desc", label: "Rating (High to Low)" },
    { value: "release.desc", label: "Release Date (Newest)" },
    { value: "release.asc", label: "Release Date (Oldest)" }
  ];

  const sortItems = (items) => {
    let sorted = [...items];
    switch (sortby) {
        case "added.desc":
            break;
        case "added.asc":
            sorted.reverse();
            break;
        case "title.asc":
            sorted.sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));
            break;
        case "title.desc":
            sorted.sort((a, b) => (b.title || b.name || "").localeCompare(a.title || a.name || ""));
            break;
        case "rating.desc":
            sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            break;
        case "release.desc":
            sorted.sort((a, b) => new Date(b.release_date || b.first_air_date || 0) - new Date(a.release_date || a.first_air_date || 0));
            break;
        case "release.asc":
            sorted.sort((a, b) => new Date(a.release_date || a.first_air_date || 0) - new Date(b.release_date || b.first_air_date || 0));
            break;
    }
    return sorted;
  };'''
code = code.replace('  const [activeTab, setActiveTab] = useState("all"); // "all", "movie", "tv", "collection"', state_injection)

# Replace displayedItems logic
old_displayed_items = '''  const displayedItems =
    activeTab === "movie"
      ? movieFavs
      : activeTab === "tv"
      ? tvFavs
      : favorites;'''

new_displayed_items = '''  const displayedItems = sortItems(
    activeTab === "movie"
      ? movieFavs
      : activeTab === "tv"
      ? tvFavs
      : favorites
  );
  
  const displayedCollections = sortItems(favCollections);'''

code = code.replace(old_displayed_items, new_displayed_items)

# Add sort button to header
old_header = '''        <div className="pageHeader">
          <div className="pageTitle">
            <AiFillStar className="titleIcon" style={{ color: "#ffd700" }} />
            <h1>My Favorites</h1>
            <span className="countBadge">{totalCount} Saved</span>
          </div>

          <div className="tabSelector">'''

new_header = '''        <div className="pageHeader">
          <div className="pageTitle">
            <AiFillStar className="titleIcon" style={{ color: "#ffd700" }} />
            <h1>My Favorites</h1>
            <span className="countBadge">{totalCount} Saved</span>
          </div>
          
          <div className="headerControls" style={{ display: "flex", alignItems: "center", gap: "20px" }}>
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
              </button>
              
              <div className="tabSelector">'''

code = code.replace(old_header, new_header)

# Make sure we add a closing div for headerControls
old_tab_close = '''              <FiLayers style={{ marginRight: 6 }} /> Collections ({favCollections.length})
            </button>
          </div>
        </div>'''

new_tab_close = '''              <FiLayers style={{ marginRight: 6 }} /> Collections ({favCollections.length})
            </button>
          </div>
          </div>
        </div>'''
code = code.replace(old_tab_close, new_tab_close)

# Replace favCollections mapping with displayedCollections
old_col_map = '''            {favCollections.map((col) => ('''
new_col_map = '''            {displayedCollections.map((col) => ('''
code = code.replace(old_col_map, new_col_map)

# Add SortModal at end
old_return_end = '''      </ContentWrapper>
    </div>
  );
};

export default FavoritesPage;'''

new_return_end = '''      </ContentWrapper>
      <SortModal 
          show={showSortModal} 
          setShow={setShowSortModal} 
          options={FAV_SORT_OPTIONS}
          selectedValue={sortby}
          onSelect={(val) => setSortby(val)}
      />
    </div>
  );
};

export default FavoritesPage;'''

code = code.replace(old_return_end, new_return_end)

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched FavoritesPage.jsx")
