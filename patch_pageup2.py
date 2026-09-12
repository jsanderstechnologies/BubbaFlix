import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
'''if (e.key === "PageUp" || e.key === "PageDown" || e.keyCode === 33 || e.keyCode === 34) {''',
'''if (e.key === "PageUp" || e.key === "PageDown" || e.keyCode === 33 || e.keyCode === 34 || e.keyCode === 427 || e.keyCode === 428) {'''
)

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched App.jsx with ChannelUp/ChannelDown intercept")
