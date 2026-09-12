import re

with open(r'f:\Cyberflix\src\pages\favorites-page\index.scss', 'r', encoding='utf-8') as f:
    code = f.read()

old_scss = '''        .tabSelector {
            display: flex;'''

new_scss = '''        .headerControls {
            display: flex;
            align-items: center;
            gap: 20px;
            
            @include md {
                flex-direction: column;
                align-items: flex-start;
                gap: 15px;
            }

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
                    outline: none;
                }
            }
        }

        .tabSelector {
            display: flex;'''

code = code.replace(old_scss, new_scss)

with open(r'f:\Cyberflix\src\pages\favorites-page\index.scss', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched FavoritesPage SCSS")
