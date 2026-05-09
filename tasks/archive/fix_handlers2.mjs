import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// ─── Handler 1: dispatch_to_qwen ──────────────────────────────────────────
// Find from "// Phase 5: Beautify dispatch_to_qwen response" to the return block
content = content.replace(
  /(\/\/ Phase 5: Beautify dispatch_to_qwen response[\s\S]*?const agentLabel = agent\.label \|\| agent\.name;\s*\n\s*const yoloStr =[\s\S]*?const modeStr =[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\n\s*\/\/ -- dispatch_to_cursor)/,
  (m, before, after) => {
    const t = [
      "          '── Task Dispatched ──',",
      "          '',",
      "          'Agent    : ' + (agent.label || agent.name || config.activeAgent),",
      "          'Task     : ' + path.basename(taskPath),",
      "          'Mode     : ' + (config.showTerminal ? 'Visible Terminal' : 'Headless Background'),",
      "          'YOLO     : ' + (agent.yoloMode ? '✅ Auto-Approve ON' : '⚠️ Manual Confirm'),",
      "          '',",
      "          '📄 Result Log    : ' + path.basename(resultLog),",
      "          '📋 Report        : ' + path.basename(summaryPath),",
      "          '',",
      "          '🚀 Agent executing in background. Check report for progress.',",
    ].join('\n');
    return before + '\n' + t + '\n        ' + after;
  }
);

// ─── Handler 2: dispatch_to_cursor ────────────────────────────────────────
content = content.replace(
  /(\/\/ Phase 5: Beautify dispatch_to_cursor response[\s\S]*?const W = \d+;\s*\n\s*return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\n\s*\/\/ -- dispatch_task)/,
  (m, before, after) => {
    const t = [
      "          '── Task Dispatched (Clipboard) ──',",
      "          '',",
      "          'Agent      : ' + (cursorAgent.label || cursorAgent.name),",
      "          'Task       : ' + path.basename(taskPath),",
      "          'Clipboard  : ' + (clipboardOk ? '✅ Copied' : '⚠️ Failed'),",
      "          '',",
      "          clipboardOk ? 'Open the agent and paste (Ctrl+V).' : 'Open the task file manually.',",
    ].join('\n');
    return before + '\n' + t + '\n        ' + after;
  }
);

// ─── Handler 3: dispatch_task ─────────────────────────────────────────────
content = content.replace(
  /(\/\/ Phase 5: Beautify dispatch_task response[\s\S]*?const agentLabel = agent\.label \|\| agent\.name;\s*\n\s*const yoloStr =[\s\S]*?const modeStr =[\s\S]*?const W = \d+;\s*\n\s*return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\n\s*\/\/ -- list_agents)/,
  (m, before, after) => {
    const t = [
      "          '── Task Dispatched ──',",
      "          '',",
      "          'Agent    : ' + (agent.label || agent.name || config.activeAgent),",
      "          'Task     : ' + path.basename(taskPath),",
      "          'Mode     : ' + (config.showTerminal ? 'Visible Terminal' : 'Headless Background'),",
      "          'YOLO     : ' + (agent.yoloMode ? '✅ Auto-Approve ON' : '⚠️ Manual Confirm'),",
      "          '',",
      "          '📄 Result Log    : ' + path.basename(resultLog),",
      "          '📋 Report        : ' + path.basename(summaryPath),",
      "          '',",
      "          '🚀 Agent executing in background. Check report for progress.',",
    ].join('\n');
    return before + '\n' + t + '\n        ' + after;
  }
);

// ─── Handler 4: list_agents ───────────────────────────────────────────────
content = content.replace(
  /(\/\/ -- list_agents[\s\S]*?if \(request\.params\.name === 'list_agents'\) \{[\s\S]*?\/\/ Phase 3: Beautify list_agents output[\s\S]*?)(const W = \d+;[\s\S]*?return \{[\s\S]*?content: \[\{ type: 'text' as const, text: lines\.join\('\\n'\) \}\],[\s\S]*?\};[\s\S]*?\}\s*\n)(\s*\/\/ -- switch_agent)/,
  (m, before, oldBlock, after) => {
    const t = [
      "    return {",
      "      content: [{ type: 'text' as const, text: [",
      "          '── Configured Agents ──',",
      "          '',",
      "          ...Object.entries(config.agents).map(([id, a]) => {",
      "            const star = id === config.activeAgent ? '⭐' : ' ';",
      "            const yolo = a.yoloMode ? '✅' : '❌';",
      "            const typeIcon = a.type === 'clipboard' ? '📋' : '🖥️';",
      "            const name = (a.label || a.name || id).padEnd(18);",
      "            const cmd = a.command.padEnd(12);",
      "            const disabled = a.enabled ? '' : ' (disabled)';",
      "            return star + ' ' + name + typeIcon + ' YOLO:' + yolo + '  ' + cmd + disabled;",
      "          }),",
      "          '',",
      "          'Active: ' + (config.agents[config.activeAgent]?.label || config.agents[config.activeAgent]?.name || config.activeAgent) + ' — switch_agent(\"<id>\") to change',",
      "        ].join('\\n') }],",
      "    };",
    ].join('\n');
    return before + t + '\n' + after;
  }
);

// ─── Handler 5: switch_agent ──────────────────────────────────────────────
content = content.replace(
  /(\/\/ -- switch_agent[\s\S]*?const newLabel = newAgent\.label \|\| newAgent\.name;\s*\n\s*const W = \d+;\s*\n\s*return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\n\s*\/\/ -- add_custom_agent)/,
  (m, before, after) => {
    const t = [
      "          '── Agent Switched ──',",
      "          '',",
      "          'From : ' + oldName,",
      "          'To   : ' + (newAgent.label || newAgent.name),",
      "          'Cmd  : ' + newAgent.command,",
      "          'YOLO : ' + (newAgent.yoloMode ? '✅ ON' : '❌ OFF'),",
      "          '',",
      "          '✅ All dispatch_task calls will now use this agent.',",
    ].join('\n');
    return before + '\n' + t + '\n        ' + after;
  }
);

// ─── Handler 6: qwen_bridge_status ────────────────────────────────────────
content = content.replace(
  /(\/\/ -- qwen_bridge_status[\s\S]*?if \(request\.params\.name === 'qwen_bridge_status'\) \{[\s\S]*?\/\/ Phase 2: Beautify qwen_bridge_status output[\s\S]*?const enabledCount =[\s\S]*?const totalCount =[\s\S]*?const W = \d+;\s*\n\s*return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\n\s*\/\/ -- get_task_report)/,
  (m, before, after) => {
    const t = [
      "          '── AutoClaude ' + getVersion() + ' ──',",
      "          '',",
      "          'Active Agent : ' + (agent.label || agent.name) + ' (`' + config.activeAgent + '`)',",
      "          'Command      : ' + agent.command,",
      "          'YOLO Mode    : ' + (agent.yoloMode ? '✅ ON' : '❌ OFF'),",
      "          'Terminal     : ' + (config.showTerminal ? 'visible' : 'headless background'),",
      "          'Agents       : ' + enabledCount + ' enabled / ' + totalCount + ' total',",
      "          'Project Dir  : ' + (config.projectDir || ''),",
      "          '💰 Savings   : ' + cum.tasks + ' tasks · ' + cum.tokensSaved.toLocaleString() + ' tokens · $' + cum.costSaved.toFixed(2),",
      "          '',",
      "          'Tools: dispatch_task · list_agents · switch_agent · add_custom_agent',",
      "          '       check_agent · verify_agent_auth · get_task_report',",
      "          '       get_savings_report · get_project_report · qwen_bridge_status',",
    ].join('\n');
    return before + '\n' + t + '\n        ' + after;
  }
);

// ─── Handler 7: get_savings_report ────────────────────────────────────────
content = content.replace(
  /(\/\/ -- get_savings_report[\s\S]*?if \(request\.params\.name === 'get_savings_report'\) \{[\s\S]*?\/\/ Phase 6: Beautify get_savings_report output[\s\S]*?const cum = getCumulativeSavings\(\);[\s\S]*?const all = loadSavings\(\);[\s\S]*?const last5 = all\.slice\(-5\)\.reverse\(\);[\s\S]*?const W = \d+;[\s\S]*?)(const lines = \[[\s\S]*?return \{[\s\S]*?content: \[\{ type: 'text' as const, text: lines\.join\('\\n'\) \}\],[\s\S]*?\};[\s\S]*?\}\s*\n)(\s*\/\/ -- get_project_report)/,
  (m, before, oldBlock, after) => {
    const t = [
      "    return {",
      "      content: [{ type: 'text' as const, text: [",
      "          '── 💰 Savings Report ──',",
      "          '',",
      "          'Total Tasks  : ' + cum.tasks,",
      "          'Tokens Saved : ~' + cum.tokensSaved.toLocaleString(),",
      "          'Cost Saved   : $' + cum.costSaved.toFixed(2),",
      "          'Avg/Task     : ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' tokens ($' + (cum.tasks > 0 ? (cum.costSaved / cum.tasks).toFixed(3) : '0.00') + ')',",
      "        ].join('\\n') }],",
      "    };",
    ].join('\n');
    return before + t + '\n' + after;
  }
);

// ─── Handler 8: verify_agent_auth success ─────────────────────────────────
content = content.replace(
  /(if \(success\) \{[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\/\/ Auth failed)/,
  (m, before, after) => {
    const t = [
      "          '── Auth Verified ──',",
      "          '',",
      "          'Agent   : ' + (agent.label || agent.name || targetId),",
      "          'Status  : ✅ Authenticated & Ready',",
      "          'Command : ' + agent.command,",
    ].join('\n');
    return before + '\n' + t + '\n        ' + after;
  }
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('All handlers replaced successfully.');
