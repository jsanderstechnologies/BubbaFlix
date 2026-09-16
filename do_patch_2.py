import re

with open('f:/Cyberflix/src/pages/settings-page/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_toggle = '''              
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

content = content.replace('<div className="themeGrid">', new_toggle, 1)

with open('f:/Cyberflix/src/pages/settings-page/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added block to themes")
