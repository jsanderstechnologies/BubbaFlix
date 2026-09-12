import re

with open(r'f:\Cyberflix\src\App.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add import
code = code.replace('import BackgroundRotator from "./components/background-rotator";', 'import BackgroundRotator from "./components/background-rotator";\nimport GlobalSearchListener from "./components/global-search-listener";')

# Inject component
old_app = '''    return (
      <BrowserRouter>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <TvInstallPrompt />'''

new_app = '''    return (
      <BrowserRouter>
        <GlobalSearchListener />
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
        <TvInstallPrompt />'''

code = code.replace(old_app, new_app)

with open(r'f:\Cyberflix\src\App.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Injected GlobalSearchListener into App.jsx")
