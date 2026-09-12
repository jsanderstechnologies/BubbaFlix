import re

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.scss', 'r', encoding='utf-8') as f:
    code = f.read()

replacement = '''
		.listItem {
			text-align: center;
			color: white;
			cursor: pointer;
			transition: all 0.2s ease;
			outline: none;

			&:hover, &:focus {
				transform: scale(1.05);
				.profileImg {
					border: 3px solid var(--pink);
				}
				.name {
					color: var(--pink);
				}
			}
'''

code = code.replace('\t\t.listItem {\n\t\t\ttext-align: center;\n\t\t\tcolor: white;', replacement)

with open(r'f:\Cyberflix\src\pages\details-page\cast-section\index.scss', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched cast-section/index.scss")
