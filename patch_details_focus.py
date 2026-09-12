import re

with open(r'f:\Cyberflix\src\pages\details-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

if 'import { restoreLastFocusedPoster }' not in code:
    code = code.replace(
        'import { useParams, useNavigate } from "react-router-dom";',
        'import { useParams, useNavigate } from "react-router-dom";\nimport { restoreLastFocusedPoster } from "../../utils/focusManager";'
    )

if 'restoreLastFocusedPoster();' not in code:
    code = code.replace(
        'const { data, loading } = useFetch(//);',
        'const { data, loading } = useFetch(//);\n\n\tuseEffect(() => {\n\t\tif (!loading && !creditsLoading) {\n\t\t\tsetTimeout(restoreLastFocusedPoster, 200);\n\t\t}\n\t}, [loading, creditsLoading]);'
    )

with open(r'f:\Cyberflix\src\pages\details-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched DetailsPage focus restore")
