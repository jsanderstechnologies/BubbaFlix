import re

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    '${baseUrl}/api/users/preferences,',
    '`${baseUrl}/api/users/preferences`,'
).replace(
    'Authorization: Bearer  }',
    'Authorization: `Bearer ${token}` }'
)

with open(r'f:\Cyberflix\src\utils\watchProgress.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched backticks")
