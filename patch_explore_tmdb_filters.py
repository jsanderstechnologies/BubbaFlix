import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_useEffect = '''	useEffect(() => {
		filters = { sort_by: "popularity.desc" };
		setData(null);
		setPageNum(1);'''

new_useEffect = '''	useEffect(() => {
		filters = { 
			sort_by: "popularity.desc",
			with_original_language: "en",
			"vote_count.gte": 10
		};
		setData(null);
		setPageNum(1);'''

code = code.replace(old_useEffect, new_useEffect)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage filters")
