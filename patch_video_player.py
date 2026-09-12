import re

with open(r'f:\Cyberflix\src\components\video-player-modal\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'import { getWatchProgress, saveWatchProgress, clearWatchProgress, saveStreamUrl }',
    'import { getWatchProgress, saveWatchProgress, clearWatchProgress, saveStreamUrl, forceSyncProgressToServer }'
)

handle_close_old = '''      if (typeof setShow === "function") setShow(false);
      if (typeof onClose === "function") onClose();'''
handle_close_new = '''      forceSyncProgressToServer();
      if (typeof setShow === "function") setShow(false);
      if (typeof onClose === "function") onClose();'''

code = code.replace(handle_close_old, handle_close_new)

with open(r'f:\Cyberflix\src\components\video-player-modal\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched handleClose")
