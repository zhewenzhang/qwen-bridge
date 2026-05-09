import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { BridgeConfig, AgentConfig } from './types.js';
import { loadConfig, saveConfig, getActiveAgent } from './config.js';
import { getToolDefinitions } from './tools.js';
import { runCliAgent, runClipboardAgent, listAgents, switchAgent, checkAgentInstalled, verifyAgentAuth } from './agents.js';
import { getCumulativeSavings, updateProjectReport, finalizeTaskSummary, loadSavings } from './reports.js';
import { sendWindowsNotification, sendSpeech, copyToClipboard } from './notifications.js';

function getVersion(): string {
  try {
    const pkgPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'package.json');
    return JSON.parse(readFileSync(pkgPath, 'utf-8')).version || '5.5.0';
  } catch { return '5.5.0'; }
}

const server = new Server({ name: 'autoclaude', version: getVersion() }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: getToolDefinitions() }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const config = loadConfig();
  const toolName = request.params.name;
  const args = (request.params.arguments || {}) as Record<string, any>;

  try {
    // ── dispatch_task ────────────────────────────────────────────────────────
    if (toolName === 'dispatch_task') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: 'File not found: ' + taskPath }], isError: true };
      const agent = getActiveAgent(config);
      const taskName = path.basename(taskPath, '.md');
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', `${agent.label || agent.name}: ${args.description || taskName}`); sendSpeech(config.speechText); }
      if (agent.type === 'clipboard') {
        let ok = false; try { copyToClipboard(fs.readFileSync(taskPath, 'utf-8')); ok = true; } catch {}
        runClipboardAgent(config, taskPath, ok);
        return { content: [{ type: 'text' as const, text: mkClipboardTask(agent, taskPath, ok) }] };
      }
      runCliAgent(config, taskPath, taskName);
      return { content: [{ type: 'text' as const, text: mkTaskDispatched(agent, taskPath, config) }] };
    }

    // ── dispatch_to_qwen ─────────────────────────────────────────────────────
    if (toolName === 'dispatch_to_qwen') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: 'File not found: ' + taskPath }], isError: true };
      const agent = config.agents['qwen'] || getActiveAgent(config);
      const taskName = path.basename(taskPath, '.md');
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', args.description || taskName); sendSpeech(config.speechText); }
      runCliAgent(config, taskPath, taskName);
      return { content: [{ type: 'text' as const, text: mkTaskDispatchedQwen(agent, taskPath) }] };
    }

    // ── dispatch_to_cursor ───────────────────────────────────────────────────
    if (toolName === 'dispatch_to_cursor') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: 'File not found: ' + taskPath }], isError: true };
      let ok = false; try { copyToClipboard(fs.readFileSync(taskPath, 'utf-8')); ok = true; } catch {}
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', (args.description || path.basename(taskPath)) + (ok ? ' - Copied' : '')); sendSpeech(config.speechText); }
      runClipboardAgent(config, taskPath, ok);
      return { content: [{ type: 'text' as const, text: mkTaskDispatchedCursor(taskPath, ok) }] };
    }

    // ── list_agents ──────────────────────────────────────────────────────────
    if (toolName === 'list_agents') return { content: [{ type: 'text' as const, text: listAgents(config).join('\n') }] };

    // ── switch_agent ─────────────────────────────────────────────────────────
    if (toolName === 'switch_agent') {
      try {
        const { old, oldName, newAgent } = switchAgent(config, args.agent);
        return { content: [{ type: 'text' as const, text: mkAgentSwitched(oldName, newAgent) }] };
      } catch (e: any) { return { content: [{ type: 'text' as const, text: 'Error: ' + e.message }], isError: true }; }
    }

    // ── add_custom_agent ─────────────────────────────────────────────────────
    if (toolName === 'add_custom_agent') {
      const id = (args.name || 'custom').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      if (config.agents[id]?.enabled) return { content: [{ type: 'text' as const, text: 'Agent "' + id + '" already exists.' }], isError: true };
      config.agents[id] = { name: args.name, command: args.command, type: 'cli', yoloFlag: args.yolo_flag || '', yoloMode: true, outputFlag: args.output_flag || '', installHint: args.install_hint || '', showTerminal: false, enabled: true };
      saveConfig(config);
      return { content: [{ type: 'text' as const, text: 'Custom agent "' + args.name + '" (' + id + ') added.\n\nUse switch_agent("' + id + '") to activate.' }] };
    }

    // ── check_agent ──────────────────────────────────────────────────────────
    if (toolName === 'check_agent') {
      try {
        const { found, path_info, version_info } = checkAgentInstalled(config, args.agent_id);
        const agent = config.agents[args.agent_id];
        return { content: [{ type: 'text' as const, text: (found ? '' : 'NOT ') + 'installed: ' + (agent?.label || agent?.name || args.agent_id) + '\n\nCommand: `' + (agent?.command || '?') + '`\nFound: ' + (found ? 'Yes' : 'No') + (found && path_info ? '\nPath: `' + path_info + '`' : '') + (found && version_info ? '\nVersion: ' + version_info : '') + (!found ? '\nInstall: `' + (agent?.installHint || '?') + '`' : '') }] };
      } catch (e: any) { return { content: [{ type: 'text' as const, text: 'Error: ' + e.message }], isError: true }; }
    }

    // ── verify_agent_auth ────────────────────────────────────────────────────
    if (toolName === 'verify_agent_auth') {
      const targetId = args.agent_id || config.activeAgent;
      const agent = config.agents[targetId];
      if (!agent) return { content: [{ type: 'text' as const, text: 'Unknown agent: ' + targetId }], isError: true };
      if (agent.type === 'clipboard') return { content: [{ type: 'text' as const, text: 'Clipboard agent - auth verification not applicable.' }] };
      const { success, output, error, timedOut } = verifyAgentAuth(config, targetId);
      if (success) return { content: [{ type: 'text' as const, text: mkAuthSuccess(agent, targetId) }] };
      return { content: [{ type: 'text' as const, text: mkAuthFailed(agent, targetId, output, error, timedOut) }] };
    }

    // ── get_task_report ──────────────────────────────────────────────────────
    if (toolName === 'get_task_report') {
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
      if (!fs.existsSync(summaryPath)) return { content: [{ type: 'text' as const, text: 'No report yet. Task may still be running.' }] };
      return { content: [{ type: 'text' as const, text: fs.readFileSync(summaryPath, 'utf-8') }] };
    }

    // ── get_savings_report ───────────────────────────────────────────────────
    if (toolName === 'get_savings_report') {
      const cum = getCumulativeSavings();
      return { content: [{ type: 'text' as const, text: mkSavingsReport(cum) }] };
    }

    // ── get_project_report ───────────────────────────────────────────────────
    if (toolName === 'get_project_report') {
      try { updateProjectReport(); } catch {}
      const rp = path.join(config.projectDir, 'PROJECT_REPORT.md');
      return { content: [{ type: 'text' as const, text: fs.existsSync(rp) ? fs.readFileSync(rp, 'utf-8') : 'No report yet.' }] };
    }

    // ── qwen_bridge_status ───────────────────────────────────────────────────
    if (toolName === 'qwen_bridge_status') {
      const cum = getCumulativeSavings();
      const agent = getActiveAgent(config);
      const enabledCount = Object.values(config.agents).filter(a => a.enabled).length;
      const totalCount = Object.keys(config.agents).length;
      return { content: [{ type: 'text' as const, text: mkBridgeStatus(agent, cum, enabledCount, totalCount) }] };
    }

    // ── verify_project ───────────────────────────────────────────────────────
    if (toolName === 'verify_project') {
      const results: string[] = ['── Project Health Check ──', ''];
      try {
        execSync('npx tsc', { timeout: 15000, encoding: 'utf-8', stdio: 'pipe', cwd: config.projectDir });
        results.push('✅ TypeScript: Compiles successfully');
      } catch (e: any) {
        results.push('❌ TypeScript: Compilation FAILED');
        results.push('   ' + ((e.stderr || e.stdout || e.message || '').substring(0, 200).replace(/\n/g, '\n   ')));
      }
      const srcDir = path.join(config.projectDir, 'src');
      const requiredModules = ['types.ts', 'config.ts', 'notifications.ts', 'reports.ts', 'agents.ts', 'tools.ts', 'index.ts'];
      const missing = requiredModules.filter(f => !fs.existsSync(path.join(srcDir, f)));
      if (missing.length === 0) results.push('✅ Modules: All 7 source files present');
      else results.push('❌ Modules: Missing — ' + missing.join(', '));
      const rootFiles = fs.readdirSync(config.projectDir);
      const orphans = rootFiles.filter(f => (f.endsWith('.cjs') || f.endsWith('.mjs') || (f.endsWith('.py') && !f.includes('package')) || f === 'nul' || f.startsWith('_fix') || f.startsWith('_replace') || f.startsWith('do_') || f.startsWith('fix_') || f.startsWith('tmp_')));
      if (orphans.length === 0) results.push('✅ Clean: No orphaned scripts');
      else { results.push('⚠️ Found ' + orphans.length + ' orphan(s), auto-cleaned'); const ad = path.join(config.projectDir, 'tasks', 'archive'); if (!fs.existsSync(ad)) fs.mkdirSync(ad, { recursive: true }); for (const f of orphans) { try { fs.renameSync(path.join(config.projectDir, f), path.join(ad, f)); } catch {} } }
      results.push(fs.existsSync(path.join(config.projectDir, 'dist', 'index.js')) ? '✅ Dist: index.js exists' : '❌ Dist: MISSING');
      try { JSON.parse(fs.readFileSync(path.join(config.projectDir, 'config.json'), 'utf-8')); results.push('✅ Config: Valid JSON'); } catch { results.push('❌ Config: Invalid JSON'); }
      results.push('');
      results.push(results.some(l => l.startsWith('❌')) ? '❌ Issues found. Fix before next dispatch.' : '✅ All checks passed.');
      return { content: [{ type: 'text' as const, text: results.join('\n') }] };
    }

  } catch (e: any) {
    return { content: [{ type: 'text' as const, text: 'Internal error: ' + (e.message || String(e)) }], isError: true };
  }

  return { content: [{ type: 'text' as const, text: 'Unknown tool: ' + toolName }], isError: true };
});

