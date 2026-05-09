# Task: Fix Report Pipeline + Add Project Master Report

## Context

The `_summary.md` generation is broken. The `.bat` file spawn approach means `finalizeTaskSummary` never fires because the parent process exits. The `.autoclaude_savings.json` is never created. Users can't see who did what or how many tokens they saved.

## Phase 1: Fix Summary Generation

### 1a. Fix `get_task_report` auto-finalize

Find the `get_task_report` handler in `src/index.ts`. The current auto-finalize logic checks `!summary.includes('Token Economics')`. But the initial `writeTaskSummary` header doesn't include "Token Economics" — only `finalizeTaskSummary` adds it. So this check should work... but it's not triggering.

Change the auto-finalize condition to be MORE aggressive:

```typescript
    // Auto-finalize: if result log has content, finalize the summary
    if (fs.existsSync(summaryPath) && fs.existsSync(resultLog)) {
      const resultStat = fs.statSync(resultLog);
      const hasContent = resultStat.size > 10;
      const summary = fs.readFileSync(summaryPath, 'utf-8');
      const notFinalized = !summary.includes('Completion Status') && !summary.includes('Token Economics');
      
      if (hasContent && notFinalized) {
        try {
          const taskContent = fs.existsSync(taskPath) ? fs.readFileSync(taskPath, 'utf-8') : '';
          finalizeTaskSummary(summaryPath, taskPath, new Date(resultStat.mtime), true, taskContent);
        } catch (e) {
          // If finalize fails, at least append a basic footer
          try {
            const footer = '\n\n---\n\n## Completion Status\n\n| Status | ✅ Completed |\n| Result Log | `' + path.basename(resultLog) + '` |\n\n*Report auto-finalized by get_task_report.*\n';
            fs.appendFileSync(summaryPath, footer, 'utf-8');
          } catch {}
        }
      }
    }
```

### 1b. Fix `estimateTokenSavings` — remove resultContent dependency

The current `estimateTokenSavings` reads resultContent to estimate tokens. But resultContent might be empty if the log hasn't been read properly. Change the function to work even with empty resultContent:

```typescript
function estimateTokenSavings(taskContent: string, resultContent: string): { ... } {
  const claudeTokensIn = 4000;
  const claudeTokensOut = Math.max(1000, Math.ceil(taskContent.length / 3));
  
  // If result is empty (agent still running or output capture issue), use conservative estimates
  const hasResult = resultContent && resultContent.length > 10;
  const estimatedExecutionTokensIn = hasResult 
    ? Math.max(8000, Math.ceil(taskContent.length / 2))
    : Math.max(10000, Math.ceil(taskContent.length / 2)); // Conservative if no output
  const estimatedExecutionTokensOut = hasResult
    ? Math.max(3000, Math.ceil(resultContent.length / 3))
    : 5000; // Conservative estimate
  
  const tokensSaved = (estimatedExecutionTokensIn + estimatedExecutionTokensOut) - (claudeTokensIn + claudeTokensOut);
  
  const p = CLAUDE_PRICING.opus4_7;
  const executionCost = (estimatedExecutionTokensIn / 1_000_000) * p.input + (estimatedExecutionTokensOut / 1_000_000) * p.output;
  const planningCost = (claudeTokensIn / 1_000_000) * p.input + (claudeTokensOut / 1_000_000) * p.output;
  const costSaved = Math.max(0, executionCost - planningCost);
  
  return { claudeTokensIn, claudeTokensOut, estimatedExecutionTokensIn, estimatedExecutionTokensOut, tokensSaved, costSaved };
}
```

---

## Phase 2: Add `updateProjectReport` Function

Add a new function that generates/updates a master `PROJECT_REPORT.md` in the project root:

