#!/usr/bin/env python3
"""Replace MCP response text with Markdown tables."""
import subprocess, sys

f = 'D:/qwen-bridge/src/index.ts'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

B = chr(96)
SQ = chr(39)
S = SQ  # shorthand

pairs = []

# 1. dispatch_task CLI
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 Task Dispatched \u2500\u2500" + "\\n\\nAgent: " + S + " + (agent.label || agent.name || config.activeAgent) + " + S + "\\nTask: " + S + " + path.basename(taskPath) + " + S + "\\nMode: " + S + " + (config.showTerminal ? " + S + "Visible" + S + " : " + S + "Headless Background" + S + ") + " + S + "\\nYOLO: " + S + " + (agent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + ") + " + S + "\\n\\n\ud83d\udcc4 Result: " + S + " + path.basename(taskPath.replace(/\\.md$/, " + S + "_result.log" + S + ")) + " + S + "\\n\ud83d\udccb Report: " + S + " + path.basename(taskPath.replace(/\\.md$/, " + S + "_summary.md" + S + ")) + " + S + "\\n\\n\ud83d\ude80 Agent executing in background." + S + " }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## \u2705 Task Dispatched\\n\\n| Field | Value |\\n|-------|-------|\\n| Agent | ${agent.label || agent.name} |\\n| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n| Mode | ${config.showTerminal ? " + S + "Visible" + S + " : " + S + "Headless Background" + S + "} |\\n| YOLO | ${agent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + "} |\\n\\n| Output | File |\\n|--------|------|\\n|\u00a0\ud83d\udcc4\u00a0Result\u00a0| " + B + "${path.basename(taskPath.replace(/\\.md$/, " + S + "_result.log" + S + "))}" + B + " |\\n|\u00a0\ud83d\udccb\u00a0Report\u00a0| " + B + "${path.basename(taskPath.replace(/\\.md$/, " + S + "_summary.md" + S + "))}" + B + " |\\n\\n\ud83d\ude80 Agent executing in background. Check _summary.md when done." + S + " }] };"
pairs.append((old, new, "dispatch_task CLI"))

# 2. dispatch_task clipboard
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 Clipboard Task \u2500\u2500" + "\\n\\nAgent: " + S + " + (agent.label || agent.name) + " + S + "\\nTask: " + S + " + path.basename(taskPath) + " + S + "\\nClipboard: " + S + " + (ok ? " + S + "\u2705 Copied" + S + " : " + S + "\u26a0\ufe0f Failed" + S + ") + " + S + "\\n\\n" + S + " + (ok ? " + S + "Open agent and paste (Ctrl+V)." + S + " : " + S + "Open task file manually." + S + ") }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## \u2705 Task Dispatched\\n\\n| Field | Value |\\n|-------|-------|\\n| Agent | ${agent.label || agent.name} |\\n| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n${ok ? " + S + "| Clipboard | \u2705 Copied (Ctrl+V into agent) |" + S + " : " + S + "| Clipboard | \u274c Copy failed |" + S + "}\\n\\n${ok ? " + S + "> \u27a1\ufe0f Open agent and paste (Ctrl+V)." + S + " : " + S + "> \u26a0\ufe0f Open the task file manually." + S + "}\\n\\n\ud83d\ude80 Agent executing independently." + S + " }] };"
pairs.append((old, new, "dispatch_task clipboard"))

# 3. dispatch_to_qwen
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 Task Dispatched \u2500\u2500" + "\\n\\nAgent: " + S + " + (agent.label || agent.name || " + S + "Qwen Code" + S + ") + " + S + "\\nTask: " + S + " + path.basename(taskPath) + " + S + "\\nYOLO: " + S + " + (agent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + ") + " + S + "\\n\\n\ud83d\ude80 Running in background." + S + " }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## \u2705 Task Dispatched\\n\\n| Field | Value |\\n|-------|-------|\\n| Agent | ${agent.label || agent.name || " + S + "Qwen Code" + S + "} |\\n| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n| YOLO | ${agent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + "} |\\n\\n\ud83d\ude80 Agent executing in background." + S + " }] };"
pairs.append((old, new, "dispatch_to_qwen"))

