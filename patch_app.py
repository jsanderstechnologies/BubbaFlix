import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import PersonPage
if 'import PersonPage' not in code:
    code = code.replace(
        'import CollectionPage from "./pages/collection-page";',
        'import CollectionPage from "./pages/collection-page";\nimport PersonPage from "./pages/person-page";'
    )

# Add Route
if '<Route path="/person/:id" element={<PersonPage />} />' not in code:
    code = code.replace(
        '<Route path="/collection/:id" element={<CollectionPage />} />',
        '<Route path="/collection/:id" element={<CollectionPage />} />\n            <Route path="/person/:id" element={<PersonPage />} />'
    )

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched App.jsx")
