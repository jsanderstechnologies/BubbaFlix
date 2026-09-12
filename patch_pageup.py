import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''
  useEffect(() => {
    fetchApiConfig();
    genresCall();

    const handleGlobalKeyDown = (e) => {
      // Prevent PageUp/PageDown from scrolling the view out of sync with D-pad focus
      if (e.key === "PageUp" || e.key === "PageDown" || e.keyCode === 33 || e.keyCode === 34) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown, { capture: true, passive: false });
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, { capture: true });
  }, []);
'''

code = code.replace(
'''
  useEffect(() => {
    fetchApiConfig();
    genresCall();
  }, []);
''', replacement)

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched App.jsx with PageUp/PageDown intercept")
