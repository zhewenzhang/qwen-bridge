import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Config ───────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

// ─── Token Economics ─────────────────────────────────────────────────────────
const CLAUDE_PRICING = {
  opus4_7: { input: 5.00, output: 25.00 },
  opus4_5: { input: 15.00, output: 75.00 },
};

interface TaskSavings {
  taskName: string;
  timestamp: string;
  claudeTokensIn: number;
  claudeTokensOut: number;
  estimatedExecutionTokensIn: number;
  estimatedExecutionTokensOut: number;
  tokensSaved: number;
  costSaved: number;
}

const SAVINGS_FILE = path.join(__dirname, '..', '.autoclaude_savings.json');

function loadSavings(): TaskSavings[] {
  try {
    if (fs.existsSync(SAVINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SAVINGS_FILE, 'utf-8'));
    }
  } catch {}
  return [];
}

function recordSavings(entry: TaskSavings): void {
  const all = loadSavings();
  all.push(entry);
  fs.writeFileSync(SAVINGS_FILE, JSON.stringify(all, null, 2), 'utf-8');
}

function getCumulativeSavings(): { tasks: number; tokensSaved: number; costSaved: number } {
  const all = loadSavings();
  return {
    tasks: all.length,
    tokensSaved: all.reduce((sum, e) => sum + e.tokensSaved, 0),
    costSaved: all.reduce((sum, e) => sum + e.costSaved, 0),
  };
}

function estimateTokenSavings(taskContent: string, resultContent: string): {
  claudeTokensIn: number;
  claudeTokensOut: number;
  estimatedExecutionTokensIn: number;
  estimatedExecutionTokensOut: number;
  tokensSaved: number;
  costSaved: number;
} {
  const claudeTokensIn = 4000;
  const claudeTokensOut = Math.max(1000, Math.ceil(taskContent.length / 3));
  const hasResult = resultContent && resultContent.length > 10;
  const estimatedExecutionTokensIn = hasResult 
    ? Math.max(8000, Math.ceil(taskContent.length / 2))
    : Math.max(10000, Math.ceil(taskContent.length / 2));
  const estimatedExecutionTokensOut = hasResult
    ? Math.max(3000, Math.ceil(resultContent.length / 3))
    : 5000;
  const tokensSaved = (estimatedExecutionTokensIn + estimatedExecutionTokensOut) - (claudeTokensIn + claudeTokensOut);
  const p = CLAUDE_PRICING.opus4_7;
  const executionCost = (estimatedExecutionTokensIn / 1_000_000) * p.input + (estimatedExecutionTokensOut / 1_000_000) * p.output;
  const planningCost = (claudeTokensIn / 1_000_000) * p.input + (claudeTokensOut / 1_000_000) * p.output;
  const costSaved = Math.max(0, executionCost - planningCost);

  return {
    claudeTokensIn,
    claudeTokensOut,
    estimatedExecutionTokensIn,
    estimatedExecutionTokensOut,
    tokensSaved,
    costSaved,
  };
}

// ─── Agent Config ─────────────────────────────────────────────────────────────
interface AgentConfig {
  name: string;
  command: string;
  args: string[];
  yoloMode: boolean;
  showTerminal: boolean;
  label: string;
  enabled?: boolean;
  type?: string;
}

interface BridgeConfig {
  projectDir: string;
  terminalApp: string;
  notifyOnDispatch: boolean;
  speechOnDispatch: boolean;
  speechText: string;
  activeAgent: string;
  agents: Record<string, AgentConfig>;
  showTerminal?: boolean;
}

function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config not found: ${CONFIG_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Partial<BridgeConfig>;

  const defaultAgents: Record<string, AgentConfig> = {
    qwen: {
      name: 'qwen',
      command: raw.agents?.qwen?.command ?? 'qwen',
      args: ['-y', '--output-format', 'text'],
      yoloMode: true,
      showTerminal: false,
      label: 'Qwen Code',
      enabled: true,
      type: 'cli',
    },
    cursor: {
      name: 'cursor',
      command: raw.agents?.cursor?.command ?? 'cursor',
      args: [],
      yoloMode: false,
      showTerminal: false,
      label: 'Cursor AI',
      enabled: true,
      type: 'clipboard',
    },
  };

  // Merge config.json agents over defaults
  const mergedAgents: Record<string, AgentConfig> = { ...defaultAgents };
  for (const [id, override] of Object.entries(raw.agents ?? {})) {
    const base = mergedAgents[id];
    const ov = override as Record<string, any>;
    if (base) {
      mergedAgents[id] = {
        ...base,
        name: ov.name ?? base.name,
        command: ov.command ?? base.command,
        args: ov.args ?? base.args,
        yoloMode: ov.yoloMode ?? base.yoloMode,
        showTerminal: ov.showTerminal ?? base.showTerminal,
        label: ov.label ?? ov.name ?? base.label,
        enabled: ov.enabled ?? base.enabled,
        type: ov.type ?? base.type,
      };
    } else {
      mergedAgents[id] = {
        name: ov.name ?? id,
        command: ov.command ?? id,
        args: ov.args ?? [],
        yoloMode: Boolean(ov.yoloMode),
        showTerminal: Boolean(ov.showTerminal),
        label: ov.label ?? ov.name ?? id,
        enabled: ov.enabled ?? true,
        type: ov.type ?? 'cli',
      };
    }
  }

  // Phase 1: Ensure every agent has a label (fallback to name)
  for (const agent of Object.values(mergedAgents)) {
    if (!agent.label) agent.label = agent.name;
  }

  return {
    terminalApp: 'wt.exe',
    notifyOnDispatch: true,
    speechOnDispatch: true,
    speechText: 'AutoClaude task dispatched',
    activeAgent: 'qwen',
    ...raw,
    agents: mergedAgents,
  } as BridgeConfig;
}

