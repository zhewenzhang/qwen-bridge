# Task: Refactor <component/module>

## Context
<Current state. Why refactoring is needed. Target architecture.>

## Phase 1: Extract <module A>
<Files to create, exact code>

## Phase 2: Extract <module B>

## Phase N: Verify & Commit
```bash
npx tsc
verify_project
git add -A && git commit -m "refactor: <description>"
```

## Checklist
- [ ] No behavioral changes
- [ ] All imports updated
- [ ] Compilation passes
- [ ] verify_project passes