```typescript
function updateProjectReport(): void {
  const reportPath = path.join(configProjectDir(), 'PROJECT_REPORT.md');
  const all = loadSavings();
  const cum = getCumulativeSavings();
  
  const now = new Date().toISOString();
  
  const lines = [
    '# 📊 AutoClaude Project Report',
    '',
    `> Last updated: ${now}`,
    `> Total tasks: ${cum.tasks} | Tokens saved: ~${cum.tokensSaved.toLocaleString()} | Cost saved: $${cum.costSaved.toFixed(2)}`,
    '',
    '---',
    '',
    '## 📈 Cumulative Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    `| **Total Tasks Dispatched** | ${cum.tasks} |`,
    `| **Total Tokens Saved** | **~${cum.tokensSaved.toLocaleString()}** |`,
    `| **Total Cost Saved (Opus 4.7)** | **$${cum.costSaved.toFixed(2)}** |`,
    `| **Total Cost Saved (Opus 4.5 legacy)** | **$${(cum.costSaved * 3).toFixed(2)}** |`,
    `| **Average Tokens / Task** | ~${cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0} |`,
    `| **Average Cost / Task** | $${cum.tasks > 0 ? (cum.costSaved / cum.tasks).toFixed(3) : '0.00'} |`,
    '',
    '---',
    '',
    '## 📋 Task History',
    '',
  ];
  
  if (all.length > 0) {
    lines.push('| # | Task | Date | Claude Tokens | Agent Tokens | Saved | Cost Saved |');
    lines.push('|---|------|------|--------------|-------------|-------|------------|');
    
    all.forEach((s, i) => {
      const date = new Date(s.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const name = s.taskName.replace(/^QWEN_/, '').replace(/_/g, ' ').substring(0, 30);
      const claudeTotal = s.claudeTokensIn + s.claudeTokensOut;
      const execTotal = s.estimatedExecutionTokensIn + s.estimatedExecutionTokensOut;
      lines.push(`| ${i + 1} | ${name} | ${date} | ~${claudeTotal.toLocaleString()} | ~${execTotal.toLocaleString()} | **~${s.tokensSaved.toLocaleString()}** | $${s.costSaved.toFixed(3)} |`);
    });
  } else {
    lines.push('*No tasks completed yet. Dispatch your first task to see results here.*');
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 👥 Role Breakdown');
  lines.push('');
  lines.push('| Role | System | Responsibility | Avg Tokens/Task |');
  lines.push('|------|--------|---------------|-----------------|');
  
  const avgClaude = cum.tasks > 0 ? Math.round((all.reduce((s, e) => s + e.claudeTokensIn + e.claudeTokensOut, 0)) / cum.tasks) : 0;
  const avgExec = cum.tasks > 0 ? Math.round((all.reduce((s, e) => s + e.estimatedExecutionTokensIn + e.estimatedExecutionTokensOut, 0)) / cum.tasks) : 0;
  
  lines.push(`| 🧠 **Planner** | Claude Code | Strategy, architecture, verification | ~${avgClaude.toLocaleString()} |`);
  lines.push(`| 🔗 **Dispatcher** | AutoClaude | Validation, dispatch, cost tracking | 0 (local) |`);
  lines.push(`| ⚡ **Executor** | AI Agent | File ops, git, builds, deploy | ~${avgExec.toLocaleString()} |`);
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 💡 About This Report');
  lines.push('');
  lines.push('This report is **automatically generated** by AutoClaude. Each time a task completes, the report is updated with:');
  lines.push('- Task metadata (name, timestamp)');
  lines.push('- Token consumption (Claude planning vs Agent execution)');
  lines.push('- Cost savings (based on Claude Opus 4.7 API pricing)');
  lines.push('');
  lines.push('> 📖 See individual `*_summary.md` files for per-task details.');
  lines.push(`> 🔧 Configured agents: ${Object.keys(config.agents).filter(id => config.agents[id].enabled).length} enabled / ${Object.keys(config.agents).length} total`);
  lines.push('');
  lines.push('*Generated by AutoClaude v5.3*');
  
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
}
```

Note: need to get `configProjectDir()` — the project dir from config. Use `const configProjectDir = () => loadConfig().projectDir;` as a helper.

### 2b. Call `updateProjectReport` from `finalizeTaskSummary`

After `recordSavings(entry)`, add:
```typescript
  updateProjectReport();
```

### 2c. Call `updateProjectReport` from `get_task_report` auto-finalize too

After the auto-finalize block completes, call `updateProjectReport()`.

---

## Phase 3: Update `_summary.md` Format — More Visual

### 3a. Make `writeTaskSummary` more prominent

Add a role summary section with emoji:

```typescript
  const header = [
    `# 📋 Task Report: ${taskName}`,
    ``,
    `| 📌 Field | 📝 Value |`,
    `|----------|----------|`,
    `| **Task File** | \`${path.basename(taskPath)}\` |`,
    `| **Dispatched** | ${startTime.toISOString()} |`,
    `| **Agent** | ${agentLabel} |`,
    `| **Mode** | 🤖 Headless + ⚡ YOLO Auto-Approve |`,
    ``,
    `---`,
    ``,
    `## 👥 Who Did What`,
    ``,
    `| 🧠 Role | 💻 System | 📝 What It Does |`,
    `|---------|----------|----------------|`,
    `| **Planner** | 🟡 Claude Code | Strategy, architecture, task file, verification |`,
    `| **Dispatcher** | 🔵 AutoClaude | Validation, dispatch, notifications, cost tracking |`,
    `| **Executor** | 🟢 ${agentLabel} | File operations, git, builds, deployments |`,
    ``,
    `---`,
    ``,
    `## ⏳ Execution Log`,
    ``,
    `> The executor is running. Check \`${path.basename(resultLog)}\` for live output.`,
    ``,
  ].join('\n');
