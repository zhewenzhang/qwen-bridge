# Task: Auth Forwarding — Relay Agent Auth Prompts to Claude

## Context
When Qwen Code hits an auth wall (401, login needed, API key), the user doesn't know. Claude doesn't know. The agent just hangs or fails silently. Need a system that scans result logs for auth patterns and surfaces them.

## Phase 1: Add Auth Detection Function to `src/reports.ts`

Add to the END of `src/reports.ts` (before the last line):

```typescript
const AUTH_PATTERNS: { pattern: RegExp; label: string; fix: string }[] = [
  { pattern: /401|unauthorized|E401/i, label: 'Authentication Required (401)', fix: 'Login with: `{command} login` or `{command} auth`' },
  { pattern: /403|forbidden|access denied/i, label: 'Access Denied (403)', fix: 'Check your subscription plan or API key permissions' },
  { pattern: /429|rate limit|quota exceeded/i, label: 'Rate Limit Hit (429)', fix: 'Wait a few minutes and retry, or upgrade your plan' },
  { pattern: /npm.*login|npm login|npm whoami.*401/i, label: 'NPM Login Required', fix: 'Run: `npm login` in your terminal' },
  { pattern: /gh auth|github.*login|GH_TOKEN/i, label: 'GitHub Auth Required', fix: 'Run: `gh auth login` in your terminal' },
  { pattern: /api key|apikey|API key|set.*key/i, label: 'API Key Required', fix: 'Set your API key: `{command} auth` or environment variable' },
  { pattern: /not found|not recognized|ENOENT|not installed/i, label: 'Command Not Found', fix: 'Install: `{installHint}`' },
  { pattern: /permission denied|EACCES|not allowed/i, label: 'Permission Denied', fix: 'Check file/folder permissions or run as administrator' },
  { pattern: /timeout|timed ?out|ETIMEDOUT/i, label: 'Connection Timeout', fix: 'Check your network connection or proxy settings' },
  { pattern: /trust|untrusted|not trusted/i, label: 'Folder Trust Required', fix: 'Run: `{command} trust` or configure trust settings' },
];

export interface AuthIssue {
  label: string;
  fix: string;
  matchedText: string;
}

export function scanForAuthIssues(resultLogPath: string, agentCommand?: string, installHint?: string): AuthIssue[] {
  const issues: AuthIssue[] = [];
  try {
    const fs = require('node:fs');
    if (!fs.existsSync(resultLogPath)) return issues;
    const content = fs.readFileSync(resultLogPath, 'utf-8');
    if (!content || content.length < 5) return issues; // Still running or empty
    
    for (const ap of AUTH_PATTERNS) {
      const match = content.match(ap.pattern);
      if (match) {
        let fix = ap.fix
          .replace('{command}', agentCommand || '<agent>')
          .replace('{installHint}', installHint || 'the tool documentation');
        issues.push({ label: ap.label, fix, matchedText: match[0] });
      }
    }
  } catch {}
  return issues;
}
```

## Phase 2: Add `check_task_status` MCP Tool

### 2a. In `src/tools.ts`, add tool definition:

```typescript
    {
      name: 'check_task_status',
      description: 'Check if a dispatched task needs user intervention (auth, login, permissions, rate limits). Scans the result log for common auth/error patterns. Use this after dispatch to see if the agent needs help.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the task file.' } }, required: ['task_file'] },
    },
```

### 2b. In `src/index.ts`, add handler before the unknown-tool return:

Import `scanForAuthIssues` from './reports.js' at the top.

```typescript
    if (toolName === 'check_task_status') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      const resultLog = taskPath.replace(/\.md$/, '_result.log');
      if (!fs.existsSync(resultLog)) return { content: [{ type: 'text' as const, text: '⏳ Task still starting — no result log yet.' }] };
      const content = fs.readFileSync(resultLog, 'utf-8');
      if (!content || content.length < 10) return { content: [{ type: 'text' as const, text: '⏳ Task running — result log is still empty. Check again in 30s.' }] };
      
      const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
      const isComplete = fs.existsSync(summaryPath) && fs.readFileSync(summaryPath, 'utf-8').includes('Completion Status');
      
      const agent = getActiveAgent(config);
      const issues = scanForAuthIssues(resultLog, agent.command, agent.installHint);
      
      if (issues.length > 0) {
        const lines = ['🔐 **Action Required — Auth/Error Detected**', ''];
        for (const iss of issues) {
          lines.push(`### ${iss.label}`);
          lines.push(`**Fix:** ${iss.fix}`);
          lines.push(`*Matched:* \`${iss.matchedText}\``);
          lines.push('');
        }
        lines.push('⚠️ The agent cannot continue until this is resolved.');
        lines.push('After fixing, re-dispatch the task or call `verify_agent_auth` to confirm readiness.');
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }
      
      if (isComplete) {
        return { content: [{ type: 'text' as const, text: '✅ Task completed. Use `get_task_report("' + path.basename(taskPath) + '")` to see the full report.' }] };
      }
      
      return { content: [{ type: 'text' as const, text: '⏳ Task running — no issues detected. Last output preview:\n\n```\n' + content.substring(Math.max(0, content.length - 500)).trim() + '\n```' }] };
    }
```

## Phase 3: Update CLAUDE.md — Auth Forwarding Workflow

In `D:\qwen-bridge\CLAUDE.md`, add after the "Superpowers Skills Integration" section:

```markdown
### Auth Forwarding Protocol

When a dispatched agent encounters authentication errors, Claude MUST follow this protocol:

1. **Check status after dispatch** — Call `check_task_status("QWEN_TASK.md")` 30-60s after dispatching
2. **If auth detected** — `check_task_status` returns 🔐 with the specific issue and fix instructions
3. **Notify user** — Claude MUST immediately tell the user:
   ```
   ⚠️ <Agent> needs your attention:
   
   Issue: <auth label>
   Fix: <specific command to run>
   
   Please run this command, then I'll re-dispatch the task.
   ```
4. **Wait for user** — Do NOT re-dispatch until the user confirms the fix
5. **Verify fix** — Call `verify_agent_auth("<agent_id>")` after user fixes
6. **Re-dispatch** — Only after verification passes

### Common auth scenarios and fixes:

| Agent | Auth Issue | User Action |
|-------|-----------|-------------|
| NPM | `npm login` needed | User runs `npm login` in terminal |
| GitHub | `gh auth login` needed | User runs `gh auth login` |
| Gemini CLI | Folder not trusted | User runs `gemini trust` |
| Qwen Code | API key not set | User runs `qwen auth` |
| Any agent | 401/403 error | User checks subscription/API key |
```

## Phase 4: Rebuild, Verify, Commit

```bash
cd D:\qwen-bridge
npx tsc
```

If compilation errors on the `require('node:fs')` inside `scanForAuthIssues`: change to use `fs` and `path` imports already present at the top of reports.ts.

Test:
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"check_task_status","arguments":{"task_file":"tasks/archive/QWEN_GITHUB_SETUP.md"}},"id":1}' | timeout 5 node dist/index.js
```

Commit:
```bash
git add -A
git commit -m "feat: Auth forwarding — check_task_status + scanForAuthIssues + CLAUDE.md protocol"
git push origin main
```
