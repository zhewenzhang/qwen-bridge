import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

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
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      const agent = getActiveAgent(config);
      const taskName = path.basename(taskPath, '.md');
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', `${agent.label || agent.name}: ${args.description || taskName}`); sendSpeech(config.speechText); }
      if (agent.type === 'clipboard') {
        let ok = false; try { copyToClipboard(fs.readFileSync(taskPath, 'utf-8')); ok = true; } catch {}
        runClipboardAgent(config, taskPath, ok);
        return { content: [{ type: 'text' as const, text: '── Clipboard Task ──\n\nAgent: ' + (agent.label || agent.name) + '\nTask: ' + path.basename(taskPath) + '\nClipboard: ' + (ok ? '✅ Copied' : '⚠️ Failed') + '\n\n' + (ok ? 'Open agent and paste (Ctrl+V).' : 'Open task file manually.') }] };
      }
      runCliAgent(config, taskPath, taskName);
      return { content: [{ type: 'text' as const, text: '── Task Dispatched ──\n\nAgent: ' + (agent.label || agent.name || config.activeAgent) + '\nTask: ' + path.basename(taskPath) + '\nMode: ' + (config.showTerminal ? 'Visible' : 'Headless Background') + '\nYOLO: ' + (agent.yoloMode ? '✅ ON' : '❌ OFF') + '\n\n📄 Result: ' + path.basename(taskPath.replace(/\.md$/, '_result.log')) + '\n📋 Report: ' + path.basename(taskPath.replace(/\.md$/, '_summary.md')) + '\n\n🚀 Agent executing in background.\n\n💡 After the agent completes, run `verify_project` to check project health.' }] };
    }

    // ── dispatch_to_qwen ─────────────────────────────────────────────────────
    if (toolName === 'dispatch_to_qwen') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      const agent = config.agents['qwen'] || getActiveAgent(config);
      const taskName = path.basename(taskPath, '.md');
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', args.description || taskName); sendSpeech(config.speechText); }
      runCliAgent(config, taskPath, taskName);
      return { content: [{ type: 'text' as const, text: '── Task Dispatched ──\n\nAgent: ' + (agent.label || agent.name || 'Qwen Code') + '\nTask: ' + path.basename(taskPath) + '\nYOLO: ' + (agent.yoloMode ? '✅ ON' : '❌ OFF') + '\n\n🚀 Running in background.' }] };
    }

    // ── dispatch_to_cursor ───────────────────────────────────────────────────
    if (toolName === 'dispatch_to_cursor') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      let ok = false; try { copyToClipboard(fs.readFileSync(taskPath, 'utf-8')); ok = true; } catch {}
      if (config.speechOnDispatch) { sendWindowsNotification('AutoClaude', (args.description || path.basename(taskPath)) + (ok ? ' — Copied' : '')); sendSpeech(config.speechText); }
      runClipboardAgent(config, taskPath, ok);
      return { content: [{ type: 'text' as const, text: '── Cursor Task ──\n\nTask: ' + path.basename(taskPath) + '\nClipboard: ' + (ok ? '✅ Copied' : '⚠️ Failed') + '\n\n' + (ok ? 'Open Cursor and paste (Ctrl+V).' : 'Open task file manually.') }] };
    }

    // ── list_agents ──────────────────────────────────────────────────────────
    if (toolName === 'list_agents') return { content: [{ type: 'text' as const, text: listAgents(config).join('\n') }] };

    // ── switch_agent ─────────────────────────────────────────────────────────
    if (toolName === 'switch_agent') {
      try {
        const { old, oldName, newAgent } = switchAgent(config, args.agent);
        return { content: [{ type: 'text' as const, text: '── Agent Switched ──\n\nFrom: ' + oldName + '\nTo: ' + (newAgent.label || newAgent.name) + '\nCmd: ' + newAgent.command + '\nYOLO: ' + (newAgent.yoloMode ? '✅ ON' : '❌ OFF') + '\n\n✅ All dispatch_task calls will now use this agent.' }] };
      } catch (e: any) { return { content: [{ type: 'text' as const, text: '❌ ' + e.message }], isError: true }; }
    }

    // ── add_custom_agent ─────────────────────────────────────────────────────
    if (toolName === 'add_custom_agent') {
      const id = (args.name || 'custom').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      if (config.agents[id]?.enabled) return { content: [{ type: 'text' as const, text: '⚠️ Agent "' + id + '" already exists.' }], isError: true };
      config.agents[id] = { name: args.name, command: args.command, type: 'cli', yoloFlag: args.yolo_flag || '', yoloMode: true, outputFlag: args.output_flag || '', installHint: args.install_hint || '', showTerminal: false, enabled: true };
      saveConfig(config);
      return { content: [{ type: 'text' as const, text: '✅ Custom agent "' + args.name + '" (' + id + ') added.\n\nUse switch_agent("' + id + '") to activate.' }] };
    }

    // ── check_agent ──────────────────────────────────────────────────────────
    if (toolName === 'check_agent') {
      try {
        const { found, path_info, version_info } = checkAgentInstalled(config, args.agent_id);
        const agent = config.agents[args.agent_id];
        return { content: [{ type: 'text' as const, text: (found ? '✅ ' : '❌ ') + (agent?.label || agent?.name || args.agent_id) + (found ? ' is installed' : ' is NOT installed') + '\n\nCommand: `' + (agent?.command || '?') + '`\nFound: ' + (found ? 'Yes ✅' : 'No ❌') + (found && path_info ? '\nPath: `' + path_info + '`' : '') + (found && version_info ? '\nVersion: ' + version_info : '') + (!found ? '\nInstall: `' + (agent?.installHint || '?') + '`' : '') }] };
      } catch (e: any) { return { content: [{ type: 'text' as const, text: '❌ ' + e.message }], isError: true }; }
    }

    // ── verify_agent_auth ────────────────────────────────────────────────────
    if (toolName === 'verify_agent_auth') {
      const targetId = args.agent_id || config.activeAgent;
      const agent = config.agents[targetId];
      if (!agent) return { content: [{ type: 'text' as const, text: '❌ Unknown agent: ' + targetId }], isError: true };
      if (agent.type === 'clipboard') return { content: [{ type: 'text' as const, text: '📋 Clipboard agent — auth verification not applicable.' }] };
      const { success, output, error, timedOut } = verifyAgentAuth(config, targetId);
      if (success) return { content: [{ type: 'text' as const, text: '── Auth Verified ──\n\nAgent: ' + (agent.label || agent.name || targetId) + '\nStatus: ✅ Ready\nCommand: ' + agent.command }] };
      return { content: [{ type: 'text' as const, text: '── Auth Failed ──\n\nAgent: ' + (agent.label || agent.name || targetId) + '\nStatus: ' + (timedOut ? '⏰ Timeout' : '❌ Failed') + '\n\n' + (error || output || '(no output)').substring(0, 300) + '\n\nRun: ' + agent.command + ' auth' }] };
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
      if (!fs.existsSync(summaryPath)) return { content: [{ type: 'text' as const, text: '⚠️ No report yet. Task may still be running.' }] };
      return { content: [{ type: 'text' as const, text: fs.readFileSync(summaryPath, 'utf-8') }] };
    }

    // ── get_savings_report ───────────────────────────────────────────────────
    if (toolName === 'get_savings_report') {
      const cum = getCumulativeSavings();
      return { content: [{ type: 'text' as const, text: '── 💰 Savings Report ──\n\nTotal Tasks: ' + cum.tasks + '\nTokens Saved: ~' + cum.tokensSaved.toLocaleString() + '\nCost Saved: $' + cum.costSaved.toFixed(2) + '\nAvg/Task: ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' tokens' }] };
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
      return { content: [{ type: 'text' as const, text: '── AutoClaude ' + getVersion() + ' ──\n\nActive Agent: ' + (agent.label || agent.name) + ' (`' + config.activeAgent + '`)\nCommand: ' + agent.command + '\nYOLO Mode: ' + (agent.yoloMode ? '✅ ON' : '❌ OFF') + '\nTerminal: ' + (config.showTerminal ? 'visible' : 'headless background') + '\nAgents: ' + enabledCount + ' enabled / ' + totalCount + ' total\nProject Dir: ' + config.projectDir + '\n💰 Savings: ' + cum.tasks + ' tasks · ' + cum.tokensSaved.toLocaleString() + ' tokens · $' + cum.costSaved.toFixed(2) }] };
    }

    // ── verify_project ───────────────────────────────────────────────────────
    if (toolName === 'verify_project') {
      const results: string[] = ['── Project Health Check ──', ''];
      
      // 1. TypeScript compilation
      try {
        execSync('npx tsc', { timeout: 15000, encoding: 'utf-8', stdio: 'pipe', cwd: config.projectDir });
        results.push('✅ TypeScript: Compiles successfully');
      } catch (e: any) {
        results.push('❌ TypeScript: Compilation FAILED');
        results.push('   ' + (e.stderr || e.stdout || e.message || '').substring(0, 200).replace(/\n/g, '\n   '));
      }
      
      // 2. Module integrity
      const srcDir = path.join(config.projectDir, 'src');
      const requiredModules = ['types.ts', 'config.ts', 'notifications.ts', 'reports.ts', 'agents.ts', 'tools.ts', 'index.ts'];
      const missing = requiredModules.filter(f => !fs.existsSync(path.join(srcDir, f)));
      if (missing.length === 0) {
        results.push('✅ Modules: All 7 source files present');
      } else {
        results.push('❌ Modules: Missing — ' + missing.join(', '));
      }
      
      // 3. Orphaned helper scripts
      const rootFiles = fs.readdirSync(config.projectDir);
      const orphans = rootFiles.filter(f => 
        f.endsWith('.cjs') || f.endsWith('.mjs') || 
        (f.endsWith('.py') && !f.includes('package')) ||
        f === 'nul' || f.startsWith('_fix') || f.startsWith('_replace') ||
        f.startsWith('do_') || f.startsWith('fix_') || f.startsWith('tmp_')
      );
      if (orphans.length === 0) {
        results.push('✅ Clean: No orphaned scripts in root');
      } else {
        results.push('⚠️ Orphans: ' + orphans.length + ' helper script(s) found');
        for (const f of orphans) results.push('   - ' + f);
        // Auto-move to archive
        const archiveDir = path.join(config.projectDir, 'tasks', 'archive');
        if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir, { recursive: true });
        for (const f of orphans) {
          try {
            fs.renameSync(path.join(config.projectDir, f), path.join(archiveDir, f));
          } catch {}
        }
        results.push('   → Moved to tasks/archive/');
      }
      
      // 4. Dist exists
      const distExists = fs.existsSync(path.join(config.projectDir, 'dist', 'index.js'));
      results.push(distExists ? '✅ Dist: index.js exists' : '❌ Dist: index.js MISSING — run npx tsc');
      
      // 5. Config valid JSON
      try {
        JSON.parse(fs.readFileSync(path.join(config.projectDir, 'config.json'), 'utf-8'));
        results.push('✅ Config: Valid JSON');
      } catch {
        results.push('❌ Config: Invalid JSON');
      }
      
      results.push('');
      const ok = !results.some(l => l.startsWith('❌'));
      results.push(ok ? '✅ All checks passed.' : '❌ Some checks failed. Fix issues before next dispatch.');
      
      return { content: [{ type: 'text' as const, text: results.join('\n') }] };
    }

  } catch (e: any) {
    return { content: [{ type: 'text' as const, text: '❌ Internal error: ' + (e.message || String(e)) }], isError: true };
  }

  return { content: [{ type: 'text' as const, text: 'Unknown tool: ' + toolName }], isError: true };
});

const transport = new StdioServerTransport();
await server.connect(transport);
