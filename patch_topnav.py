import re

with open(r'f:\Cyberflix\src\components\top-nav\index.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'const { logout } = useContext(AuthContext);',
    'const { logout, user } = useContext(AuthContext);'
)

usage_button = '''
  						{user?.role === "admin" && (
  						<button
  							className={`navBtn ${isActive("/usage")}`}
  							tabIndex="0"
  							onClick={() => navigate("/usage")}
  							onKeyDown={(e) => {
  								if (e.key === "Enter" || e.keyCode === 13 || e.keyCode === 23 || e.keyCode === 66) {
  									e.preventDefault();
  									navigate("/usage");
  								}
  							}}
  						>
  							<FiInfo /> Usage
  						</button>
  						)}
'''

code = re.sub(r'(<button[^>]*className=\{`navBtn \$\{isActive\("/settings"\)\}`\})', usage_button + r'\n  						\1', code)

with open(r'f:\Cyberflix\src\components\top-nav\index.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched TopNav")
