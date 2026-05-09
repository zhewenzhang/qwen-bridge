#!/usr/bin/env python3
"""Replace Unicode box-drawing chars in MCP tool responses with Markdown tables."""
f = 'D:/qwen-bridge/src/index.ts'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

BT = chr(96)

def rep(start, end, repl):
    global c
    si = c.find(start)
    if si == -1:
        print('FAIL start: ' + repr(start[:80]))
        return False
    ei = c.find(end, si + len(start))
    if ei == -1:
        print('FAIL end: ' + repr(end[:80]))
        return False
    c = c[:si] + repl + c[ei + len(end):]
    print('OK: ' + start[:50])
    return True

# 1. dispatch_to_qwen
rep(
    "    // Phase 5: Beautify dispatch_to_qwen response\n"
    "    const agentLabel = agent.label || agent.name;\n"
    "    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';\n"
    "    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';\n"
    "    const W = 50;",
    "    };\n  }\n\n  // -- dispatch_to_cursor",
    "    // Phase 5: Beautify dispatch_to_qwen response\n"
    "    const agentLabel = agent.label || agent.name;\n"
    "    const yoloStr = agent.yoloMode ? '\\u2705 ON' : '\\u274c OFF';\n"
    "    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';\n\n"
    "    return {\n      content: [{\n        type: 'text' as const,\n        text: [\n"
    "          '## \\u2705 Task Dispatched',\n          '',\n          '| Field | Value |',\n"
    "          '|-------|-------|',\n          '| Agent | ${agentLabel} |',\n"
    "          '| Task | `" + "' + '${path.basename(taskPath)}' + '" + "` |',\n"
    "          '| Mode | ${modeStr} |',\n          '| YOLO | ${yoloStr} |',\n"
    "          '',\n          '| Output | File |',\n          '|--------|------|',\n"
    "          '| \\ud83d\\udcc4 Result Log | `" + "' + '${path.basename(resultLog)}' + '" + "` |',\n"
    "          '| \\ud83d\\udccb Process Report | `" + "' + '${path.basename(summaryPath)}' + '" + "` |',\n"
    "          '',\n          '\\ud83d\\ude80 Agent executing in background. Check _summary.md when done.',\n"
    "        ].join('\\n'),\n      }],\n    };\n  }\n\n  // -- dispatch_to_cursor"
)

# 2. dispatch_to_cursor
rep(
    "    // Phase 5: Beautify dispatch_to_cursor response\n"
    "    const W = 50;\n"
    "    return {",
    "    };\n  }\n\n  // -- dispatch_task (agent-agnostic)",
    "    // Phase 5: Beautify dispatch_to_cursor response\n"
    "    return {\n      content: [{\n        type: 'text' as const,\n        text: [\n"
    "          '## \\u2705 Task Dispatched to Cursor',\n          '',\n"
    "          '| Field | Value |',\n          '|-------|-------|',\n"
    "          '| Task | `" + "' + '${path.basename(taskPath)}' + '" + "` |',\n"
    "          clipboardOk ? '| Clipboard | \\u2705 Copied (Ctrl+V into Cursor) |' : '| Clipboard | \\u274c Copy failed |',\n"
    "          '',\n"
    "          clipboardOk ? '> \\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V' : '> \\u26a0\\ufe0f Open the task file manually in Cursor',\n"
    "          '',\n"
    "          '\\ud83d\\ude80 Claude is free \\u2014 Cursor AI runs independently using its own tokens.',\n"
    "        ].join('\\n'),\n      }],\n    };\n  }\n\n  // -- dispatch_task (agent-agnostic)"
)

