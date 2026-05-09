# Task: Fix <bug description>

## Context
<What's broken. How to reproduce. Expected behavior.>

## Phase 1: Identify root cause
<Files to examine, logs to check>

## Phase 2: Apply fix
<Exact code changes with file paths>

## Phase 3: Verify
```bash
npx tsc
verify_project
```

## Phase N: Commit and Push
```bash
git add -A && git commit -m "fix: <description>" && git push origin main
```

## Checklist
- [ ] Root cause identified
- [ ] Fix applied correctly
- [ ] `npx tsc` passes
- [ ] Bug no longer reproducible
- [ ] Committed and pushed