// ─── Markdown Response Helpers ────────────────────────────────────────────────

function mkClipboardTask(agent: AgentConfig, taskPath: string, ok: boolean): string {
  return [
    '## Clipboard Task',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Agent | ' + (agent.label || agent.name) + ' |',
    '| Task | `' + path.basename(taskPath) + '` |',
    '| Clipboard | ' + (ok ? 'Copied' : 'Failed') + ' |',
    '',
    ok ? '> Open agent and paste (Ctrl+V).' : '> Open task file manually.',
  ].join('\n');
}

function mkTaskDispatched(agent: AgentConfig, taskPath: string, config: BridgeConfig): string {
  const resultLog = path.basename(taskPath.replace(/\.md$/, '_result.log'));
  const summaryPath = path.basename(taskPath.replace(/\.md$/, '_summary.md'));
  return [
    '## Task Dispatched',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Agent | ' + (agent.label || agent.name || config.activeAgent) + ' |',
    '| Task | `' + path.basename(taskPath) + '` |',
    '| Mode | ' + (config.showTerminal ? 'Visible' : 'Headless Background') + ' |',
    '| YOLO | ' + (agent.yoloMode ? 'ON' : 'OFF') + ' |',
    '',
    '| Output | File |',
    '|--------|------|',
    '| Result Log | `' + resultLog + '` |',
    '| Process Report | `' + summaryPath + '` |',
    '',
    'Agent executing in background.',
  ].join('\n');
}