# 3. dispatch_task
rep(
    "    // Phase 5: Beautify dispatch_task response\n"
    "    const agentLabel = agent.label || agent.name;\n"
    "    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';\n"
    "    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';\n"
    "    const W = 50;\n",
    "    };\n  }\n\n  // -- list_agents",
    "    // Phase 5: Beautify dispatch_task response\n"
    "    const agentLabel = agent.label || agent.name;\n"
    "    const yoloStr = agent.yoloMode ? '\\u2705 ON' : '\\u274c OFF';\n"
    "    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';\n\n"
    "    return {\n      content: [{\n        type: 'text' as const,\n        text: [\n"
    "          '## \\u2705 Task Dispatched',\n          '',\n          '| Field | Value |',\n"
    "          '|-------|-------|',\n          '| Agent | ${agentLabel} |',\n"
    "          '| Task | `" + "' + '${path.basename(taskPath)}' + '" + "` |',\n"
    "          '| Mode | ${modeStr} |',\n          '| YOLO | ${yoloStr} |',\n"
    "          '',\n          '| Output | File |',\n          '|--------|------|',\n"
    "          '| \\ud83d\\udcc4 Result Log | `" + "' + '${path.basename(resultLog)}' + '" + "` |',\n"
    "          '| \\ud83d\\udccb Process Report | `" + "' + '${path.basename(summaryPath)}' + '" + "` |',\n"
    "          '',\n          '\\ud83d\\ude80 Agent executing in background. Check _summary.md when done.',\n"
    "        ].join('\\n'),\n      }],\n    };\n  }\n\n  // -- list_agents"
)

# 4. list_agents
rep(
    "    // Phase 3: Beautify list_agents output\n"
    "    const W = 74;",
    "    };\n  }\n\n  // -- switch_agent",
    "    // Phase 3: Beautify list_agents output\n"
    "    const lines = [\n"
    "      '## Configured Agents',\n      '',\n"
    "      '| | Agent | Type | YOLO | Command | Status |',\n"
    "      '|---|-------|------|------|---------|--------|',\n    "
    "    ];\n\n"
    "    for (const [id, agent] of Object.entries(config.agents)) {\n"
    "      const active = id === config.activeAgent ? '\\u2b50' : ' ';\n"
    "      const yolo = agent.yoloMode ? '\\u2705' : '\\u274c';\n"
    "      const typeIcon = agent.type === 'clipboard' ? '\\ud83d\\udccb' : '\\ud83d\\uddA5\\ufe0f';\n"
    "      const enabled = agent.enabled !== false;\n"
    "      const status = enabled ? 'Enabled' : 'Disabled';\n"
    "      lines.push(`| ${active} | ${agent.label || agent.name || id} | ${typeIcon} | ${yolo} | " + BT + "${agent.command}" + BT + " | ${status} |`);\n"
    "    }\n\n"
    "    lines.push('');\n"
    "    const activeAgent = config.agents[config.activeAgent];\n"
    "    lines.push(`**Active:** ${activeAgent?.label || activeAgent?.name || config.activeAgent} \\u2014 all " + BT + "dispatch_task" + BT + " calls use this agent.`);\n"
    "    lines.push('');\n"
    "    lines.push('Switch with " + BT + "switch_agent(\"<id>\")" + BT + " \\u00b7 Add custom with " + BT + "add_custom_agent(...)" + BT + "');\n\n"
    "    return {\n"
    "      content: [{ type: 'text' as const, text: lines.join('\\n') }],\n"
    "    };\n  }\n\n  // -- switch_agent"
)

