# P2: Code Modularization — 1536 lines → 7 files

## Strategy
Create 6 NEW files + rewrite index.ts as a thin router. Each module is self-contained with clear exports.

## CRITICAL: Do NOT edit src/index.ts. Create NEW files, then REPLACE index.ts entirely.

STEP-BY-STEP:
1. Create each new module file
2. Verify each file exists
3. Replace src/index.ts with the new thin router
4. Run `npx tsc` and fix any errors
5. Commit

## Module 1: `src/types.ts`

Create `D:\qwen-bridge\src\types.ts`:

```typescript
export interface AgentConfig {
  name?: string;
  label?: string;
  command: string;
  type: "cli" | "clipboard";
  yoloFlag?: string;
  yoloMode?: boolean;
  outputFlag?: string;
  installHint?: string;
  enabled?: boolean;
  args?: string[];
  showTerminal?: boolean;
}

export interface BridgeConfig {
  projectDir: string;
  activeAgent: string;
  speechOnDispatch: boolean;
  speechText: string;
  showTerminal: boolean;
  agents: Record<string, AgentConfig>;
}

export interface TaskSavings {
  taskName: string;
  timestamp: string;
  claudeTokensIn: number;
  claudeTokensOut: number;
  estimatedExecutionTokensIn: number;
  estimatedExecutionTokensOut: number;
  tokensSaved: number;
  costSaved: number;
}

export const CLAUDE_PRICING = {
  opus4_7: { input: 5.00, output: 25.00 },
  opus4_5: { input: 15.00, output: 75.00 },
};
```

## Module 2: `src/config.ts`

Create `D:\qwen-bridge\src\config.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BridgeConfig, AgentConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

export const DEFAULT_AGENTS: Record<string, AgentConfig> = {
  qwen: { name: 'Qwen Code', label: 'Qwen Code', command: 'qwen', type: 'cli', yoloFlag: '-y', yoloMode: true, outputFlag: '--output-format text', installHint: 'npm install -g @qwen-code/qwen-code', showTerminal: false, enabled: true },
  gemini: { name: 'Gemini CLI', label: 'Gemini CLI', command: 'gemini', type: 'cli', yoloFlag: '--yolo', yoloMode: true, outputFlag: '', installHint: 'npm install -g @google/gemini-cli', showTerminal: false, enabled: false },
  codex: { name: 'Codex CLI', label: 'Codex CLI', command: 'codex', type: 'cli', yoloFlag: '--approval-mode yolo', yoloMode: true, outputFlag: '', installHint: 'npm install -g @openai/codex', showTerminal: false, enabled: false },
  aider: { name: 'Aider', label: 'Aider', command: 'aider', type: 'cli', yoloFlag: '--yes', yoloMode: true, outputFlag: '', installHint: 'pip install aider-chat', showTerminal: false, enabled: false },
  opencode: { name: 'OpenCode', label: 'OpenCode', command: 'opencode', type: 'cli', yoloFlag: '-y', yoloMode: true, outputFlag: '', installHint: 'npm install -g @opencode-ai/cli', showTerminal: false, enabled: false },
  cline: { name: 'Cline CLI', label: 'Cline CLI', command: 'cline', type: 'cli', yoloFlag: '-y', yoloMode: true, outputFlag: '', installHint: 'npm install -g @cline/cli', showTerminal: false, enabled: false },
  cursor: { name: 'Cursor AI', label: 'Cursor AI', command: 'cursor', type: 'clipboard', yoloFlag: '', yoloMode: false, outputFlag: '', installHint: 'https://cursor.com', showTerminal: false, enabled: false },
};

export function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error(`Config not found: ${CONFIG_PATH}`);
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const savedAgents = raw.agents || {};
  const agents: Record<string, AgentConfig> = { ...DEFAULT_AGENTS };
  for (const [id, cfg] of Object.entries(savedAgents)) {
    agents[id] = { ...agents[id], ...(cfg as Partial<AgentConfig>) } as AgentConfig;
  }
  // Ensure label fallback
  for (const [id, a] of Object.entries(agents)) {
    if (!a.label) a.label = a.name || id;
  }
  return {
    projectDir: raw.projectDir || process.cwd(),
    activeAgent: raw.activeAgent || 'qwen',
    speechOnDispatch: raw.speechOnDispatch ?? true,
    speechText: raw.speechText || 'AutoClaude task dispatched',
    showTerminal: raw.showTerminal ?? false,
    agents,
  };
}

export function saveConfig(config: BridgeConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    projectDir: config.projectDir,
    activeAgent: config.activeAgent,
    speechOnDispatch: config.speechOnDispatch,
    speechText: config.speechText,
    showTerminal: config.showTerminal,
    agents: config.agents,
  }, null, 2), 'utf-8');
}

export function getActiveAgent(config: BridgeConfig): AgentConfig {
  const agent = config.agents[config.activeAgent];
  if (agent && agent.enabled) return agent;
  for (const [id, a] of Object.entries(config.agents)) {
    if (a.enabled && a.type === 'cli') { config.activeAgent = id; saveConfig(config); return a; }
  }
  throw new Error('No enabled CLI agent found.');
}
```