function mkTaskDispatchedQwen(agent: AgentConfig, taskPath: string): string {
  const resultLog = path.basename(taskPath.replace(/\.md$/, '_result.log'));
  const summaryPath = path.basename(taskPath.replace(/\.md$/, '_summary.md'));
  return [
    '## Task Dispatched',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Agent | ' + (agent.label || agent.name || 'Qwen Code') + ' |',
    '| Task | `' + path.basename(taskPath) + '` |',
    '| YOLO | ' + (agent.yoloMode ? 'ON' : 'OFF') + ' |',
    '',
    '| Output | File |',
    '|--------|------|',
    '| Result Log | `' + resultLog + '` |',
    '| Process Report | `' + summaryPath + '` |',
    '',
    'Agent executing in background.',
  ].join('\n');
}

function mkTaskDispatchedCursor(taskPath: string, ok: boolean): string {
  return [
    '## Task Dispatched to Cursor',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Task | `' + path.basename(taskPath) + '` |',
    '| Clipboard | ' + (ok ? 'Copied (Ctrl+V into Cursor)' : 'Copy failed') + ' |',
    '',
    ok ? '> Open Cursor AI chat and press Ctrl+V' : '> Open the task file manually in Cursor',
    '',
    'Cursor AI runs independently using its own tokens.',
  ].join('\n');
}

