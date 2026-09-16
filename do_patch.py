import re

with open('f:/Cyberflix/src/pages/settings-page/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The exact block to remove
remove_block = '''              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="disableBg" 
                  checked={disableBackgrounds} 
                  onChange={handleToggleBackgrounds} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="disableBg" style={{ cursor: 'pointer', fontSize: '1.1rem' }}>Disable Background Art</label>
              </div>'''

if remove_block in content:
    content = content.replace(remove_block, '')
    print("Removed block")
else:
    print("Block not found!")

# Add to theme block
theme_header = '''              <p className="description">
                Select your preferred color theme for BubbaFlix, including Dark Red (Netflix Style). Synced across all client devices.
              </p>
              <div className="themeGrid">'''
              
new_toggle = '''              <p className="description">
                Select your preferred color theme for BubbaFlix, including Dark Red (Netflix Style). Synced across all client devices.
              </p>
              
              <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="disableBg" 
                  checked={disableBackgrounds} 
                  onChange={handleToggleBackgrounds} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="disableBg" style={{ cursor: 'pointer', fontSize: '1.1rem' }}>Disable Background Art</label>
              </div>
              
              <div className="themeGrid">'''

if theme_header in content:
    content = content.replace(theme_header, new_toggle)
    print("Added block to themes")
else:
    print("Theme header not found!")
    
with open('f:/Cyberflix/src/pages/settings-page/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