# 5. switch_agent
rep(
    "    // Phase 4: Capture old agent name before switching\n"
    "    const oldAgent = config.agents[config.activeAgent];\n"
    "    const oldName = oldAgent?.label || oldAgent?.name || config.activeAgent;\n"
    "    const newAgent = config.agents[agent];\n\n"
    "    config.activeAgent = agent;\n"
    "    saveConfig(config);\n\n"
    "    const newLabel = newAgent.label || newAgent.name;\n"
    "    const W = 42;",
    "    };\n  }\n\n  // -- add_custom_agent",
    "    // Phase 4: Capture old agent name before switching\n"
    "    const oldAgent = config.agents[config.activeAgent];\n"
    "    const oldName = oldAgent?.label || oldAgent?.name || config.activeAgent;\n"
    "    const newAgent = config.agents[agent];\n\n"
    "    config.activeAgent = agent;\n"
    "    saveConfig(config);\n\n"
    "    const newLabel = newAgent.label || newAgent.name;\n\n"
    "    return {\n      content: [{\n        type: 'text' as const,\n        text: [\n"
    "          '## Agent Switched',\n          '',\n          '| | |',\n"
    "          '|---|---|',\n          '| From | ${oldName} |',\n"
    "          '| To | ${newLabel} |',\n"
    "          '| YOLO | ' + (newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF') + ' |',\n"
    "          '| Command | " + BT + "${newAgent.command}" + BT + " |',\n"
    "          '',\n"
    "          '\\u2705 All " + BT + "dispatch_task" + BT + " calls will now use ${newLabel}.',\n"
    "          'This change is persisted to " + BT + "config.json" + BT + ".',\n"
    "        ].join('\\n'),\n      }],\n    };\n  }\n\n  // -- add_custom_agent"
)

# 6. qwen_bridge_status
rep(
    "    // Phase 2: Beautify qwen_bridge_status output\n"
    "    const cum = getCumulativeSavings();\n"
    "    const agent = getActiveAgent(config);\n"
    "    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;\n"
    "    const totalCount = Object.keys(config.agents).length;\n"
    "    const W = 53;",
    "    };\n  }\n\n  // -- get_task_report",
    "    // Phase 2: Beautify qwen_bridge_status output\n"
    "    const cum = getCumulativeSavings();\n"
    "    const agent = getActiveAgent(config);\n"
    "    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;\n"
    "    const totalCount = Object.keys(config.agents).length;\n\n"
    "    return {\n      content: [{\n        type: 'text' as const,\n        text: [\n"
    "          `## AutoClaude v${getVersion()} \\u2014 Status`,\n"
    "          '',\n          '| Field | Value |',\n          '|-------|-------|',\n"
    "          `| Active Agent | ${agent.label || agent.name} (" + BT + "${agent.name}" + BT + ") |`,\n"
    "          `| YOLO Mode | ${agent.yoloMode ? '\\u2705 ON' : '\\u274c OFF'} |`,\n"
    "          `| Terminal | ${config.showTerminal ? 'Visible' : 'Headless background'} |`,\n"
    "          `| Agents | ${enabledCount} enabled / ${totalCount} total |`,\n"
    "          `| Project Dir | " + BT + "${config.projectDir || ''}" + BT + " |`,\n"
    "          `| \\ud83d\\udcb0 Savings | ${cum.tasks} tasks \\u00b7 ${cum.tokensSaved.toLocaleString()} tokens \\u00b7 $${cum.costSaved.toFixed(2)} |`,\n"
    "          '',\n"
    "          '**Tools:** dispatch_task \\u00b7 list_agents \\u00b7 switch_agent \\u00b7 add_custom_agent \\u00b7 check_agent \\u00b7 verify_agent_auth \\u00b7 get_task_report \\u00b7 get_savings_report \\u00b7 get_project_report \\u00b7 qwen_bridge_status',\n"
    "        ].join('\\n'),\n      }],\n    };\n  }\n\n  // -- get_task_report"
)

# 7. get_task_report not-found
rep(
    "      // Phase 7: Beautify auto-finalize / not-found message\n"
    "      const W = 50;",
    "        }],\n      };\n    }\n\n    const report = fs.readFileSync(summaryPath, 'utf-8');",
    "      // Phase 7: Beautify auto-finalize / not-found message\n"
    "      return {\n        content: [{\n          type: 'text' as const,\n          text: [\n"
    "            '## \\ud83d\\udccb Task Report',\n            '',\n"
    "            '| Field | Value |',\n            '|-------|-------|',\n"
    "            `| Task | " + BT + "${path.basename(taskPath)}" + BT + " |`,\n"
    "            `| Status | \\u23f3 Still running... |`,\n"
    "            `| \\ud83d\\udcc4 Raw log | ${fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet'} |`,\n"
    "            '',\n"
    "            '> \\ud83d\\udca1 The report will auto-finalize when output is detected in the result log.',\n"
    "          ].join('\\n'),\n        }],\n      };\n    }\n\n"
    "    const report = fs.readFileSync(summaryPath, 'utf-8');"
)

