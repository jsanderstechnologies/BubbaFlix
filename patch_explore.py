import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

import_statement = 'import SortModal from "../../components/sort-modal";\nimport { FiSliders, FiLayers, FiFilm } from "react-icons/fi";'
code = code.replace('import { FiSliders, FiLayers, FiFilm } from "react-icons/fi";', import_statement)

# We need to add state for showSortModal
state_injection = '''	const [sortby, setSortby] = useState("popularity.desc");
	const [showSortModal, setShowSortModal] = useState(false);'''
code = code.replace('const [sortby, setSortby] = useState("popularity.desc");', state_injection)

# Replace the select with a button
old_select = '''							<div className="selectWrapper">
								<FiSliders className="selectIcon" />
								<select
									className="tvSortSelect"
									value={sortby}
									onChange={handleSortChange}
									tabIndex="0"
								>
									{SORT_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value} style={{ background: '#222', color: 'white' }}>
											{opt.label}
										</option>
									))}
								</select>
							</div>'''

new_select = '''							<div className="selectWrapper">
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
							</div>'''

code = code.replace(old_select, new_select)

# Insert SortModal before closing div of ExplorePage
old_return_end = '''			</ContentWrapper>
		</div>
	);
};

export default ExplorePage;'''

new_return_end = '''			</ContentWrapper>
			<SortModal 
				show={showSortModal} 
				setShow={setShowSortModal} 
				options={SORT_OPTIONS}
				selectedValue={sortby}
				onSelect={(val) => {
					setSortby(val);
					setPageNum(1);
					// Re-fetch handled automatically by useEffect that watches `sortby`
				}}
			/>
		</div>
	);
};

export default ExplorePage;'''

code = code.replace(old_return_end, new_return_end)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage.jsx")
