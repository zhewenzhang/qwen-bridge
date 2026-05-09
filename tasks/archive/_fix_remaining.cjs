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

// Find orphaned old code in section 1 (lines 418-420 after partial replacement)
{
  const idx = findLineIdx('// Phase 8: Beautify terminal banner with Unicode boxes');
  if (idx >= 0) {
    console.log('Removing orphaned old code at line', idx + 1, '-', idx + 3);
    replaceRange(idx, idx + 2, [
      '    // Compute display lines for the banner',
    ]);
  }
}

// Section 2: runCursor - find the full old block
{
  const idx = findLineIdx('// Phase 8: Beautify Cursor terminal banner');
  if (idx < 0) { console.log('SKIP cursor section'); }
  else {
    // The old block starts at idx and goes through the Write-Host '' after \u255a line
    // Find the end by looking for the line with ╚ (U+255A) in Write-Host
    let endIdx = idx;
    const zz = '\u255a'; // Actual Unicode character ╚
    for (let i = idx; i < lines.length; i++) {
      if (lines[i].includes(zz) && lines[i].includes('Write-Host')) {
        if (i + 1 < lines.length && lines[i + 1].includes("Write-Host ''")) {
          endIdx = i + 1;
          break;
        }
      }
    }
    
    console.log('Cursor section: replacing lines', idx + 1, '-', endIdx + 1);

    const BT = String.fromCharCode(96);
    const SQ = String.fromCharCode(39);
    const DQ = String.fromCharCode(34);
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

    replaceRange(idx, endIdx, NB);
  }
}

// WRITE BACK
const output = lines.join(CRLF);
fs.writeFileSync(f, output, 'utf8');

// Verify
const boxCount = (output.match(/[\u2500-\u257F]/g) || []).length;
const padStrCount = (output.match(/padStr/g) || []).length;
console.log('Box-drawing chars remaining:', boxCount);
console.log('padStr references remaining:', padStrCount);
console.log('Total lines:', lines.length);
