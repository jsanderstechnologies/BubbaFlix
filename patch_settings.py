import re

with open('f:/Cyberflix/src/pages/settings-page/index.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variable
state_insert = '''  const [excludeLowQuality, setExcludeLowQuality] = useState(true);
  const [disableBackgrounds, setDisableBackgrounds] = useState(false);'''
content = content.replace('  const [excludeLowQuality, setExcludeLowQuality] = useState(true);', state_insert)

# 2. Set initial value in loadAllSettings
load_insert = '''    const excludeLowConfig = (localStorage.getItem("stream_exclude_low_quality") !== null ? JSON.parse(localStorage.getItem("stream_exclude_low_quality")) : null) ?? serverSettings?.stream_exclude_low_quality ?? true;
    setExcludeLowQuality(excludeLowConfig);
    
    const disableBgConfig = (localStorage.getItem("disable_backgrounds") !== null ? JSON.parse(localStorage.getItem("disable_backgrounds")) : null) ?? user?.preferences?.disableBackgrounds ?? false;
    setDisableBackgrounds(disableBgConfig);'''
content = content.replace('''    const excludeLowConfig = (localStorage.getItem("stream_exclude_low_quality") !== null ? JSON.parse(localStorage.getItem("stream_exclude_low_quality")) : null) ?? serverSettings?.stream_exclude_low_quality ?? true;
    setExcludeLowQuality(excludeLowConfig);''', load_insert)

# 3. Handle theme/bg change
theme_insert = '''  const handleSelectTheme = (themeId) => {
    setActiveTheme(themeId);
    applyTheme(themeId);
    updatePreferences({ theme: themeId, disableBackgrounds });
  };
  
  const handleToggleBackgrounds = (e) => {
    const val = e.target.checked;
    setDisableBackgrounds(val);
    localStorage.setItem("disable_backgrounds", JSON.stringify(val));
    updatePreferences({ theme: activeTheme, disableBackgrounds: val });
  };'''
content = re.sub(r'  const handleSelectTheme = \(themeId\) => \{[^\}]+\};', theme_insert, content)

# 4. Add UI for toggle
ui_insert = '''              </div>
              
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input 
                  type="checkbox" 
                  id="disableBg" 
                  checked={disableBackgrounds} 
                  onChange={handleToggleBackgrounds} 
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <label htmlFor="disableBg" style={{ cursor: 'pointer', fontSize: '1.1rem' }}>Disable Background Art</label>
              </div>
            </div>'''
content = content.replace('''              </div>
            </div>''', ui_insert, 1)

with open('f:/Cyberflix/src/pages/settings-page/index.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched settings")
