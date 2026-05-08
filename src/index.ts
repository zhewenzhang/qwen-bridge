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

interface BridgeConfig {
  projectDir: string;
  qwenCommand: string;
  cursorCommand: string;
  terminalApp: string;
  notifyOnDispatch: boolean;
  speechOnDispatch: boolean;
  speechText: string;
  showTerminal: boolean;
  yoloMode: boolean;
}

function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config not found: ${CONFIG_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Partial<BridgeConfig>;
  return {
    cursorCommand: 'cursor',
    showTerminal: false,
    yoloMode: true,
    ...raw,
  } as BridgeConfig;
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
  // Escape single quotes for PowerShell here-string
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
  success: boolean
): void {
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  let resultPreview = '';
  try {
    if (fs.existsSync(resultLog)) {
      resultPreview = fs.readFileSync(resultLog, 'utf-8').substring(0, 2000);
    }
  } catch {}

  const footer = [
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
    `## Result Preview`,
    ``,
    '```',
    resultPreview,
    '```',
    ``,
    `---`,
    ``,
    `*Report generated by AutoClaude v4.0 — Plan with Claude, Execute Everywhere.*`,
  ].join('\n');

  try {
    fs.appendFileSync(summaryPath, footer, 'utf-8');
  } catch {}
}

// ─── Qwen / Cursor Launch ─────────────────────────────────────────────────────

