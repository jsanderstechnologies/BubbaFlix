import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
'''if (e.key === "PageUp" || e.key === "PageDown" || e.keyCode === 33 || e.keyCode === 34 || e.keyCode === 427 || e.keyCode === 428) {''',
'''if (e.key === "PageUp" || e.key === "PageDown" || e.keyCode === 33 || e.keyCode === 34 || e.keyCode === 427 || e.keyCode === 428 || e.key === "Home" || e.keyCode === 36 || e.key === "End" || e.keyCode === 35) {'''
)

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched App.jsx with Home/End intercept")
