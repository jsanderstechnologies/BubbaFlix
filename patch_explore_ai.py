import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix import
code = code.replace('import { filterCollectionsWithGroq } from "../../utils/groqFilter";', 'import { filterCollectionsWithGroq, filterExploreMediaWithGroq } from "../../utils/groqFilter";')

# Patch fetchInitialData
old_initial = '''	const fetchInitialData = () => {
		setLoading(true);
		fetchDataFromAPI(`/discover/${mediaType}`, filters).then((res) => {
			const filtered = filterEnglishMedia(res?.results || []);
			setData({ ...res, results: filtered });
			setPageNum((prev) => prev + 1);
			setLoading(false);
		});
	};'''

new_initial = '''	const fetchInitialData = () => {
		setLoading(true);
		fetchDataFromAPI(`/discover/${mediaType}`, filters).then(async (res) => {
			let filtered = filterEnglishMedia(res?.results || []);
			filtered = await filterExploreMediaWithGroq(filtered, mediaType);
			setData({ ...res, results: filtered });
			setPageNum((prev) => prev + 1);
			setLoading(false);
		});
	};'''

code = code.replace(old_initial, new_initial)

# Patch fetchNextPageData
old_next = '''	const fetchNextPageData = () => {
		fetchDataFromAPI(
			`/discover/${mediaType}?page=${pageNum}`,
			filters
		).then((res) => {
			const filteredNext = filterEnglishMedia(res?.results || []);
			if (data?.results) {
				setData({
					...data,
					results: [...data.results, ...filteredNext],
				});
			} else {
				setData({ ...res, results: filteredNext });
			}
			setPageNum((prev) => prev + 1);
		});
	};'''

new_next = '''	const fetchNextPageData = () => {
		fetchDataFromAPI(
			`/discover/${mediaType}?page=${pageNum}`,
			filters
		).then(async (res) => {
			let filteredNext = filterEnglishMedia(res?.results || []);
			filteredNext = await filterExploreMediaWithGroq(filteredNext, mediaType);
			
			// We have to use a functional state update to ensure we don't capture stale `data`
			setData((prevData) => {
				if (prevData?.results) {
					return {
						...prevData,
						results: [...prevData.results, ...filteredNext],
					};
				} else {
					return { ...res, results: filteredNext };
				}
			});
			setPageNum((prev) => prev + 1);
		});
	};'''

code = code.replace(old_next, new_next)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage data fetches")
