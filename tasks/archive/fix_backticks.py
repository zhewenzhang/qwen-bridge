#!/usr/bin/env python3
"""Fix escaped backticks in template literals."""
f = 'D:/qwen-bridge/src/index.ts'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# The problem: inside template literals, raw backticks break parsing.
# We need ` to be \`  inside template literals.
# Find patterns like "`${...}`" inside template literals and fix them.

# Pattern: space + backtick + dollar + curly -> space + backslash + backtick + dollar + curly
import re

# Fix: backtick followed by ${ inside a template literal context
# These appear as: `... ` followed by ${  (backtick not preceded by backslash)
# We need to escape them as \`

# Specific patterns to fix - raw backtick before ${ in template literal strings
fixes = [
    # list_agents line 1028
    ("| `${agent.command}` | ${status} |`);", "| \\`${agent.command}\\` | ${status} |`);"),
    # list_agents active line 1033
    ("all `dispatch_task` calls use this agent.`);", "all \\`dispatch_task\\` calls use this agent.`);"),
    # qwen_bridge_status
    ("(`${agent.name}`) |`,", "(\\`${agent.name}\\`) |`,"),
    ("| `${config.projectDir || ''}` |`,", "| \\`${config.projectDir || ''}\\` |`,"),
    # get_task_report
    ("`| Task | `${path.basename(taskPath)}` |`,", "`| Task | \\`${path.basename(taskPath)}\\` |`,"),
    # verify_agent_auth
    ("`| Command | `${agent.command}` |`,", "`| Command | \\`${agent.command}\\` |`,"),
]

for old, new in fixes:
    count = c.count(old)
    print(f"Replacing '{old[:50]}...' x{count}")
    c = c.replace(old, new)

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
print('Done')