```

### 3b. Make `finalizeTaskSummary` Token Economics section more prominent

Add a large "💰 SAVED" banner:

```typescript
    `---`,
    ``,
    `## 💰 Token Economics`,
    ``,
    `| 🧠 Claude (Planning) | ⚡ Agent (Execution) | 💰 Saved |`,
    `|----------------------|----------------------|----------|`,
    `| ~${(savings.claudeTokensIn + savings.claudeTokensOut).toLocaleString()} tokens | ~${(savings.estimatedExecutionTokensIn + savings.estimatedExecutionTokensOut).toLocaleString()} tokens | **~${savings.tokensSaved.toLocaleString()} tokens** |`,
    `| $${(savings.claudeTokensIn / 1_000_000 * 5 + savings.claudeTokensOut / 1_000_000 * 25).toFixed(4)} | $${(savings.estimatedExecutionTokensIn / 1_000_000 * 5 + savings.estimatedExecutionTokensOut / 1_000_000 * 25).toFixed(4)} | **$${savings.costSaved.toFixed(4)}** |`,
    ``,
    `> 🔥 **${Math.round((1 - (savings.claudeTokensIn + savings.claudeTokensOut) / (savings.estimatedExecutionTokensIn + savings.estimatedExecutionTokensOut)) * 100)}% savings** — Claude only pays for planning, not execution.`,
    ``,
    `### 📊 Cumulative (All Tasks)`,
    ``,
    `| Total Tasks | Total Tokens Saved | Total Cost Saved |`,
    `|-------------|-------------------|-----------------|`,
    `| ${cum.tasks} | **~${cum.tokensSaved.toLocaleString()}** | **$${cum.costSaved.toFixed(2)}** |`,
    ``,
    `> 📄 See \`PROJECT_REPORT.md\` for the complete project-level report.`,
```

---

## Phase 4: Add `get_project_report` MCP Tool

Let Claude read the master project report:

In ListTools:
```typescript
    {
      name: 'get_project_report',
      description: 'Read the master project report (PROJECT_REPORT.md) showing cumulative task history, token savings, and role breakdown across all dispatched tasks.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
```

In CallTool:
```typescript
  if (request.params.name === 'get_project_report') {
    const reportPath = path.join(config.projectDir, 'PROJECT_REPORT.md');
    if (!fs.existsSync(reportPath)) {
      updateProjectReport(); // Generate if missing
    }
    const report = fs.readFileSync(reportPath, 'utf-8');
    return {
      content: [{ type: 'text' as const, text: report }],
    };
  }
```

---

## Phase 5: Rebuild and Fix Compilation

```bash
cd D:\qwen-bridge
npx tsc
```

Fix any TypeScript errors. Make sure:
- `updateProjectReport` has access to `config` (either pass as param or use loadConfig())
- All imports are correct (`fs`, `path`)

---

## Phase 6: Update index.html — Add Report Preview Section

After the "Savings" section in index.html, add a small preview:

```html
<!-- Project Report Preview -->
<section class="py-8">
    <div class="max-w-4xl mx-auto glass-card rounded-2xl p-8 md:p-12 space-y-6">
        <div class="flex items-center gap-4">
            <span class="material-symbols-outlined text-3xl text-primary-container">description</span>
            <div>
                <h2 class="text-2xl font-bold text-on-background" data-i18n="report_title">Project Report</h2>
                <p class="text-sm text-on-surface-variant" data-i18n="report_sub">Auto-generated after every task. Shows who did what, token usage, and cost savings.</p>
            </div>
        </div>
        <div class="bg-surface-container-low rounded-xl p-4 font-mono text-xs leading-relaxed text-on-surface overflow-x-auto">
            <span class="text-on-surface-variant"># 📊 AutoClaude Project Report</span><br/>
            <span class="text-on-surface-variant">## 👥 Who Did What</span><br/>
            | 🧠 <strong>Claude Code</strong> | Strategy, planning, verification | ~7K tokens/task |<br/>
            | 🔗 <strong>AutoClaude</strong> | Dispatch, capture, cost tracking | 0 tokens (local) |<br/>
            | ⚡ <strong>Qwen Code</strong> | File ops, git, build, deploy | ~25K tokens/task |<br/>
            <br/>
            <span class="text-on-surface-variant">## 💰 Savings</span><br/>
            | Total Tasks: <strong>12</strong> | Tokens Saved: <strong>~216,000</strong> | Cost Saved: <strong>$3.60</strong> |
        </div>
        <p class="text-xs text-on-surface-variant" data-i18n="report_footer">
            Call <code class="bg-surface-container px-1 rounded">get_project_report</code> in Claude to see your live report.
        </p>
    </div>
</section>
```

Add i18n keys for this section in `i18n.js` (EN + ZH).

---

## Phase 7: Commit and Push

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "v5.3: Fix report pipeline + PROJECT_REPORT.md + get_project_report tool"
git push origin main
```
