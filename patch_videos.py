import re

with open(r'f:\Cyberflix\src\pages\details-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# remove import
code = re.sub(r'import VideosSection from "./videos-section";\n', '', code)

# remove component usage
code = re.sub(r'<VideosSection data={data} loading={loading} />\n', '', code)

with open(r'f:\Cyberflix\src\pages\details-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Removed VideosSection from DetailsPage")
