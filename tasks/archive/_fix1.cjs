const fs = require('fs');
const f = 'D:/qwen-bridge/src/index.ts';
const s = fs.readFileSync(f, 'utf8');

// Build the old text using actual Unicode characters
const B1 = '\u2551';  // ║ - actual Unicode
const B2 = '\u2554';  // ╔
const B3 = '\u2550';  // ═
const B4 = '\u2557';  // ╗
const B5 = '\u2560';  // ╠
const B6 = '\u2563';  // ╣
const B7 = '\u255a';  // ╚
const B8 = '\u255d';  // ╝
const BT = String.fromCharCode(96);  // backtick

// Find the old runCliAgent block
const marker1 = 'Phase 8: Beautify terminal banner with Unicode boxes';
const si1 = s.indexOf(marker1);
if (si1 < 0) { console.log('NOT FOUND: marker1'); process.exit(1); }

// Show exact chars at the start of the block
console.log('=== runCliAgent block start ===');
const start1 = si1 - 8;  // Include the leading spaces and comment slashes
console.log('At index', start1);

// Find the end: the line `Write-Host ''`, before Get-Content
// Look for the pattern that includes B7 (╝) followed by Write-Host ''
let ei1 = si1;
for (let i = si1; i < s.length; i++) {
  if (s[i] === B7 && s.substring(i, i + 50).includes("Write-Host")) {
    // Found the ╚ line; next line should be Write-Host ''
    const nextNewline = s.indexOf('\n', i);
    if (nextNewline > 0) {
      const nextLine = s.substring(nextNewline + 1, nextNewline + 30);
      if (nextLine.includes("Write-Host ''")) {
        ei1 = nextNewline + 1 + "Write-Host ''".length + 1;  // Include the comma and newline
        // Actually let's be more precise
        const writeHostIdx = s.indexOf("Write-Host ''", nextNewline);
        if (writeHostIdx > 0) {
          // Find the end of this line (comma or newline)
          const lineEnd = s.indexOf(',', writeHostIdx);
          if (lineEnd > 0 && lineEnd < writeHostIdx + 30) {
            ei1 = lineEnd + 1;  // Include the comma
          }
        }
        break;
      }
    }
  }
}

console.log('Old block 1: index', si1, 'to', ei1);
console.log('Length:', ei1 - si1);
const oldBlock1 = s.substring(si1, ei1);
console.log('First 100 chars:', oldBlock1.substring(0, 100));
console.log('Last 50 chars:', oldBlock1.substring(ei1 - si1 - 50));

// Build new replacement
const H = '\u2500';
const newText1 =
  '    // Compute display lines for the banner\n' +
  '    const agentLabel = agent.label || agent.name;\n' +
  '    const taskBaseName = path.basename(taskPath);\n' +
  '    const modeLine = agent.yoloMode\n' +
  "      ? '  Mode  : \u26a1 YOLO Auto-Approve'\n" +
  "      : '  Mode  : \u26a0\ufe0f Manual Confirm';\n" +
  '\n' +
  '    fs.writeFileSync(ps1Path, bom + [\n' +
  '      ' + BT + "Set-Location '${config.projectDir.replace(/'/g, \"''\")}'" + BT + ',\n' +
  '      ' + BT + "Write-Host ''" + BT + ',\n' +
  '      ' + BT + "Write-Host '" + H + H + " AutoClaude \u2014 Task Dispatched " + H + H + "' -ForegroundColor Cyan" + BT + ',\n' +
  '      ' + BT + "Write-Host '  Agent : ${agentLabel}' -ForegroundColor White" + BT + ',\n' +
  '      ' + BT + "Write-Host '  File  : ${taskBaseName}' -ForegroundColor White" + BT + ',\n' +
  '      ' + BT + "Write-Host '${modeLine}' -ForegroundColor ${agent.yoloMode ? 'Green' : 'Yellow'}" + BT + ',\n' +
  '      ' + BT + "Write-Host ''" + BT + ',';

// Now do the replacement
const newS = s.substring(0, si1) + newText1 + s.substring(ei1);
fs.writeFileSync(f, newS, 'utf8');
console.log('\nReplaced runCliAgent block');
console.log('New file size:', newS.length);
