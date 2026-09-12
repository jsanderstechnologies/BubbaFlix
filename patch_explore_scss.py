import re

with open(r'f:\Cyberflix\src\pages\explore-page\index.scss', 'r', encoding='utf-8') as f:
    code = f.read()

old_scss = '''        .selectWrapper {
            display: flex;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 8px 12px;
            
            .selectIcon {
                color: white;
                margin-right: 10px;
                font-size: 18px;
            }

            .tvSortSelect {
                background: transparent;
                border: none;
                color: white;
                font-size: 16px;
                outline: none;
                cursor: pointer;
                
                &:focus, &.isFocused {
                    color: var(--pink);
                }
            }
        }'''

new_scss = '''        .selectWrapper {
            display: flex;
            align-items: center;
            
            .tvSortBtn {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid transparent;
                border-radius: 8px;
                padding: 10px 16px;
                color: white;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                transition: all 0.2s;
                
                .selectIcon {
                    font-size: 18px;
                }
                
                &:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                
                &:focus, &.isFocused {
                    background: var(--pink);
                    border-color: white;
                    transform: scale(1.05);
                    box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
                }
            }
        }'''

code = code.replace(old_scss, new_scss)

with open(r'f:\Cyberflix\src\pages\explore-page\index.scss', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched ExplorePage SCSS")
