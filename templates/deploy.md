# Task: Deploy <version>

## Context
<What's being deployed. Version number. Release notes.>

## Phase 1: Pre-deploy checks
```bash
npx tsc
verify_project
npm test
```

## Phase 2: Build & publish
```bash
npm run build
npm publish
```

## Phase 3: Post-deploy verification
- [ ] Landing page loads: `https://zhewenzhang.github.io/AutoClaude/`
- [ ] GitHub release visible
- [ ] NPM package updated

## Checklist
- [ ] All checks passed
- [ ] Deployed successfully
- [ ] Release notes published
