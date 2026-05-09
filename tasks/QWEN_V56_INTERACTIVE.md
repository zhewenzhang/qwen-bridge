# Task: v5.6 Interactive Task Sessions — task_preflight + task_continue

## Phase 1: Add `task_preflight` handler in `src/index.ts`

Add this handler before the unknown-tool return. Import `execSync` if needed:

```typescript
    if (toolName === 'task_preflight') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      const content = fs.readFileSync(taskPath, 'utf-8');
      const results: string[] = ['── Pre-flight Check ──', ''];
      let issues = 0;

      // Check agent
      const agent = getActiveAgent(config);
      const { found, version_info } = (() => { try { return checkAgentInstalled(config, config.activeAgent); } catch { return { found: false, path_info: '', version_info: '' }; } })();
      if (found) {
        results.push('✅ Agent: ' + (agent.label || agent.name) + ' (' + (version_info || 'installed') + ')');
        const auth = verifyAgentAuth(config, config.activeAgent);
        if (auth.success) { results.push('✅ Auth: ' + (agent.label || agent.name) + ' authenticated'); }
        else { results.push('⚠️ Auth: ' + (agent.label || agent.name) + ' needs authentication — run `' + agent.command + ' auth`'); issues++; }
      } else { results.push('❌ Agent: ' + (agent.label || agent.name) + ' not found — install: ' + (agent.installHint || '?')); issues++; }

      // Check git config (if task mentions git)
      if (content.match(/git (commit|push|add)/i)) {
        try { const name = execSync('git config user.name', { encoding: 'utf-8', stdio: 'pipe' }).trim(); results.push('✅ Git: user.name=' + name); } catch { results.push('⚠️ Git: user.name not set — run `git config --global user.name "Your Name"`'); issues++; }
        try { const email = execSync('git config user.email', { encoding: 'utf-8', stdio: 'pipe' }).trim(); results.push('✅ Git: user.email=' + email); } catch { results.push('⚠️ Git: user.email not set'); issues++; }
      }

      // Check gh auth (if task mentions gh or github)
      if (content.match(/\bgh\b|github.*push|gh repo|gh release/i)) {
        try { execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' }); results.push('✅ GitHub CLI: authenticated'); } catch { results.push('⚠️ GitHub CLI: not authenticated — run `gh auth login`'); issues++; }
      }

      // Check npm auth (if task mentions npm publish)
      if (content.match(/npm publish|npm.*registry/i)) {
        try { const u = execSync('npm whoami', { encoding: 'utf-8', stdio: 'pipe' }).trim(); results.push('✅ NPM: logged in as ' + u); } catch { results.push('⚠️ NPM: not logged in — run `npm login`'); issues++; }
      }

      results.push('');
      if (issues === 0) results.push('✅ All checks passed. Ready to dispatch.');
      else results.push('⚠️ ' + issues + ' issue(s) to resolve before dispatch.\n\nResolve the issues above, then tell me "ready" and I will dispatch.');

      return { content: [{ type: 'text' as const, text: results.join('\n') }] };
    }
```

## Phase 2: Add `task_continue` handler in `src/index.ts`

```typescript
    if (toolName === 'task_continue') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      const content = fs.readFileSync(taskPath, 'utf-8');
      const resultLog = taskPath.replace(/\.md$/, '_result.log');
      let completedSteps: string[] = [];
      if (fs.existsSync(resultLog)) {
        const log = fs.readFileSync(resultLog, 'utf-8');
        const doneMatches = log.match(/✅|DONE|COMPLETE|completed|success/gi);
        if (doneMatches) completedSteps = doneMatches;
      }

      const phases = content.split(/## Phase \d+/i);
      const remainingPhases = phases.length > 1 ? phases.slice(-2).join('\n') : content;

      const v2Path = taskPath.replace(/\.md$/, '_v2.md');
      const v2Content = [
        '# Task: Continue — ' + path.basename(taskPath, '.md'),
        '',
        '## Context',
        'Continuation of `' + path.basename(taskPath) + '`. Previous attempts completed: ' + (completedSteps.length > 0 ? completedSteps.length + ' steps done' : 'unknown'),
        '',
        '## Remaining Work',
        remainingPhases.substring(0, 3000),
        '',
        '## Instructions',
        'Pick up where the previous execution left off. Only do the REMAINING work — do not redo completed steps.',
        '',
        '## Checklist',
        '- [ ] Remaining steps completed',
        '- [ ] `npx tsc` passes (if applicable)',
        '- [ ] Committed and pushed (if applicable)',
      ].join('\n');
      fs.writeFileSync(v2Path, v2Content, 'utf-8');

      return { content: [{ type: 'text' as const, text: '── Continuation Task Created ──\n\nOriginal: ' + path.basename(taskPath) + '\nContinue: ' + path.basename(v2Path) + '\n\nDispatch with: dispatch_task("' + path.basename(v2Path) + '")' }] };
    }
```

## Phase 3: Add tool definitions in `src/tools.ts`

Add these two entries to the tools array:

```typescript
    {
      name: 'task_preflight',
      description: 'Run pre-flight checks BEFORE dispatching a task. Checks agent auth, git config, GitHub CLI, NPM login based on task content. Fix all issues before dispatch.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the task file to check.' } }, required: ['task_file'] },
    },
    {
      name: 'task_continue',
      description: 'Create a continuation task (_v2.md) for a task that was blocked. Reads the original task and result log, creates a focused mini-task with only the remaining steps.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the original task file.' } }, required: ['task_file'] },
    },
```

## Phase 4: Update CLAUDE.md — Add Pre-flight Protocol

After "Auth Forwarding Protocol" section, add:

```markdown
### Pre-flight Protocol (MANDATORY before every dispatch)

Claude MUST run `task_preflight("QWEN_TASK.md")` before EVERY dispatch. Never dispatch with known issues.

**If all green:** Dispatch immediately.
**If issues found:** Tell user what to fix, wait for "ready" confirmation, re-run preflight, then dispatch.

**User interaction examples:**

```
Claude: "Before I dispatch, let me check prerequisites..."
  → task_preflight → "⚠️ NPM not logged in"

Claude: "This task publishes to NPM. Please run `npm login` first."

User: "done"

Claude: → task_preflight → all green → dispatch ✅
```

```
Claude: "Before I dispatch..."

User: "just do it"

Claude: → task_preflight → "⚠️ Git user.name not set"

Claude: "I can't dispatch until git is configured. Run: 
        git config --global user.name 'Your Name'
        git config --global user.email 'your@email.com'
        Then tell me 'ready'."
```
```

## Phase 5: Rebuild, Commit

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "v5.6: Interactive task sessions — task_preflight + task_continue + pre-flight protocol"
git push origin main
```

## RULES
- Edit files directly. No helper scripts.
- Run `npx tsc` after all edits.
- Fix any compilation errors before committing.