// Phase 1: saveConfig strips derived fields (label is derived from name)
function saveConfig(config: BridgeConfig): void {
  const clean: Record<string, any> = { ...config };
  const cleanAgents: Record<string, any> = {};
  for (const [id, agent] of Object.entries(config.agents)) {
    const { label, ...rest } = agent as any;
    cleanAgents[id] = rest;
  }
  clean.agents = cleanAgents;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(clean, null, 2), 'utf-8');
}

function getActiveAgent(config: BridgeConfig): AgentConfig {
  return config.agents[config.activeAgent] ?? config.agents.qwen;
}

// ─── Notifications ────────────────────────────────────────────────────────────
function sendWindowsNotification(title: string, message: string): void {
  try {
    const ps = `
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
      $template = [Windows.UI.Notifications.ToastTemplateType]::ToastText02;
      $xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent($template);
      $xml.SelectSingleNode('//text[@id=1]').InnerText = '${title.replace(/'/g, "''")}';
      $xml.SelectSingleNode('//text[@id=2]').InnerText = '${message.replace(/'/g, "''")}';
      $toast = [Windows.UI.Notifications.ToastNotification]::new($xml);
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('AutoClaude').Show($toast);
    `.trim();
    execSync(`powershell -Command "${ps}"`, { timeout: 3000, stdio: 'pipe' });
  } catch {
    try {
      execSync(
        `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; $n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; $n.ShowBalloonTip(3000, '${title}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info); Start-Sleep -Seconds 4; $n.Dispose()"`,
        { timeout: 6000, stdio: 'pipe' }
      );
    } catch {
      // best-effort
    }
  }
}

function sendSpeech(text: string): void {
  try {
    execSync(
      `powershell -Command "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${text.replace(/'/g, "''")}')"`,
      { timeout: 5000, stdio: 'pipe' }
    );
  } catch {
    // best-effort
  }
}

