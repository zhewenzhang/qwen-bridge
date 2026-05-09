# Task: v5.7 Desktop Integration + Session Discipline

## Phase 1: Add `userPrompt()` to `src/notifications.ts`

Add this function at the end of notifications.ts:

```typescript
export function userPrompt(mode: 'input' | 'confirm' | 'alert', message: string, title?: string): string {
  const t = (title || 'AutoClaude').replace(/'/g, "''");
  const m = message.replace(/'/g, "''");
  
  if (mode === 'input') {
    // Text input dialog
    const ps = `
      Add-Type -AssemblyName Microsoft.VisualBasic
      [Microsoft.VisualBasic.Interaction]::InputBox('${m}', '${t}', '')
    `.trim();
    try {
      return execSync(`powershell -Command "${ps}"`, { timeout: 120000, encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch { return ''; }
  }
  
  if (mode === 'confirm') {
    // Yes/No dialog
    const ps = `
      Add-Type -AssemblyName System.Windows.Forms
      $r = [System.Windows.Forms.MessageBox]::Show('${m}', '${t}', [System.Windows.Forms.MessageBoxButtons]::YesNo, [System.Windows.Forms.MessageBoxIcon]::Question)
      if ($r -eq 'Yes') { Write-Output 'yes' } else { Write-Output 'no' }
    `.trim();
    try {
      return execSync(`powershell -Command "${ps}"`, { timeout: 120000, encoding: 'utf-8', stdio: 'pipe' }).trim();
    } catch { return 'no'; }
  }
  
  // Alert dialog
  const ps = `
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show('${m}', '${t}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
    Write-Output 'ok'
  `.trim();
  try {
    execSync(`powershell -Command "${ps}"`, { timeout: 30000, encoding: 'utf-8', stdio: 'pipe' });
    return 'ok';
  } catch { return 'error'; }
}
```

Note: `execSync` is already imported at the top of notifications.ts.

## Phase 2: Add `session_status` handler in `src/index.ts`

### 2a. Add session tracking helper in index.ts (after getVersion function)

```typescript
const SESSION_FILE = '.autoclaude_session.json';

function getSessionPath(): string {
  const cfg = loadConfig();
  return path.join(cfg.projectDir, SESSION_FILE);
}

interface SessionEntry {
  taskName: string;
  timestamp: string;
  claudeTokens: number;
  agentTokens: number;
  tokensSaved: number;
  costSaved: number;
}

function recordSessionTask(taskName: string, claudeTokens: number, agentTokens: number, tokensSaved: number, costSaved: number): void {
  const sp = getSessionPath();
  let entries: SessionEntry[] = [];
  try { if (fs.existsSync(sp)) entries = JSON.parse(fs.readFileSync(sp, 'utf-8')); } catch {}
  
  // Check if this task was already recorded (by taskName)
  if (!entries.some(e => e.taskName === taskName)) {
    entries.push({ taskName, timestamp: new Date().toISOString(), claudeTokens, agentTokens, tokensSaved, costSaved });
    fs.writeFileSync(sp, JSON.stringify(entries, null, 2), 'utf-8');
  }
}

function getSessionStatus(): string {
  const sp = getSessionPath();
  let entries: SessionEntry[] = [];
  try { if (fs.existsSync(sp)) entries = JSON.parse(fs.readFileSync(sp, 'utf-8')); } catch {}
  
  const totalClaude = entries.reduce((s, e) => s + e.claudeTokens, 0);
  const totalAgent = entries.reduce((s, e) => s + e.agentTokens, 0);
  const totalSaved = entries.reduce((s, e) => s + e.tokensSaved, 0);
  const totalCost = entries.reduce((s, e) => s + e.costSaved, 0);
  const firstTime = entries.length > 0 ? entries[0].timestamp : new Date().toISOString();
  
  return [
    '── Session Status ──',
    '',
    'Tasks : ' + entries.length,
    'Tokens: Claude ~' + totalClaude.toLocaleString() + ' | Agent ~' + totalAgent.toLocaleString(),
    'Saved : ~' + totalSaved.toLocaleString() + ' tokens ($' + totalCost.toFixed(2) + ')',
    'Start : ' + new Date(firstTime).toLocaleString(),
    '',
    entries.length > 0 
      ? 'Last: ' + entries[entries.length - 1].taskName.replace(/^QWEN_/, '').replace(/_/g, ' ').substring(0, 40)
      : 'No tasks yet.',
  ].join('\n');
}
```

### 2b. Add the handler in the CallTool switch

```typescript
    if (toolName === 'session_status') {
      return { content: [{ type: 'text' as const, text: getSessionStatus() }] };
    }
```

### 2c. Add auto-recording to `get_task_report` finalize

In `get_task_report`, after the `finalizeTaskSummary` call and after `updateProjectReport()`, add:

```typescript
      // Record to session tracking
      try {
        const s = loadSavings().find((e: any) => e.taskName === path.basename(taskPath, '.md'));
        if (s) {
          recordSessionTask(s.taskName, s.claudeTokensIn + s.claudeTokensOut, s.estimatedExecutionTokensIn + s.estimatedExecutionTokensOut, s.tokensSaved, s.costSaved);
        }
      } catch {}
```

Need to import `loadSavings` from './reports.js' (already imported).

## Phase 3: Add `user_prompt` handler in `src/index.ts`

```typescript
    if (toolName === 'user_prompt') {
      const { mode, message, title } = args as { mode?: string; message: string; title?: string };
      const m = mode || 'alert';
      if (!['input', 'confirm', 'alert'].includes(m)) return { content: [{ type: 'text' as const, text: '❌ Invalid mode. Use: input, confirm, or alert.' }], isError: true };
      try {
        const result = userPrompt(m as 'input' | 'confirm' | 'alert', message, title);
        if (m === 'confirm') return { content: [{ type: 'text' as const, text: result === 'yes' ? '✅ User confirmed.' : '❌ User declined.' }] };
        if (m === 'input') return { content: [{ type: 'text' as const, text: result ? '📝 Input received: "' + result + '"' : '⚠️ No input provided (cancelled).' }] };
        return { content: [{ type: 'text' as const, text: '✅ Alert shown.' }] };
      } catch (e: any) {
        return { content: [{ type: 'text' as const, text: '❌ Popup failed: ' + (e.message || '') }], isError: true };
      }
    }
```

Import `userPrompt` from './notifications.js'.

## Phase 4: Add tool definitions in `src/tools.ts`

```typescript
    {
      name: 'user_prompt',
      description: 'Show a desktop popup dialog to the user. Mode: "input" (text input box for OTP codes etc), "confirm" (Yes/No dialog), "alert" (info message). Use this when the agent needs user input like auth codes or confirmations.',
      inputSchema: { type: 'object' as const, properties: { mode: { type: 'string', description: 'input, confirm, or alert' }, message: { type: 'string', description: 'Message to show' }, title: { type: 'string', description: 'Dialog title (optional)' } }, required: ['message'] },
    },
    {
      name: 'session_status',
      description: 'Show current session statistics: tasks dispatched, Claude vs Agent tokens, savings, and time elapsed. Use after each task to report progress to the user.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
```

## Phase 5: Update CLAUDE.md — Add MANDATORY Closeout Rule

After "Pre-flight Protocol" section, add:

```markdown
### MANDATORY Task Closeout (after EVERY task)

After each task completes, Claude MUST execute this exact sequence:

```
1. get_task_report("QWEN_TASK.md")   → auto-finalize + record to session
2. session_status                     → get updated counters
3. Tell the user:
   "✅ <task name> complete
   Claude ~X,XXX tokens | Agent ~XX,XXX tokens | Saved ~XX,XXX ($X.XX)
   Session: N tasks | ~XXX,XXX tokens saved | $X.XX total"
```

**This is MANDATORY. Do NOT skip this for any task.** The user must see the cost breakdown after every dispatch.

### Desktop Popup Use Cases

When user input is needed, use `user_prompt` instead of asking via text:

| Scenario | Tool Call |
|----------|-----------|
| Need OTP/2FA code | `user_prompt("input", "Enter your 6-digit verification code", "NPM 2FA")` |
| Confirm risky action | `user_prompt("confirm", "Publish autoclaude@5.7.0 to NPM?", "Confirm Publish")` |
| Task complete alert | `user_prompt("alert", "Task completed: 3 files changed, ~18K tokens saved", "AutoClaude")` |
```

## Phase 6: Rebuild, Commit

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "v5.7: Desktop popup (user_prompt) + session_status + mandatory closeout + auto session tracking"
git push origin main
```

## RULES
- Edit files directly. No helper scripts.
- Run `npx tsc`. Fix any errors before committing.
- Do NOT create .cjs/.mjs/.py files.
