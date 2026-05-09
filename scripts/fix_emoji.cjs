const fs = require('fs');
const path = 'D:/qwen-bridge/src/index.ts';
let content = fs.readFileSync(path, 'utf8');

// Fix backslash + emoji → just emoji
const emojiRanges = /\\([\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}])/gu;
const before = content.length;
content = content.replace(emojiRanges, '$1');
const diff = before - content.length;

console.log(`Removed ${diff} stray backslashes before emoji`);
fs.writeFileSync(path, content, 'utf8');

// Verify
const lines = content.split('\n');
[549, 556, 569, 590, 598, 599, 605].forEach(n => {
  const line = lines[n - 1];
  const hasBackslash = line.includes('\\📊') || line.includes('\\📈') || line.includes('\\📋') || line.includes('\\👥') || line.includes('\\🧠') || line.includes('\\🔗') || line.includes('\\💡');
  console.log(`Line ${n}: backslash=${hasBackslash}`);
});
