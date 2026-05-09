# Task: Beautify All Bridge Output — Terminal UX Polish

## Overview
Redesign every user-facing output from the bridge. Use Unicode box-drawing characters, emoji icons, structured tables, and color-coded formatting. Fix the `Label: undefined` bug.

---

## Phase 1: Fix `Label: undefined` Bug

### Root cause
`config.json` agents use `"name"` field, but `dist/index.js` reads `agent.label`. The `loadConfig` function doesn't map `name` to `label`.

### Fix in `src/index.ts`

In the `loadConfig` function, after merging agents, ensure every agent has a `label` field:

```typescript
// Ensure every agent has a label (fallback to name)
for (const [id, agent] of Object.entries(agents)) {
  if (!agent.label) agent.label = agent.name || id;
}
```

Also update the `saveConfig` function to NOT save the `label` field (it's derived from `name`).

---

## Phase 2: Beautify `qwen_bridge_status` Output

Replace the current plain-text status handler output with a boxed, emoji-rich format:

```typescript
  if (request.params.name === 'qwen_bridge_status') {
    const cum = getCumulativeSavings();
    const agent = getActiveAgent(config);
    const enabledCount = Object.values(config.agents).filter(a => a.enabled).length;
    const totalCount = Object.keys(config.agents).length;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '┌─────────────────────────────────────────────────────┐',
          '│              AutoClaude v5.1 — Status               │',
          '├─────────────────────────────────────────────────────┤',
          `│  Active Agent : ${agent.name.padEnd(35)} │`,
          `│  Command      : ${agent.command.padEnd(35)} │`,
          `│  YOLO Mode    : ${(agent.yoloMode ? '✅ ON' : '❌ OFF').padEnd(35)} │`,
          `│  Terminal     : ${(config.showTerminal ? 'visible' : 'headless background').padEnd(35)} │`,
          '├─────────────────────────────────────────────────────┤',
          `│  Agents       : ${String(enabledCount).padEnd(3)} enabled / ${String(totalCount).padEnd(3)} total              │`,
          `│  Project Dir  : ${(config.projectDir || '').substring(0, 35).padEnd(35)} │`,
          '├─────────────────────────────────────────────────────┤',
          `│  💰 Savings  : ${String(cum.tasks).padEnd(4)} tasks · ${cum.tokensSaved.toLocaleString().padEnd(10)} tokens · $${cum.costSaved.toFixed(2).padEnd(8)} │`,
          '└─────────────────────────────────────────────────────┘',
          '',
          'Tools: dispatch_task · dispatch_to_qwen · dispatch_to_cursor',
          '       list_agents · switch_agent · add_custom_agent',
          '       get_task_report · get_savings_report · status',
        ].join('\n'),
      }],
    };
  }
```

---

## Phase 3: Beautify `list_agents` Output

Replace the current list_agents output with a clean table format:

```typescript
  if (request.params.name === 'list_agents') {
    const lines = [
      '┌──────────────────────────────────────────────────────────────────────────┐',
      '│                         Configured Agents                               │',
      '├──────────────────────────────────────────────────────────────────────────┤',
    ];
    
    for (const [id, agent] of Object.entries(config.agents)) {
      const active = id === config.activeAgent ? '⭐' : ' ';
      const yolo = agent.yoloMode ? '✅' : '❌';
      const typeIcon = agent.type === 'clipboard' ? '📋' : '🖥️';
      const name = (agent.label || agent.name || id).padEnd(18);
      const cmd = agent.command.padEnd(12);
      const type = agent.type.padEnd(4);
      const hint = agent.enabled ? '' : ' (disabled)';
      lines.push(`│ ${active} ${name} ${typeIcon} ${type} YOLO:${yolo}  ${cmd}${hint.padEnd(20)} │`);
    }
    
    lines.push('├──────────────────────────────────────────────────────────────────────────┤');
    const active = config.agents[config.activeAgent];
    lines.push(`│  ⭐ Active: ${(active?.label || active?.name || config.activeAgent)} — dispatch_task will use this agent`);
    lines.push('└──────────────────────────────────────────────────────────────────────────┘');
    lines.push('');
    lines.push('Switch: switch_agent("<id>")  |  Add custom: add_custom_agent(...)');

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  }
```

---

## Phase 4: Beautify `switch_agent` Output

```typescript
    return {
      content: [{
        type: 'text' as const,
        text: [
          '┌──────────────────────────────────────────┐',
          '│         Agent Switched                    │',
          '├──────────────────────────────────────────┤',
          `│  From : ${(oldName || oldAgent).padEnd(32)} │`,
          `│  To   : ${(newAgent.label || newAgent.name).padEnd(32)} │`,
          `│  Cmd  : ${newAgent.command.padEnd(32)} │`,
          `│  YOLO : ${(newAgent.yoloMode ? '✅ ON' : '❌ OFF').padEnd(32)} │`,
          '└──────────────────────────────────────────┘',
          '',
          '✅ All dispatch_task calls will now use this agent.',
        ].join('\n'),
      }],
    };
```

(Need to capture `oldAgent` name before switching: `const oldName = config.agents[oldAgent]?.label || config.agents[oldAgent]?.name || oldAgent;`)

---

## Phase 5: Beautify `dispatch_task` Response

```typescript
    // CLI agent dispatch response:
    return {
      content: [{
        type: 'text' as const,
        text: [
          '┌──────────────────────────────────────────────────┐',
          '│           Task Dispatched                        │',
          '├──────────────────────────────────────────────────┤',
          `│  Agent   : ${agent.label || agent.name}`.padEnd(50) + ' │',
          `│  File    : ${path.basename(taskPath)}`.padEnd(50) + ' │',
          `│  Mode    : ${config.showTerminal ? 'Visible Terminal' : 'Headless Background'}`.padEnd(50) + ' │',
          `│  YOLO    : ${agent.yoloMode ? '✅ Auto-Approve ON' : '⚠️ Manual Confirm'}`.padEnd(50) + ' │',
          '├──────────────────────────────────────────────────┤',
          `│  📄 Result : ${path.basename(resultLog)}`.padEnd(50) + ' │',
          `│  📋 Report : ${path.basename(summaryPath)}`.padEnd(50) + ' │',
          '└──────────────────────────────────────────────────┘',
          '',
          '🚀 Agent executing in background. Check _summary.md when done.',
        ].join('\n'),
      }],
    };
```

Also beautify `dispatch_to_qwen` and `dispatch_to_cursor` responses with the same style.

---

## Phase 6: Beautify `get_savings_report` Output

```typescript
    const lines = [
      '┌──────────────────────────────────────────────────┐',
      '│            💰 Savings Report                     │',
      '├──────────────────────────────────────────────────┤',
      `│  Tasks     : ${String(cum.tasks).padStart(5)}                              │`,
      `│  Tokens    : ${cum.tokensSaved.toLocaleString().padStart(10)} saved                   │`,
      `│  Cost      : $${cum.costSaved.toFixed(2).padStart(8)} saved                   │`,
      '├──────────────────────────────────────────────────┤',
    ];
    
    if (last5.length > 0) {
      lines.push('│  Recent Tasks:                                   │');
      for (const s of last5.slice(0, 5)) {
        const shortName = s.taskName.substring(0, 25).padEnd(25);
        lines.push(`│  📋 ${shortName} ${s.tokensSaved.toLocaleString().padStart(8)} tk  $${s.costSaved.toFixed(2).padStart(6)}  │`);
      }
    }
    
    lines.push('└──────────────────────────────────────────────────┘');
    if (cum.tasks > 0) {
      lines.push('');
      lines.push(`💡 Average: ~${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($${(cum.costSaved / cum.tasks).toFixed(3)}) saved per task`);
    }
```

---

## Phase 7: Beautify `get_task_report` Auto-Finalize Message

When the task is still running, show:

```typescript
    text: [
      '┌──────────────────────────────────────────────────┐',
      '│            📋 Task Report                        │',
      '├──────────────────────────────────────────────────┤',
      `│  Task  : ${path.basename(taskPath)}`.padEnd(50) + ' │',
      `│  Status: ⏳ Still running...                     │',
      '├──────────────────────────────────────────────────┤',
      `│  📄 Raw log: ${path.basename(resultLog)} exists  │`,
      '│  💡 The report will auto-finalize when output    │',
      '│     is detected in the result log.              │',
      '└──────────────────────────────────────────────────┘',
    ].join('\n'),
```

---

## Phase 8: Beautify the Terminal Banner (.ps1 for showTerminal mode)

Update the `.ps1` script banner in `runCliAgent` terminal mode to use better box characters:

```typescript
    const ps1Lines = [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '╔══════════════════════════════════════════════╗' -ForegroundColor Cyan`,
      `Write-Host '║        AutoClaude — Task Dispatched          ║' -ForegroundColor Cyan`,
      `Write-Host '╠══════════════════════════════════════════════╣' -ForegroundColor Cyan`,
      `Write-Host '║  Agent : ${agent.label || agent.name}'.padEnd(44) + '║' -ForegroundColor White`,
      `Write-Host '║  File  : ${path.basename(taskPath)}'.padEnd(44) + '║' -ForegroundColor White`,
      `Write-Host '║  Mode  : YOLO Auto-Approve'.padEnd(44) + '║' -ForegroundColor Green`,
      `Write-Host '╚══════════════════════════════════════════════╝' -ForegroundColor Cyan`,
      `Write-Host ''`,
      `Get-Content '${taskPath.replace(/'/g, "''")}' -Raw | & ${agent.command}${yoloFlag} --output-format text`,
    ];
