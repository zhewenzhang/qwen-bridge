# P3: Root Directory Cleanup

## Context
The project root has 17 QWEN_*.md task files and orphaned summary files. These are task artifacts, not project source. Move them to `tasks/archive/`.

## Phase 1: Create directory and move files

```bash
cd D:\qwen-bridge
mkdir -p tasks/archive

# Move all completed task files to archive
mv QWEN_*.md tasks/archive/
mv QWEN_*_summary.md tasks/archive/ 2>/dev/null
mv QWEN_*_result.log tasks/archive/ 2>/dev/null

# Move helper/test scripts
mv fix_boxes*.mjs tasks/archive/ 2>/dev/null
mv _rewrite_*.cjs tasks/archive/ 2>/dev/null
mv _test_*.txt tasks/archive/ 2>/dev/null
mv _apply_*.cjs tasks/archive/ 2>/dev/null
mv test_*.cjs tasks/archive/ 2>/dev/null
mv test_*.js tasks/archive/ 2>/dev/null

# Keep SESSION_REPORT.md, CHANGELOG.md, README*.md in root (they're project docs)
```

## Phase 2: Update .gitignore

Add to `.gitignore`:
```
tasks/archive/_*.cjs
tasks/archive/_*.txt
tasks/archive/_*.mjs
tasks/archive/fix_*.mjs
tasks/archive/test_*.cjs
tasks/archive/test_*.js
*.log
```

## Phase 3: Update CHANGELOG.md

Add entry for this cleanup under v5.5.

## Phase 4: Commit

```bash
git add -A
git commit -m "P3: Root cleanup — archive 17 task files to tasks/archive/"
git push origin main
```
