import re

with open(r'f:\Cyberflix\src\pages\usage-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'import Img from "../../components/lazy-load/Img";',
    'import Img from "../../components/lazy-load";'
)

with open(r'f:\Cyberflix\src\pages\usage-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched Img import")