// ─── Clipboard ────────────────────────────────────────────────────────────────
function copyToClipboard(text: string): void {
  const escaped = text.replace(/'/g, "''");
  execSync(
    `powershell -Command "Set-Clipboard -Value '${escaped}'"`,
    { timeout: 5000, stdio: 'pipe' }
  );
}

// ─── Task Summary Reports ─────────────────────────────────────────────────────

function writeTaskSummary(
  taskPath: string,
  taskName: string,
  description: string,
  startTime: Date,
  agentLabel: string
): string {
  const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
  // Phase 9: Beautify _summary.md format
  const header = [
    `# 📋 Task Report: ${taskName}`,
    ``,
    `| 📌 Field | 🗝 Value |`,
    `|----------|----------|`,
    `| **Task File** | \`${path.basename(taskPath)}\` |`,
    `| **Dispatched** | ${startTime.toISOString()} |`,
    `| **Agent** | ${agentLabel} |`,
    `| **Mode** | 🤖 Headless + ⚡ YOLO Auto-Approve |`,
    ``,
    `---`,
    ``,
    `## 👥 Who Did What`,
    ``,
    `| 🧠 Role | 💻 System | 🗝 What It Does |`,
    `|---------|----------|-------------------|`,
    `| **Planner** | 🟡 Claude Code | Strategy, architecture, task file, verification |`,
    `| **Dispatcher** | 🔵 AutoClaude | Validation, dispatch, notifications, cost tracking |`,
    `| **Executor** | 🟢 ${agentLabel} | File operations, git, builds, deployments |`,
    ``,
    `---`,
    ``,
    `## ⏳ Execution Log`,
    ``,
    `> The executor is running. Check \`${path.basename(taskPath.replace(/\.md$/, '_result.log'))}\` for live output.`,
    ``,
  ].join('\n');
  fs.writeFileSync(summaryPath, header, 'utf-8');
  return summaryPath;
}

function finalizeTaskSummary(
  summaryPath: string,
  taskPath: string,
  startTime: Date,
  success: boolean,
  taskContent: string,
  agentLabel: string
): void {
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  let resultContent = '';
  try {
    if (fs.existsSync(resultLog)) {
      resultContent = fs.readFileSync(resultLog, 'utf-8');
    }
  } catch {}

  const savings = estimateTokenSavings(taskContent, resultContent);

  const taskName = path.basename(taskPath, '.md');
  recordSavings({
    taskName,
    timestamp: startTime.toISOString(),
    ...savings,
  });

  try { updateProjectReport(); } catch {}

  const cum = getCumulativeSavings();
  const oldP = CLAUDE_PRICING.opus4_5;

  const footer = [
    ``,
    `---`,
    ``,
    `## 💰 Token Economics`,
    ``,
    `| Metric | Claude (Planning) | ${agentLabel} (Execution) |`,
    `|--------|-------------------|-----------------------|`,
    `| **Tokens In** | ~${savings.claudeTokensIn.toLocaleString()} | ~${savings.estimatedExecutionTokensIn.toLocaleString()} |`,
    `| **Tokens Out** | ~${savings.claudeTokensOut.toLocaleString()} | ~${savings.estimatedExecutionTokensOut.toLocaleString()} |`,
    `| **Estimated Cost** | $${(savings.claudeTokensIn / 1_000_000 * CLAUDE_PRICING.opus4_7.input + savings.claudeTokensOut / 1_000_000 * CLAUDE_PRICING.opus4_7.output).toFixed(4)} | $${(savings.estimatedExecutionTokensIn / 1_000_000 * CLAUDE_PRICING.opus4_7.input + savings.estimatedExecutionTokensOut / 1_000_000 * CLAUDE_PRICING.opus4_7.output).toFixed(4)} |`,
    ``,
    `### Savings This Task`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Tokens Saved** | **~${savings.tokensSaved.toLocaleString()} tokens** |`,
    `| **Cost Saved (Opus 4.7)** | **$${savings.costSaved.toFixed(4)}** |`,
    `| **Cost Saved (Opus 4.5 legacy)** | $${(savings.costSaved * 3).toFixed(4)} (3x at old pricing) |`,
    ``,
    `### Cumulative Savings (All Tasks)`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Total Tasks** | ${cum.tasks} |`,
    `| **Total Tokens Saved** | **~${cum.tokensSaved.toLocaleString()}** |`,
    `| **Total Cost Saved** | **$${cum.costSaved.toFixed(2)}** |`,
    ``,
    `> With AutoClaude, Claude only spends tokens on planning & strategy (~${Math.round(savings.claudeTokensIn + savings.claudeTokensOut).toLocaleString()} tokens/task). The heavy lifting (file edits, git, builds) uses ${agentLabel}'s token pool. That's ${Math.round((1 - (savings.claudeTokensIn + savings.claudeTokensOut) / (savings.estimatedExecutionTokensIn + savings.estimatedExecutionTokensOut)) * 100)}% savings per task.`,
    ``,
    `---`,
    ``,
    `## Completion Status`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| **Status** | ${success ? '✅ Completed' : '⚠️ Check log'} |`,
    `| **Duration** | ${duration}s |`,
    `| **Started** | ${startTime.toISOString()} |`,
    `| **Ended** | ${endTime.toISOString()} |`,
    `| **Result Log** | \`${path.basename(resultLog)}\` |`,
    ``,
    `---`,
    ``,
    `## 📄 Result Preview`,
    ``,
    '```',
    resultContent.substring(0, 2000),
    '```',
    ``,
    `---`,
    ``,
    `*Report generated by AutoClaude v5.3 — Plan with Claude, Execute Everywhere.*`,
  ].join('\n');

  try {
    const header = [
      `# Task Report: ${taskName}`,
      ``,
      `| 📌 Field | 🗝 Value |`,
      `|----------|----------|`,
      `| **Task File** | \`${path.basename(taskPath)}\` |`,
      `| **Dispatched** | ${startTime.toISOString()} |`,
      `| **Agent** | ${agentLabel} |`,
      `| **Mode** | Headless background + YOLO auto-approve |`,
      ``,
      `---`,
      ``,
      `## Role Separation`,
      ``,
      `| Role | System | Responsibility |`,
      `|------|--------|----------------|`,
      `| Planner | Claude Code | Strategy, architecture design, task file authoring, final verification |`,
      `| Dispatcher | AutoClaude (MCP Bridge) | Task validation, dispatching, notifications, output capture, cost tracking |`,
      `| Executor | ${agentLabel} | File operations, git commits, builds, deployments — all execution work |`,
      ``,
    ].join('\n');
    fs.writeFileSync(summaryPath, header + footer, 'utf-8');
  } catch {}
}

// ─── Agent Launch ─────────────────────────────────────────────────────────────

/** Run a CLI agent (Qwen Code, etc.) — headless background or visible terminal tab. */
function runCliAgent(config: BridgeConfig, agent: AgentConfig, taskPath: string, taskName: string): void {
  const resultLog = taskPath.replace(/\.md$/, '_result.log');

  if (agent.showTerminal) {
    const ps1Path = path.join(os.tmpdir(), `_bridge_${agent.name}_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
    const bom = '\uFEFF';
    const yoloFlag = agent.yoloMode ? ' -y' : '';
        // Phase 8: Beautify terminal banner with Unicode boxes
    const agentLabel = agent.label || agent.name;
    const taskBaseName = path.basename(taskPath);

    // Compute padded lines in TypeScript before embedding in PowerShell
    const line1 = '\u2551        AutoClaude \u2014 Task Dispatched          \u2551';
    const line2 = padStr('\u2551  Agent : ' + agentLabel, 44) + '\u2551';
    const line3 = padStr('\u2551  File  : ' + taskBaseName, 44) + '\u2551';
    const line4 = agent.yoloMode
      ? padStr('\u2551  Mode  : \u26a1 YOLO Auto-Approve', 44) + '\u2551'
      : padStr('\u2551  Mode  : \u26a0\ufe0f Manual Confirm', 44) + '\u2551';

    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557' -ForegroundColor Cyan`,
      `Write-Host '${line1}' -ForegroundColor Cyan`,
      `Write-Host '\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563' -ForegroundColor Cyan`,
      `Write-Host '${line2}' -ForegroundColor White`,
      `Write-Host '${line3}' -ForegroundColor White`,
      `Write-Host '${line4}' -ForegroundColor ${agent.yoloMode ? 'Green' : 'Yellow'}`,
      `Write-Host '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d' -ForegroundColor Cyan`,
      `Write-Host ''`,
      `Get-Content '${taskPath.replace(/'/g, "''")}' -Raw | & ${agent.command}${yoloFlag} --output-format text`,
    ].join('\n') + '\n', 'utf-8');
    try {
      spawn(config.terminalApp, ['-w', '0', 'new-tab', '--title', `${agent.label}: ${taskName}`, 'powershell.exe', '-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    } catch {
      spawn('powershell.exe', ['-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    }
  } else {
    const startTime = new Date();
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    writeTaskSummary(taskPath, taskName, taskName, startTime, agent.label);

    const taskContent = fs.readFileSync(taskPath, 'utf-8');
    const formatInstruction = [
      '<!-- AUTOCLAUDE FORMAT INSTRUCTION -->',
      'After completing ALL steps in this task, you MUST output a final section:',
      '',
      '## Completion Checklist',
      '',
      '| Step | Role | Status |',
      '|------|------|--------|',
      '| Planning | Claude | OK |',
      '| Dispatching | AutoClaude | OK |',
      `| Execute task steps | ${agent.label} | OK |`,
      '',
      '## Token Report',
      '- Claude tokens: planning only (~2K-5K input)',
      `- Execution tokens: used by ${agent.label} independently`,
      '',
      '<!-- END FORMAT INSTRUCTION -->',
      '',
    ].join('\n');
    const fullContent = formatInstruction + taskContent;

    const tmpTaskFile = path.join(os.tmpdir(), `_ac_task_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`);
    fs.writeFileSync(tmpTaskFile, fullContent, 'utf-8');

    const batFile = path.join(os.tmpdir(), `_ac_run_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.bat`);
    const batContent = [
      '@echo off',
      `cd /d "${config.projectDir}"`,
      `type "${tmpTaskFile}" | ${agent.command} -y --output-format text > "${resultLog}" 2>&1`,
    ].join('\r\n') + '\r\n';
    fs.writeFileSync(batFile, batContent);

    spawn('cmd.exe', ['/c', 'start', '/min', '', batFile], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    }).unref();
  }
}

/** Show Cursor task banner (terminal mode) or just clipboard + notification (headless). */
function runCursor(config: BridgeConfig, taskPath: string, taskName: string, _clipboardOk: boolean): void {
  const cursorAgent = config.agents['cursor'];
  if (!cursorAgent) return;

  if (cursorAgent.showTerminal) {
    const ps1Path = path.join(os.tmpdir(), `_bridge_cursor_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
    const bom = '\uFEFF';
        // Phase 8: Beautify Cursor terminal banner
    const taskBaseName = path.basename(taskPath);
    const cLine1 = '\u2551        AutoClaude \u2014 Task Dispatched          \u2551';
    const cLine2 = padStr('\u2551  Task : ' + taskName.substring(0, 35), 46) + '\u2551';
    const cLine3 = padStr('\u2551  File : ' + taskBaseName.substring(0, 35), 46) + '\u2551';
    const cLine4 = padStr('\u2551  \u2705 Task content copied to CLIPBOARD', 46) + '\u2551';
    const cLine5 = padStr('\u2551  \u27a1\ufe0f Open Cursor AI chat and press Ctrl+V', 46) + '\u2551';

    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557' -ForegroundColor Cyan`,
      `Write-Host '${cLine1}' -ForegroundColor Cyan`,
      `Write-Host '\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563' -ForegroundColor Cyan`,
      `Write-Host '${cLine2}' -ForegroundColor White`,
      `Write-Host '${cLine3}' -ForegroundColor White`,
      `Write-Host '\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563' -ForegroundColor Cyan`,
      `Write-Host '${cLine4}' -ForegroundColor Green`,
      `Write-Host '${cLine5}' -ForegroundColor Yellow`,
      `Write-Host '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d' -ForegroundColor Cyan`,
      `Write-Host ''`,
      `Write-Host 'Task file content:' -ForegroundColor Gray`,
      `Get-Content '${taskPath.replace(/'/g, "''")}' | Write-Host -ForegroundColor Gray`,
    ].join('\n') + '\n', 'utf-8');
    try {
      spawn(config.terminalApp, ['-w', '0', 'new-tab', '--title', `Cursor: ${taskName}`, 'powershell.exe', '-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    } catch {
      spawn('powershell.exe', ['-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    }
  }

  try {
    spawn(cursorAgent.command, [config.projectDir], { detached: true, stdio: 'ignore', shell: false }).unref();
  } catch {
    // cursor not available, user can open manually
  }
}

// \u2500\u2500\u2500 Project Report \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function updateProjectReport(): void {
  const config = loadConfig();
  const reportPath = path.join(config.projectDir, 'PROJECT_REPORT.md');
  const all = loadSavings();
  const cum = getCumulativeSavings();
  const now = new Date().toISOString();
  
  const lines: string[] = [
    '# \U0001f4ca AutoClaude Project Report',
    '',
    '> Last updated: ' + now,
    '> Total tasks: ' + cum.tasks + ' | Tokens saved: ~' + cum.tokensSaved.toLocaleString() + ' | Cost saved: $' + cum.costSaved.toFixed(2),
    '',
    '---',
    '',
    '## \U0001f4c8 Cumulative Summary',
    '',
    '| Metric | Value |',
    '|--------|-------|',
    '| **Total Tasks Dispatched** | ' + cum.tasks + ' |',
    '| **Total Tokens Saved** | **~' + cum.tokensSaved.toLocaleString() + '** |',
    '| **Total Cost Saved (Opus 4.7)** | **$' + cum.costSaved.toFixed(2) + '** |',
    '| **Total Cost Saved (Opus 4.5 legacy)** | **$' + (cum.costSaved * 3).toFixed(2) + '** |',
    '| **Average Tokens / Task** | ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' |',
    '| **Average Cost / Task** | $' + (cum.tasks > 0 ? (cum.costSaved / cum.tasks).toFixed(3) : '0.00') + ' |',
    '',
    '---',
    '',
    '## \U0001f4cb Task History',
    '',
  ];
  
  if (all.length > 0) {
    lines.push('| # | Task | Date | Claude Tokens | Agent Tokens | Saved | Cost Saved |');
    lines.push('|---|------|------|--------------|-------------|-------|------------|');
    all.forEach((s, i) => {
      const date = new Date(s.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const name = s.taskName.replace(/^QWEN_/, '').replace(/_/g, ' ').substring(0, 30);
      const claudeTotal = s.claudeTokensIn + s.claudeTokensOut;
      const execTotal = s.estimatedExecutionTokensIn + s.estimatedExecutionTokensOut;
      lines.push('| ' + (i + 1) + ' | ' + name + ' | ' + date + ' | ~' + claudeTotal.toLocaleString() + ' | ~' + execTotal.toLocaleString() + ' | **~' + s.tokensSaved.toLocaleString() + '** | $' + s.costSaved.toFixed(3) + ' |');
    });
  } else {
    lines.push('*No tasks completed yet.*');
  }
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## \U0001f465 Role Breakdown');
  lines.push('');
  lines.push('| Role | System | Responsibility | Avg Tokens/Task |');
  lines.push('|------|--------|---------------|-----------------|');
  
  const avgClaude = cum.tasks > 0 ? Math.round((all.reduce((sum, e) => sum + e.claudeTokensIn + e.claudeTokensOut, 0)) / cum.tasks) : 0;
  const avgExec = cum.tasks > 0 ? Math.round((all.reduce((sum, e) => sum + e.estimatedExecutionTokensIn + e.estimatedExecutionTokensOut, 0)) / cum.tasks) : 0;
  
  lines.push('| \U0001f9e0 **Planner** | Claude Code | Strategy, architecture, verification | ~' + avgClaude.toLocaleString() + ' |');
  lines.push('| \U0001f517 **Dispatcher** | AutoClaude | Validation, dispatch, cost tracking | 0 (local) |');
  lines.push('| \u26a1 **Executor** | AI Agent | File ops, git, builds, deploy | ~' + avgExec.toLocaleString() + ' |');
  
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## \U0001f4a1 About This Report');
  lines.push('');
  lines.push('Automatically generated by AutoClaude.');
  lines.push('');
  const enabledCount = Object.keys(config.agents).filter(id => config.agents[id].enabled !== false).length;
  const totalCount = Object.keys(config.agents).length;
  lines.push('> Agents: ' + enabledCount + ' enabled / ' + totalCount + ' total');
  lines.push('');
  lines.push('*AutoClaude v5.3*');
  
  fs.writeFileSync(reportPath, lines.join('\\n'), 'utf-8');
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'autoclaude', version: '5.3.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'dispatch_to_qwen',
      description:
        'AutoClaude dispatches tasks to Qwen Code for background execution. ' +
        'Qwen Code runs headless (no terminal window) in YOLO mode (auto-approve all actions). ' +
        'Output is written to a _result.log file beside the task file. ' +
        'Sends a Windows notification and speech alert. Claude returns immediately. ' +
        'Use this after writing a QWEN_*.md task file.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_file: {
            type: 'string',
            description:
              'Path to the task markdown file. Can be absolute or relative to projectDir. ' +
              'Example: "QWEN_PHASE30_VISUAL_NOTES_IMPACT.md"',
          },
          description: {
            type: 'string',
            description: 'One-line description of the task, used in the notification.',
          },
        },
        required: ['task_file'],
      },
    },
    {
      name: 'dispatch_to_cursor',
      description:
        'Dispatch a task markdown file to Cursor AI for execution. ' +
        'Copies the task content to the Windows clipboard so you can paste it into Cursor AI chat with Ctrl+V. ' +
        'Optionally opens Cursor in the project directory and a terminal banner (if showTerminal is on). ' +
        'Sends a Windows notification and speech alert. Claude returns immediately. ' +
        'Use this after writing a CURSOR_*.md task file.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_file: {
            type: 'string',
            description:
              'Path to the task markdown file. Can be absolute or relative to projectDir. ' +
              'Example: "CURSOR_TEST_RESULTS_SERIES8_EN.md"',
          },
          description: {
            type: 'string',
            description: 'One-line description of the task, used in the notification.',
          },
        },
        required: ['task_file'],
      },
    },
    {
      name: 'dispatch_task',
      description:
        'Dispatch a task to the currently active agent (configured in config.json). ' +
        'The active agent can be switched using the switch_agent tool. ' +
        'Use this for agent-agnostic task dispatching.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_file: {
            type: 'string',
            description: 'Path to the task markdown file.',
          },
          description: {
            type: 'string',
            description: 'One-line description of the task.',
          },
        },
        required: ['task_file'],
      },
    },
    {
      name: 'list_agents',
      description:
        'List all configured agents and show which one is currently active. ' +
        'Agents are defined in config.json with their command, args, yoloMode, and label.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'switch_agent',
      description:
        'Switch the active agent for dispatch_task. ' +
        'This persists across sessions by updating config.json. ' +
        'Use list_agents to see available agents first.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          agent: {
            type: 'string',
            description: 'Name of the agent to switch to (e.g., "qwen", "cursor", or a custom agent name)',
          },
        },
        required: ['agent'],
      },
    },
    {
      name: 'add_custom_agent',
      description:
        'Add a new custom agent to the configuration. ' +
        'The agent will be available for task dispatching after adding. ' +
        'Requires a name, command, and optional label.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          name: {
            type: 'string',
            description: 'Unique name for the agent (used in switch_agent)',
          },
          command: {
            type: 'string',
            description: 'CLI command to invoke the agent (e.g., "qwen", "cursor", "my-agent")',
          },
          label: {
            type: 'string',
            description: 'Human-readable label (defaults to name)',
          },
          yoloMode: {
            type: 'boolean',
            description: 'Whether to auto-approve all actions (default: false)',
          },
        },
        required: ['name', 'command'],
      },
    },
    {
      name: 'qwen_bridge_status',
      description: 'Check that AutoClaude is running and show current config.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'get_task_report',
      description:
        'Read the standardized execution report (_summary.md) for a previously dispatched task. ' +
        'Shows the process breakdown: which steps Claude did vs which steps the executor did. ' +
        'Use this to check task completion status and results.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_file: {
            type: 'string',
            description: 'Path to the original task markdown file. The corresponding _summary.md will be read.',
          },
        },
        required: ['task_file'],
      },
    },
    {
      name: 'get_savings_report',
      description:
        'Show cumulative token and cost savings across all AutoClaude-dispatched tasks. ' +
        'Displays total tokens saved, total money saved, and per-task breakdown. ' +
        'Uses Claude Opus 4.7 API pricing ($5/$25 per 1M tokens).',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'get_project_report',
      description:
        'Read the master project report (PROJECT_REPORT.md) showing cumulative task history, token savings, and role breakdown.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
  ],
}));

