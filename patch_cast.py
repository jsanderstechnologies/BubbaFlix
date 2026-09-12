import re

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

if 'import { useNavigate }' not in code:
    code = code.replace(
        'import { useSelector } from "react-redux";',
        'import { useSelector } from "react-redux";\nimport { useNavigate } from "react-router-dom";'
    )

if 'const navigate = useNavigate();' not in code:
    code = code.replace(
        'const { url } = useSelector((state) => state.home);',
        'const { url } = useSelector((state) => state.home);\n\tconst navigate = useNavigate();'
    )

replacement = '''<div 
									key={item.id} 
									className="listItem"
									tabIndex="0"
									role="button"
									onClick={() => navigate(/person/)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
											e.preventDefault();
											navigate(/person/);
										}
									}}
								>'''

code = code.replace('<div key={item.id} className="listItem">', replacement)

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched cast-section/index.jsx")
