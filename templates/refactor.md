# Task: Refactor <component/module>

## Context
<Current state. Why refactoring is needed. Target architecture.>

## Phase 1: Extract <module A>
Create `src/<module>.ts`:
```typescript
// Extracted code here
```

## Phase 2: Update imports
Update `src/index.ts` to import from new module.

## Phase N: Verify & Commit
```bash
npx tsc
verify_project
git add -A && git commit -m "refactor: <description>" && git push origin main
```

## Checklist
- [ ] No behavioral changes
- [ ] All imports updated correctly
- [ ] `npx tsc` passes
- [ ] `verify_project` passes (all 7 modules present)
- [ ] Committed and pushed
