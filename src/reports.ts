import fs from 'node:fs';
import path from 'node:path';
import type { TaskSavings } from './types.js';
import { CLAUDE_PRICING } from './types.js';
import { loadConfig } from './config.js';

const SAVINGS_FILE = '.autoclaude_savings.json';

function getSavingsPath(): string {
  const cfg = loadConfig();
  return path.join(cfg.projectDir, SAVINGS_FILE);
}

export function loadSavings(): TaskSavings[] {
  try { const p = getSavingsPath(); if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch {}
  return [];
}

export function recordSavings(entry: TaskSavings): void {
  const all = loadSavings();
  all.push(entry);
  fs.writeFileSync(getSavingsPath(), JSON.stringify(all, null, 2), 'utf-8');
}

export function getCumulativeSavings(): { tasks: number; tokensSaved: number; costSaved: number } {
  const all = loadSavings();
  return {
    tasks: all.length,
    tokensSaved: all.reduce((s, e) => s + e.tokensSaved, 0),
    costSaved: all.reduce((s, e) => s + e.costSaved, 0),
  };
}

export function estimateTokenSavings(taskContent: string, resultContent: string) {
  const claudeTokensIn = 4000;
  const claudeTokensOut = Math.max(1000, Math.ceil(taskContent.length / 3));
  const hasResult = resultContent && resultContent.length > 10;
  const estimatedExecutionTokensIn = hasResult ? Math.max(8000, Math.ceil(taskContent.length / 2)) : Math.max(10000, Math.ceil(taskContent.length / 2));
  const estimatedExecutionTokensOut = hasResult ? Math.max(3000, Math.ceil(resultContent.length / 3)) : 5000;
  const tokensSaved = (estimatedExecutionTokensIn + estimatedExecutionTokensOut) - (claudeTokensIn + claudeTokensOut);
  const p = CLAUDE_PRICING.opus4_7;
  const executionCost = (estimatedExecutionTokensIn / 1_000_000) * p.input + (estimatedExecutionTokensOut / 1_000_000) * p.output;
  const planningCost = (claudeTokensIn / 1_000_000) * p.input + (claudeTokensOut / 1_000_000) * p.output;
  return { claudeTokensIn, claudeTokensOut, estimatedExecutionTokensIn, estimatedExecutionTokensOut, tokensSaved, costSaved: Math.max(0, executionCost - planningCost) };
}

export function writeTaskSummary(taskPath: string, taskName: string, startTime: Date, agentLabel: string): string {
  const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  const header = [
    `# 📋 Task Report: ${taskName}`,
    '',
    '| 📌 Field | 📝 Value |',
    '|----------|----------|',
    `| **Task File** | \`${path.basename(taskPath)}\` |`,
    `| **Dispatched** | ${startTime.toISOString()} |`,
    `| **Agent** | ${agentLabel} |`,
    '| **Mode** | 🤖 Headless + ⚡ YOLO Auto-Approve |',
    '',
    '---',
    '',
    '## 👥 Who Did What',
    '',
    '| 🧠 Role | 💻 System | 📝 What It Does |',
    '|---------|----------|----------------|',
    '| **Planner** | 🟡 Claude Code | Strategy, architecture, task file, verification |',
    '| **Dispatcher** | 🔵 AutoClaude | Validation, dispatch, notifications, cost tracking |',
    `| **Executor** | 🟢 ${agentLabel} | File operations, git, builds, deployments |`,
    '',
    '---',
    '',
    '## ⏳ Execution Log',
    '',
    `> Check \`${path.basename(resultLog)}\` for live output.`,
    '',
  ].join('\n');
  fs.writeFileSync(summaryPath, header, 'utf-8');
  return summaryPath;
}

export function finalizeTaskSummary(summaryPath: string, taskPath: string, startTime: Date, success: boolean, taskContent: string): void {
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  let resultContent = '';
  try { if (fs.existsSync(resultLog)) resultContent = fs.readFileSync(resultLog, 'utf-8'); } catch {}
  const savings = estimateTokenSavings(taskContent, resultContent);
  const taskName = path.basename(taskPath, '.md');
  recordSavings({ taskName, timestamp: startTime.toISOString(), ...savings });
  const cum = getCumulativeSavings();
  const footer = [
    '',
    '---',
    '',
    '## 💰 Token Economics',
    '',
    `| 🧠 Claude (Planning) | ⚡ Agent (Execution) | 💰 Saved |`,
    `|----------------------|----------------------|----------|`,
    `| ~${(savings.claudeTokensIn + savings.claudeTokensOut).toLocaleString()} tokens | ~${(savings.estimatedExecutionTokensIn + savings.estimatedExecutionTokensOut).toLocaleString()} tokens | **~${savings.tokensSaved.toLocaleString()} tokens** |`,
    `| $${((savings.claudeTokensIn / 1_000_000 * 5) + (savings.claudeTokensOut / 1_000_000 * 25)).toFixed(4)} | $${((savings.estimatedExecutionTokensIn / 1_000_000 * 5) + (savings.estimatedExecutionTokensOut / 1_000_000 * 25)).toFixed(4)} | **$${savings.costSaved.toFixed(4)}** |`,
    '',
    `> 🔥 **${Math.round((1 - (savings.claudeTokensIn + savings.claudeTokensOut) / (savings.estimatedExecutionTokensIn + savings.estimatedExecutionTokensOut)) * 100)}% savings**`,
    '',
    '### 📊 Cumulative',
    `| Total Tasks | ${cum.tasks} | Tokens Saved | **~${cum.tokensSaved.toLocaleString()}** | Cost Saved | **$${cum.costSaved.toFixed(2)}** |`,
    '',
    '---',
    '',
    '## ✅ Completion Status',
    `| Status | ${success ? '✅ Completed' : '⚠️ See log'} | Duration | ${duration}s |`,
    `| Result Log | \`${path.basename(resultLog)}\` |`,
    '',
    `*Report generated by AutoClaude.*`,
  ].join('\n');
  try {
    const taskName2 = path.basename(taskPath, '.md');
    const header = [
      `# 📋 Task Report: ${taskName2}`,
      '',
      '| 📌 Field | 📝 Value |',
      '|----------|----------|',
      `| **Task File** | \`${path.basename(taskPath)}\` |`,
      `| **Dispatched** | ${startTime.toISOString()} |`,
    ].join('\n');
    fs.writeFileSync(summaryPath, header + footer, 'utf-8');
  } catch {}
}

export function updateProjectReport(): void {
  const cfg = loadConfig();
  const reportPath = path.join(cfg.projectDir, 'PROJECT_REPORT.md');
  const all = loadSavings();
  const cum = getCumulativeSavings();
  const lines = [
    '# 📊 AutoClaude Project Report',
    '',
    `> Updated: ${new Date().toISOString()}  |  Tasks: ${cum.tasks}  |  Tokens Saved: ~${cum.tokensSaved.toLocaleString()}  |  Cost Saved: $${cum.costSaved.toFixed(2)}`,
    '',
    '---',
    '',
    '## 👥 Who Does What',
    '',
    '| 🧠 Role | 💻 System | 📝 Responsibility | Avg Tokens/Task |',
    '|---------|----------|-------------------|----------------|',
    '| **Planner** | Claude Code | Strategy, architecture, task writing | ~7,000 |',
    '| **Dispatcher** | AutoClaude | Validation, dispatch, cost tracking | 0 (local) |',
    '| **Executor** | AI Agent | File ops, git, builds, deployments | ~25,000 |',
    '',
    '---',
    '',
    '## 📊 Cumulative Savings',
    '',
    `| **Total Tasks** | ${cum.tasks} | **Tokens Saved** | **~${cum.tokensSaved.toLocaleString()}** | **Cost Saved** | **$${cum.costSaved.toFixed(2)}** |`,
    '',
  ];
  if (all.length > 0) {
    lines.push('## 📋 Task History', '');
    for (const [i, s] of all.entries()) {
      const name = s.taskName.replace(/^QWEN_/, '').replace(/_/g, ' ').substring(0, 30);
      const c = s.claudeTokensIn + s.claudeTokensOut;
      const e = s.estimatedExecutionTokensIn + s.estimatedExecutionTokensOut;
      lines.push(`${i + 1}. ${name} — Claude ~${c.toLocaleString()} · Agent ~${e.toLocaleString()} · **Saved ~${s.tokensSaved.toLocaleString()}**`);
    }
    lines.push('');
  }
  lines.push('*Generated by AutoClaude.*');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
}

const AUTH_PATTERNS: { pattern: RegExp; label: string; fix: string }[] = [
  { pattern: /401|unauthorized|E401/i, label: 'Authentication Required (401)', fix: 'Login with: `{command} login` or `{command} auth`' },
  { pattern: /403|forbidden|access denied/i, label: 'Access Denied (403)', fix: 'Check your subscription plan or API key permissions' },
  { pattern: /429|rate limit|quota exceeded/i, label: 'Rate Limit Hit (429)', fix: 'Wait a few minutes and retry, or upgrade your plan' },
  { pattern: /npm.*login|npm login|npm whoami.*401/i, label: 'NPM Login Required', fix: 'Run: `npm login` in your terminal' },
  { pattern: /gh auth|github.*login|GH_TOKEN/i, label: 'GitHub Auth Required', fix: 'Run: `gh auth login` in your terminal' },
  { pattern: /api key|apikey|API key|set.*key/i, label: 'API Key Required', fix: 'Set your API key: `{command} auth` or environment variable' },
  { pattern: /not found|not recognized|ENOENT|not installed/i, label: 'Command Not Found', fix: 'Install: `{installHint}`' },
  { pattern: /permission denied|EACCES|not allowed/i, label: 'Permission Denied', fix: 'Check file/folder permissions or run as administrator' },
  { pattern: /timeout|timed ?out|ETIMEDOUT/i, label: 'Connection Timeout', fix: 'Check your network connection or proxy settings' },
  { pattern: /trust|untrusted|not trusted/i, label: 'Folder Trust Required', fix: 'Run: `{command} trust` or configure trust settings' },
];

export interface AuthIssue {
  label: string;
  fix: string;
  matchedText: string;
}

export function scanForAuthIssues(resultLogPath: string, agentCommand?: string, installHint?: string): AuthIssue[] {
  const issues: AuthIssue[] = [];
  try {
    if (!fs.existsSync(resultLogPath)) return issues;
    const content = fs.readFileSync(resultLogPath, 'utf-8');
    if (!content || content.length < 5) return issues;

    for (const ap of AUTH_PATTERNS) {
      const match = content.match(ap.pattern);
      if (match) {
        let fix = ap.fix
          .replace('{command}', agentCommand || '<agent>')
          .replace('{installHint}', installHint || 'the tool documentation');
        issues.push({ label: ap.label, fix, matchedText: match[0] });
      }
    }
  } catch {}
  return issues;
}
