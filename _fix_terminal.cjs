const fs = require('fs');
const f = 'D:/qwen-bridge/src/index.ts';
let s = fs.readFileSync(f, 'utf8');
const CRLF = '\r\n';
let lines = s.split(CRLF);

function replaceRange(startIdx, endIdx, newLinesArr) {
  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx + 1);
  lines = before.concat(newLinesArr, after);
}

function findLineIdx(anchor) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(anchor)) return i;
  }
  return -1;
}

const BT = String.fromCharCode(96);
const SQ = String.fromCharCode(39);
const DQ = String.fromCharCode(34);

// SECTION 1: runCliAgent terminal banner
// The old block is from "// Compute padded lines in TypeScript" (line ~421) 
// through the last Write-Host '' after the box close (line ~440)
{
  const startIdx = findLineIdx('// Compute padded lines in TypeScript before embedding in PowerShell');
  if (startIdx < 0) { console.log('SKIP 1'); }
  else {
    // Find end: line with \u255a followed by Write-Host ''
    let endIdx = startIdx;
    for (let i = startIdx; i < lines.length; i++) {
      // In source, \\u255a is literal text \u255a
      if (lines[i].includes('\\u255a') && lines[i].includes('Write-Host')) {
        if (i + 1 < lines.length && lines[i + 1].includes("Write-Host ''")) {
          endIdx = i + 1;
          break;
        }
      }
    }

    // Build: `Set-Location '${config.projectDir.replace(/'/g, "''")}'`
    const psLoc = '      ' + BT + 'Set-Location ' + SQ + '$' + '{config.projectDir.replace(/' + SQ + '/g, ' + DQ + "''" + DQ + ')}' + SQ + BT + ',';

    const NB = [
      '    // Compute display lines for the banner',
      '    const agentLabel = agent.label || agent.name;',
      '    const taskBaseName = path.basename(taskPath);',
      '    const modeLine = agent.yoloMode',
      "      ? '  Mode  : \\u26a1 YOLO Auto-Approve'",
      "      : '  Mode  : \\u26a0\\ufe0f Manual Confirm';",
      '',
      '    fs.writeFileSync(ps1Path, bom + [',
      psLoc,
      "      " + BT + "Write-Host ''" + BT + ",",
      "      " + BT + "Write-Host '\\u2500\\u2500 AutoClaude \\u2014 Task Dispatched \\u2500\\u2500' -ForegroundColor Cyan" + BT + ",",
      "      " + BT + "Write-Host '  Agent : ${agentLabel}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '  File  : ${taskBaseName}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '${modeLine}' -ForegroundColor ${agent.yoloMode ? 'Green' : 'Yellow'}" + BT + ",",
      "      " + BT + "Write-Host ''" + BT + ",",
    ];

    console.log('SEC 1: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// SECTION 2: runCursor terminal banner
{
  const startIdx = findLineIdx('// Phase 8: Beautify Cursor terminal banner');
  if (startIdx < 0) { console.log('SKIP 2'); }
  else {
    let endIdx = startIdx;
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].includes('\\u255a') && lines[i].includes('Write-Host')) {
        if (i + 1 < lines.length && lines[i + 1].includes("Write-Host ''")) {
          endIdx = i + 1;
          break;
        }
      }
    }

    const psLoc = '      ' + BT + 'Set-Location ' + SQ + '$' + '{config.projectDir.replace(/' + SQ + '/g, ' + DQ + "''" + DQ + ')}' + SQ + BT + ',';

    const NB = [
      '    // Cursor banner \u2014 simple header format',
      '    const taskBaseName = path.basename(taskPath);',
      '',
      '    fs.writeFileSync(ps1Path, bom + [',
      psLoc,
      "      " + BT + "Write-Host ''" + BT + ",",
      "      " + BT + "Write-Host '\\u2500\\u2500 AutoClaude \\u2014 Task Dispatched \\u2500\\u2500' -ForegroundColor Cyan" + BT + ",",
      "      " + BT + "Write-Host '  Task  : ${taskName.substring(0, 35)}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '  File  : ${taskBaseName.substring(0, 35)}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '  \\u2705 Task content copied to CLIPBOARD' -ForegroundColor Green" + BT + ",",
      "      " + BT + "Write-Host '  \\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V' -ForegroundColor Yellow" + BT + ",",
      "      " + BT + "Write-Host ''" + BT + ",",
    ];

    console.log('SEC 2: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// WRITE BACK
const output = lines.join(CRLF);
fs.writeFileSync(f, output, 'utf8');

// Verify
const boxCount = (output.match(/[\u2500-\u257F]/g) || []).length;
const padStrCount = (output.match(/padStr/g) || []).length;
console.log('');
console.log('Box-drawing chars remaining:', boxCount);
console.log('padStr references remaining:', padStrCount);
console.log('Total lines:', lines.length);
