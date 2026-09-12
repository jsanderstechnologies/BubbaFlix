import re

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('navigate(/person/);', 'navigate(/person/);')
code = code.replace('> navigate(/person/)}', '')

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched cast-section syntax again")
