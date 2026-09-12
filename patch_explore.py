import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_tab_switcher = '''					<div className="exploreTabSwitcher">
						{mediaType === "movie" && (
							<div className="typeTabs" style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
								<button'''

new_tab_switcher = '''					<div className="exploreTabSwitcher" style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginBottom: "15px" }}>
						{mediaType === "movie" && (
							<div className="typeTabs" style={{ display: "flex", gap: "10px" }}>
								<button'''

code = code.replace(old_tab_switcher, new_tab_switcher)

old_sort_tabs = '''						{!(mediaType === "movie" && movieTab === "collections") && (
							<div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "5px" }}>
								<div className="tabBtn selectContainer" style={{ padding: 0, position: "relative", overflow: "hidden" }}>'''

new_sort_tabs = '''						{!(mediaType === "movie" && movieTab === "collections") && (
							<div className="sortTabs" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
								<div className="tabBtn selectContainer" style={{ padding: 0, position: "relative", overflow: "hidden", border: "none", cursor: "pointer" }}>'''

code = code.replace(old_sort_tabs, new_sort_tabs)

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Explore Page updated")