/** Run Qwen Code — headless background (default) or visible terminal tab. */
function runQwen(config: BridgeConfig, taskPath: string, taskName: string): void {
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  const args = config.yoloMode ? ['-y', '--output-format', 'text'] : ['--output-format', 'text'];

  if (config.showTerminal) {
    // Visible terminal: open Windows Terminal tab, show banner, pipe task to qwen
    const ps1Path = path.join(os.tmpdir(), `_bridge_qwen_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
    const bom = '﻿';
    const yoloFlag = config.yoloMode ? ' -y' : '';
    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '========================================' -ForegroundColor Yellow`,
      `Write-Host '  AutoClaude — Task Dispatched' -ForegroundColor Yellow`,
      `Write-Host '========================================' -ForegroundColor Yellow`,
      `Write-Host '  File: ${taskPath.replace(/'/g, "''")}' -ForegroundColor Cyan`,
      ...(config.yoloMode ? [`Write-Host '  Mode: YOLO (auto-approve)' -ForegroundColor Green`] : []),
      `Write-Host '========================================' -ForegroundColor Yellow`,
      `Write-Host ''`,
      `Get-Content '${taskPath.replace(/'/g, "''")}' -Raw | & ${config.qwenCommand}${yoloFlag} --output-format text`,
    ].join('\n') + '\n', 'utf-8');
    try {
      spawn(config.terminalApp, ['-w', '0', 'new-tab', '--title', `Qwen: ${taskName}`, 'powershell.exe', '-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    } catch {
      spawn('powershell.exe', ['-NoExit', '-File', ps1Path], { detached: true, stdio: 'ignore', shell: false }).unref();
    }
  } else {
    // Headless: direct spawn qwen via its .cmd wrapper, pipe task to stdin, capture output to log
    const startTime = new Date();
    const summaryPath = writeTaskSummary(taskPath, taskName, taskName, startTime, 'Qwen Code');

    // Prepend format instructions to task content
    const taskContent = fs.readFileSync(taskPath, 'utf-8');
    const formatInstruction = [
      '<!-- AUTOCLAUDE FORMAT INSTRUCTION -->',
      'After completing ALL steps in this task, you MUST output a final section:',
      '',
      '## Completion Checklist',
      '',
      '| Step | Role | Status |',
      '|------|------|--------|',
      '| Planning | Claude | ✅ |',
      '| Dispatching | AutoClaude | ✅ |',
      '| Execute task steps | Qwen Code | ✅ |',
      '',
      '## Token Report',
      '- Claude tokens: planning only (~2K-5K input)',
      '- Execution tokens: used by Qwen Code independently',
      '',
      '<!-- END FORMAT INSTRUCTION -->',
      '',
    ].join('\n');
    const fullContent = formatInstruction + taskContent;

    const logFd = fs.openSync(resultLog, 'w');
    const child = spawn(config.qwenCommand, args, {
      stdio: ['pipe', logFd, logFd],
      shell: true,
    });
    child.stdin!.write(fullContent);
    child.stdin!.end();
    child.on('close', (code) => {
      try { fs.closeSync(logFd); } catch {}
      finalizeTaskSummary(summaryPath, taskPath, startTime, code === 0);
    });
    child.unref();
  }
}

/** Show Cursor task banner (terminal mode) or just clipboard + notification (headless). */
function runCursor(config: BridgeConfig, taskPath: string, taskName: string, _clipboardOk: boolean): void {
  if (config.showTerminal) {
    const ps1Path = path.join(os.tmpdir(), `_bridge_cursor_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
    const bom = '﻿';
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

  // Try to launch Cursor (non-blocking, failure is OK)
  try {
    spawn(config.cursorCommand, [config.projectDir], { detached: true, stdio: 'ignore', shell: false }).unref();
  } catch {
    // cursor not available, user can open manually
  }
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'autoclaude', version: '4.0.0' },
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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const config = loadConfig();

  // ── dispatch_to_qwen ──────────────────────────────────────────────────────
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
        content: [{ type: 'text' as const, text: `❌ File not found: ${taskPath}` }],
        isError: true,
      };
    }

    const taskName = path.basename(taskPath, '.md');
    const notifMsg = description ?? `Task ready: ${taskName}`;

    if (config.notifyOnDispatch) sendWindowsNotification('AutoClaude', notifMsg);
    if (config.speechOnDispatch) sendSpeech(config.speechText);
    runQwen(config, taskPath, taskName);

    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    return {
      content: [{
        type: 'text' as const,
        text: [
          '✅ Dispatched to Qwen Code',
          `   Task File   : ${taskPath}`,
          `   Description : ${notifMsg}`,
          `   YOLO mode   : ${config.yoloMode ? 'ON (auto-approve all actions)' : 'OFF'}`,
          `   Mode        : ${config.showTerminal ? 'visible terminal' : 'headless background'}`,
          `   Result Log  : ${resultLog}`,
          `   Summary     : ${summaryPath}`,
          '',
          'AutoClaude dispatched. Qwen Code executing in background.',
          'Check _summary.md for the process report and _result.log for raw output.',
        ].join('\n'),
      }],
    };
  }

  // ── dispatch_to_cursor ────────────────────────────────────────────────────
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
        content: [{ type: 'text' as const, text: `❌ File not found: ${taskPath}` }],
        isError: true,
      };
    }

    const taskName = path.basename(taskPath, '.md');
    const notifMsg = description ?? `Cursor task ready: ${taskName}`;

    // 1. Copy task file content to clipboard
    const taskContent = fs.readFileSync(taskPath, 'utf-8');
    let clipboardOk = false;
    try {
      copyToClipboard(taskContent);
      clipboardOk = true;
    } catch {
      // clipboard copy failed, not fatal
    }

    // 2. Notification + speech
    if (config.notifyOnDispatch) {
      sendWindowsNotification('AutoClaude', notifMsg + (clipboardOk ? ' — Content in clipboard' : ''));
    }
    if (config.speechOnDispatch) {
      sendSpeech(config.speechText + (clipboardOk ? ' — content in clipboard' : ''));
    }

    // 3. Launch Cursor + show terminal banner
    runCursor(config, taskPath, taskName, clipboardOk);

    return {
      content: [{
        type: 'text' as const,
        text: [
          '✅ Dispatched to Cursor',
          `   File       : ${taskPath}`,
          `   Task       : ${notifMsg}`,
          `   Clipboard  : ${clipboardOk ? '✓ Task content copied (Ctrl+V into Cursor AI chat)' : '⚠ Copy failed — paste task file manually'}`,
          `   Terminal   : ${config.showTerminal ? 'visible' : 'headless'}`,
          '',
          clipboardOk
            ? 'Task content is in your clipboard. Open Cursor AI chat and press Ctrl+V.'
            : 'Open the task file manually in Cursor.',
          'Claude is free — Cursor AI runs independently using its own tokens.',
        ].join('\n'),
      }],
    };
  }

  // ── qwen_bridge_status ────────────────────────────────────────────────────
  if (request.params.name === 'qwen_bridge_status') {
    return {
      content: [{
        type: 'text' as const,
        text: [
          '✅ AutoClaude is running (v4.0)',
          '',
          'Current config:',
          `  projectDir      : ${config.projectDir}`,
          `  qwenCommand     : ${config.qwenCommand}`,
          `  cursorCommand   : ${config.cursorCommand}`,
          `  terminalApp     : ${config.terminalApp}`,
          `  notifyOnDispatch: ${config.notifyOnDispatch}`,
          `  speechOnDispatch: ${config.speechOnDispatch}`,
          `  showTerminal    : ${config.showTerminal}`,
          `  yoloMode        : ${config.yoloMode}`,
          '',
          'Available tools:',
          '  dispatch_to_qwen    — dispatch QWEN_*.md to Qwen Code',
          '  dispatch_to_cursor  — dispatch CURSOR_*.md to Cursor AI (clipboard + launch)',
          '  qwen_bridge_status  — this status check',
          '  get_task_report     — read _summary.md for a dispatched task',
        ].join('\n'),
      }],
    };
  }

  // ── get_task_report ───────────────────────────────────────────────────────
  if (request.params.name === 'get_task_report') {
    const { task_file } = request.params.arguments as { task_file: string };
    const taskPath = path.isAbsolute(task_file)
      ? task_file
      : path.join(config.projectDir, task_file);
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');

    if (!fs.existsSync(summaryPath)) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            `⚠️ No report found for: ${path.basename(taskPath)}`,
            '',
            `Expected at: ${summaryPath}`,
            '',
            'The task may still be running, or no summary was generated.',
            `Check if _result.log exists: ${fs.existsSync(taskPath.replace(/\.md$/, '_result.log')) ? 'Yes' : 'No'}`,
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

  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` }],
    isError: true,
  };
});

// ─── Start ────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
