#!/usr/bin/env python3
"""Replace MCP response text with Markdown tables in D:/qwen-bridge/src/index.ts"""
f = 'D:/qwen-bridge/src/index.ts'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

B = chr(96)  # backtick

# 1. dispatch_task CLI response
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 Task Dispatched \u2500\u2500\\n\\nAgent: ' + (agent.label || agent.name || config.activeAgent) + '\\nTask: ' + path.basename(taskPath) + '\\nMode: ' + (config.showTerminal ? 'Visible' : 'Headless Background') + '\\nYOLO: ' + (agent.yoloMode ? '\u2705 ON' : '\u274c OFF') + '\\n\\n\ud83d\udcc4 Result: ' + path.basename(taskPath.replace(/\\.md$/, '_result.log')) + '\\n\ud83d\udccb Report: ' + path.basename(taskPath.replace(/\\.md$/, '_summary.md')) + '\\n\\n\ud83d\ude80 Agent executing in background.' }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## \u2705 Task Dispatched\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Agent | ${agent.label || agent.name} |\\n"
    "| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n"
    "| Mode | ${config.showTerminal ? 'Visible' : 'Headless Background'} |\\n"
    "| YOLO | ${agent.yoloMode ? '\u2705 ON' : '\u274c OFF'} |\\n"
    "\\n"
    "| Output | File |\\n"
    "|--------|------|\\n"
    "|\u00a0\ud83d\udcc4\u00a0Result\u00a0Log\u00a0| " + B + "${path.basename(taskPath.replace(/\\.md$/, '_result.log'))}" + B + " |\\n"
    "|\u00a0\ud83d\udccb\u00a0Report\u00a0| " + B + "${path.basename(taskPath.replace(/\\.md$/, '_summary.md'))}" + B + " |\\n"
    "\\n"
    "\ud83d\ude80 Agent executing in background. Check _summary.md when done.' }] };"
)
print('1. dispatch_task CLI')

# 2. dispatch_task clipboard response
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 Clipboard Task \u2500\u2500\\n\\nAgent: ' + (agent.label || agent.name) + '\\nTask: ' + path.basename(taskPath) + '\\nClipboard: ' + (ok ? '\u2705 Copied' : '\u26a0\ufe0f Failed') + '\\n\\n' + (ok ? 'Open agent and paste (Ctrl+V).' : 'Open task file manually.') }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## \u2705 Task Dispatched\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Agent | ${agent.label || agent.name} |\\n"
    "| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n"
    "${ok ? '| Clipboard | \u2705 Copied (Ctrl+V into agent) |' : '| Clipboard | \u274c Copy failed |'}\\n"
    "\\n"
    "${ok ? '> \u27a1\ufe0f Open agent and paste (Ctrl+V).' : '> \u26a0\ufe0f Open the task file manually.'}\\n"
    "\\n"
    "\ud83d\ude80 Agent executing independently.' }] };"
)
print('2. dispatch_task clipboard')

# 3. dispatch_to_qwen
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 Task Dispatched \u2500\u2500\\n\\nAgent: ' + (agent.label || agent.name || 'Qwen Code') + '\\nTask: ' + path.basename(taskPath) + '\\nYOLO: ' + (agent.yoloMode ? '\u2705 ON' : '\u274c OFF') + '\\n\\n\ud83d\ude80 Running in background.' }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## \u2705 Task Dispatched\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Agent | ${agent.label || agent.name || 'Qwen Code'} |\\n"
    "| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n"
    "| YOLO | ${agent.yoloMode ? '\u2705 ON' : '\u274c OFF'} |\\n"
    "\\n"
    "\ud83d\ude80 Agent executing in background.' }] };"
)
print('3. dispatch_to_qwen')

# 4. dispatch_to_cursor
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 Cursor Task \u2500\u2500\\n\\nTask: ' + path.basename(taskPath) + '\\nClipboard: ' + (ok ? '\u2705 Copied' : '\u26a0\ufe0f Failed') + '\\n\\n' + (ok ? 'Open Cursor and paste (Ctrl+V).' : 'Open task file manually.') }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## \u2705 Task Dispatched to Cursor\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n"
    "${ok ? '| Clipboard | \u2705 Copied (Ctrl+V into Cursor) |' : '| Clipboard | \u274c Copy failed |'}\\n"
    "\\n"
    "${ok ? '> \u27a1\ufe0f Open Cursor AI chat and press Ctrl+V' : '> \u26a0\ufe0f Open the task file manually in Cursor'}\\n"
    "\\n"
    "\ud83d\ude80 Claude is free \u2014 Cursor AI runs independently using its own tokens.' }] };"
)
print('4. dispatch_to_cursor')

# 5. switch_agent
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 Agent Switched \u2500\u2500\\n\\nFrom: ' + oldName + '\\nTo: ' + (newAgent.label || newAgent.name) + '\\nCmd: ' + newAgent.command + '\\nYOLO: ' + (newAgent.yoloMode ? '\u2705 ON' : '\u274c OFF') + '\\n\\n\u2705 All dispatch_task calls will now use this agent.' }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## Agent Switched\\n\\n"
    "| | |\\n"
    "|---|---|\\n"
    "| From | ${oldName} |\\n"
    "| To | ${newAgent.label || newAgent.name} |\\n"
    "| YOLO | ' + (newAgent.yoloMode ? '\u2705 ON' : '\u274c OFF') + ' |\\n"
    "| Command | " + B + "${newAgent.command}" + B + " |\\n"
    "\\n"
    "\u2705 All " + B + "dispatch_task" + B + " calls will now use ${newAgent.label || newAgent.name}.\\n"
    "This change is persisted to " + B + "config.json" + B + ".' }] };"
)
print('5. switch_agent')

