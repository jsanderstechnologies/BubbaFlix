import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix SORT_OPTIONS to include Title Z-A and rename to A-Z
old_sort_opts = '''const SORT_OPTIONS = [
	{ value: "popularity.desc", label: "Sort by Popularity (High to Low)" },
	{ value: "vote_average.desc", label: "Sort by Rating (Top Rated)" },
	{ value: "primary_release_date.desc", label: "Sort by Release Date (Newest)" },
	{ value: "original_title.asc", label: "Sort by Title (A-Z)" },
	{ value: "popularity.asc", label: "Sort by Popularity (Low to High)" },
	{ value: "vote_average.asc", label: "Sort by Rating (Lowest)" },
	{ value: "primary_release_date.asc", label: "Sort by Release Date (Oldest)" },
];'''

new_sort_opts = '''const getSortOptions = (mediaType) => [
	{ value: "popularity.desc", label: "Sort by Popularity (High to Low)" },
	{ value: "vote_average.desc", label: "Sort by Rating (Top Rated)" },
	{ value: "primary_release_date.desc", label: "Sort by Release Date (Newest)" },
	{ value: mediaType === "tv" ? "name.asc" : "original_title.asc", label: "Sort Alphabetically (A-Z)" },
	{ value: mediaType === "tv" ? "name.desc" : "original_title.desc", label: "Sort Alphabetically (Z-A)" },
	{ value: "popularity.asc", label: "Sort by Popularity (Low to High)" },
	{ value: "vote_average.asc", label: "Sort by Rating (Lowest)" },
	{ value: "primary_release_date.asc", label: "Sort by Release Date (Oldest)" },
];'''

code = code.replace(old_sort_opts, new_sort_opts)

# Fix SortModal onSelect in ExplorePage
old_on_select = '''			<SortModal 
				show={showSortModal} 
				setShow={setShowSortModal} 
				options={SORT_OPTIONS}
				selectedValue={sortby}
				onSelect={(val) => {
					setSortby(val);
					setPageNum(1);
					// Re-fetch handled automatically by useEffect that watches sortby
				}}
			/>'''

new_on_select = '''			<SortModal 
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
			/>'''

code = code.replace(old_on_select, new_on_select)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage sorting")
