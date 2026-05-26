# Claude Code Operating Manual — Sales Quest
# Print this. Pin it. Run it every time.

---

## THE SESSION START RITUAL (non-negotiable, 60 seconds)

Paste this VERBATIM as your first message every single session:

```
Before anything else:
1. Read CLAUDE.md fully
2. Read SOLVED.md fully  
3. Read SESSION.md fully
4. Run: cd /Users/arturogodoy/Documents/sales-quest-app && bunx tsc --noEmit
5. Report: current tsc status + what SESSION.md says the next task is

Do not write any code yet.
```

---

## THE SESSION END RITUAL (non-negotiable, 2 minutes)

Paste this as your LAST message every session:

```
Before we close:
1. Run bunx tsc --noEmit and report status
2. If passing, run: git add -A && git commit -m "feat: [describe what was done]"
3. Update SESSION.md with:
   - What was completed today
   - What is broken or in progress
   - What NOT to touch next session
   - The single next task
4. If any new bugs were solved today, add them to SOLVED.md
```

---

## PROMPT TEMPLATES THAT ACTUALLY WORK

### Starting a new feature
```
Task: [one sentence description]
File(s) to touch: [specific paths only]
Do NOT touch: [anything else]
First: grep SOLVED.md for keywords: [relevant keywords]
Then: read the target file before writing anything
```

### Debugging a regression
```
Regression: [describe what broke]
It was working at commit: [commit hash or tag]
grep SOLVED.md for: [keywords related to the bug]
Do NOT attempt a fix until you've shown me what SOLVED.md says about this
```

### Small isolated change
```
Single change only: [describe exactly]
File: [exact path]
Do not refactor anything else
Run tsc after and show me the output
```

### Check before you wreck
```
Before touching [file/system]:
- grep SOLVED.md for [keyword]
- Show me the current content of [file]
- Tell me what you plan to change and why
- Wait for my confirmation before editing
```

---

## THE /compact RULE

Use /compact when:
- You've been in a session 30+ minutes
- Claude starts giving vague answers
- You feel like it's forgetting earlier context

After /compact, immediately re-run the Session Start Ritual grep commands.
Context compression wipes the working memory — reload it.

---

## THE ONE-TASK RULE

Claude Code works one task at a time.
If it starts touching files you didn't mention — STOP IT IMMEDIATELY.

```
Stop. You're touching [file] which wasn't part of this task.
Revert that change and stay focused on [original task] only.
```

---

## THE TSC GATE

This is the only quality check that matters before any commit:

```
cd /Users/arturogodoy/Documents/sales-quest-app && bunx tsc --noEmit
```

- Errors = do not commit, do not move on
- Clean = commit immediately, then start next task
- Never accumulate tsc debt across sessions

---

## GREP CHEAT SHEET

```bash
# Load hard rules
grep -n "NEVER\|ALWAYS" CLAUDE.md

# Check if a bug was already solved
grep -i "keyword" SOLVED.md

# Find where something lives
grep -rn "functionName\|componentName" src/ --include="*.ts" --include="*.tsx"

# Find all env variable usage
grep -rn "process.env\|import.meta.env" src/

# Find all auth-related files
grep -rn "supabase\|clerk\|auth" src/ --include="*.ts" --include="*.tsx" -l

# Find all date handling
grep -rn "new Date\|toUserTz" src/ --include="*.ts" --include="*.tsx"
```