# 4. dispatch_to_cursor
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 Cursor Task \u2500\u2500" + "\\n\\nTask: " + S + " + path.basename(taskPath) + " + S + "\\nClipboard: " + S + " + (ok ? " + S + "\u2705 Copied" + S + " : " + S + "\u26a0\ufe0f Failed" + S + ") + " + S + "\\n\\n" + S + " + (ok ? " + S + "Open Cursor and paste (Ctrl+V)." + S + " : " + S + "Open task file manually." + S + ") }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## \u2705 Task Dispatched to Cursor\\n\\n| Field | Value |\\n|-------|-------|\\n| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n${ok ? " + S + "| Clipboard | \u2705 Copied (Ctrl+V into Cursor) |" + S + " : " + S + "| Clipboard | \u274c Copy failed |" + S + "}\\n\\n${ok ? " + S + "> \u27a1\ufe0f Open Cursor AI chat and press Ctrl+V" + S + " : " + S + "> \u26a0\ufe0f Open the task file manually in Cursor" + S + "}\\n\\n\ud83d\ude80 Claude is free \u2014 Cursor AI runs independently using its own tokens." + S + " }] };"
pairs.append((old, new, "dispatch_to_cursor"))

# 5. switch_agent
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 Agent Switched \u2500\u2500" + "\\n\\nFrom: " + S + " + oldName + " + S + "\\nTo: " + S + " + (newAgent.label || newAgent.name) + " + S + "\\nCmd: " + S + " + newAgent.command + " + S + "\\nYOLO: " + S + " + (newAgent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + ") + " + S + "\\n\\n\u2705 All dispatch_task calls will now use this agent." + S + " }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## Agent Switched\\n\\n| | |\\n|---|---|\\n| From | ${oldName} |\\n| To | ${newAgent.label || newAgent.name} |\\n| YOLO | " + S + " + (newAgent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + ") + " + S + " |\\n| Command | " + B + "${newAgent.command}" + B + " |\\n\\n\u2705 All " + B + "dispatch_task" + B + " calls will now use ${newAgent.label || newAgent.name}.\\nThis change is persisted to " + B + "config.json" + B + "." + S + " }] };"
pairs.append((old, new, "switch_agent"))

