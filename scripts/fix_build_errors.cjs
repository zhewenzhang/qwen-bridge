const fs = require('fs');
const P = 'D:/qwen-bridge/src/index.ts';
let c = fs.readFileSync(P, 'utf8');

// Fix 1: Status banner template literal
c = c.replace(
  "`              AutoClaude v${'{getVersion()}'()} \\u2014 Status               `",
  "`              AutoClaude v${getVersion()} \\u2014 Status               `"
);
console.log('Fixed status banner template');

// Fix 2: finalizeTaskSummary needs agentLabel (6 args)
c = c.replace(
  'finalizeTaskSummary(summaryPath, taskPath, new Date(), true, taskContent);',
  'finalizeTaskSummary(summaryPath, taskPath, new Date(), true, taskContent, \'Qwen Code\');'
);
console.log('Fixed finalizeTaskSummary args');

fs.writeFileSync(P, c, 'utf8');

// Verify
const L = c.split('\n');
console.log('\nLine 1165 now:', L[1164].trim().substring(0, 100));
console.log('Line 1307 now:', L[1306].trim().substring(0, 100));
