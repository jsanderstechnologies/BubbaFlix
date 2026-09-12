import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace('import { FiSliders } from "react-icons/fi";', 'import { FiSliders, FiChevronDown } from "react-icons/fi";')

with open(r'f:\Cyberflix\src\pages\favorites-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Imported FiChevronDown")
