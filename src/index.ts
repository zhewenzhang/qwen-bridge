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
}

function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config not found: ${CONFIG_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as Partial<BridgeConfig>;
  // provide defaults for new fields
  return {
    cursorCommand: 'cursor',
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
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Agent Bridge').Show($toast);
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

// ─── Terminal Launch ──────────────────────────────────────────────────────────

function writePs1(filePath: string, lines: string[]): void {
  // Write UTF-8 with BOM for Windows PowerShell compatibility
  const bom = '﻿';
  fs.writeFileSync(filePath, bom + lines.join('\n') + '\n', 'utf-8');
}

function launchQwenInTerminal(config: BridgeConfig, taskPath: string, taskName: string): void {
  const tabTitle = `Qwen: ${taskName}`;
  const safeTaskPath = taskPath.replace(/'/g, "''");
  const safeProjectDir = config.projectDir.replace(/'/g, "''");

  // Write script to temp file to avoid command-line quoting issues with -Command
  const ps1Path = path.join(os.tmpdir(), `_bridge_qwen_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
  writePs1(ps1Path, [
    `Set-Location '${safeProjectDir}'`,
    `Write-Host ''`,
    `Write-Host '========================================' -ForegroundColor Yellow`,
    `Write-Host '  QWEN BRIDGE -- Task Dispatched' -ForegroundColor Yellow`,
    `Write-Host '========================================' -ForegroundColor Yellow`,
    `Write-Host '  File: ${safeTaskPath}' -ForegroundColor Cyan`,
    `Write-Host '========================================' -ForegroundColor Yellow`,
    `Write-Host ''`,
    `& ${config.qwenCommand} -i "Read and execute the task instructions from ${safeTaskPath}. Follow each step exactly as written."`,
  ]);

  try {
    spawn(
      config.terminalApp,
      ['-w', '0', 'new-tab', '--title', tabTitle, 'powershell.exe', '-NoExit', '-File', ps1Path],
      { detached: true, stdio: 'ignore', shell: false }
    ).unref();
  } catch {
    // Fallback: simpler launch without wt.exe
    spawn(
      'powershell.exe',
      ['-NoExit', '-File', ps1Path],
      { detached: true, stdio: 'ignore', shell: false }
    ).unref();
  }
}

function launchCursor(config: BridgeConfig, taskPath: string, taskName: string): void {
  const tabTitle = `Cursor: ${taskName}`;
  const safeTaskPath = taskPath.replace(/'/g, "''");
  const safeProjectDir = config.projectDir.replace(/'/g, "''");
  const shortTask = taskName.substring(0, 38);
  const shortFile = path.basename(taskPath).substring(0, 38);

  // Write banner script to temp file
  const ps1Path = path.join(os.tmpdir(), `_bridge_cursor_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ps1`);
  writePs1(ps1Path, [
    `Set-Location '${safeProjectDir}'`,
    `Write-Host ''`,
    `Write-Host '================================================' -ForegroundColor Cyan`,
    `Write-Host '  CURSOR BRIDGE -- Task Dispatched' -ForegroundColor Cyan`,
    `Write-Host '================================================' -ForegroundColor Cyan`,
    `Write-Host '  Task : ${shortTask}' -ForegroundColor White`,
    `Write-Host '  File : ${shortFile}' -ForegroundColor White`,
    `Write-Host '================================================' -ForegroundColor Cyan`,
    `Write-Host '  [OK] Task content copied to CLIPBOARD' -ForegroundColor Green`,
    `Write-Host '  --> Open Cursor AI chat and press Ctrl+V' -ForegroundColor Yellow`,
    `Write-Host '================================================' -ForegroundColor Cyan`,
    `Write-Host ''`,
    `Write-Host 'Task file content:' -ForegroundColor Gray`,
    `Get-Content '${safeTaskPath}' | Write-Host -ForegroundColor Gray`,
  ]);

  try {
    spawn(
      config.terminalApp,
      ['-w', '0', 'new-tab', '--title', tabTitle, 'powershell.exe', '-NoExit', '-File', ps1Path],
      { detached: true, stdio: 'ignore', shell: false }
    ).unref();
  } catch {
    spawn(
      'powershell.exe',
      ['-NoExit', '-File', ps1Path],
      { detached: true, stdio: 'ignore', shell: false }
    ).unref();
  }

  // Try to launch Cursor (non-blocking, failure is OK)
  try {
    spawn(config.cursorCommand, [config.projectDir], {
      detached: true, stdio: 'ignore', shell: false
    }).unref();
  } catch {
    // cursor not available, user can open manually
  }
}

// ─── MCP Server ───────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'qwen-bridge', version: '2.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'dispatch_to_qwen',
      description:
        'Dispatch a task markdown file to Qwen Code for execution. ' +
        'Opens a new Windows Terminal tab with Qwen Code, sends a Windows notification and speech alert. ' +
        'Claude returns immediately — Qwen Code runs independently. ' +
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
        'Opens Cursor in the project directory and a terminal tab showing the task details. ' +
        'Sends a Windows notification and speech alert. ' +
        'Claude returns immediately — Cursor AI runs independently using its own tokens. ' +
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
      description: 'Check that the agent bridge is running and show current config.',
      inputSchema: { type: 'object' as const, properties: {} },
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

    if (config.notifyOnDispatch) sendWindowsNotification('Qwen Bridge', notifMsg);
    if (config.speechOnDispatch) sendSpeech(config.speechText);
    launchQwenInTerminal(config, taskPath, taskName);

    return {
      content: [{
        type: 'text' as const,
        text: [
          '✅ Dispatched to Qwen Code',
          `   File    : ${taskPath}`,
          `   Task    : ${notifMsg}`,
          `   Command : ${config.qwenCommand}`,
          '',
          'A new Windows Terminal tab has opened with Qwen Code.',
          'Windows notification sent. Speech alert played.',
          'Claude is free — Qwen Code is running independently.',
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
      sendWindowsNotification('Cursor Bridge', notifMsg + (clipboardOk ? ' — Content in clipboard' : ''));
    }
    if (config.speechOnDispatch) {
      sendSpeech('Cursor task ready' + (clipboardOk ? ', content in clipboard' : ''));
    }

    // 3. Launch Cursor + show terminal banner
    launchCursor(config, taskPath, taskName);

    return {
      content: [{
        type: 'text' as const,
        text: [
          '✅ Dispatched to Cursor',
          `   File       : ${taskPath}`,
          `   Task       : ${notifMsg}`,
          `   Clipboard  : ${clipboardOk ? '✓ Task content copied (Ctrl+V into Cursor AI chat)' : '⚠ Copy failed — paste task file manually'}`,
          `   Cursor cmd : ${config.cursorCommand}`,
          '',
          'Next steps:',
          '  1. Switch to Cursor (window should have opened)',
          '  2. Open the Cursor AI chat (Ctrl+Shift+J or click the chat icon)',
          '  3. Press Ctrl+V to paste the task — Cursor AI will execute it',
          '',
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
          '✅ Agent Bridge is running (v2.0)',
          '',
          'Current config:',
          `  projectDir      : ${config.projectDir}`,
          `  qwenCommand     : ${config.qwenCommand}`,
          `  cursorCommand   : ${config.cursorCommand}`,
          `  terminalApp     : ${config.terminalApp}`,
          `  notifyOnDispatch: ${config.notifyOnDispatch}`,
          `  speechOnDispatch: ${config.speechOnDispatch}`,
          '',
          'Available tools:',
          '  dispatch_to_qwen    — dispatch QWEN_*.md to Qwen Code',
          '  dispatch_to_cursor  — dispatch CURSOR_*.md to Cursor AI (clipboard + launch)',
          '  qwen_bridge_status  — this status check',
        ].join('\n'),
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
