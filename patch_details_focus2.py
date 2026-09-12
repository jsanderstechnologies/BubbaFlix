import re

with open(r'f:\Cyberflix\src\pages\details-page\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# remove the broken useEffect
code = code.replace(
    'const { data, loading } = useFetch(//);\n\n\tuseEffect(() => {\n\t\tif (!loading && !creditsLoading) {\n\t\t\tsetTimeout(restoreLastFocusedPoster, 200);\n\t\t}\n\t}, [loading, creditsLoading]);',
    'const { data, loading } = useFetch(///videos);'
)

# add the correct useEffect after creditsLoading is defined
if 'setTimeout(restoreLastFocusedPoster, 200)' not in code:
    code = code.replace(
        'const title = detailsData?.title || detailsData?.name;',
        'const title = detailsData?.title || detailsData?.name;\n\n\tuseEffect(() => {\n\t\tif (!loading && !creditsLoading) {\n\t\t\tsetTimeout(restoreLastFocusedPoster, 200);\n\t\t}\n\t}, [loading, creditsLoading]);'
    )

with open(r'f:\Cyberflix\src\pages\details-page\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched DetailsPage focus restore 2")
