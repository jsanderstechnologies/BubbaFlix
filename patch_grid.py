import re

with open(r'f:\Cyberflix\src\pages\person-page\index.scss', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''
        .creditsGrid {
            display: flex;
            flex-flow: row wrap;
            gap: 8px;
            margin-bottom: 50px;
        }
'''

code = re.sub(r'\.creditsGrid \{[^\}]+@media[^\}]+\}\s*\}', replacement.strip(), code, flags=re.DOTALL)

with open(r'f:\Cyberflix\src\pages\person-page\index.scss', 'w', encoding='utf-8') as f:
    f.write(code)

print("Fixed person page grid")