// ─── Helper: pad a string to a target length (safe for unicode) ────────────────
function padStr(s: string, len: number) {
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const config = loadConfig();

  // -- dispatch_to_qwen -------------------------------------------------------
  if (request.params.name === 'dispatch_to_qwen') {
    const { task_file, description } = request.params.arguments as {
      task_file: string;
      description?: string;
    };

    const taskPath = path.isAbsolute(task_file)
      ? task_file
      : path.join(config.projectDir, task_file);

    if (!fs.existsSync(taskPath)) {
      return {
        content: [{ type: 'text' as const, text: `File not found: ${taskPath}` }],
        isError: true,
      };
    }

    const taskName = path.basename(taskPath, '.md');
    const notifMsg = description ?? `Task ready: ${taskName}`;
    const agent = getActiveAgent(config);

    if (config.notifyOnDispatch) sendWindowsNotification('AutoClaude', notifMsg);
    if (config.speechOnDispatch) sendSpeech(config.speechText);
    runCliAgent(config, agent, taskPath, taskName);

    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');

    // Phase 5: Beautify dispatch_to_qwen response
    const agentLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\u2705 Auto-Approve ON' : '\u26a0\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';
    const W = 50;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502           Task Dispatched to Qwen Code               \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          `\u2502  Agent   : ${padStr(agentLabel, W - 12)}\u2502`,
          `\u2502  File    : ${padStr(path.basename(taskPath), W - 12)}\u2502`,
          `\u2502  Mode    : ${padStr(modeStr, W - 12)}\u2502`,
          `\u2502  YOLO    : ${padStr(yoloStr, W - 12)}\u2502`,
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          `\u2502  \ud83d\udcc4 Result : ${padStr(path.basename(resultLog), W - 12)}\u2502`,
          `\u2502  \ud83d\udccb Report : ${padStr(path.basename(summaryPath), W - 12)}\u2502`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\ud83d\ude80 Agent executing in background. Check _summary.md when done.',
        ].join('\n'),
      }],
    };
  }

  // -- dispatch_to_cursor -----------------------------------------------------
  if (request.params.name === 'dispatch_to_cursor') {
    const { task_file, description } = request.params.arguments as {
      task_file: string;
      description?: string;
    };

    const taskPath = path.isAbsolute(task_file)
      ? task_file
      : path.join(config.projectDir, task_file);

    if (!fs.existsSync(taskPath)) {
      return {
        content: [{ type: 'text' as const, text: `File not found: ${taskPath}` }],
        isError: true,
      };
    }

    const taskName = path.basename(taskPath, '.md');
    const notifMsg = description ?? `Cursor task ready: ${taskName}`;

    const taskContent = fs.readFileSync(taskPath, 'utf-8');
    let clipboardOk = false;
    try {
      copyToClipboard(taskContent);
      clipboardOk = true;
    } catch {
      // clipboard copy failed, not fatal
    }

    if (config.notifyOnDispatch) {
      sendWindowsNotification('AutoClaude', notifMsg + (clipboardOk ? ' -- Content in clipboard' : ''));
    }
    if (config.speechOnDispatch) {
      sendSpeech(config.speechText + (clipboardOk ? ' -- content in clipboard' : ''));
    }

    runCursor(config, taskPath, taskName, clipboardOk);

    // Phase 5: Beautify dispatch_to_cursor response
    const W = 50;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502           Task Dispatched to Cursor                  \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          `\u2502  File       : ${padStr(path.basename(taskPath), W - 15)}\u2502`,
          `\u2502  Clipboard  : ${padStr(clipboardOk ? '\u2705 Copied (Ctrl+V into Cursor)' : '\u274c Copy failed', W - 15)}\u2502`,
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          clipboardOk
            ? `\u2502  \u27a1\ufe0f ${padStr('Open Cursor AI chat and press Ctrl+V', W - 6)}\u2502`
            : `\u2502  \u26a0\ufe0f ${padStr('Open the task file manually in Cursor', W - 6)}\u2502`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\ud83d\ude80 Claude is free \u2014 Cursor AI runs independently using its own tokens.',
        ].join('\n'),
      }],
    };
  }

  // -- dispatch_task (agent-agnostic) -----------------------------------------
  if (request.params.name === 'dispatch_task') {
    const { task_file, description } = request.params.arguments as {
      task_file: string;
      description?: string;
    };

    const taskPath = path.isAbsolute(task_file)
      ? task_file
      : path.join(config.projectDir, task_file);

    if (!fs.existsSync(taskPath)) {
      return {
        content: [{ type: 'text' as const, text: `File not found: ${taskPath}` }],
        isError: true,
      };
    }

    const taskName = path.basename(taskPath, '.md');
    const notifMsg = description ?? `Task ready: ${taskName}`;
    const agent = getActiveAgent(config);

    if (config.notifyOnDispatch) sendWindowsNotification('AutoClaude', `${notifMsg} [${agent.label}]`);
    if (config.speechOnDispatch) sendSpeech(`${config.speechText} to ${agent.label}`);

    // Cursor uses clipboard model; others use headless CLI model
    if (agent.name === 'cursor' || agent.type === 'clipboard') {
      const taskContent = fs.readFileSync(taskPath, 'utf-8');
      let clipboardOk = false;
      try { copyToClipboard(taskContent); clipboardOk = true; } catch {}
      runCursor(config, taskPath, taskName, clipboardOk);
    } else {
      runCliAgent(config, agent, taskPath, taskName);
    }

    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');

    // Phase 5: Beautify dispatch_task response
    const agentLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\u2705 Auto-Approve ON' : '\u26a0\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';
    const W = 50;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502           Task Dispatched                        \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          `\u2502  Agent   : ${padStr(agentLabel, W - 12)}\u2502`,
          `\u2502  File    : ${padStr(path.basename(taskPath), W - 12)}\u2502`,
          `\u2502  Mode    : ${padStr(modeStr, W - 12)}\u2502`,
          `\u2502  YOLO    : ${padStr(yoloStr, W - 12)}\u2502`,
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          `\u2502  \ud83d\udcc4 Result : ${padStr(path.basename(resultLog), W - 12)}\u2502`,
          `\u2502  \ud83d\udccb Report : ${padStr(path.basename(summaryPath), W - 12)}\u2502`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\ud83d\ude80 Agent executing in background. Check _summary.md when done.',
        ].join('\n'),
      }],
    };
  }

  // -- list_agents ------------------------------------------------------------
  if (request.params.name === 'list_agents') {
    // Phase 3: Beautify list_agents output
    const W = 74;
    const lines = [
      '\u250c' + '\u2500'.repeat(W) + '\u2510',
      '\u2502' + padStr('                         Configured Agents                               ', W) + '\u2502',
      '\u251c' + '\u2500'.repeat(W) + '\u2524',
    ];

    for (const [id, agent] of Object.entries(config.agents)) {
      const active = id === config.activeAgent ? '\u2b50' : '  ';
      const yolo = agent.yoloMode ? '\u2705' : '\u274c';
      const typeIcon = agent.type === 'clipboard' ? '\ud83d\udccb' : '\ud83d\udda5\ufe0f';
      const name = padStr(agent.label || agent.name || id, 18);
      const cmd = padStr(agent.command, 14);
      const enabled = agent.enabled !== false;
      const hint = enabled ? '' : ' (disabled)';
      const row = ` ${active} ${name} ${typeIcon} YOLO:${yolo}  ${cmd}${hint}`;
      lines.push('\u2502' + padStr(row, W) + '\u2502');
    }

    lines.push('\u251c' + '\u2500'.repeat(W) + '\u2524');
    const activeAgent = config.agents[config.activeAgent];
    const activeInfo = `  \u2b50 Active: ${activeAgent?.label || activeAgent?.name || config.activeAgent} \u2014 dispatch_task will use this agent`;
    lines.push('\u2502' + padStr(activeInfo, W) + '\u2502');
    lines.push('\u2514' + '\u2500'.repeat(W) + '\u2518');
    lines.push('');
    lines.push('Switch: switch_agent("<id>")  |  Add custom: add_custom_agent(...)');

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  }

  // -- switch_agent -----------------------------------------------------------
  if (request.params.name === 'switch_agent') {
    const { agent } = request.params.arguments as { agent: string };

    if (!config.agents[agent]) {
      const available = Object.keys(config.agents).join(', ');
      return {
        content: [{
          type: 'text' as const,
          text: `Unknown agent: ${agent}. Available agents: ${available}`,
        }],
        isError: true,
      };
    }

    // Phase 4: Capture old agent name before switching
    const oldAgent = config.agents[config.activeAgent];
    const oldName = oldAgent?.label || oldAgent?.name || config.activeAgent;
    const newAgent = config.agents[agent];

    config.activeAgent = agent;
    saveConfig(config);

    const newLabel = newAgent.label || newAgent.name;
    const W = 42;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502         Agent Switched                    \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          `\u2502  From : ${padStr(oldName, W - 11)}\u2502`,
          `\u2502  To   : ${padStr(newLabel, W - 11)}\u2502`,
          `\u2502  Cmd  : ${padStr(newAgent.command, W - 11)}\u2502`,
          `\u2502  YOLO : ${padStr(newAgent.yoloMode ? '\u2705 ON' : '\u274c OFF', W - 11)}\u2502`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\u2705 All dispatch_task calls will now use this agent.',
          'This change is persisted to config.json.',
        ].join('\n'),
      }],
    };
  }

  // -- add_custom_agent -------------------------------------------------------
  if (request.params.name === 'add_custom_agent') {
    const { name, command, label, yoloMode } = request.params.arguments as {
      name: string;
      command: string;
      label?: string;
      yoloMode?: boolean;
    };

    if (config.agents[name]) {
      return {
        content: [{
          type: 'text' as const,
          text: `Agent "${name}" already exists. Use switch_agent to activate it, or choose a different name.`,
        }],
        isError: true,
      };
    }

    config.agents[name] = {
      name,
      command,
      args: [],
      yoloMode: yoloMode ?? false,
      showTerminal: false,
      label: label ?? name,
    };
    saveConfig(config);

    return {
      content: [{
        type: 'text' as const,
        text: [
          `Added custom agent: ${name}`,
          `   Command : ${command}`,
          `   Label   : ${label ?? name}`,
          `   YOLO    : ${yoloMode ?? false ? 'ON' : 'OFF'}`,
          '',
          'Agent added to config.json. Use switch_agent to activate it.',
        ].join('\n'),
      }],
    };
  }

  // -- qwen_bridge_status -----------------------------------------------------
  if (request.params.name === 'qwen_bridge_status') {
    // Phase 2: Beautify qwen_bridge_status output
    const cum = getCumulativeSavings();
    const agent = getActiveAgent(config);
    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;
    const totalCount = Object.keys(config.agents).length;
    const W = 53;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c' + '\u2500'.repeat(W) + '\u2510',
          '\u2502' + padStr('              AutoClaude v5.3 \u2014 Status               ', W) + '\u2502',
          '\u251c' + '\u2500'.repeat(W) + '\u2524',
          `\u2502  Active Agent : ${padStr(agent.label || agent.name, W - 19)}\u2502`,
          `\u2502  Command      : ${padStr(agent.command, W - 19)}\u2502`,
          `\u2502  YOLO Mode    : ${padStr(agent.yoloMode ? '\u2705 ON' : '\u274c OFF', W - 19)}\u2502`,
          `\u2502  Terminal     : ${padStr(config.showTerminal ? 'visible' : 'headless background', W - 19)}\u2502`,
          '\u251c' + '\u2500'.repeat(W) + '\u2524',
          `\u2502  Agents       : ${padStr(`${enabledCount} enabled / ${totalCount} total`, W - 19)}\u2502`,
          `\u2502  Project Dir  : ${padStr((config.projectDir || '').substring(0, W - 19), W - 19)}\u2502`,
          '\u251c' + '\u2500'.repeat(W) + '\u2524',
          `\u2502  \ud83d\udcb0 Savings  : ${padStr(`${cum.tasks} tasks \u00b7 ${cum.tokensSaved.toLocaleString()} tokens \u00b7 $${cum.costSaved.toFixed(2)}`, W - 19)}\u2502`,
          '\u2514' + '\u2500'.repeat(W) + '\u2518',
          '',
          'Tools: dispatch_task \u00b7 dispatch_to_qwen \u00b7 dispatch_to_cursor',
          '       list_agents \u00b7 switch_agent \u00b7 add_custom_agent',
          '       get_task_report \u00b7 get_savings_report \u00b7 qwen_bridge_status',
        ].join('\n'),
      }],
    };
  }

  // -- get_task_report --------------------------------------------------------
  if (request.params.name === 'get_task_report') {
    const { task_file } = request.params.arguments as { task_file: string };
    const taskPath = path.isAbsolute(task_file)
      ? task_file
      : path.join(config.projectDir, task_file);
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    const resultLog = taskPath.replace(/\.md$/, '_result.log');

    // Auto-finalize: if result log has content, finalize the summary
    if (fs.existsSync(summaryPath) && fs.existsSync(resultLog)) {
      const resultStat = fs.statSync(resultLog);
      const hasContent = resultStat.size > 10;
      const summary = fs.readFileSync(summaryPath, 'utf-8');
      const notFinalized = !summary.includes('Completion Status') && !summary.includes('Token Economics');
      
      if (hasContent && notFinalized) {
        try {
          const taskContent = fs.existsSync(taskPath) ? fs.readFileSync(taskPath, 'utf-8') : '';
          const agentMatch = summary.match(/\*\*Agent\*\* \| (.+?) \|/);
          const agentLabel = agentMatch ? agentMatch[1] : 'Agent';
          finalizeTaskSummary(summaryPath, taskPath, new Date(resultStat.mtime), true, taskContent, agentLabel);
        } catch (e) {
          try {
            const bt = String.fromCharCode(96);
            const footer = '\n\n---\n\n## Completion Status\n\n| Status | \u2705 Completed |\n| Result Log | ' + bt + path.basename(resultLog) + bt + ' |\n\n*Report auto-finalized by get_task_report.*\n';
            fs.appendFileSync(summaryPath, footer, 'utf-8');
          } catch {}
        }
        try { updateProjectReport(); } catch {}
      }
    }

    if (!fs.existsSync(summaryPath)) {
      // Phase 7: Beautify auto-finalize / not-found message
      const W = 50;
      return {
        content: [{
          type: 'text' as const,
          text: [
            '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
            '\u2502            \ud83d\udccb Task Report                        \u2502',
            '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
            `\u2502  Task  : ${padStr(path.basename(taskPath), W - 11)}\u2502`,
            `\u2502  Status: ${padStr('\u23f3 Still running...', W - 11)}\u2502`,
            '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
            `\u2502  \ud83d\udcc4 Raw log: ${padStr(fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet', W - 11)}\u2502`,
            '\u2502  \ud83d\udca1 The report will auto-finalize when output    \u2502',
            '\u2502     is detected in the result log.              \u2502',
            '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          ].join('\n'),
        }],
      };
    }

    const report = fs.readFileSync(summaryPath, 'utf-8');
    return {
      content: [{
        type: 'text' as const,
        text: report,
      }],
    };
  }

  // -- get_savings_report -----------------------------------------------------
  if (request.params.name === 'get_savings_report') {
    // Phase 6: Beautify get_savings_report output
    const cum = getCumulativeSavings();
    const all = loadSavings();
    const last5 = all.slice(-5).reverse();
    const W = 50;

    const lines = [
      '\u250c' + '\u2500'.repeat(W) + '\u2510',
      '\u2502' + padStr('            \ud83d\udcb0 Savings Report                     ', W) + '\u2502',
      '\u251c' + '\u2500'.repeat(W) + '\u2524',
      `\u2502  Tasks     : ${padStr(String(cum.tasks), W - 16)}\u2502`,
      `\u2502  Tokens    : ${padStr(cum.tokensSaved.toLocaleString() + ' saved', W - 16)}\u2502`,
      `\u2502  Cost      : ${padStr('$' + cum.costSaved.toFixed(2) + ' saved', W - 16)}\u2502`,
      '\u251c' + '\u2500'.repeat(W) + '\u2524',
    ];

    if (last5.length > 0) {
      lines.push('\u2502' + padStr('  Recent Tasks:', W) + '\u2502');
      for (const s of last5.slice(0, 5)) {
        const shortName = s.taskName.substring(0, 25);
        const row = `  \ud83d\udccb ${padStr(shortName, 25)} ${s.tokensSaved.toLocaleString().padStart(8)} tk  $${s.costSaved.toFixed(2).padStart(6)}`;
        lines.push('\u2502' + padStr(row, W) + '\u2502');
      }
      lines.push('\u251c' + '\u2500'.repeat(W) + '\u2524');
    }

    lines.push('\u2514' + '\u2500'.repeat(W) + '\u2518');
    if (cum.tasks > 0) {
      lines.push('');
      lines.push(`\ud83d\udca1 Average: ~${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($${(cum.costSaved / cum.tasks).toFixed(3)}) saved per task`);
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  }

  // -- get_project_report -----------------------------------------------------
  if (request.params.name === 'get_project_report') {
    const reportPath = path.join(config.projectDir, 'PROJECT_REPORT.md');
    if (!fs.existsSync(reportPath)) {
      updateProjectReport();
    }
    const report = fs.readFileSync(reportPath, 'utf-8');
    return {
      content: [{ type: 'text' as const, text: report }],
    };
  }

  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` }],
    isError: true,
  };
});

// -- Start ---------------------------------------------------------------------
const transport = new StdioServerTransport();
await server.connect(transport);