# 8. get_savings_report
rep(
    "    // Phase 6: Beautify get_savings_report output\n"
    "    const cum = getCumulativeSavings();\n"
    "    const all = loadSavings();\n"
    "    const last5 = all.slice(-5).reverse();\n"
    "    const W = 50;",
    "    }\n\n    return {\n      content: [{ type: 'text' as const, text: lines.join('\\n') }],\n    };\n  }\n\n  // -- get_project_report",
    "    // Phase 6: Beautify get_savings_report output\n"
    "    const cum = getCumulativeSavings();\n"
    "    const all = loadSavings();\n"
    "    const last5 = all.slice(-5).reverse();\n\n"
    "    const lines = [\n"
    "      '## \\ud83d\\udcb0 Savings Report',\n      '',\n"
    "      '### Cumulative',\n      '| Metric | Value |',\n      '|--------|-------|',\n"
    "      `| Total Tasks | ${cum.tasks} |`,\n"
    "      `| Tokens Saved | ~${cum.tokensSaved.toLocaleString()} |`,\n"
    "      `| Cost Saved | $${cum.costSaved.toFixed(2)} |`,\n"
    "    ];\n\n"
    "    if (last5.length > 0) {\n"
    "      lines.push('');\n"
    "      lines.push('### Recent Tasks');\n"
    "      lines.push('| Task | Tokens Saved | Cost Saved |');\n"
    "      lines.push('|------|-------------|------------|');\n"
    "      for (const s of last5.slice(0, 5)) {\n"
    "        const shortName = s.taskName.substring(0, 25);\n"
    "        lines.push(`| ${shortName} | ~${s.tokensSaved.toLocaleString()} | $${s.costSaved.toFixed(2)} |`);\n"
    "      }\n"
    "    }\n\n"
    "    if (cum.tasks > 0) {\n"
    "      lines.push('');\n"
    "      lines.push(`\\ud83d\\udca1 Average: ~${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($${(cum.costSaved / cum.tasks).toFixed(2)}) saved per task.`);\n"
    "    }\n\n"
    "    return {\n"
    "      content: [{ type: 'text' as const, text: lines.join('\\n') }],\n"
    "    };\n  }\n\n  // -- get_project_report"
)

# 9. verify_agent_auth success
rep(
    "            'Auth Verified',\n"
    "            '',\n"
    "            `Agent   : ${agent.name || targetId}`,\n"
    "            `Status  : Authenticated and Ready`,\n"
    "            `Command : ${agent.command}`,\n"
    "            '',\n"
    "            `${agent.name || targetId} is authenticated and responding. Ready to dispatch tasks.`,",
    "          ].join('\\n'),\n        }],\n      };\n    }\n\n    // Auth failed -- analyze the error",
    "            '## Auth Verification',\n"
    "            '',\n"
    "            '| Field | Value |',\n"
    "            '|-------|-------|',\n"
    "            `| Agent | ${agent.name || targetId} |`,\n"
    "            '| Status | \\u2705 Authenticated \\u0026 Ready |',\n"
    "            `| Command | " + BT + "${agent.command}" + BT + " |`,\n"
    "            '',\n"
    "            '\\u2705 Ready to dispatch tasks.',\n"
    "          ].join('\\n'),\n        }],\n      };\n    }\n\n    // Auth failed -- analyze the error"
)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print('\nAll 9 replacements done.')
