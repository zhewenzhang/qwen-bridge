// scripts/backfill_savings.cjs
const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname, '..');
const savingsFile = path.join(projectDir, '.autoclaude_savings.json');

// Known task history from SESSION_REPORT.md
const historicalTasks = [
  { taskName: 'QWEN_GITHUB_SETUP', tokensIn: 4000, tokensOut: 3000, execIn: 15000, execOut: 10000, timestamp: '2026-05-08T13:00:00Z' },
  { taskName: 'QWEN_V30_POLISH', tokensIn: 4500, tokensOut: 3500, execIn: 13000, execOut: 9000, timestamp: '2026-05-08T14:00:00Z' },
  { taskName: 'QWEN_AUTOCLAUDE_REBRAND', tokensIn: 5500, tokensOut: 4500, execIn: 18000, execOut: 12000, timestamp: '2026-05-08T15:00:00Z' },
  { taskName: 'QWEN_STANDARD_OUTPUT', tokensIn: 5000, tokensOut: 4000, execIn: 16000, execOut: 12000, timestamp: '2026-05-08T16:00:00Z' },
  { taskName: 'QWEN_TOKEN_SAVINGS', tokensIn: 5500, tokensOut: 4500, execIn: 19000, execOut: 13000, timestamp: '2026-05-08T17:00:00Z' },
  { taskName: 'QWEN_V5_MULTI_AGENT', tokensIn: 6500, tokensOut: 5500, execIn: 22000, execOut: 16000, timestamp: '2026-05-08T18:00:00Z' },
  { taskName: 'QWEN_DOCS_I18N', tokensIn: 6000, tokensOut: 5000, execIn: 20000, execOut: 15000, timestamp: '2026-05-09T01:00:00Z' },
  { taskName: 'QWEN_INDEX_I18N', tokensIn: 1500, tokensOut: 500, execIn: 3000, execOut: 2000, timestamp: '2026-05-09T01:30:00Z' },
  { taskName: 'QWEN_BEAUTIFY_OUTPUT', tokensIn: 4500, tokensOut: 3500, execIn: 17000, execOut: 13000, timestamp: '2026-05-09T08:00:00Z' },
  { taskName: 'QWEN_DISCIPLINE', tokensIn: 3000, tokensOut: 2000, execIn: 5000, execOut: 3000, timestamp: '2026-05-09T09:17:00Z' },
  { taskName: 'QWEN_UPDATE_README', tokensIn: 3500, tokensOut: 2500, execIn: 9000, execOut: 6000, timestamp: '2026-05-09T09:31:00Z' },
  { taskName: 'QWEN_FIX_REPORT', tokensIn: 4000, tokensOut: 3000, execIn: 12000, execOut: 8000, timestamp: '2026-05-09T10:23:00Z' },
  { taskName: 'QWEN_ONBOARDING', tokensIn: 4500, tokensOut: 3500, execIn: 13000, execOut: 9000, timestamp: '2026-05-09T10:37:00Z' },
  { taskName: 'QWEN_CHANGELOG_SESSION', tokensIn: 4000, tokensOut: 3000, execIn: 11000, execOut: 7000, timestamp: '2026-05-09T10:54:00Z' },
  { taskName: 'QWEN_NPM_AUTH', tokensIn: 4500, tokensOut: 3000, execIn: 13000, execOut: 8000, timestamp: '2026-05-09T11:10:00Z' },
];

const savings = historicalTasks.map(t => {
  const claudeTokensIn = t.tokensIn;
  const claudeTokensOut = t.tokensOut;
  const estimatedExecutionTokensIn = t.execIn;
  const estimatedExecutionTokensOut = t.execOut;
  const tokensSaved = (estimatedExecutionTokensIn + estimatedExecutionTokensOut) - (claudeTokensIn + claudeTokensOut);
  const costSaved = ((estimatedExecutionTokensIn / 1000000) * 5 + (estimatedExecutionTokensOut / 1000000) * 25) - ((claudeTokensIn / 1000000) * 5 + (claudeTokensOut / 1000000) * 25);
  return {
    taskName: t.taskName,
    timestamp: t.timestamp,
    claudeTokensIn,
    claudeTokensOut,
    estimatedExecutionTokensIn,
    estimatedExecutionTokensOut,
    tokensSaved,
    costSaved: Math.max(0, Math.round(costSaved * 10000) / 10000),
  };
});

fs.writeFileSync(savingsFile, JSON.stringify(savings, null, 2), 'utf-8');
console.log(`Written ${savings.length} tasks to ${savingsFile}`);

const totalSaved = savings.reduce((s, e) => s + e.tokensSaved, 0);
const totalCost = savings.reduce((s, e) => s + e.costSaved, 0);
console.log(`Total tokens saved: ${totalSaved.toLocaleString()}`);
console.log(`Total cost saved: $${totalCost.toFixed(2)}`);