function mkAgentSwitched(oldName: string, newAgent: AgentConfig): string {
  return [
    '## Agent Switched',
    '',
    '| | |',
    '|---|---|',
    '| From | ' + oldName + ' |',
    '| To | ' + (newAgent.label || newAgent.name) + ' |',
    '| YOLO | ' + (newAgent.yoloMode ? 'ON' : 'OFF') + ' |',
    '| Command | `' + newAgent.command + '` |',
    '',
    'All dispatch_task calls will now use ' + (newAgent.label || newAgent.name) + '.',
  ].join('\n');
}

function mkAuthSuccess(agent: AgentConfig, targetId: string): string {
  return [
    '## Auth Verification',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Agent | ' + (agent.label || agent.name || targetId) + ' |',
    '| Status | Authenticated and Ready |',
    '| Command | `' + agent.command + '` |',
    '',
    'Ready to dispatch tasks.',
  ].join('\n');
}

function mkAuthFailed(agent: AgentConfig, targetId: string, output: string, error: string, timedOut: boolean): string {
  const detail = (error || output || '(no output)').substring(0, 300);
  return [
    '## Auth Failed',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Agent | ' + (agent.label || agent.name || targetId) + ' |',
    '| Status | ' + (timedOut ? 'Timeout (30s)' : 'Failed') + ' |',
    '',
    '```',
    detail,
    '```',
    '',
    'Run: `' + agent.command + ' auth`',
  ].join('\n');
}

function mkSavingsReport(cum: { tasks: number; tokensSaved: number; costSaved: number }): string {
  const avg = cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : '0';
  return [
    '## Savings Report',
    '',
    '### Cumulative',
    '| Metric | Value |',
    '|--------|-------|',
    '| Total Tasks | ' + cum.tasks + ' |',
    '| Tokens Saved | ~' + cum.tokensSaved.toLocaleString() + ' |',
    '| Cost Saved | $' + cum.costSaved.toFixed(2) + ' |',
    '',
    'Average: ~' + avg + ' tokens saved per task.',
  ].join('\n');
}

function mkBridgeStatus(agent: AgentConfig, cum: { tasks: number; tokensSaved: number; costSaved: number }, enabledCount: number, totalCount: number): string {
  return [
    '## AutoClaude ' + getVersion() + ' - Status',
    '',
    '| Field | Value |',
    '|-------|-------|',
    '| Active Agent | ' + (agent.label || agent.name) + ' (`' + agent.name + '`) |',
    '| YOLO Mode | ' + (agent.yoloMode ? 'ON' : 'OFF') + ' |',
    '| Terminal | ' + (agent.showTerminal ? 'Visible' : 'Headless background') + ' |',
    '| Agents | ' + enabledCount + ' enabled / ' + totalCount + ' total |',
    '| Project Dir | `' + cum.tasks + '` |',
    '| Savings | ' + cum.tasks + ' tasks |',
    '',
    'Tools: dispatch_task, list_agents, switch_agent, add_custom_agent, check_agent, verify_agent_auth, get_task_report, get_savings_report, get_project_report, qwen_bridge_status',
  ].join('\n');
}

const transport = new StdioServerTransport();
await server.connect(transport);
