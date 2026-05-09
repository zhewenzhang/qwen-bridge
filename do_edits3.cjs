const fs = require('fs');
const p = 'D:/qwen-bridge/src/index.ts';
let c = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
let lines = c.split('\n');

function findLine(pattern, startFrom = 0) {
  for (let i = startFrom; i < lines.length; i++) {
    if (lines[i].includes(pattern)) return i;
  }
  return -1;
}

// Edit 4: list_agents
let idx = findLine("// -- list_agents");
if (idx >= 0) {
  let endIdx = -1;
  for (let j = idx; j < lines.length; j++) {
    if (lines[j] === '  }' && j + 1 < lines.length && lines[j + 1].trim() === '' && j + 2 < lines.length && lines[j + 2].includes('// -- switch_agent')) {
      endIdx = j;
      break;
    }
  }
  if (endIdx < 0) {
    // fallback: find next "  }" after the return statement
    for (let j = idx; j < lines.length; j++) {
      if (lines[j].trim() === '}' && j > idx + 5) {
        endIdx = j;
        break;
      }
    }
  }
  
  if (endIdx >= 0) {
    const newBlock = [
      "  // -- list_agents ------------------------------------------------------------",
      "  if (request.params.name === 'list_agents') {",
      "    const activeAgent = config.agents[config.activeAgent];",
      "    return {",
      "      content: [{ type: 'text' as const, text: [",
      "          '\\u2500\\u2500 Configured Agents \\u2500\\u2500',",
      "          '',",
      "          ...Object.entries(config.agents).map(([id, a]) => {",
      "            const star = id === config.activeAgent ? '\\u2b50' : ' ';",
      "            const yolo = a.yoloMode ? '\\u2705' : '\\u274c';",
      "            const typeIcon = a.type === 'clipboard' ? '\\ud83d\\udccb' : '\\ud83d\\udda5\\ufe0f';",
      "            const name = (a.label || a.name || id).padEnd(18);",
      "            const cmd = a.command.padEnd(12);",
      "            const disabled = a.enabled ? '' : ' (disabled)';",
      "            return star + ' ' + name + typeIcon + ' YOLO:' + yolo + '  ' + cmd + disabled;",
      "          }),",
      "          '',",
      "          'Active: ' + (activeAgent?.label || activeAgent?.name || config.activeAgent) + ' \\u2014 switch_agent(\"<id>\") to change',",
      "        ].join('\\n') }],",
      "    };",
      "  }"
    ];
    lines.splice(idx, endIdx - idx + 1, ...newBlock);
    console.log('Edit 4 (list_agents): DONE at line ' + (idx + 1) + ' to ' + (endIdx + 1));
  } else {
    console.log('Edit 4 (list_agents): END NOT FOUND');
  }
} else {
  console.log('Edit 4 (list_agents): START NOT FOUND');
}

// Rejoin
c = lines.join('\n');
lines = c.split('\n');

// Edit 5: switch_agent - find the return with duplicate array blocks
idx = findLine("// -- switch_agent");
if (idx >= 0) {
  // Find the return { with the broken pattern (two adjacent arrays)
  let retStart = -1;
  for (let j = idx; j < lines.length; j++) {
    if (lines[j].trim() === 'return {') {
      // Check if this is the main return (not the error return)
      if (j + 3 < lines.length && lines[j + 2].includes("type: 'text' as const,")) {
        retStart = j;
        break;
      }
    }
  }
  
  if (retStart >= 0) {
    // Check if it has the broken pattern (two arrays without text: on first)
    let hasBrokenPattern = false;
    for (let j = retStart; j < Math.min(retStart + 30, lines.length); j++) {
      if (lines[j].includes('Agent Switched')) {
        hasBrokenPattern = true;
        break;
      }
    }
    
    if (hasBrokenPattern) {
      let retEnd = -1;
      for (let j = retStart; j < lines.length; j++) {
        if (lines[j].trim() === '};' && j > retStart + 5) {
          // Check if next non-empty line is "// -- add_custom_agent"
          for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
            if (lines[k].includes('// -- add_custom_agent') || lines[k].includes('add_custom_agent')) {
              retEnd = j;
              break;
            }
          }
          if (retEnd >= 0) break;
        }
      }
      
      if (retEnd >= 0) {
        const newSwitch = [
          "    return {",
          "      content: [{",
          "        type: 'text' as const,",
          "        text: [",
          "          '\\u2500\\u2500 Agent Switched \\u2500\\u2500',",
          "          '',",
          "          'From : ' + oldName,",
          "          'To   : ' + (newAgent.label || newAgent.name),",
          "          'Cmd  : ' + newAgent.command,",
          "          'YOLO : ' + (newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF'),",
          "          '',",
          "          '\\u2705 All dispatch_task calls will now use this agent.',",
          "        ].join('\\n')",
          "      }],",
          "    };"
        ];
        lines.splice(retStart, retEnd - retStart + 1, ...newSwitch);
        console.log('Edit 5 (switch_agent): DONE at line ' + (retStart + 1) + ' to ' + (retEnd + 1));
      } else {
        console.log('Edit 5 (switch_agent): END NOT FOUND');
      }
    } else {
      console.log('Edit 5 (switch_agent): Already fixed or pattern not found');
    }
  } else {
    console.log('Edit 5 (switch_agent): return NOT FOUND');
  }
} else {
  console.log('Edit 5 (switch_agent): START NOT FOUND');
}

c = lines.join('\n');
fs.writeFileSync(p, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('All edits done.');
