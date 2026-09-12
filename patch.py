import re

with open(r'f:\Cyberflix\src\utils\premiumize.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Update loop to require file_id or folder_id
code = code.replace(
    '''        if (listRes.data && listRes.data.status === "success" && Array.isArray(listRes.data.transfers)) {
          match = listRes.data.transfers.find((t) => t.id === transferId || t.name === transferName);
        }''',
    '''        if (listRes.data && listRes.data.status === "success" && Array.isArray(listRes.data.transfers)) {
          const found = listRes.data.transfers.find((t) => t.id === transferId || t.name === transferName);
          if (found && (found.file_id || found.folder_id || found.status === "finished")) {
            match = found;
          }
        }'''
)

# Remove the fallback check root folder list block completely
fallback_start = code.find('      // Fallback check root folder list for recent downloads')
if fallback_start != -1:
    fallback_end = code.find('    } else if (createRes.data && createRes.data.message) {', fallback_start)
    if fallback_end != -1:
        code = code[:fallback_start] + code[fallback_end:]

with open(r'f:\Cyberflix\src\utils\premiumize.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched premiumize.js")
