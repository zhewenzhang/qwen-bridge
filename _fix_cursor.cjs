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

// Fix the cursor section:
// Lines 500-511 have the new code (missing closing)
// Lines 512-534 have the old code (needs to be removed)
// Need to add the closing "].join('\n') + '\n', 'utf-8');" after line 511

// Find "Write-Host ''" at line 510 (0-indexed: 510) that's part of new cursor code
// Then find "const taskBaseName" at line 512 that starts the old code

let newCodeEnd = -1;
let oldCodeStart = -1;
let oldCodeEnd = -1;

for (let i = 0; i < lines.length; i++) {
  // Find the new code's last "Write-Host ''" followed by old code
  if (lines[i].includes("Write-Host ''") && i > 500 && i < 520) {
    // Check if next lines have the old pattern
    if (i + 2 < lines.length && lines[i + 2].includes("cLine1")) {
      newCodeEnd = i;
      oldCodeStart = i + 1; // The line after Write-Host '' which might be empty or the const
      break;
    }
  }
}

if (newCodeEnd < 0) {
  console.log('Could not find the split point');
  process.exit(1);
}

// Find the end of old code: the "].join" line
for (let i = oldCodeStart; i < lines.length; i++) {
  if (lines[i].includes("].join('\\n') + '\\n', 'utf-8');")) {
    oldCodeEnd = i;
    break;
  }
}

console.log('New code ends at line:', newCodeEnd + 1);
console.log('Old code: lines', oldCodeStart + 1, '-', oldCodeEnd + 1);

// Replace: keep new code, add closing, remove old code
// Replace from (newCodeEnd + 1) to oldCodeEnd with just the closing line
replaceRange(newCodeEnd + 1, oldCodeEnd, [
  "    ].join('\\n') + '\\n', 'utf-8');",
]);

// WRITE BACK
const output = lines.join(CRLF);
fs.writeFileSync(f, output, 'utf8');

// Verify
const boxCount = (output.match(/[\u2500-\u257F]/g) || []).length;
const padStrCount = (output.match(/padStr/g) || []).length;
console.log('Box-drawing chars remaining:', boxCount);
console.log('padStr references remaining:', padStrCount);
console.log('Total lines:', lines.length);
