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
import { getCumulativeSavings, updateProjectReport, finalizeTaskSummary, loadSavings, scanForAuthIssues } from './reports.js';
import { sendWindowsNotification, sendSpeech, copyToClipboard, userPrompt } from './notifications.js';

function getVersion(): string {
  try {
    const pkgPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'package.json');
    return JSON.parse(readFileSync(pkgPath, 'utf-8')).version || '5.5.0';
  } catch { return '5.5.0'; }
}


const SESSION_FILE = '.autoclaude_session.json';

function getSessionPath(): string {
  const cfg = loadConfig();
  return path.join(cfg.projectDir, SESSION_FILE);
}

interface SessionEntry {
  taskName: string;
  timestamp: string;
  claudeTokens: number;
  agentTokens: number;
  tokensSaved: number;
  costSaved: number;
}

function recordSessionTask(taskName: string, claudeTokens: number, agentTokens: number, tokensSaved: number, costSaved: number): void {
  const sp = getSessionPath();
  let entries: SessionEntry[] = [];
  try { if (fs.existsSync(sp)) entries = JSON.parse(fs.readFileSync(sp, 'utf-8')); } catch {}
  if (!entries.some(e => e.taskName === taskName)) {
    entries.push({ taskName, timestamp: new Date().toISOString(), claudeTokens, agentTokens, tokensSaved, costSaved });
    fs.writeFileSync(sp, JSON.stringify(entries, null, 2), 'utf-8');
  }
}

