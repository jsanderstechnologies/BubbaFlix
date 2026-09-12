import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''										style={{ 
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
										{mediaType === "tv" && TV_SORT_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value} style={{ background: "#04152d", color: "#fff" }}>
												{opt.label}
											</option>
										))}
										{mediaType === "movie" && MOVIE_SORT_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value} style={{ background: "#04152d", color: "#fff" }}>
												{opt.label}
											</option>
										))}
									</select>
								</div>'''

replacement = '''										style={{ 
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
										{mediaType === "tv" && TV_SORT_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value} style={{ background: "#04152d", color: "#fff" }}>
												{opt.label}
											</option>
										))}
										{mediaType === "movie" && MOVIE_SORT_OPTIONS.map((opt) => (
											<option key={opt.value} value={opt.value} style={{ background: "#04152d", color: "#fff" }}>
												{opt.label}
											</option>
										))}
									</select>
									<div style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
										<FiChevronDown />
									</div>
								</div>'''

code = code.replace(target, replacement)

if 'FiChevronDown' not in code:
    code = code.replace('import { FiSliders, FiFilm, FiTv, FiLayers } from "react-icons/fi";', 'import { FiSliders, FiFilm, FiTv, FiLayers, FiChevronDown } from "react-icons/fi";')

with open(r'f:\Cyberflix\src\pages\explore-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Explore Page arrow patched")
