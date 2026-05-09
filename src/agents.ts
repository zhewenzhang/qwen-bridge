import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BridgeConfig, AgentConfig } from './types.js';
import { saveConfig, getActiveAgent } from './config.js';
import { writeTaskSummary } from './reports.js';
import { sendWindowsNotification, sendSpeech, copyToClipboard } from './notifications.js';

export function runCliAgent(config: BridgeConfig, taskPath: string, taskName: string): void {
  const agent = getActiveAgent(config);
  const startTime = new Date();
  const resultLog = taskPath.replace(/\.md$/, '_result.log');
  writeTaskSummary(taskPath, taskName, startTime, agent.label || agent.name || 'Agent');

  const taskContent = fs.readFileSync(taskPath, 'utf-8');
  const formatInstruction = [
    '<!-- AUTOCLAUDE FORMAT INSTRUCTION -->',
    'After completing ALL steps, output: ## Completion Checklist',
    '| Step | Role | Status |',
    '| Planning | Claude | ✅ |',
    '| Dispatching | AutoClaude | ✅ |',
    `| Execute | ${agent.label || agent.name} | ✅ |`,
    '<!-- END FORMAT INSTRUCTION -->', '',
  ].join('\n');
  const fullContent = formatInstruction + taskContent;

  if (config.showTerminal) {
    const safeName = (agent.label || agent.name || 'agent').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeTask = taskName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const ps1Path = path.join(os.tmpdir(), `_bridge_${safeName}_${safeTask}.ps1`);
    const yoloFlag = agent.yoloMode ? (agent.yoloFlag || '-y') : '';
    const bom = '﻿';
    fs.writeFileSync(ps1Path, bom + [
      `Set-Location '${config.projectDir.replace(/'/g, "''")}'`,
      `Write-Host ''`,
      `Write-Host '========================================' -ForegroundColor Cyan`,
      `Write-Host '  AutoClaude — Task Dispatched' -ForegroundColor Cyan`,
      `Write-Host '  Agent: ${(agent.label || agent.name || '').replace(/'/g, "''")}' -ForegroundColor White`,
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
    const cmd = ('`' + a.command + '`').padEnd(18);
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
  try { output = execSync(cmd, { timeout: 30000, encoding: 'utf-8', stdio: 'pipe', shell: true } as any); } catch (e: any) { error = e.stderr || e.stdout || e.message || ''; if (e.killed) timedOut = true; }
  try { fs.unlinkSync(tmpFile); } catch {}
  return { success: output.includes('AUTOCLAUDE_AUTH_OK'), output, error, timedOut };
}
