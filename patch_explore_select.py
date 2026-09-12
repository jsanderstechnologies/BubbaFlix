import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace sortTabs with a select
old_sort_tabs = '''						{!(mediaType === "movie" && movieTab === "collections") && (
							<div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "5px" }}>
								<div style={{ color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", marginRight: "10px", fontSize: "14px" }}>
									<FiSliders style={{ marginRight: "6px" }}/> Sort By:
								</div>
								{getSortOptions(mediaType).map((opt) => (
									<button
										key={opt.value}
										className={`tabBtn ${sortby === opt.value ? "active" : ""}`}
										onClick={() => {
											setSortby(opt.value);
											if (opt.value) {
												filters.sort_by = opt.value;
											} else {
												delete filters.sort_by;
											}
											setPageNum(1);
											fetchInitialData();
										}}
										tabIndex="0"
										style={{ padding: "6px 14px", fontSize: "13px" }}
									>
										{opt.label.replace("Sort by ", "").replace("Sort ", "")}
									</button>
								))}
							</div>
						)}'''

new_sort_tabs = '''						{!(mediaType === "movie" && movieTab === "collections") && (
							<div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "5px" }}>
								<div className="tabBtn selectContainer" style={{ padding: 0, position: "relative", overflow: "hidden" }}>
									<div style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
										<FiSliders style={{ marginRight: "6px" }}/> Sort:
									</div>
									<select
										className="tvSortSelect"
										value={sortby}
										onChange={(e) => {
											const val = e.target.value;
											setSortby(val);
											if (val) {
												filters.sort_by = val;
											} else {
												delete filters.sort_by;
											}
											setPageNum(1);
											fetchInitialData();
										}}
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
										{getSortOptions(mediaType).map((opt) => (
											<option key={opt.value} value={opt.value} style={{ background: '#222', color: 'white' }}>
												{opt.label}
											</option>
										))}
									</select>
									<div style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
										▼
									</div>
								</div>
							</div>
						)}'''

code = code.replace(old_sort_tabs, new_sort_tabs)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage select")
