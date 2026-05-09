const fs = require('fs');
const path = require('path');

console.log('=== Verification ===\n');

// 1. Check .autoclaude_savings.json exists with 15 entries
const savingsFile = 'D:/qwen-bridge/.autoclaude_savings.json';
if (fs.existsSync(savingsFile)) {
  const savings = JSON.parse(fs.readFileSync(savingsFile, 'utf8'));
  console.log(`✅ .autoclaude_savings.json: ${savings.length} entries`);
  const totalSaved = savings.reduce((s, e) => s + e.tokensSaved, 0);
  const totalCost = savings.reduce((s, e) => s + e.costSaved, 0);
  console.log(`   Total tokens saved: ${totalSaved.toLocaleString()}`);
  console.log(`   Total cost saved: $${totalCost.toFixed(2)}`);
} else {
  console.log('❌ .autoclaude_savings.json not found');
}

// 2. Check src/index.ts
const src = fs.readFileSync('D:/qwen-bridge/src/index.ts', 'utf8');

// 2a. No U0001f escapes
const hasBadEscapes = /\\U0001f[0-9a-f]{4}/i.test(src);
console.log(`\n${hasBadEscapes ? '❌' : '✅'} Emoji: no \\U0001f escapes: ${!hasBadEscapes}`);

// 2b. Has getVersion
console.log(`${src.includes('function getVersion()') ? '✅' : '❌'} getVersion() function exists`);

// 2c. Server uses getVersion
console.log(`${src.includes('version: getVersion()') ? '✅' : '❌'} Server uses getVersion()`);

// 2d. No hardcoded 5.3.0
console.log(`${!src.includes("'5.3.0'") ? '✅' : '❌'} No hardcoded 5.3.0`);

// 2e. Status banner uses getVersion
console.log(`${src.includes('v${getVersion()}') ? '✅' : '❌'} Status banner uses getVersion()`);

// 2f. Project report scans for unfinalized
console.log(`${src.includes('Scan for unfinalized summaries') ? '✅' : '❌'} get_project_report scans unfinalized`);

// 3. Check package.json version
const pkg = JSON.parse(fs.readFileSync('D:/qwen-bridge/package.json', 'utf8'));
console.log(`\n${pkg.version === '5.5.0' ? '✅' : '❌'} package.json version: ${pkg.version}`);

// 4. Check dist/index.js exists (built)
const distFile = 'D:/qwen-bridge/dist/index.js';
console.log(`\n${fs.existsSync(distFile) ? '✅' : '❌'} dist/index.js exists`);

// 5. Check i18n.js emoji
const i18n = fs.readFileSync('D:/qwen-bridge/i18n.js', 'utf8');
const hasI18nEscapes = /\\[uU][0-9a-fA-F]{4,}/.test(i18n);
console.log(`${hasI18nEscapes ? '❌' : '✅'} i18n.js: no Unicode escapes`);

// 6. Show emoji in source
console.log('\n--- Emoji in src/index.ts ---');
const emojiMatches = src.match(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}]/gu) || [];
const unique = [...new Set(emojiMatches)];
console.log('Unique emoji found:', unique.join(' '));