## Module 3: `src/notifications.ts`

Create `D:\qwen-bridge\src\notifications.ts`:

```typescript
import { spawn, execSync } from 'node:child_process';

export function sendWindowsNotification(title: string, message: string): void {
  try {
    const ps = [
      `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;`,
      `$template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;`,
      `$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template);`,
      `$xml.SelectSingleNode('//text[@id=1]').InnerText = '${title.replace(/'/g, "''")}';`,
      `$xml.SelectSingleNode('//text[@id=2]').InnerText = '${message.replace(/'/g, "''")}';`,
      `$toast = [Windows.UI.Notifications.ToastNotification]::new($xml);`,
      `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AutoClaude').Show($toast);`,
    ].join('\n');
    execSync(`powershell -Command "${ps}"`, { timeout: 3000, stdio: 'pipe' });
  } catch {
    try {
      execSync(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(3000, '${title}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info); Start-Sleep -Seconds 4; $n.Dispose()"`, { timeout: 6000, stdio: 'pipe' });
    } catch { /* best-effort */ }
  }
}

export function sendSpeech(text: string): void {
  try {
    execSync(`powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')"`, { timeout: 5000, stdio: 'pipe' });
  } catch { /* best-effort */ }
}

export function copyToClipboard(text: string): void {
  const escaped = text.replace(/'/g, "''");
  execSync(`powershell -Command "Set-Clipboard -Value '${escaped}'"`, { timeout: 5000, stdio: 'pipe' });
}
```

## Module 4: `src/reports.ts`

Create `D:\qwen-bridge\src\reports.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';
import type { TaskSavings, BridgeConfig } from './types.js';
import { CLAUDE_PRICING } from './types.js';
import { loadConfig, CONFIG_PATH } from './config.js';

const SAVINGS_FILE = path.join(path.dirname(CONFIG_PATH), '.autoclaude_savings.json');

export function loadSavings(): TaskSavings[] {
  try { if (fs.existsSync(SAVINGS_FILE)) return JSON.parse(fs.readFileSync(SAVINGS_FILE, 'utf-8')); } catch {}
  return [];
}

export function recordSavings(entry: TaskSavings): void {
  const all = loadSavings();
  all.push(entry);
  fs.writeFileSync(SAVINGS_FILE, JSON.stringify(all, null, 2), 'utf-8');
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
    const header = [
      `# 📋 Task Report: ${taskName}`,
      '',
      '| 📌 Field | 📝 Value |',
      '|----------|----------|',
      `| **Task File** | \`${path.basename(taskPath)}\` |`,
      `| **Dispatched** | ${startTime.toISOString()} |`,
      `| **Agent** | ${path.basename(taskPath, '.md').includes('CURSOR') ? 'Cursor AI' : 'Qwen Code'} |`,
      '',
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
```

## Module 5: `src/agents.ts`

Create `D:\qwen-bridge\src\agents.ts`:

```typescript
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BridgeConfig, AgentConfig } from './types.js';
import { saveConfig, getActiveAgent } from './config.js';
import { writeTaskSummary, finalizeTaskSummary, updateProjectReport } from './reports.js';
import { sendWindowsNotification, sendSpeech, copyToClipboard } from './notifications.js';

export function runCliAgent(config: BridgeConfig, taskPath: string, taskName: string): void {
  const agent = getActiveAgent(config);
  const startTime = new Date();
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  const summaryPath = writeTaskSummary(taskPath, taskName, startTime, agent.label || agent.name || 'Agent');

  const taskContent = fs.readFileSync(taskPath, 'utf-8');
  const formatInstruction = [
    '<!-- AUTOCLAUDE FORMAT INSTRUCTION -->',
    'After completing ALL steps, output:',
    '## Completion Checklist',
    '| Step | Role | Status |',
    '| Planning | Claude | ✅ |',
    '| Dispatching | AutoClaude | ✅ |',
    `| Execute | ${agent.label || agent.name} | ✅ |`,
    '<!-- END FORMAT INSTRUCTION -->',
    '',
  ].join('\n');
  const fullContent = formatInstruction + taskContent;

  if (config.showTerminal) {
    const ps1Path = path.join(os.tmpdir(), `_bridge_${(agent.label || agent.name).replace(/[^a-zA-Z0-9_-]/g, '_')}_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
    const yoloFlag = agent.yoloMode ? (agent.yoloFlag || '-y') : '';
    const bom = '﻿';
    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '========================================' -ForegroundColor Cyan`,
      `Write-Host '  AutoClaude — Task Dispatched' -ForegroundColor Cyan`,
      `Write-Host '  Agent: ${(agent.label || agent.name).replace(/'/g, "''")}' -ForegroundColor White`,
      `Write-Host '  File: ${path.basename(taskPath).replace(/'/g, "''")}' -ForegroundColor White`,
      `Write-Host '========================================' -ForegroundColor Cyan`,
      `Write-Host ''`,
      `Get-Content '${taskPath.replace(/'/g, "''")}' -Raw | & ${agent.command}${yoloFlag ? ' ' + yoloFlag : ''}${agent.outputFlag ? ' ' + agent.outputFlag : ''}`,
    ].join('\n') + '\n', 'utf-8');
    try {
      spawn('wt.exe', ['-w', '0', 'new-tab', '--title', `Agent: ${taskName}`, 'powershell.exe', '-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    } catch {
      spawn('powershell.exe', ['-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    }
    return;
  }

  // Headless mode
  const tmpTaskFile = path.join(os.tmpdir(), `_ac_task_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`);
  fs.writeFileSync(tmpTaskFile, fullContent, 'utf-8');
  const agentFlags = [agent.yoloMode ? (agent.yoloFlag || '-y') : '', agent.outputFlag || ''].filter(Boolean).join(' ');
  const batFile = path.join(os.tmpdir(), `_ac_run_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.bat`);
  fs.writeFileSync(batFile, ['@echo off', `cd /d "${config.projectDir}"`, `type "${tmpTaskFile}" | ${agent.command} ${agentFlags} > "${resultLog}" 2>&1`].join('\r\n') + '\r\n');
  spawn('cmd.exe', ['/c', 'start', '/min', '', batFile], { detached: true, stdio: 'ignore', shell: false }).unref();
}

export function runClipboardAgent(config: BridgeConfig, taskPath: string, clipboardOk: boolean): void {
  const agent = getActiveAgent(config);
  try { spawn(agent.command, [config.projectDir], { detached: true, stdio: 'ignore', shell: false }).unref(); } catch {}
}

export function listAgents(config: BridgeConfig): string[] {
  const lines = ['## Configured Agents', ''];
  lines.push('| | Agent | Type | YOLO | Command | Status |');
  lines.push('|---|-------|------|------|---------|--------|');
  for (const [id, a] of Object.entries(config.agents)) {
    const star = id === config.activeAgent ? '⭐' : ' ';
    const yolo = a.yoloMode ? '✅' : '❌';
    const typeIcon = a.type === 'clipboard' ? '📋' : '🖥️';
    const name = (a.label || a.name || id).padEnd(18);
    const cmd = '`' + a.command + '`'.padEnd(18);
    const status = a.enabled ? 'Enabled' : 'Disabled';
    lines.push(`| ${star} | ${name} | ${typeIcon} | ${yolo} | ${cmd} | ${status} |`);
  }
  lines.push('');
  const active = config.agents[config.activeAgent];
  lines.push(`**Active:** ${active?.label || active?.name || config.activeAgent} — all dispatch_task calls use this agent.`);
  lines.push('');
  lines.push('Switch with `switch_agent("<id>")` · Add custom with `add_custom_agent(...)`');
  return lines;
}

export function switchAgent(config: BridgeConfig, agentId: string): { old: string; oldName: string; newAgent: AgentConfig } {
  const old = config.activeAgent;
  const oldName = config.agents[old]?.label || config.agents[old]?.name || old;
  if (!config.agents[agentId]) throw new Error(`Unknown agent: ${agentId}`);
  if (!config.agents[agentId].enabled) throw new Error(`Agent ${agentId} is not enabled.`);
  config.activeAgent = agentId;
  saveConfig(config);
  return { old, oldName, newAgent: config.agents[agentId] };
}

export function checkAgentInstalled(config: BridgeConfig, agentId: string): { found: boolean; path_info: string; version_info: string } {
  const agent = config.agents[agentId];
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);
  let found = false, path_info = '', version_info = '';
  try { path_info = execSync(`where ${agent.command}`, { timeout: 3000, encoding: 'utf-8', stdio: 'pipe' }).trim().split('\n')[0]; found = true; } catch {}
  if (found) {
    try { version_info = execSync(`${agent.command} --version`, { timeout: 5000, encoding: 'utf-8', stdio: 'pipe' }).trim().split('\n')[0].substring(0, 80); } catch {}
    if (!agent.enabled) { agent.enabled = true; saveConfig(config); }
  }
  return { found, path_info, version_info };
}

export function verifyAgentAuth(config: BridgeConfig, agentId: string): { success: boolean; output: string; error: string; timedOut: boolean } {
  const agent = config.agents[agentId] || getActiveAgent(config);
  const testPrompt = 'Say "AUTOCLAUDE_AUTH_OK" only. Do not create files. Do not run commands.';
  const tmpFile = path.join(os.tmpdir(), '_ac_auth_test.txt');
  fs.writeFileSync(tmpFile, testPrompt, 'utf-8');
  const yoloFlag = agent.yoloMode ? (agent.yoloFlag || '-y') : '';
  const cmd = `type "${tmpFile}" | ${agent.command} ${yoloFlag} ${agent.outputFlag || ''}`.trim();
  let output = '', error = '', timedOut = false;
  try { output = execSync(cmd, { timeout: 30000, encoding: 'utf-8', stdio: 'pipe', shell: true }); } catch (e: any) { error = e.stderr || e.stdout || e.message || ''; if (e.killed) timedOut = true; }
  try { fs.unlinkSync(tmpFile); } catch {}
  return { success: output.includes('AUTOCLAUDE_AUTH_OK'), output, error, timedOut };
}
```

## Module 6: `src/tools.ts` (tool definitions)

Create `D:\qwen-bridge\src\tools.ts`:

```typescript
export function getToolDefinitions() {
  return [
    {
      name: 'dispatch_task',
      description: 'Dispatch a task file to the currently active AI coding agent. Use list_agents to see available agents, switch_agent to change. CLI agents run in background with auto-approve. Clipboard agents copy task to clipboard.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the task markdown file.' }, description: { type: 'string', description: 'One-line task description.' } }, required: ['task_file'] },
    },
    {
      name: 'dispatch_to_qwen',
      description: 'Dispatch a task to Qwen Code specifically (legacy). Prefer dispatch_task for agent-agnostic dispatching.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string' }, description: { type: 'string' } }, required: ['task_file'] },
    },
    {
      name: 'dispatch_to_cursor',
      description: 'Dispatch a task to Cursor AI (clipboard). Copies task content to clipboard.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string' }, description: { type: 'string' } }, required: ['task_file'] },
    },
    {
      name: 'list_agents',
      description: 'List all configured AI coding agents. Shows which are enabled, disabled, and active.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'switch_agent',
      description: 'Switch the active agent. All subsequent dispatch_task calls use this agent.',
      inputSchema: { type: 'object' as const, properties: { agent: { type: 'string', description: 'Agent ID to switch to (e.g. "qwen", "gemini").' } }, required: ['agent'] },
    },
    {
      name: 'add_custom_agent',
      description: 'Register a custom CLI tool as an agent.',
      inputSchema: { type: 'object' as const, properties: { name: { type: 'string' }, command: { type: 'string' }, yolo_flag: { type: 'string' }, output_flag: { type: 'string' }, install_hint: { type: 'string' } }, required: ['name', 'command'] },
    },
    {
      name: 'check_agent',
      description: 'Verify a CLI agent command exists in PATH. Auto-enables found agents.',
      inputSchema: { type: 'object' as const, properties: { agent_id: { type: 'string' } }, required: ['agent_id'] },
    },
    {
      name: 'verify_agent_auth',
      description: 'Check if an agent can authenticate and run. Sends a test prompt.',
      inputSchema: { type: 'object' as const, properties: { agent_id: { type: 'string' } } },
    },
    {
      name: 'get_task_report',
      description: 'Read the standardized execution report (_summary.md) for a dispatched task.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string' } }, required: ['task_file'] },
    },
    {
      name: 'get_savings_report',
      description: 'Show cumulative token and cost savings across all tasks.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'get_project_report',
      description: 'Read the master project report (PROJECT_REPORT.md).',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'qwen_bridge_status',
      description: 'Check AutoClaude status and current configuration.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
  ];
}
```

## Module 7: REPLACE `src/index.ts`

After all 6 modules are created, REPLACE the entire `src/index.ts` with:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { BridgeConfig } from './types.js';
import { loadConfig, saveConfig, getActiveAgent } from './config.js';
import { getToolDefinitions } from './tools.js';
import { runCliAgent, runClipboardAgent, listAgents, switchAgent, checkAgentInstalled, verifyAgentAuth } from './agents.js';
import { getCumulativeSavings, updateProjectReport, finalizeTaskSummary, loadSavings, writeTaskSummary } from './reports.js';
import { sendWindowsNotification, sendSpeech, copyToClipboard } from './notifications.js';

function getVersion(): string {
  try { return JSON.parse(readFileSync(path.join(import.meta.dirname || '.', '..', 'package.json'), 'utf-8')).version || '5.5.0'; } catch { return '5.5.0'; }
}

const server = new Server({ name: 'autoclaude', version: getVersion() }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: getToolDefinitions() }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const config = loadConfig();
  const name = request.params.name;
  const args = request.params.arguments as Record<string, any>;

  try {
    // --- dispatch_task ---
    if (name === 'dispatch_task') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text', text: '❌ File not found: ' + taskPath }], isError: true };
      const agent = getActiveAgent(config);
      const taskName = path.basename(taskPath, '.md');
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', `${agent.label || agent.name}: ${args.description || taskName}`); sendSpeech(config.speechText); }
      if (agent.type === 'clipboard') {
        let ok = false;
        try { copyToClipboard(fs.readFileSync(taskPath, 'utf-8')); ok = true; } catch {}
        runClipboardAgent(config, taskPath, ok);
        return { content: [{ type: 'text', text: '── Task Dispatched (Clipboard) ──\n\nAgent: ' + (agent.label || agent.name) + '\nTask: ' + path.basename(taskPath) + '\nClipboard: ' + (ok ? '✅ Copied' : '⚠️ Failed') + '\n\n' + (ok ? 'Open agent and paste (Ctrl+V).' : 'Open task file manually.') }] };
      }
      runCliAgent(config, taskPath, taskName);
      return { content: [{ type: 'text', text: '── Task Dispatched ──\n\nAgent: ' + (agent.label || agent.name || config.activeAgent) + '\nTask: ' + path.basename(taskPath) + '\nMode: ' + (config.showTerminal ? 'Visible' : 'Headless Background') + '\nYOLO: ' + (agent.yoloMode ? '✅ ON' : '❌ OFF') + '\n\n📄 Result: ' + path.basename(taskPath.replace(/\.md$/, '_result.log')) + '\n📋 Report: ' + path.basename(taskPath.replace(/\.md$/, '_summary.md')) + '\n\n🚀 Agent executing in background.' }] };
    }

    // --- dispatch_to_qwen ---
    if (name === 'dispatch_to_qwen') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text', text: '❌ File not found: ' + taskPath }], isError: true };
      const agent = config.agents['qwen'] || getActiveAgent(config);
      const taskName = path.basename(taskPath, '.md');
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', args.description || taskName); sendSpeech(config.speechText); }
      runCliAgent(config, taskPath, taskName);
      return { content: [{ type: 'text', text: '── Task Dispatched ──\n\nAgent: ' + (agent.label || agent.name || 'Qwen Code') + '\nTask: ' + path.basename(taskPath) + '\nYOLO: ' + (agent.yoloMode ? '✅ ON' : '❌ OFF') + '\n\n🚀 Running in background.' }] };
    }

    // --- dispatch_to_cursor ---
    if (name === 'dispatch_to_cursor') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text', text: '❌ File not found: ' + taskPath }], isError: true };
      let ok = false;
      try { copyToClipboard(fs.readFileSync(taskPath, 'utf-8')); ok = true; } catch {}
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', (args.description || path.basename(taskPath)) + (ok ? ' — Copied' : '')); sendSpeech(config.speechText); }
      runClipboardAgent(config, taskPath, ok);
      return { content: [{ type: 'text', text: '── Cursor Task ──\n\nTask: ' + path.basename(taskPath) + '\nClipboard: ' + (ok ? '✅ Copied' : '⚠️ Failed') + '\n\n' + (ok ? 'Open Cursor and paste (Ctrl+V).' : 'Open task file manually.') }] };
    }

    // --- list_agents ---
    if (name === 'list_agents') return { content: [{ type: 'text', text: listAgents(config).join('\n') }] };

    // --- switch_agent ---
    if (name === 'switch_agent') {
      try {
        const { old, oldName, newAgent } = switchAgent(config, args.agent);
        return { content: [{ type: 'text', text: '── Agent Switched ──\n\nFrom: ' + oldName + '\nTo: ' + (newAgent.label || newAgent.name) + '\nCmd: ' + newAgent.command + '\nYOLO: ' + (newAgent.yoloMode ? '✅ ON' : '❌ OFF') + '\n\n✅ All dispatch_task calls will now use this agent.' }] };
      } catch (e: any) { return { content: [{ type: 'text', text: '❌ ' + e.message }], isError: true }; }
    }

    // --- add_custom_agent ---
    if (name === 'add_custom_agent') {
      const id = args.name?.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'custom';
      if (config.agents[id]?.enabled) return { content: [{ type: 'text', text: '⚠️ Agent "' + id + '" already exists.' }], isError: true };
      config.agents[id] = { name: args.name, command: args.command, type: 'cli', yoloFlag: args.yolo_flag || '', yoloMode: true, outputFlag: args.output_flag || '', installHint: args.install_hint || '', showTerminal: false, enabled: true };
      saveConfig(config);
      return { content: [{ type: 'text', text: '✅ Custom agent "' + args.name + '" (' + id + ') added.\n\nUse switch_agent("' + id + '") to activate.' }] };
    }

    // --- check_agent ---
    if (name === 'check_agent') {
      try {
        const { found, path_info, version_info } = checkAgentInstalled(config, args.agent_id);
        const agent = config.agents[args.agent_id];
        return { content: [{ type: 'text', text: (found ? '✅ ' : '❌ ') + (agent?.label || agent?.name || args.agent_id) + (found ? ' is installed' : ' is NOT installed') + '\n\nCommand: `' + (agent?.command || '?') + '`\nFound: ' + (found ? 'Yes ✅' : 'No ❌') + (found && path_info ? '\nPath: `' + path_info + '`' : '') + (found && version_info ? '\nVersion: ' + version_info : '') + (!found ? '\nInstall: `' + (agent?.installHint || '?') + '`' : '') }] };
      } catch (e: any) { return { content: [{ type: 'text', text: '❌ ' + e.message }], isError: true }; }
    }

    // --- verify_agent_auth ---
    if (name === 'verify_agent_auth') {
      const targetId = args.agent_id || config.activeAgent;
      const agent = config.agents[targetId];
      if (!agent) return { content: [{ type: 'text', text: '❌ Unknown agent: ' + targetId }], isError: true };
      if (agent.type === 'clipboard') return { content: [{ type: 'text', text: '📋 Clipboard agent — auth verification not applicable.' }] };
      const { success, output, error, timedOut } = verifyAgentAuth(config, targetId);
      if (success) return { content: [{ type: 'text', text: '── Auth Verified ──\n\nAgent: ' + (agent.label || agent.name || targetId) + '\nStatus: ✅ Ready\nCommand: ' + agent.command }] };
      return { content: [{ type: 'text', text: '── Auth Failed ──\n\nAgent: ' + (agent.label || agent.name || targetId) + '\nStatus: ' + (timedOut ? '⏰ Timeout' : '❌ Failed') + '\n\n' + (error || output || '(no output)').substring(0, 300) + '\n\nRun: ' + agent.command + ' auth' }] };
    }

    // --- get_task_report ---
    if (name === 'get_task_report') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
      const resultLog = taskPath.replace(/\.md$/, '_result.log');
      if (fs.existsSync(summaryPath) && fs.existsSync(resultLog) && fs.statSync(resultLog).size > 10) {
        const summary = fs.readFileSync(summaryPath, 'utf-8');
        if (!summary.includes('Completion Status') && !summary.includes('Token Economics')) {
          try { const tc = fs.existsSync(taskPath) ? fs.readFileSync(taskPath, 'utf-8') : ''; finalizeTaskSummary(summaryPath, taskPath, new Date(), true, tc); } catch {}
        }
      }
      try { updateProjectReport(); } catch {}
      if (!fs.existsSync(summaryPath)) return { content: [{ type: 'text', text: '⚠️ No report yet. Task may still be running.' }] };
      return { content: [{ type: 'text', text: fs.readFileSync(summaryPath, 'utf-8') }] };
    }

    // --- get_savings_report ---
    if (name === 'get_savings_report') {
      const cum = getCumulativeSavings();
      return { content: [{ type: 'text', text: '── 💰 Savings Report ──\n\nTotal Tasks: ' + cum.tasks + '\nTokens Saved: ~' + cum.tokensSaved.toLocaleString() + '\nCost Saved: $' + cum.costSaved.toFixed(2) + '\nAvg/Task: ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' tokens' }] };
    }

    // --- get_project_report ---
    if (name === 'get_project_report') {
      try { updateProjectReport(); } catch {}
      const rp = path.join(config.projectDir, 'PROJECT_REPORT.md');
      return { content: [{ type: 'text', text: fs.existsSync(rp) ? fs.readFileSync(rp, 'utf-8') : 'No report yet.' }] };
    }

    // --- qwen_bridge_status ---
    if (name === 'qwen_bridge_status') {
      const cum = getCumulativeSavings();
      const agent = getActiveAgent(config);
      const enabledCount = Object.values(config.agents).filter(a => a.enabled).length;
      const totalCount = Object.keys(config.agents).length;
      return { content: [{ type: 'text', text: '── AutoClaude ' + getVersion() + ' ──\n\nActive Agent: ' + (agent.label || agent.name) + ' (`' + config.activeAgent + '`)\nCommand: ' + agent.command + '\nYOLO Mode: ' + (agent.yoloMode ? '✅ ON' : '❌ OFF') + '\nTerminal: ' + (config.showTerminal ? 'visible' : 'headless background') + '\nAgents: ' + enabledCount + ' enabled / ' + totalCount + ' total\nProject Dir: ' + config.projectDir + '\n💰 Savings: ' + cum.tasks + ' tasks · ' + cum.tokensSaved.toLocaleString() + ' tokens · $' + cum.costSaved.toFixed(2) }] };
    }

  } catch (e: any) {
    return { content: [{ type: 'text', text: '❌ Internal error: ' + (e.message || String(e)) }], isError: true };
  }

  return { content: [{ type: 'text', text: 'Unknown tool: ' + name }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Build & Verify

```bash
cd D:\qwen-bridge
npx tsc
```

If compilation errors: fix import paths, fix type mismatches. The modules use `.js` extensions in imports because TypeScript compiles to ESM.

After build succeeds:
```bash
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | timeout 5 node dist/index.js | grep -c '"name"'
```
Should return 12 tools.

## Commit

```bash
git add -A
git commit -m "P2: Code modularization — 1536 lines split into 7 files (types, config, agents, reports, notifications, tools, index)"
git push origin main
```
