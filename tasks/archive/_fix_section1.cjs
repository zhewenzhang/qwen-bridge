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

// Section 1 duplicate cleanup:
// Line 418: new code comment "// Compute display lines for the banner"
// Line 419: empty
// Lines 420-440: OLD duplicate code starting with "// Compute padded lines"
// Line 441+: Get-Content line (part of the fs.writeFileSync)

// Find the old duplicate block start
let oldStart = -1;
let oldEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// Compute padded lines in TypeScript before embedding in PowerShell')) {
    oldStart = i;
    break;
  }
}

if (oldStart < 0) {
  console.log('Old duplicate block not found');
  process.exit(1);
}

// Find the end: the "].join" that closes this old block
for (let i = oldStart; i < lines.length; i++) {
  if (lines[i].includes("].join('\\n') + '\\n', 'utf-8');")) {
    oldEnd = i;
    break;
  }
}

console.log('Removing duplicate old code: lines', oldStart + 1, '-', oldEnd + 1);

// Check what's just before oldStart - there should be an empty line
if (oldStart > 0 && lines[oldStart - 1].trim() === '') {
  oldStart--; // Also remove the empty line before
  console.log('Also removing empty line at', oldStart + 1);
}

replaceRange(oldStart, oldEnd, []);

// WRITE BACK
const output = lines.join(CRLF);
fs.writeFileSync(f, output, 'utf8');

// Verify
const boxCount = (output.match(/[\u2500-\u257F]/g) || []).length;
const padStrCount = (output.match(/padStr/g) || []).length;
console.log('Box-drawing chars remaining:', boxCount);
console.log('padStr references remaining:', padStrCount);
console.log('Total lines:', lines.length);
