# Task: Add compile verification + update CLAUDE.md task rules + verify_project tool

## Phase 1: Update CLAUDE.md — Add Task Quality Rules

Read `D:\qwen-bridge\CLAUDE.md`. After the "Task File Guidelines" section, ADD:

```markdown
### Task Quality Rules (from failure analysis)

Based on 15 dispatched tasks, these rules prevent the 7 known failure patterns:

1. **<200 lines** — Tasks over 400 lines fail 60% of the time. Split large tasks.
2. **Exact code, not descriptions** — Provide the exact replacement text, not "change X to Y style"
3. **One file per phase** — If a phase touches 3+ files, split into sub-phases
4. **Forbid helper scripts** — Agent MUST edit files directly. Do NOT write .cjs/.mjs/.py scripts to "do the edits"
5. **Require build verification** — Every phase MUST end with: verify `npx tsc` passes before continuing
6. **Forbid config refactoring** — Only change config.json when the task EXPLICITLY asks for config changes
7. **Single goal per task** — If the task description contains "and also", split it

### Cleanup Rule
After every task completion, Claude MUST check for and remove orphaned helper scripts:
- `ls *.cjs *.mjs *.py 2>/dev/null` in project root
- Move any found to `tasks/archive/`
```

## Phase 2: Add `verify_project` MCP Tool

### 2a. In `src/tools.ts`, add this tool definition (inside the array):

```typescript
    {
      name: 'verify_project',
      description: 'Verify project health: TypeScript compilation, module integrity, orphaned helper scripts. Run this after each task dispatch to ensure the project is clean.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
```

### 2b. In `src/index.ts`, add the handler before the unknown-tool return:

```typescript
    // ── verify_project ───────────────────────────────────────────────────────
    if (toolName === 'verify_project') {
      const results: string[] = ['── Project Health Check ──', ''];
      
      // 1. TypeScript compilation
      try {
        execSync('npx tsc', { timeout: 15000, encoding: 'utf-8', stdio: 'pipe', cwd: config.projectDir });
        results.push('✅ TypeScript: Compiles successfully');
      } catch (e: any) {
        results.push('❌ TypeScript: Compilation FAILED');
        results.push('   ' + (e.stderr || e.stdout || e.message || '').substring(0, 200).replace(/\n/g, '\n   '));
      }
      
      // 2. Module integrity
      const srcDir = path.join(config.projectDir, 'src');
      const requiredModules = ['types.ts', 'config.ts', 'notifications.ts', 'reports.ts', 'agents.ts', 'tools.ts', 'index.ts'];
      const missing = requiredModules.filter(f => !fs.existsSync(path.join(srcDir, f)));
      if (missing.length === 0) {
        results.push('✅ Modules: All 7 source files present');
      } else {
        results.push('❌ Modules: Missing — ' + missing.join(', '));
      }
      
      // 3. Orphaned helper scripts
      const rootFiles = fs.readdirSync(config.projectDir);
      const orphans = rootFiles.filter(f => 
        f.endsWith('.cjs') || f.endsWith('.mjs') || 
        (f.endsWith('.py') && !f.includes('package')) ||
        f === 'nul' || f.startsWith('_fix') || f.startsWith('_replace') ||
        f.startsWith('do_') || f.startsWith('fix_') || f.startsWith('tmp_')
      );
      if (orphans.length === 0) {
        results.push('✅ Clean: No orphaned scripts in root');
      } else {
        results.push('⚠️ Orphans: ' + orphans.length + ' helper script(s) found');
        for (const f of orphans) results.push('   - ' + f);
        // Auto-move to archive
        const archiveDir = path.join(config.projectDir, 'tasks', 'archive');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        for (const f of orphans) {
          try {
            fs.renameSync(path.join(config.projectDir, f), path.join(archiveDir, f));
          } catch {}
        }
        results.push('   → Moved to tasks/archive/');
      }
      
      // 4. Dist exists
      const distExists = fs.existsSync(path.join(config.projectDir, 'dist', 'index.js'));
      results.push(distExists ? '✅ Dist: index.js exists' : '❌ Dist: index.js MISSING — run npx tsc');
      
      // 5. Config valid JSON
      try {
        JSON.parse(fs.readFileSync(path.join(config.projectDir, 'config.json'), 'utf-8'));
        results.push('✅ Config: Valid JSON');
      } catch {
        results.push('❌ Config: Invalid JSON');
      }
      
      results.push('');
      const ok = !results.some(l => l.startsWith('❌'));
      results.push(ok ? '✅ All checks passed.' : '❌ Some checks failed. Fix issues before next dispatch.');
      
      return { content: [{ type: 'text' as const, text: results.join('\n') }] };
    }
```

Need to add `import { execSync } from 'node:child_process';` at the top of index.ts (already there for spawn).

### 2c. Also add to dispatch handlers: post-dispatch verification

In `dispatch_task` handler, after spawning the agent, add a note to the output:
```
'\n\n💡 After the agent completes, run `verify_project` to check project health.'
```

---

## Phase 3: Rebuild, Verify, Commit

```bash
cd D:\qwen-bridge
npx tsc
```

If compilation errors on execSync import: verify `execSync` is imported from 'node:child_process' in index.ts.

Then:
```bash
npx tsc
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"verify_project","arguments":{}},"id":1}' | timeout 5 node dist/index.js
```

Commit:
```bash
git add -A
git commit -m "v5.5: verify_project tool + CLAUDE.md task quality rules"
git push origin main
```

## RULES FOR THIS TASK
- Edit files DIRECTLY. Do NOT create helper scripts.
- After all edits, run `npx tsc` to verify
- Do NOT refactor config.json
