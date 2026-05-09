const fs = require('fs');
const f = 'D:/qwen-bridge/src/index.ts';
let s = fs.readFileSync(f, 'utf8');

function rep(startText, endText, replacement) {
  const si = s.indexOf(startText);
  if (si === -1) { console.log('NOT FOUND:', startText.substring(0, 60)); return; }
  const ei = s.indexOf(endText, si + startText.length);
  if (ei === -1) { console.log('END NOT FOUND:', endText.substring(0, 60)); return; }
  s = s.substring(0, si) + replacement + s.substring(ei + endText.length);
  console.log('OK:', startText.substring(0, 50));
}

// 1. dispatch_to_qwen
rep(
  '    // Phase 5: Beautify dispatch_to_qwen response\n    const agentLabel = agent.label || agent.name;\n    const yoloStr = agent.yoloMode ? ' + String.fromCharCode(92) + 'u2705 Auto-Approve ON' : ' + String.fromCharCode(92) + 'u26a0' + String.fromCharCode(92) + 'ufe0f Manual Confirm';\n    const modeStr = agent.showTerminal ? ' + String.fromCharCode(39) + 'Visible Terminal' : ' + String.fromCharCode(39) + 'Headless Background';\n    const W = 50;',
  '    };\n  }\n\n  // -- dispatch_to_cursor',
  '    // Phase 5: Beautify dispatch_to_qwen response\n    const agentLabel = agent.label || agent.name;\n    const yoloStr = agent.yoloMode ? ' + String.fromCharCode(92) + 'u2705 ON' : ' + String.fromCharCode(92) + 'u274c OFF';\n    const modeStr = agent.showTerminal ? ' + String.fromCharCode(39) + 'Visible Terminal' : ' + String.fromCharCode(39) + 'Headless Background';\n\n    return {\n      content: [{\n        type: ' + String.fromCharCode(39) + 'text' + String.fromCharCode(39) + ' as const,\n        text: [\n          ' + String.fromCharCode(39) + '## ' + String.fromCharCode(92) + 'u2705 Task Dispatched' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| Field | Value |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '|-------|-------|' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| Agent |  |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| Task |  |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| Mode |  |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| YOLO |  |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| Output | File |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '|--------|------|' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| ' + String.fromCharCode(92) + 'ud83d' + String.fromCharCode(92) + 'udcc4 Result Log |  |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + '| ' + String.fromCharCode(92) + 'ud83d' + String.fromCharCode(92) + 'udccb Process Report |  |' + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + String.fromCharCode(39) + ',\n          ' + String.fromCharCode(39) + String.fromCharCode(92) + 'ud83d' + String.fromCharCode(92) + 'ude80 Agent executing in background. Check _summary.md when done.' + String.fromCharCode(39) + ',\n        ].join(' + String.fromCharCode(92) + 'n' + String.fromCharCode(39) + '),\n      }],\n    };\n  }\n\n  // -- dispatch_to_cursor'
);

fs.writeFileSync(f, s, 'utf8');
console.log('Done with replacement 1');