```

Important: these `padEnd` calls need to be done in TypeScript, not in the PowerShell string. Compute the padded strings before building the PowerShell array.

---

## Phase 9: Beautify `_summary.md` Format

Update `writeTaskSummary` to use a cleaner format with emoji:

```typescript
  const header = [
    `# 📋 Task Report: ${taskName}`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Task File** | \`${path.basename(taskPath)}\` |`,
    `| **Dispatched** | ${startTime.toISOString()} |`,
    `| **Agent** | ${agentLabel} |`,
    `| **Mode** | 🤖 Headless + ⚡ YOLO Auto-Approve |`,
    ``,
    `---`,
    ``,
    `## 👥 Role Separation`,
    ``,
    `| 🧠 Role | 💻 System | 📝 Responsibility |`,
    `|---------|----------|-------------------|`,
    `| **Planner** | Claude Code | Strategy, architecture, task authoring, verification |`,
    `| **Dispatcher** | AutoClaude | Validation, dispatch, notification, cost tracking |`,
    `| **Executor** | ${agentLabel} | File operations, git, builds, deployments |`,
    ``,
  ].join('\n');
```

---

## Phase 10: Rebuild, Commit, Push

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "v5.2: Beautify all terminal output — Unicode boxes, emoji, structured tables"
git push origin main
```

Fix any TypeScript compilation errors (padEnd, type issues).

---

## Phase 11: Verify

1. `qwen_bridge_status` shows boxed output with emoji
2. `list_agents` shows clean table with ⭐ for active agent
3. `switch_agent` shows boxed confirmation
4. `dispatch_task` response is boxed and beautiful
5. `get_savings_report` shows formatted savings
6. `get_task_report` shows formatted report
7. `Label: undefined` is gone from all outputs
8. Terminal banner (showTerminal mode) uses Unicode boxes
