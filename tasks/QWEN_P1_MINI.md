# P1 Mini: Fix 3 Core Handler Outputs

## Strategy
Replace Unicode box characters with `── Title ──` headers in ONLY 3 handlers. Provide EXACT replacement text — no interpretation needed.

## Handler 1: qwen_bridge_status

### FIND this block in src/index.ts (the handler for qwen_bridge_status)

Look for `if (request.params.name === 'qwen_bridge_status')` and find its `text: [` array.

### REPLACE the entire text array with:

```typescript
        text: [
          '── AutoClaude ' + getVersion() + ' ──',
          '',
          'Active Agent : ' + agent.name + ' (`' + config.activeAgent + '`)',
          'Command      : ' + agent.command,
          'YOLO Mode    : ' + (agent.yoloMode ? '✅ ON' : '❌ OFF'),
          'Terminal     : ' + (config.showTerminal ? 'visible' : 'headless background'),
          'Agents       : ' + enabledCount + ' enabled / ' + totalCount + ' total',
          'Project Dir  : ' + (config.projectDir || ''),
          '💰 Savings   : ' + cum.tasks + ' tasks · ' + cum.tokensSaved.toLocaleString() + ' tokens · $' + cum.costSaved.toFixed(2),
          '',
          'Tools: dispatch_task · list_agents · switch_agent · add_custom_agent',
          '       check_agent · verify_agent_auth · get_task_report',
          '       get_savings_report · get_project_report · qwen_bridge_status',
        ].join('\n'),
```

## Handler 2: dispatch_task / dispatch_to_qwen / dispatch_to_cursor response

### FIND the response block for CLI dispatch (the `return` with `text: [` containing "Task Dispatched")

### REPLACE with:

```typescript
        text: [
          '── Task Dispatched ──',
          '',
          'Agent    : ' + (agent.label || agent.name || config.activeAgent),
          'Task     : ' + path.basename(taskPath),
          'Mode     : ' + (config.showTerminal ? 'Visible Terminal' : 'Headless Background'),
          'YOLO     : ' + (agent.yoloMode ? '✅ Auto-Approve ON' : '⚠️ Manual Confirm'),
          '',
          '📄 Result Log    : ' + path.basename(resultLog),
          '📋 Report        : ' + path.basename(summaryPath),
          '',
          '🚀 Agent executing in background. Check report for progress.',
        ].join('\n'),
```

For the Cursor/clipboard dispatch response, use:

```typescript
        text: [
          '── Task Dispatched (Clipboard) ──',
          '',
          'Agent      : ' + (agent.label || agent.name),
          'Task       : ' + path.basename(taskPath),
          'Clipboard  : ' + (clipboardOk ? '✅ Copied' : '⚠️ Failed'),
          '',
          clipboardOk ? 'Open the agent and paste (Ctrl+V).' : 'Open the task file manually.',
        ].join('\n'),
```

## Handler 3: list_agents

### FIND the list_agents handler text array

### REPLACE with:

```typescript
        text: [
          '── Configured Agents ──',
          '',
          ...Object.entries(config.agents).map(([id, a]) => {
            const star = id === config.activeAgent ? '⭐' : ' ';
            const yolo = a.yoloMode ? '✅' : '❌';
            const typeIcon = a.type === 'clipboard' ? '📋' : '🖥️';
            const name = (a.label || a.name || id).padEnd(18);
            const cmd = a.command.padEnd(12);
            const disabled = a.enabled ? '' : ' (disabled)';
            return star + ' ' + name + typeIcon + ' YOLO:' + yolo + '  ' + cmd + disabled;
          }),
          '',
          'Active: ' + (active?.label || active?.name || config.activeAgent) + ' — switch_agent("<id>") to change',
        ].join('\n'),
```

## Handler 4: switch_agent

### FIND and REPLACE:

```typescript
        text: [
          '── Agent Switched ──',
          '',
          'From : ' + oldName,
          'To   : ' + (newAgent.label || newAgent.name),
          'Cmd  : ' + newAgent.command,
          'YOLO : ' + (newAgent.yoloMode ? '✅ ON' : '❌ OFF'),
          '',
          '✅ All dispatch_task calls will now use this agent.',
        ].join('\n'),
```

## Handler 5: verify_agent_auth (success path)

### REPLACE the success text with:

```typescript
        text: [
          '── Auth Verified ──',
          '',
          'Agent   : ' + (agent.label || agent.name || targetId),
          'Status  : ✅ Authenticated & Ready',
          'Command : ' + agent.command,
        ].join('\n'),
```

## Handler 6: get_savings_report

### REPLACE the text array with:

```typescript
        text: [
          '── 💰 Savings Report ──',
          '',
          'Total Tasks  : ' + cum.tasks,
          'Tokens Saved : ~' + cum.tokensSaved.toLocaleString(),
          'Cost Saved   : $' + cum.costSaved.toFixed(2),
          'Avg/Task     : ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' tokens ($' + (cum.tasks > 0 ? (cum.costSaved / cum.tasks).toFixed(3) : '0.00') + ')',
        ].join('\n'),
```

## CRITICAL RULES

1. **Remove ALL `┌`, `─`, `┐`, `│`, `└`, `┘`, `├`, `┤`** escape sequences from the handlers above
2. **Remove ALL `┌─┐│└┘├┤`** literal characters from the handlers above
3. **Keep all other code** (variables, logic, if/else) EXACTLY as-is
4. **After editing, run `npx tsc`** to verify no compilation errors
5. **If tsc fails, fix errors before committing**

## Build & Commit

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "P1: Clean output format for 6 core handlers — minimalist headers"
git push origin main
```
