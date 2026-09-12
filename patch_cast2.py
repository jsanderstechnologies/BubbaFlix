import re

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

if 'saveLastClickedPoster' not in code:
    code = code.replace(
        'import { useNavigate } from "react-router-dom";',
        'import { useNavigate } from "react-router-dom";\nimport { saveLastClickedPoster } from "../../../utils/focusManager";'
    )

replacement = '''<div 
									key={item.id} 
									id={poster-person-}
									className="listItem"
									tabIndex="0"
									role="button"
									onClick={() => {
										saveLastClickedPoster(item.id, "person");
										navigate(/person/);
									}}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
											e.preventDefault();
											saveLastClickedPoster(item.id, "person");
											navigate(/person/);
										}
									}}
								>'''

code = re.sub(r'<div \s*key={item\.id}\s*className="listItem".*?>', replacement, code, flags=re.DOTALL)

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched cast-section focus")
