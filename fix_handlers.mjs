import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// ─── Handler 1: qwen_bridge_status ──────────────────────────────────────────
content = content.replace(
  /(\/\/ -- qwen_bridge_status[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\})/,
  (match, before, after) => {
    const newText = [
      "          '── AutoClaude ' + getVersion() + ' ──',",
      "          '',",
      "          'Active Agent : ' + (agent.label || agent.name) + ' (`' + config.activeAgent + '`)',",
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
    return before + '\n' + newText + '\n        ' + after;
  }
);

// ─── Handler 2a: dispatch_to_qwen ───────────────────────────────────────────
content = content.replace(
  /(\/\/ Phase 5: Beautify dispatch_to_qwen response[\s\S]*?const agentLabel = agent\.label \|\| agent\.name;[\s\S]*?const yoloStr = agent\.yoloMode[\s\S]*?const modeStr = agent\.showTerminal[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\/\/ -- dispatch_to_cursor)/,
  (match, before, after) => {
    const newText = [
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
    return before + '\n' + newText + '\n        ' + after;
  }
);

// ─── Handler 2b: dispatch_to_cursor ─────────────────────────────────────────
content = content.replace(
  /(\/\/ Phase 5: Beautify dispatch_to_cursor response[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\/\/ -- dispatch_task)/,
  (match, before, after) => {
    const newText = [
      "          '── Task Dispatched (Clipboard) ──',",
      "          '',",
      "          'Agent      : ' + (cursorAgent.label || cursorAgent.name),",
      "          'Task       : ' + path.basename(taskPath),",
      "          'Clipboard  : ' + (clipboardOk ? '✅ Copied' : '⚠️ Failed'),",
      "          '',",
      "          clipboardOk ? 'Open the agent and paste (Ctrl+V).' : 'Open the task file manually.',",
    ].join('\n');
    return before + '\n' + newText + '\n        ' + after;
  }
);

// ─── Handler 2c: dispatch_task ──────────────────────────────────────────────
content = content.replace(
  /(\/\/ Phase 5: Beautify dispatch_task response[\s\S]*?const agentLabel = agent\.label \|\| agent\.name;[\s\S]*?const yoloStr = agent\.yoloMode[\s\S]*?const modeStr = agent\.showTerminal[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\/\/ -- list_agents)/,
  (match, before, after) => {
    const newText = [
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
    return before + '\n' + newText + '\n        ' + after;
  }
);

// ─── Handler 3: list_agents ─────────────────────────────────────────────────
content = content.replace(
  /(\/\/ -- list_agents[\s\S]*?if \(request\.params\.name === 'list_agents'\) \{[\s\S]*?\/\/ Phase 3: Beautify list_agents output[\s\S]*?)(const lines = \[[\s\S]*?'Switch with)/,
  (match, before, oldLines) => {
    const newText = [
      "return {",
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
    
    // Replace the entire block from "const lines = [" through the end of the handler
    content = content.replace(
      /\/\/ Phase 3: Beautify list_agents output[\s\S]*?return \{[\s\S]*?content: \[\{ type: 'text' as const, text: lines\.join\('\\n'\) \}\],[\s\S]*?\};[\s\S]*?\}\s*(?=\/\/ -- switch_agent)/,
      newText + '\n\n  '
    );
    
    return before + newText;
  }
);

// ─── Handler 4: switch_agent ────────────────────────────────────────────────
content = content.replace(
  /(\/\/ -- switch_agent[\s\S]*?const newLabel = newAgent\.label \|\| newAgent\.name;[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\/\/ -- add_custom_agent)/,
  (match, before, after) => {
    const newText = [
      "          '── Agent Switched ──',",
      "          '',",
      "          'From : ' + oldName,",
      "          'To   : ' + (newAgent.label || newAgent.name),",
      "          'Cmd  : ' + newAgent.command,",
      "          'YOLO : ' + (newAgent.yoloMode ? '✅ ON' : '❌ OFF'),",
      "          '',",
      "          '✅ All dispatch_task calls will now use this agent.',",
    ].join('\n');
    return before + '\n' + newText + '\n        ' + after;
  }
);

// ─── Handler 5: verify_agent_auth success ───────────────────────────────────
content = content.replace(
  /(if \(success\) \{[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\/\/ Auth failed)/,
  (match, before, after) => {
    const newText = [
      "          '── Auth Verified ──',",
      "          '',",
      "          'Agent   : ' + (agent.label || agent.name || targetId),",
      "          'Status  : ✅ Authenticated & Ready',",
      "          'Command : ' + agent.command,",
    ].join('\n');
    return before + '\n' + newText + '\n        ' + after;
  }
);

// ─── Handler 6: get_savings_report ──────────────────────────────────────────
content = content.replace(
  /(\/\/ -- get_savings_report[\s\S]*?if \(request\.params\.name === 'get_savings_report'\) \{[\s\S]*?\/\/ Phase 6: Beautify get_savings_report output[\s\S]*?const cum = getCumulativeSavings\(\);[\s\S]*?const all = loadSavings\(\);[\s\S]*?const last5 = all\.slice\(-5\)\.reverse\(\);[\s\S]*?)(const lines = \[[\s\S]*?'\]\.join\('\\n'\) \}\],\s*\};\s*\}\s*\/\/ -- get_project_report)/,
  (match, before, oldBlock) => {
    const newText = [
      "return {",
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
    
    content = content.replace(
      /\/\/ Phase 6: Beautify get_savings_report output[\s\S]*?const cum = getCumulativeSavings\(\);[\s\S]*?const all = loadSavings\(\);[\s\S]*?const last5 = all\.slice\(-5\)\.reverse\(\);[\s\S]*?const lines = \[[\s\S]*?content: \[\{ type: 'text' as const, text: lines\.join\('\\n'\) \}\],[\s\S]*?\};[\s\S]*?\}\s*(?=\/\/ -- get_project_report)/,
      newText + '\n\n  '
    );
    
    return before + newText;
  }
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done. Handlers replaced.');
