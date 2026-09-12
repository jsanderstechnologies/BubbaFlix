import re

with open(r'f:\Cyberflix\src\utils\dpadNavigation.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace direction assignment
old_dir_assignment = '''    let direction = null;
    if (key === "ArrowUp" || code === 38 || code === 19) direction = "ArrowUp";
    else if (key === "ArrowDown" || code === 40 || code === 20) direction = "ArrowDown";
    else if (key === "ArrowLeft" || code === 37 || code === 21) direction = "ArrowLeft";
    else if (key === "ArrowRight" || code === 39 || code === 22) direction = "ArrowRight";'''

new_dir_assignment = '''    let direction = null;
    let isPageJump = false;
    if (key === "ArrowUp" || code === 38 || code === 19) direction = "ArrowUp";
    else if (key === "ArrowDown" || code === 40 || code === 20) direction = "ArrowDown";
    else if (key === "ArrowLeft" || code === 37 || code === 21) direction = "ArrowLeft";
    else if (key === "ArrowRight" || code === 39 || code === 22) direction = "ArrowRight";
    else if (key === "PageUp" || code === 33 || code === 427) { direction = "ArrowUp"; isPageJump = true; }
    else if (key === "PageDown" || code === 34 || code === 428) { direction = "ArrowDown"; isPageJump = true; }'''

code = code.replace(old_dir_assignment, new_dir_assignment)

# Replace ArrowDown logic
old_arrow_down = '''      if (direction === "ArrowDown") {
        const minTop = Math.min(...candidates.map((el) => el.getBoundingClientRect().top));
        const rowCandidates = candidates.filter((el) => el.getBoundingClientRect().top <= minTop + 60);'''

new_arrow_down = '''      if (direction === "ArrowDown") {
        let targetTop = 0;
        if (isPageJump) {
          const targetY = r1.top + window.innerHeight * 0.8;
          const candidateDistances = candidates.map(el => Math.abs(el.getBoundingClientRect().top - targetY));
          const minTargetDiff = Math.min(...candidateDistances);
          const bestCandidate = candidates.find(el => Math.abs(el.getBoundingClientRect().top - targetY) === minTargetDiff);
          targetTop = bestCandidate ? bestCandidate.getBoundingClientRect().top : Math.min(...candidates.map((el) => el.getBoundingClientRect().top));
        } else {
          targetTop = Math.min(...candidates.map((el) => el.getBoundingClientRect().top));
        }
        const rowCandidates = candidates.filter((el) => Math.abs(el.getBoundingClientRect().top - targetTop) <= 60);'''

code = code.replace(old_arrow_down, new_arrow_down)

# Replace ArrowUp logic
old_arrow_up = '''      } else if (direction === "ArrowUp") {
        const maxBottom = Math.max(...candidates.map((el) => el.getBoundingClientRect().bottom));
        const rowCandidates = candidates.filter((el) => el.getBoundingClientRect().bottom >= maxBottom - 60);'''

new_arrow_up = '''      } else if (direction === "ArrowUp") {
        let targetBottom = 0;
        if (isPageJump) {
          const targetY = r1.bottom - window.innerHeight * 0.8;
          const candidateDistances = candidates.map(el => Math.abs(el.getBoundingClientRect().bottom - targetY));
          const minTargetDiff = Math.min(...candidateDistances);
          const bestCandidate = candidates.find(el => Math.abs(el.getBoundingClientRect().bottom - targetY) === minTargetDiff);
          targetBottom = bestCandidate ? bestCandidate.getBoundingClientRect().bottom : Math.max(...candidates.map((el) => el.getBoundingClientRect().bottom));
        } else {
          targetBottom = Math.max(...candidates.map((el) => el.getBoundingClientRect().bottom));
        }
        const rowCandidates = candidates.filter((el) => Math.abs(el.getBoundingClientRect().bottom - targetBottom) <= 60);'''

code = code.replace(old_arrow_up, new_arrow_up)

with open(r'f:\Cyberflix\src\utils\dpadNavigation.js', 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched dpadNavigation")