function getSessionStatus(): string {
  const sp = getSessionPath();
  let entries: SessionEntry[] = [];
  try { if (fs.existsSync(sp)) entries = JSON.parse(fs.readFileSync(sp, 'utf-8')); } catch {}
  const totalClaude = entries.reduce((s, e) => s + e.claudeTokens, 0);
  const totalAgent = entries.reduce((s, e) => s + e.agentTokens, 0);
  const totalSaved = entries.reduce((s, e) => s + e.tokensSaved, 0);
  const totalCost = entries.reduce((s, e) => s + e.costSaved, 0);
  const firstTime = entries.length > 0 ? entries[0].timestamp : new Date().toISOString();
  return [
    '\u2500\u2500 Session Status \u2500\u2500',
    '',
    'Tasks : ' + entries.length,
    'Tokens: Claude ~' + totalClaude.toLocaleString() + ' | Agent ~' + totalAgent.toLocaleString(),
    'Saved : ~' + totalSaved.toLocaleString() + ' tokens ($' + totalCost.toFixed(2) + ')',
    'Start : ' + new Date(firstTime).toLocaleString(),
    '',
    entries.length > 0
      ? 'Last: ' + entries[entries.length - 1].taskName.replace(/^QWEN_/, '').replace(/_/g, ' ').substring(0, 40)
      : 'No tasks yet.',
  ].join('\n');
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
      // Record to session tracking
      try {
        const s = loadSavings().find((e: any) => e.taskName === path.basename(taskPath, '.md'));
        if (s) {
          recordSessionTask(s.taskName, s.claudeTokensIn + s.claudeTokensOut, s.estimatedExecutionTokensIn + s.estimatedExecutionTokensOut, s.tokensSaved, s.costSaved);
        }
      } catch {}
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
      return { content: [{ type: 'text' as const, text: mkBridgeStatus(config, agent, cum, enabledCount, totalCount) }] };
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
      try {
        const diffOutput = execSync('git diff --stat HEAD~1', { timeout: 5000, encoding: 'utf-8', stdio: 'pipe', cwd: config.projectDir });
        const diffLines = diffOutput.trim().split('\n');
        const lastLine = diffLines[diffLines.length - 1] || '';
        results.push('📊 Diff: ' + lastLine.trim());
        if (diffLines.length > 11) results.push('⚠️ Large change: ' + (diffLines.length - 1) + ' files modified');
      } catch { results.push('📊 Diff: (no previous commit)'); }
      results.push('');
      results.push(results.some(l => l.startsWith('❌')) ? '❌ Issues found. Fix before next dispatch.' : '✅ All checks passed.');
      return { content: [{ type: 'text' as const, text: results.join('\n') }] };
    }

    // ── check_task_status ────────────────────────────────────────────────────
    if (toolName === 'check_task_status') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      const resultLog = taskPath.replace(/\.md$/, '_result.log');
      if (!fs.existsSync(resultLog)) return { content: [{ type: 'text' as const, text: '⏳ Task still starting — no result log yet.' }] };
      const content = fs.readFileSync(resultLog, 'utf-8');
      if (!content || content.length < 10) return { content: [{ type: 'text' as const, text: '⏳ Task running — result log is still empty. Check again in 30s.' }] };

      const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
      const isComplete = fs.existsSync(summaryPath) && fs.readFileSync(summaryPath, 'utf-8').includes('Completion Status');

      const agent = getActiveAgent(config);
      const issues = scanForAuthIssues(resultLog, agent.command, agent.installHint);

      if (issues.length > 0) {
        const lines = ['🔐 **Action Required — Auth/Error Detected**', ''];
        for (const iss of issues) {
          lines.push(`### ${iss.label}`);
          lines.push(`**Fix:** ${iss.fix}`);
          lines.push(`*Matched:* \`${iss.matchedText}\``);
          lines.push('');
        }
        lines.push('⚠️ The agent cannot continue until this is resolved.');
        lines.push('After fixing, re-dispatch the task or call `verify_agent_auth` to confirm readiness.');
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      }

      if (isComplete) {
        return { content: [{ type: 'text' as const, text: '✅ Task completed. Use `get_task_report("' + path.basename(taskPath) + '")` to see the full report.' }] };
      }

      return { content: [{ type: 'text' as const, text: '⏳ Task running — no issues detected. Last output preview:\n\n```\n' + content.substring(Math.max(0, content.length - 500)).trim() + '\n```' }] };
    }

    // ── task_preflight ───────────────────────────────────────────────────────
    if (toolName === 'task_preflight') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      const content = fs.readFileSync(taskPath, 'utf-8');
      const results: string[] = ['── Pre-flight Check ──', ''];
      let issues = 0;

      // Check agent
      const agent = getActiveAgent(config);
      const { found, version_info } = (() => { try { return checkAgentInstalled(config, config.activeAgent); } catch { return { found: false, version_info: '' }; } })();
      if (found) {
        results.push('✅ Agent: ' + (agent.label || agent.name) + ' (' + (version_info || 'installed') + ')');
        const auth = verifyAgentAuth(config, config.activeAgent);
        if (auth.success) { results.push('✅ Auth: ' + (agent.label || agent.name) + ' authenticated'); }
        else { results.push('⚠️ Auth: ' + (agent.label || agent.name) + ' needs authentication — run `' + agent.command + ' auth`'); issues++; }
      } else { results.push('❌ Agent: ' + (agent.label || agent.name) + ' not found — install: ' + (agent.installHint || '?')); issues++; }

      // Check git config (if task mentions git)
      if (content.match(/git (commit|push|add)/i)) {
        try { const name = execSync('git config user.name', { encoding: 'utf-8', stdio: 'pipe' }).trim(); results.push('✅ Git: user.name=' + name); } catch { results.push('⚠️ Git: user.name not set — run `git config --global user.name "Your Name"`'); issues++; }
        try { const email = execSync('git config user.email', { encoding: 'utf-8', stdio: 'pipe' }).trim(); results.push('✅ Git: user.email=' + email); } catch { results.push('⚠️ Git: user.email not set'); issues++; }
      }

      // Check gh auth (if task mentions gh or github)
      if (content.match(/\bgh\b|github.*push|gh repo|gh release/i)) {
        try { execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' }); results.push('✅ GitHub CLI: authenticated'); } catch { results.push('⚠️ GitHub CLI: not authenticated — run `gh auth login`'); issues++; }
      }

      // Check npm auth (if task mentions npm publish)
      if (content.match(/npm publish|npm.*registry/i)) {
        try { const u = execSync('npm whoami', { encoding: 'utf-8', stdio: 'pipe' }).trim(); results.push('✅ NPM: logged in as ' + u); } catch { results.push('⚠️ NPM: not logged in — run `npm login`'); issues++; }
      }

      results.push('');
      if (issues === 0) results.push('✅ All checks passed. Ready to dispatch.');
      else results.push('⚠️ ' + issues + ' issue(s) to resolve before dispatch.\n\nResolve the issues above, then tell me "ready" and I will dispatch.');

      return { content: [{ type: 'text' as const, text: results.join('\n') }] };
    }

    // ── task_continue ────────────────────────────────────────────────────────
    if (toolName === 'task_continue') {
      const taskPath = path.isAbsolute(args.task_file) ? args.task_file : path.join(config.projectDir, args.task_file);
      if (!fs.existsSync(taskPath)) return { content: [{ type: 'text' as const, text: '❌ File not found: ' + taskPath }], isError: true };
      const content = fs.readFileSync(taskPath, 'utf-8');
      const resultLog = taskPath.replace(/\.md$/, '_result.log');
      let completedSteps: string[] = [];
      if (fs.existsSync(resultLog)) {
        const log = fs.readFileSync(resultLog, 'utf-8');
        const doneMatches = log.match(/✅|DONE|COMPLETE|completed|success/gi);
        if (doneMatches) completedSteps = doneMatches;
      }

      const phases = content.split(/## Phase \d+/i);
      const remainingPhases = phases.length > 1 ? phases.slice(-2).join('\n') : content;

      const v2Path = taskPath.replace(/\.md$/, '_v2.md');
      const v2Content = [
        '# Task: Continue — ' + path.basename(taskPath, '.md'),
        '',
        '## Context',
        'Continuation of `' + path.basename(taskPath) + '`. Previous attempts completed: ' + (completedSteps.length > 0 ? completedSteps.length + ' steps done' : 'unknown'),
        '',
        '## Remaining Work',
        remainingPhases.substring(0, 3000),
        '',
        '## Instructions',
        'Pick up where the previous execution left off. Only do the REMAINING work — do not redo completed steps.',
        '',
        '## Checklist',
        '- [ ] Remaining steps completed',
        '- [ ] `npx tsc` passes (if applicable)',
        '- [ ] Committed and pushed (if applicable)',
      ].join('\n');
      fs.writeFileSync(v2Path, v2Content, 'utf-8');

      return { content: [{ type: 'text' as const, text: '── Continuation Task Created ──\n\nOriginal: ' + path.basename(taskPath) + '\nContinue: ' + path.basename(v2Path) + '\n\nDispatch with: dispatch_task("' + path.basename(v2Path) + '")' }] };
    }


    // \u2500\u2500 session_status \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    if (toolName === 'session_status') {
      return { content: [{ type: 'text' as const, text: getSessionStatus() }] };
    }

    // \u2500\u2500 user_prompt \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
    if (toolName === 'user_prompt') {
      const { mode, message, title } = args as { mode?: string; message: string; title?: string };
      const m = mode || 'alert';
      if (!['input', 'confirm', 'alert'].includes(m)) return { content: [{ type: 'text' as const, text: '\u274c Invalid mode. Use: input, confirm, or alert.' }], isError: true };
      try {
        const result = userPrompt(m as 'input' | 'confirm' | 'alert', message, title);
        if (m === 'confirm') return { content: [{ type: 'text' as const, text: result === 'yes' ? '\u2705 User confirmed.' : '\u274c User declined.' }] };
        if (m === 'input') return { content: [{ type: 'text' as const, text: result ? '\ud83d\udddd Input received: "' + result + '"' : '\u26a0\ufe0f No input provided (cancelled).' }] };
        return { content: [{ type: 'text' as const, text: '\u2705 Alert shown.' }] };
      } catch (e: any) {
        return { content: [{ type: 'text' as const, text: '\u274c Popup failed: ' + (e.message || '') }], isError: true };
      }
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

function mkBridgeStatus(config: BridgeConfig, agent: AgentConfig, cum: { tasks: number; tokensSaved: number; costSaved: number }, enabledCount: number, totalCount: number): string {
  return [
    '── AutoClaude ' + getVersion() + ' ──',
    '',
    'Active Agent : ' + (agent.label || agent.name) + ' (`' + config.activeAgent + '`)',
    'Command      : ' + agent.command,
    'YOLO Mode    : ' + (agent.yoloMode ? '✅ ON' : '❌ OFF'),
    'Terminal     : ' + (config.showTerminal ? 'visible' : 'headless background'),
    'Agents       : ' + enabledCount + ' enabled / ' + totalCount + ' total',
    'Project Dir  : ' + (config.projectDir || ''),
    '💰 Savings   : ' + cum.tasks + ' tasks · ' + cum.tokensSaved.toLocaleString() + ' tokens · $' + cum.costSaved.toFixed(2),
    '',
    'Tools: dispatch_task · list_agents · switch_agent · add_custom_agent',
    '       check_agent · verify_agent_auth · get_task_report',
    '       get_savings_report · get_project_report · verify_project',
  ].join('\n');
}

const transport = new StdioServerTransport();
await server.connect(transport);
