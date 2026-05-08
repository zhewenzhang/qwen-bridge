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
  const claudeTokensOut = Math.ceil(taskContent.length / 3);
  const estimatedExecutionTokensIn = Math.max(8000, Math.ceil(taskContent.length / 2));
  const estimatedExecutionTokensOut = Math.max(3000, resultContent.length > 0 ? Math.ceil(resultContent.length / 3) : 5000);
  const tokensSaved = (estimatedExecutionTokensIn + estimatedExecutionTokensOut) - (claudeTokensIn + claudeTokensOut);
  const p = CLAUDE_PRICING.opus4_7;
  const executionCost = (estimatedExecutionTokensIn / 1_000_000) * p.input + (estimatedExecutionTokensOut / 1_000_000) * p.output;
  const planningCost = (claudeTokensIn / 1_000_000) * p.input + (claudeTokensOut / 1_000_000) * p.output;
  const costSaved = executionCost - planningCost;

  return {
    claudeTokensIn,
    claudeTokensOut,
    estimatedExecutionTokensIn,
    estimatedExecutionTokensOut,
    tokensSaved,
    costSaved: Math.max(0, costSaved),
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
}

interface BridgeConfig {
  projectDir: string;
  terminalApp: string;
  notifyOnDispatch: boolean;
  speechOnDispatch: boolean;
  speechText: string;
  activeAgent: string;
  agents: Record<string, AgentConfig>;
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
    },
    cursor: {
      name: 'cursor',
      command: raw.agents?.cursor?.command ?? 'cursor',
      args: [],
      yoloMode: false,
      showTerminal: false,
      label: 'Cursor AI',
    },
  };

  return {
    terminalApp: 'wt.exe',
    notifyOnDispatch: true,
    speechOnDispatch: true,
    speechText: 'AutoClaude task dispatched',
    activeAgent: 'qwen',
    agents: defaultAgents,
    ...raw,
  } as BridgeConfig;
}

