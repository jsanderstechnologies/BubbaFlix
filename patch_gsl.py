import re

with open(r'f:\Cyberflix\src\components\global-search-listener\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace("navigate('/search/');", "navigate('/search');")

with open(r'f:\Cyberflix\src\components\global-search-listener\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
