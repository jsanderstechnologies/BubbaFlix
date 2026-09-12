import re

with open(r'f:\Cyberflix\src\utils\premiumize.js', 'r', encoding='utf-8') as f:
    code = f.read()

new_methods = '''
export const checkPremiumizeCache = async (magnets) => {
  let apiKey = getPremiumizeKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    apiKey = serverSettings?.premiumizeKey || "";
  }
  if (!apiKey || !magnets || magnets.length === 0) return [];

  try {
    const params = new URLSearchParams();
    magnets.forEach(m => params.append("items[]", m));

    const res = await axios.post(`https://www.premiumize.me/api/cache/check?apikey=${apiKey}`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (res.data?.status === "success") {
      return res.data.response || [];
    }
  } catch (err) {
    console.error("[Premiumize API] Cache check failed:", err);
  }
  return magnets.map(() => false);
};

export const getPremiumizeTransfers = async () => {
  let apiKey = getPremiumizeKey();
  if (!apiKey) {
    const serverSettings = await fetchServerSettings();
    apiKey = serverSettings?.premiumizeKey || "";
  }
  if (!apiKey) return [];

  try {
    const res = await axios.get(`https://www.premiumize.me/api/transfer/list?apikey=${apiKey}`);
    if (res.data?.status === "success") {
      return res.data.transfers || [];
    }
  } catch (err) {
    console.error("[Premiumize API] Transfer list failed:", err);
  }
  return [];
};
'''

code = code + new_methods

with open(r'f:\Cyberflix\src\utils\premiumize.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched premiumize.js with cache and transfer checks")
