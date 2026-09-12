import re

with open(r'f:\Cyberflix\src\utils\filterUtils.js', 'r', encoding='utf-8') as f:
    code = f.read()

old_lang_check = '''    // 1. Primary Rule: If original_language is present, enforce English ("en" or "eng")
    if (item.original_language) {
      const lang = item.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") return false;
    }'''

new_lang_check = '''    // 1. Primary Rule: Enforce English, BUT allow universally popular international hits (like The Fifth Element, Parasite)
    if (item.original_language) {
      const lang = item.original_language.toLowerCase();
      if (lang !== "en" && lang !== "eng") {
        if (!item.vote_count || item.vote_count < 1500) {
          return false;
        }
      }
    }'''

code = code.replace(old_lang_check, new_lang_check)

old_country_check = '''    // 4. Country check ONLY if original_language is not explicitly English
    if (!item.original_language && Array.isArray(item.origin_country) && item.origin_country.length > 0) {
      const hasEnglishCountry = item.origin_country.some((c) => ["US", "GB", "CA", "AU", "NZ", "IE"].includes(c));
      if (!hasEnglishCountry) return false;
    }'''

new_country_check = '''    // 4. Country check ONLY if original_language is not explicitly English
    if (!item.original_language && Array.isArray(item.origin_country) && item.origin_country.length > 0) {
      const hasEnglishCountry = item.origin_country.some((c) => ["US", "GB", "CA", "AU", "NZ", "IE"].includes(c));
      if (!hasEnglishCountry) {
        if (!item.vote_count || item.vote_count < 1500) {
          return false;
        }
      }
    }'''

code = code.replace(old_country_check, new_country_check)

with open(r'f:\Cyberflix\src\utils\filterUtils.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched filterUtils.js for popular foreign movies")
