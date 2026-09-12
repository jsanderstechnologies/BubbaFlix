import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_global = '''    const handleGlobalKeyDown = (e) => {
      // Prevent PageUp/PageDown/Home/End from scrolling the view out of sync with D-pad focus
      if (
        e.key === "PageUp" || e.keyCode === 33 || e.keyCode === 427 || 
        e.key === "PageDown" || e.keyCode === 34 || e.keyCode === 428 || 
        e.key === "Home" || e.keyCode === 36 || 
        e.key === "End" || e.keyCode === 35
      ) {
        e.preventDefault();
      }
    };'''

new_global = '''    const handleGlobalKeyDown = (e) => {
      // Prevent Home/End from scrolling the view out of sync with D-pad focus (PageUp/Down handled by dpad engine)
      if (
        e.key === "Home" || e.keyCode === 36 || 
        e.key === "End" || e.keyCode === 35
      ) {
        e.preventDefault();
      }
    };'''

code = code.replace(old_global, new_global)

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched App.jsx")
