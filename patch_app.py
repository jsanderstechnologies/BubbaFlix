import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'import SettingsPage from "./pages/settings-page";',
    'import SettingsPage from "./pages/settings-page";\nimport UsagePage from "./pages/usage-page";'
)

code = code.replace(
    '<Route path="/settings" element={<SettingsPage />} />',
    '<Route path="/settings" element={<SettingsPage />} />\n            <Route path="/usage" element={<UsagePage />} />'
)

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched App.jsx")
