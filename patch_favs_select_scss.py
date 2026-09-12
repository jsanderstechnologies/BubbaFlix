import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.scss', 'r', encoding='utf-8') as f:
    code = f.read()

scss_injection = '''        .tabItem.selectContainer {
            &:has(.tvSortSelect:focus), &:has(.tvSortSelect.isFocused) {
                background: white;
                color: black;
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(255, 255, 255, 0.4);
                border-color: transparent;
                
                .tvSortSelect {
                    color: black !important;
                }
                div {
                    color: black !important;
                }
            }
            &:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        }
'''
code = code.replace('.tabItem {', scss_injection + '\n        .tabItem {')

with open(r'f:\Cyberflix\src\pages\favorites-page\index.scss', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched FavoritesPage SCSS")