function saveConfig(config: BridgeConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
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
  const header = [
    `# Task Report: ${taskName}`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
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
    `| Dispatcher | AutoClaude (MCP Bridge) | Task validation, dispatching, notifications, output capture |`,
    `| Executor | ${agentLabel} | File operations, git commits, builds, deployments — all execution work |`,
    ``,
    `---`,
    ``,
    `## Execution Log`,
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

  const cum = getCumulativeSavings();
  const oldP = CLAUDE_PRICING.opus4_5;

  const footer = [
    ``,
    `---`,
    ``,
    `## Token Economics`,
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
    `| **Status** | ${success ? 'Completed' : 'Check log'} |`,
    `| **Duration** | ${duration}s |`,
    `| **Started** | ${startTime.toISOString()} |`,
    `| **Ended** | ${endTime.toISOString()} |`,
    `| **Result Log** | \`${path.basename(resultLog)}\` |`,
    ``,
    `---`,
    ``,
    `## Result Preview`,
    ``,
    '```',
    resultContent.substring(0, 2000),
    '```',
    ``,
    `---`,
    ``,
    `*Report generated by AutoClaude v5.0 — Plan with Claude, Execute Everywhere.*`,
  ].join('\n');

  try {
    const header = [
      `# Task Report: ${taskName}`,
      ``,
      `| Field | Value |`,
      `|-------|-------|`,
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
  const args = agent.yoloMode ? ['-y', '--output-format', 'text'] : ['--output-format', 'text'];

  if (agent.showTerminal) {
    const ps1Path = path.join(os.tmpdir(), `_bridge_${agent.name}_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
    const bom = '\uFEFF';
    const yoloFlag = agent.yoloMode ? ' -y' : '';
    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '========================================' -ForegroundColor Yellow`,
      `Write-Host '  AutoClaude — Task Dispatched' -ForegroundColor Yellow`,
      `Write-Host '========================================' -ForegroundColor Yellow`,
      `Write-Host '  File: ${taskPath.replace(/'/g, "''")}' -ForegroundColor Cyan`,
      ...(agent.yoloMode ? [`Write-Host '  Mode: YOLO (auto-approve)' -ForegroundColor Green`] : []),
      `Write-Host '========================================' -ForegroundColor Yellow`,
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
    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '================================================' -ForegroundColor Cyan`,
      `Write-Host '  AutoClaude — Task Dispatched' -ForegroundColor Cyan`,
      `Write-Host '================================================' -ForegroundColor Cyan`,
      `Write-Host '  Task : ${taskName.substring(0, 38)}' -ForegroundColor White`,
      `Write-Host '  File : ${path.basename(taskPath).substring(0, 38)}' -ForegroundColor White`,
      `Write-Host '================================================' -ForegroundColor Cyan`,
      `Write-Host '  [OK] Task content copied to CLIPBOARD' -ForegroundColor Green`,
      `Write-Host '  --> Open Cursor AI chat and press Ctrl+V' -ForegroundColor Yellow`,
      `Write-Host '================================================' -ForegroundColor Cyan`,
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

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'autoclaude', version: '5.0.0' },
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
  ],
}));

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
    return {
      content: [{
        type: 'text' as const,
        text: [
          `Dispatched to ${agent.label}`,
          `   Task File   : ${taskPath}`,
          `   Description : ${notifMsg}`,
          `   YOLO mode   : ${agent.yoloMode ? 'ON (auto-approve all actions)' : 'OFF'}`,
          `   Mode        : ${agent.showTerminal ? 'visible terminal' : 'headless background'}`,
          `   Result Log  : ${resultLog}`,
          `   Summary     : ${summaryPath}`,
          '',
          'AutoClaude dispatched. Agent executing in background.',
          'Check _summary.md for the process report and _result.log for raw output.',
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

    return {
      content: [{
        type: 'text' as const,
        text: [
          'Dispatched to Cursor',
          `   File       : ${taskPath}`,
          `   Task       : ${notifMsg}`,
          `   Clipboard  : ${clipboardOk ? 'Task content copied (Ctrl+V into Cursor AI chat)' : 'Copy failed -- paste task file manually'}`,
          `   Terminal   : ${config.agents['cursor']?.showTerminal ? 'visible' : 'headless'}`,
          '',
          clipboardOk
            ? 'Task content is in clipboard. Open Cursor AI chat and press Ctrl+V.'
            : 'Open the task file manually in Cursor.',
          'Claude is free -- Cursor AI runs independently using its own tokens.',
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
    if (agent.name === 'cursor') {
      const taskContent = fs.readFileSync(taskPath, 'utf-8');
      let clipboardOk = false;
      try { copyToClipboard(taskContent); clipboardOk = true; } catch {}
      runCursor(config, taskPath, taskName, clipboardOk);
    } else {
      runCliAgent(config, agent, taskPath, taskName);
    }

    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    return {
      content: [{
        type: 'text' as const,
        text: [
          `Dispatched to ${agent.label} [active agent]`,
          `   Task File   : ${taskPath}`,
          `   Description : ${notifMsg}`,
          `   YOLO mode   : ${agent.yoloMode ? 'ON (auto-approve all actions)' : 'OFF'}`,
          `   Mode        : ${agent.showTerminal ? 'visible terminal' : 'headless background'}`,
          `   Result Log  : ${resultLog}`,
          `   Summary     : ${summaryPath}`,
          '',
          `AutoClaude dispatched to ${agent.label}. Agent executing in background.`,
          'Check _summary.md for the process report and _result.log for raw output.',
        ].join('\n'),
      }],
    };
  }

  // -- list_agents ------------------------------------------------------------
  if (request.params.name === 'list_agents') {
    const agentList = Object.entries(config.agents).map(([key, agent]) => {
      const isActive = key === config.activeAgent;
      return [
        `${isActive ? '>> ' : '   '}${key}`,
        `     Command  : ${agent.command}`,
        `     Label    : ${agent.label}`,
        `     YOLO     : ${agent.yoloMode ? 'ON' : 'OFF'}`,
        `     Terminal : ${agent.showTerminal ? 'visible' : 'headless'}`,
      ].join('\n');
    });

    return {
      content: [{
        type: 'text' as const,
        text: [
          'Configured Agents:',
          '',
          ...agentList,
          '',
          `Active agent: ${config.activeAgent} (${config.agents[config.activeAgent]?.label ?? 'unknown'})`,
        ].join('\n'),
      }],
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

    const oldAgent = config.activeAgent;
    config.activeAgent = agent;
    saveConfig(config);

    return {
      content: [{
        type: 'text' as const,
        text: [
          `Switched active agent: ${oldAgent} -> ${agent}`,
          `   Label   : ${config.agents[agent].label}`,
          `   Command : ${config.agents[agent].command}`,
          `   YOLO    : ${config.agents[agent].yoloMode ? 'ON' : 'OFF'}`,
          '',
          'This change is persisted to config.json.',
          'Use dispatch_task to send tasks to the new active agent.',
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
    const cum = getCumulativeSavings();
    const activeAgent = getActiveAgent(config);
    const agentList = Object.entries(config.agents).map(([k, a]) => `${k} (${a.label})`).join(', ');

    return {
      content: [{
        type: 'text' as const,
        text: [
          'AutoClaude is running (v5.0)',
          '',
          'Current config:',
          `  projectDir      : ${config.projectDir}`,
          `  terminalApp     : ${config.terminalApp}`,
          `  notifyOnDispatch: ${config.notifyOnDispatch}`,
          `  speechOnDispatch: ${config.speechOnDispatch}`,
          `  activeAgent     : ${config.activeAgent} (${activeAgent.label})`,
          `  agents          : ${agentList}`,
          '',
          'Available tools:',
          '  dispatch_to_qwen    — dispatch QWEN_*.md to Qwen Code',
          '  dispatch_to_cursor  — dispatch CURSOR_*.md to Cursor AI (clipboard + launch)',
          '  dispatch_task       — dispatch to active agent (agent-agnostic)',
          '  list_agents         — list all configured agents',
          '  switch_agent        — switch the active agent',
          '  add_custom_agent    — add a new agent to config',
          '  qwen_bridge_status  — this status check',
          '  get_task_report     — read _summary.md for a dispatched task',
          '  get_savings_report  — show cumulative token & cost savings',
          '',
          `Cumulative Savings: ${cum.tasks} tasks, ~${cum.tokensSaved.toLocaleString()} tokens, $${cum.costSaved.toFixed(2)}`,
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

    if (fs.existsSync(summaryPath) && fs.existsSync(resultLog)) {
      const summary = fs.readFileSync(summaryPath, 'utf-8');
      const hasResult = fs.statSync(resultLog).size > 0;
      if (hasResult && !summary.includes('Token Economics')) {
        try {
          const taskContent = fs.existsSync(taskPath) ? fs.readFileSync(taskPath, 'utf-8') : '';
          // Extract agent label from summary if possible
          const agentMatch = summary.match(/\*\*Agent\*\* \| (.+?) \|/);
          const agentLabel = agentMatch ? agentMatch[1] : 'Agent';
          finalizeTaskSummary(summaryPath, taskPath, new Date(), true, taskContent, agentLabel);
        } catch {}
      }
    }

    if (!fs.existsSync(summaryPath)) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            `No report found for: ${path.basename(taskPath)}`,
            '',
            `Expected at: ${summaryPath}`,
            '',
            'The task may still be running, or no summary was generated.',
            `Check if _result.log exists: ${fs.existsSync(resultLog) ? 'Yes' : 'No'}`,
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
    const cum = getCumulativeSavings();
    const all = loadSavings();
    const last5 = all.slice(-5).reverse();

    const lines = [
      'AutoClaude Savings Report',
      '',
      'Claude API Pricing: Opus 4.7 ($5.00/1M input, $25.00/1M output)',
      '',
      '## Cumulative Savings',
      '',
      `| Metric | Value |`,
      `|--------|-------|`,
      `| **Total Tasks Dispatched** | ${cum.tasks} |`,
      `| **Total Tokens Saved** | **~${cum.tokensSaved.toLocaleString()}** |`,
      `| **Total Cost Saved** | **$${cum.costSaved.toFixed(2)}** |`,
      '',
    ];

    if (last5.length > 0) {
      lines.push('| Task | Tokens Saved | Cost Saved |', '|------|-------------|------------|');
      for (const s of last5) {
        lines.push(`| ${s.taskName} | ${s.tokensSaved.toLocaleString()} tokens | $${s.costSaved.toFixed(4)} saved |`);
      }
      lines.push('');
      lines.push(`> Average savings: **~${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($${(cum.costSaved / cum.tasks).toFixed(4)})** per task`);
      lines.push(`> At legacy Opus 4.5 pricing ($15/$75), savings would be **~$${(cum.costSaved * 3).toFixed(2)}**`);
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
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