# 6. qwen_bridge_status
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 AutoClaude " + S + " + getVersion() + " + S + " \u2500\u2500" + "\\n\\nActive Agent: " + S + " + (agent.label || agent.name) + " + S + " (" + B + S + " + config.activeAgent + " + S + B + ")" + S + "\\nCommand: " + S + " + agent.command + " + S + "\\nYOLO Mode: " + S + " + (agent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + ") + " + S + "\\nTerminal: " + S + " + (config.showTerminal ? " + S + "visible" + S + " : " + S + "headless background" + S + ") + " + S + "\\nAgents: " + S + " + enabledCount + " + S + " enabled / " + S + " + totalCount + " + S + " total" + "\\nProject Dir: " + S + " + config.projectDir + " + S + "\\n\ud83d\udcb0 Savings: " + S + " + cum.tasks + " + S + " tasks \u00b7 " + S + " + cum.tokensSaved.toLocaleString() + " + S + " tokens \u00b7 $" + S + " + cum.costSaved.toFixed(2) + " + S + " }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## AutoClaude v" + B + "${getVersion()}" + B + " \u2014 Status\\n\\n| Field | Value |\\n|-------|-------|\\n| Active Agent | ${agent.label || agent.name} (" + B + B + "${config.activeAgent}" + B + B + ") |\\n| YOLO Mode | " + S + " + (agent.yoloMode ? " + S + "\u2705 ON" + S + " : " + S + "\u274c OFF" + S + ") + " + S + " |\\n| Terminal | ${config.showTerminal ? " + S + "Visible" + S + " : " + S + "Headless background" + S + "} |\\n| Agents | ${enabledCount} enabled / ${totalCount} total |\\n| Project Dir | " + B + "${config.projectDir}" + B + " |\\n|\u00a0\ud83d\udcb0\u00a0Savings\u00a0| ${cum.tasks} tasks \u00b7 ${cum.tokensSaved.toLocaleString()} tokens \u00b7 $${cum.costSaved.toFixed(2)} |\\n\\n**Tools:** dispatch_task \u00b7 list_agents \u00b7 switch_agent \u00b7 add_custom_agent \u00b7 check_agent \u00b7 verify_agent_auth \u00b7 get_task_report \u00b7 get_savings_report \u00b7 get_project_report \u00b7 qwen_bridge_status" + S + " }] };"
pairs.append((old, new, "qwen_bridge_status"))

# 7. verify_agent_auth success
old = "if (success) return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 Auth Verified \u2500\u2500" + "\\n\\nAgent: " + S + " + (agent.label || agent.name || targetId) + " + S + "\\nStatus: \u2705 Ready\\nCommand: " + S + " + agent.command + " + S + " }] };"
new = "if (success) return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## Auth Verification\\n\\n| Field | Value |\\n|-------|-------|\\n| Agent | ${agent.label || agent.name || targetId} |\\n| Status | \u2705 Authenticated \u0026 Ready |\\n| Command | " + B + "${agent.command}" + B + " |\\n\\n\u2705 Ready to dispatch tasks." + S + " }] };"
pairs.append((old, new, "verify_agent_auth"))

# 8. get_savings_report
old = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u2500\u2500 \ud83d\udcb0 Savings Report \u2500\u2500" + "\\n\\nTotal Tasks: " + S + " + cum.tasks + " + S + "\\nTokens Saved: ~" + S + " + cum.tokensSaved.toLocaleString() + " + S + "\\nCost Saved: $" + S + " + cum.costSaved.toFixed(2) + " + S + "\\nAvg/Task: ~" + S + " + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + " + S + " tokens" + S + " }] };"
new = "return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## \ud83d\udcb0 Savings Report\\n\\n| Metric | Value |\\n|--------|-------|\\n| Total Tasks | ${cum.tasks} |\\n| Tokens Saved | ~${cum.tokensSaved.toLocaleString()} |\\n| Cost Saved | $${cum.costSaved.toFixed(2)} |\\n\\n${cum.tasks > 0 ? " + S + "\ud83d\udca1 Avg: ~" + S + " + Math.round(cum.tokensSaved / cum.tasks).toLocaleString() + " + S + " tokens ($" + S + " + (cum.costSaved / cum.tasks).toFixed(2) + " + S + ")/task." + S + " : " + S + S + "} }] };"
pairs.append((old, new, "get_savings_report"))

# 9. get_task_report not-found
old = "if (!fs.existsSync(summaryPath)) return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "\u26a0\ufe0f No report yet. Task may still be running." + S + " }] };"
new = "if (!fs.existsSync(summaryPath)) return { content: [{ type: " + S + "text" + S + " as const, text: " + S + "## \ud83d\udccb Task Report\\n\\n| Field | Value |\\n|-------|-------|\\n| Task | " + B + "${path.basename(taskPath)}" + B + " |\\n| Status | \u23f3 Still running... |\\n| \ud83d\udcc4 Raw log | ${fs.existsSync(resultLog) ? path.basename(resultLog) + " + S + " exists" + S + " : " + S + "No result log yet" + S + "} |\\n\\n> \ud83d\udca1 The report will auto-finalize when output is detected in the result log." + S + " }] };"
pairs.append((old, new, "get_task_report not-found"))

# Verify all
all_ok = True
for old, new, name in pairs:
    idx = c.find(old)
    if idx == -1:
        print("MISSING: " + name)
        all_ok = False
    else:
        print("FOUND: " + name)

if not all_ok:
    print("Aborting")
    sys.exit(1)

# Replace
for old, new, name in pairs:
    c = c.replace(old, new)
    print("DONE: " + name)

with open(f, "w", encoding="utf-8") as fh:
    fh.write(c)

print("\nCompiling...")
result = subprocess.run(["npx", "tsc"], cwd="D:/qwen-bridge", capture_output=True, text=True, timeout=60)
if result.returncode == 0:
    print("Compilation: OK")
else:
    print("Compilation FAILED:\n" + result.stdout)
    sys.exit(1)
