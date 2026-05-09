const fs = require('fs');
const p = 'D:/qwen-bridge/src/index.ts';
let c = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
let lines = c.split('\n');

// Fix switch_agent: replace lines 1081-1086 (0-indexed: 1080-1085) 
// The return block shows "Configured Agents" but should show "Agent Switched"
// And remove the duplicate block at 1089-1106

// First, fix the main return at line 1081 (idx 1080)
// Find it: look for "const newLabel = newAgent.label" 
let newLabelIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const newLabel = newAgent.label || newAgent.name;')) {
    newLabelIdx = i;
    break;
  }
}
console.log('newLabelIdx:', newLabelIdx);

// The return { should be 2 lines after newLabel
let retStart = newLabelIdx + 2; // should be line 1081 (idx 1080)
console.log('retStart line:', retStart + 1, JSON.stringify(lines[retStart]));

// Find end of this return block (the }; after the array)
let retEnd = -1;
for (let j = retStart; j < lines.length; j++) {
  if (lines[j].trim() === '};' && j > retStart + 3) {
    retEnd = j;
    break;
  }
}
console.log('retEnd line:', retEnd + 1, JSON.stringify(lines[retEnd]));

// Now check if there's a duplicate switch_agent block after
let dupIdx = -1;
for (let j = retEnd + 1; j < lines.length; j++) {
  if (lines[j].includes('// -- switch_agent') && j > retEnd) {
    dupIdx = j;
    break;
  }
}
console.log('Duplicate block at line:', dupIdx + 1);

// Replace the main return block
const newSwitchReturn = [
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

// Remove the old return block and the duplicate
let removeEnd = retEnd;
if (dupIdx >= 0) {
  // Find end of duplicate block
  for (let j = dupIdx; j < lines.length; j++) {
    if (lines[j].trim() === '}' && j > dupIdx + 5) {
      removeEnd = j;
      break;
    }
  }
}

console.log('Replacing lines ' + (retStart + 1) + ' to ' + (removeEnd + 1));

// Remove everything from retStart to removeEnd (inclusive), insert new block
lines.splice(retStart, removeEnd - retStart + 1, ...newSwitchReturn);

c = lines.join('\n');
fs.writeFileSync(p, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('switch_agent fix DONE. Total lines: ' + lines.length);
