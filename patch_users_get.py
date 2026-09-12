import re

with open(r'f:\Cyberflix\server\transcoder.cjs', 'r', encoding='utf-8') as f:
    code = f.read()

old_line = 'const sanitized = Object.values(users).map(u => ({ id: u.id, username: u.username, role: u.role }));'
new_line = 'const sanitized = Object.values(users).map(u => ({ id: u.id, username: u.username, role: u.role, preferences: u.preferences }));'

code = code.replace(old_line, new_line)

with open(r'f:\Cyberflix\server\transcoder.cjs', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched users endpoint")
