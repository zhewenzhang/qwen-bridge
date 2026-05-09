f = 'D:/qwen-bridge/src/index.ts'
with open(f, 'r', encoding='utf-8') as fh:
    c = fh.read()

# Fix switch_agent response (lines 1080-1095 area)
old = (
    "    const newLabel = newAgent.label || newAgent.name;\n"
    "    const W = 42;\n"
    "    return {\n"
    "      content: [{\n"
    "        type: 'text' as const,\n"
    "        text: [\n"
    "          '\\u2500\\u2500 Agent Switched \\u2500\\u2500',\n"
    "          '',\n"
    "          'From : ' + oldName,\n"
    "          'To   : ' + (newAgent.label || newAgent.name),\n"
    "          'Cmd  : ' + newAgent.command,\n"
    "          'YOLO : ' + (newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF'),\n"
    "          '',\n"
    "          '\\u2705 All dispatch_task calls will now use this agent.',\n"
    "        ].join('\\n')\n"
    "      }],\n"
    "    };\n"
    "\n"
    "  // -- add_custom_agent"
)

new = (
    "    const newLabel = newAgent.label || newAgent.name;\n\n"
    "    return {\n"
    "      content: [{\n"
    "        type: 'text' as const,\n"
    "        text: [\n"
    "          '## Agent Switched',\n"
    "          '',\n"
    "          '| | |',\n"
    "          '|---|---|',\n"
    "          '| From | ${oldName} |',\n"
    "          '| To | ${newLabel} |',\n"
    "          '| YOLO | ' + (newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF') + ' |',\n"
    "          '| Command | \\`${newAgent.command}\\` |',\n"
    "          '',\n"
    "          '\\u2705 All \\`dispatch_task\\` calls will now use ${newLabel}.',\n"
    "          'This change is persisted to \\`config.json\\`.',\n"
    "        ].join('\\n'),\n"
    "      }],\n"
    "    };\n"
    "  }\n\n"
    "  // -- add_custom_agent"
)

if old in c:
    c = c.replace(old, new)
    print('Fixed switch_agent response')
else:
    print('FAIL: pattern not found')
    idx = c.find("const newLabel = newAgent.label || newAgent.name;")
    if idx != -1:
        print(repr(c[idx:idx+300]))

with open(f, 'w', encoding='utf-8') as fh:
    fh.write(c)
