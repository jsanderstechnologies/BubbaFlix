import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Remove SortModal import
code = code.replace('import SortModal from "../../components/sort-modal";\n', '')

# Remove showSortModal state
code = code.replace('	const [showSortModal, setShowSortModal] = useState(false);\n', '')

# Replace the entire exploreTabSwitcher and filters block
old_header_controls = '''					{mediaType === "movie" ? (
						<div className="exploreTabSwitcher">
							<button
								className={`tabBtn ${movieTab === "movies" ? "active" : ""}`}
								onClick={() => {
									setMovieTab("movies");
									sessionStorage.setItem("explore_movie_tab", "movies");
								}}
								tabIndex="0"
							>
								<FiFilm /> Movies
							</button>
							<button
								className={`tabBtn ${movieTab === "collections" ? "active" : ""}`}
								onClick={() => {
									setMovieTab("collections");
									sessionStorage.setItem("explore_movie_tab", "collections");
								}}
								tabIndex="0"
							>
								<FiLayers /> Collections
							</button>
						</div>
					) : (
						<div className="filters">
							<div className="selectWrapper">
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
							</div>
						</div>
					)}'''

new_header_controls = '''					<div className="exploreTabSwitcher">
						{mediaType === "movie" && (
							<div className="typeTabs" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
								<button
									className={`tabBtn ${movieTab === "movies" ? "active" : ""}`}
									onClick={() => {
										setMovieTab("movies");
										sessionStorage.setItem("explore_movie_tab", "movies");
									}}
									tabIndex="0"
								>
									<FiFilm /> Movies
								</button>
								<button
									className={`tabBtn ${movieTab === "collections" ? "active" : ""}`}
									onClick={() => {
										setMovieTab("collections");
										sessionStorage.setItem("explore_movie_tab", "collections");
									}}
									tabIndex="0"
								>
									<FiLayers /> Collections
								</button>
							</div>
						)}
						
						{!(mediaType === "movie" && movieTab === "collections") && (
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
						)}
					</div>'''

code = code.replace(old_header_controls, new_header_controls)

# Remove SortModal usage at bottom
old_modal_usage = '''			</ContentWrapper>
			<SortModal 
				show={showSortModal} 
				setShow={setShowSortModal} 
				options={getSortOptions(mediaType)}
				selectedValue={sortby}
				onSelect={(val) => {
					setSortby(val);
					if (val) {
						filters.sort_by = val;
					} else {
						delete filters.sort_by;
					}
					setPageNum(1);
					fetchInitialData();
				}}
			/>
		</div>'''

new_modal_usage = '''			</ContentWrapper>
		</div>'''

code = code.replace(old_modal_usage, new_modal_usage)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage buttons")