# 6. qwen_bridge_status
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 AutoClaude ' + getVersion() + ' \u2500\u2500\\n\\nActive Agent: ' + (agent.label || agent.name) + ' (`' + config.activeAgent + '`)"
    + "\\nCommand: ' + agent.command + '\\nYOLO Mode: ' + (agent.yoloMode ? '\u2705 ON' : '\u274c OFF') + '\\nTerminal: ' + (config.showTerminal ? 'visible' : 'headless background') + '\\nAgents: ' + enabledCount + ' enabled / ' + totalCount + ' total\\nProject Dir: ' + config.projectDir + '\\n\ud83d\udcb0 Savings: ' + cum.tasks + ' tasks \u00b7 ' + cum.tokensSaved.toLocaleString() + ' tokens \u00b7 $' + cum.costSaved.toFixed(2) }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## AutoClaude v${getVersion()} \u2014 Status\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Active Agent | ${agent.label || agent.name} (" + B + B + "${config.activeAgent}" + B + B + ") |\\n"
    "| YOLO Mode | ' + (agent.yoloMode ? '\u2705 ON' : '\u274c OFF') + ' |\\n"
    "| Terminal | ${config.showTerminal ? 'Visible' : 'Headless background'} |\\n"
    "| Agents | ${enabledCount} enabled / ${totalCount} total |\\n"
    "| Project Dir | " + B + "${config.projectDir}" + B + " |\\n"
    "|\u00a0\ud83d\udcb0\u00a0Savings\u00a0| ${cum.tasks} tasks \u00b7 ${cum.tokensSaved.toLocaleString()} tokens \u00b7 $${cum.costSaved.toFixed(2)} |\\n"
    "\\n"
    "**Tools:** dispatch_task \u00b7 list_agents \u00b7 switch_agent \u00b7 add_custom_agent \u00b7 check_agent \u00b7 verify_agent_auth \u00b7 get_task_report \u00b7 get_savings_report \u00b7 get_project_report \u00b7 qwen_bridge_status' }] };"
)
print('6. qwen_bridge_status')

# 7. verify_agent_auth success
c = c.replace(
    "if (success) return { content: [{ type: 'text' as const, text: '\u2500\u2500 Auth Verified \u2500\u2500\\n\\nAgent: ' + (agent.label || agent.name || targetId) + '\\nStatus: \u2705 Ready\\nCommand: ' + agent.command }] };",
    "if (success) return { content: [{ type: 'text' as const, text: "
    "'## Auth Verification\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Agent | ${agent.label || agent.name || targetId} |\\n"
    "| Status | \u2705 Authenticated \u0026 Ready |\\n"
    "| Command | " + B + "${agent.command}" + B + " |\\n"
    "\\n"
    "\u2705 Ready to dispatch tasks.' }] };"
)
print('7. verify_agent_auth success')

# 8. get_savings_report
c = c.replace(
    "return { content: [{ type: 'text' as const, text: '\u2500\u2500 \ud83d\udcb0 Savings Report \u2500\u2500\\n\\nTotal Tasks: ' + cum.tasks + '\\nTokens Saved: ~' + cum.tokensSaved.toLocaleString() + '\\nCost Saved: $' + cum.costSaved.toFixed(2) + '\\nAvg/Task: ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' tokens' }] };",
    "return { content: [{ type: 'text' as const, text: "
    "'## \ud83d\udcb0 Savings Report\\n\\n"
    "| Metric | Value |\\n"
    "|--------|-------|\\n"
    "| Total Tasks | ${cum.tasks} |\\n"
    "| Tokens Saved | ~${cum.tokensSaved.toLocaleString()} |\\n"
    "| Cost Saved | $${cum.costSaved.toFixed(2)} |\\n"
    "\\n"
    "${cum.tasks > 0 ? '\ud83d\udca1 Average: ~' + Math.round(cum.tokensSaved / cum.tasks).toLocaleString() + ' tokens ($' + (cum.costSaved / cum.tasks).toFixed(2) + ') saved per task.' : ''}' }] };"
)
print('8. get_savings_report')

# 9. get_task_report not-found
c = c.replace(
    "if (!fs.existsSync(summaryPath)) return { content: [{ type: 'text' as const, text: '\u26a0\ufe0f No report yet. Task may still be running.' }] };",
    "if (!fs.existsSync(summaryPath)) return { content: [{ type: 'text' as const, text: "
    "'## \ud83d\udccb Task Report\\n\\n"
    "| Field | Value |\\n"
    "|-------|-------|\\n"
    "| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n"
    "| Status | \u23f3 Still running... |\\n"
    "| \ud83d\udcc4 Raw log | ${fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet'} |\\n"
    "\\n"
    '> \ud83d\udca1 The report will auto-finalize when output is detected in the result log.' }] };"
)
print('9. get_task_report not-found')

# 10. list_agents - uses listAgents() from agents.ts, need to check that too
print('10. list_agents - handled in agents.ts (separate file)')

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print('\nAll index.ts replacements done.')
