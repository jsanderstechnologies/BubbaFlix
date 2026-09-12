import re

with open(r'f:\Cyberflix\src\components\video-player-modal\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = re.sub(
    r'(if\s*\(typeof\s*setShow\s*===\s*"function"\)\s*setShow\(false\);)',
    r'forceSyncProgressToServer();\n      \1',
    code
)

with open(r'f:\Cyberflix\src\components\video-player-modal\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched handleClose properly")
