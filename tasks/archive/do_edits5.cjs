const fs = require('fs');
const p = 'D:/qwen-bridge/src/index.ts';
let c = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
let lines = c.split('\n');

// Find line 1094 (0-indexed 1093): "    };"  and line 1095 (idx 1094): "" and line 1096 (idx 1095): "// -- add_custom_agent"
// We need to insert "  }" between them

// Find the exact position: after switch_agent's return };
let switchReturnEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// -- add_custom_agent')) {
    // Look back for the };
    switchReturnEnd = i - 1;
    break;
  }
}
console.log('Insert closing brace at line:', switchReturnEnd);
console.log('Line content:', JSON.stringify(lines[switchReturnEnd]));
console.log('Next line:', JSON.stringify(lines[switchReturnEnd + 1]));

// Insert "  }" before the add_custom_agent comment
lines.splice(switchReturnEnd + 1, 0, '  }');

c = lines.join('\n');
fs.writeFileSync(p, c.replace(/\n/g, '\r\n'), 'utf8');
console.log('Done. Total lines:', lines.length);
