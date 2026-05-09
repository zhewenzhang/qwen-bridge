import fs from 'node:fs';

const filePath = 'D:\\qwen-bridge\\src\\index.ts';
let c = fs.readFileSync(filePath, 'utf-8');

// Split into lines for easier manipulation
const lines = c.split('\n');

// Find handler start/end line numbers
function findHandler(marker) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(marker)) return i;
  }
  return -1;
}

// Find the text: [ start and ].join('\n') end for a handler
function findTextBlock(handlerLine) {
  let textStart = -1, textEnd = -1;
  for (let i = handlerLine; i < lines.length; i++) {
    if (lines[i].includes("text: [") || lines[i].includes("text:[")) {
      textStart = i;
      break;
    }
  }
  for (let i = textStart; i < lines.length; i++) {
    if (lines[i].includes("].join('\\n')")) {
      textEnd = i;
      break;
    }
  }
  return { textStart, textEnd };
}

function replaceTextBlock(textStart, textEnd, newLines) {
  const indent = '        ';
  lines.splice(textStart, textEnd - textStart + 1, ...newLines.split('\n').map(l => indent + l));
}

// ─── 1. dispatch_to_qwen ──────────────────────────────────────────────
let h = findHandler('// Phase 5: Beautify dispatch_to_qwen response');
if (h >= 0) {
  let { textStart, textEnd } = findTextBlock(h);
  if (textStart >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── Task Dispatched ──',
          '',
          'Agent    : ' + (agent.label || agent.name || config.activeAgent),
          'Task     : ' + path.basename(taskPath),
          'Mode     : ' + (config.showTerminal ? 'Visible Terminal' : 'Headless Background'),
          'YOLO     : ' + (agent.yoloMode ? '✅ Auto-Approve ON' : '⚠️ Manual Confirm'),
          '',
          '📄 Result Log    : ' + path.basename(resultLog),
          '📋 Report        : ' + path.basename(summaryPath),
          '',
          '🚀 Agent executing in background. Check report for progress.',
        ].join('\\n')`);
    console.log('✓ dispatch_to_qwen');
  }
}

// Reload after each replacement to keep indices accurate
c = lines.join('\n');

// ─── 2. dispatch_to_cursor ────────────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('// Phase 5: Beautify dispatch_to_cursor response');
if (h >= 0) {
  let { textStart, textEnd } = findTextBlock(h);
  if (textStart >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── Task Dispatched (Clipboard) ──',
          '',
          'Agent      : ' + (cursorAgent.label || cursorAgent.name),
          'Task       : ' + path.basename(taskPath),
          'Clipboard  : ' + (clipboardOk ? '✅ Copied' : '⚠️ Failed'),
          '',
          clipboardOk ? 'Open the agent and paste (Ctrl+V).' : 'Open the task file manually.',
        ].join('\\n')`);
    console.log('✓ dispatch_to_cursor');
  }
}

c = lines.join('\n');

// ─── 3. dispatch_task ─────────────────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('// Phase 5: Beautify dispatch_task response');
if (h >= 0) {
  let { textStart, textEnd } = findTextBlock(h);
  if (textStart >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── Task Dispatched ──',
          '',
          'Agent    : ' + (agent.label || agent.name || config.activeAgent),
          'Task     : ' + path.basename(taskPath),
          'Mode     : ' + (config.showTerminal ? 'Visible Terminal' : 'Headless Background'),
          'YOLO     : ' + (agent.yoloMode ? '✅ Auto-Approve ON' : '⚠️ Manual Confirm'),
          '',
          '📄 Result Log    : ' + path.basename(resultLog),
          '📋 Report        : ' + path.basename(summaryPath),
          '',
          '🚀 Agent executing in background. Check report for progress.',
        ].join('\\n')`);
    console.log('✓ dispatch_task');
  }
}

c = lines.join('\n');

// ─── 4. list_agents ───────────────────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('// Phase 3: Beautify list_agents output');
if (h >= 0) {
  // Find the return statement with text array
  let returnLine = -1, textStart = -1, textEnd = -1;
  for (let i = h; i < lines.length; i++) {
    if (lines[i].includes('return {')) { returnLine = i; break; }
  }
  for (let i = returnLine; i < lines.length; i++) {
    if (lines[i].includes('text: [') || lines[i].includes('text:[')) { textStart = i; break; }
  }
  // For list_agents, find the lines.join pattern
  for (let i = returnLine; i < lines.length; i++) {
    if (lines[i].includes('lines.join')) { textEnd = i; break; }
  }
  if (textStart >= 0 && textEnd >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── Configured Agents ──',
          '',
          ...Object.entries(config.agents).map(([id, a]) => {
            const star = id === config.activeAgent ? '⭐' : ' ';
            const yolo = a.yoloMode ? '✅' : '❌';
            const typeIcon = a.type === 'clipboard' ? '📋' : '🖥️';
            const name = (a.label || a.name || id).padEnd(18);
            const cmd = a.command.padEnd(12);
            const disabled = a.enabled ? '' : ' (disabled)';
            return star + ' ' + name + typeIcon + ' YOLO:' + yolo + '  ' + cmd + disabled;
          }),
          '',
          'Active: ' + (config.agents[config.activeAgent]?.label || config.agents[config.activeAgent]?.name || config.activeAgent) + ' — switch_agent("<id>") to change',
        ].join('\\n')`);
    console.log('✓ list_agents');
  }
}

c = lines.join('\n');

// ─── 5. switch_agent ──────────────────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('// Phase 4: Capture old agent name before switching');
if (h >= 0) {
  let { textStart, textEnd } = findTextBlock(h);
  if (textStart >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── Agent Switched ──',
          '',
          'From : ' + oldName,
          'To   : ' + (newAgent.label || newAgent.name),
          'Cmd  : ' + newAgent.command,
          'YOLO : ' + (newAgent.yoloMode ? '✅ ON' : '❌ OFF'),
          '',
          '✅ All dispatch_task calls will now use this agent.',
        ].join('\\n')`);
    console.log('✓ switch_agent');
  }
}

c = lines.join('\n');

// ─── 6. qwen_bridge_status ────────────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('// Phase 2: Beautify qwen_bridge_status output');
if (h >= 0) {
  let { textStart, textEnd } = findTextBlock(h);
  if (textStart >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── AutoClaude ' + getVersion() + ' ──',
          '',
          'Active Agent : ' + (agent.label || agent.name) + ' (\`' + config.activeAgent + '\`)',
          'Command      : ' + agent.command,
          'YOLO Mode    : ' + (agent.yoloMode ? '✅ ON' : '❌ OFF'),
          'Terminal     : ' + (config.showTerminal ? 'visible' : 'headless background'),
          'Agents       : ' + enabledCount + ' enabled / ' + totalCount + ' total',
          'Project Dir  : ' + (config.projectDir || ''),
          '💰 Savings   : ' + cum.tasks + ' tasks · ' + cum.tokensSaved.toLocaleString() + ' tokens · $' + cum.costSaved.toFixed(2),
          '',
          'Tools: dispatch_task · list_agents · switch_agent · add_custom_agent',
          '       check_agent · verify_agent_auth · get_task_report',
          '       get_savings_report · get_project_report · qwen_bridge_status',
        ].join('\\n')`);
    console.log('✓ qwen_bridge_status');
  }
}

c = lines.join('\n');

// ─── 7. verify_agent_auth success ─────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('if (success) {');
if (h >= 0) {
  let { textStart, textEnd } = findTextBlock(h);
  if (textStart >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── Auth Verified ──',
          '',
          'Agent   : ' + (agent.label || agent.name || targetId),
          'Status  : ✅ Authenticated & Ready',
          'Command : ' + agent.command,
        ].join('\\n')`);
    console.log('✓ verify_agent_auth');
  }
}

c = lines.join('\n');

// ─── 8. get_savings_report ────────────────────────────────────────────
lines.length = 0; lines.push(...c.split('\n'));
h = findHandler('// Phase 6: Beautify get_savings_report output');
if (h >= 0) {
  // Find the return with lines array
  let returnLine = -1, textStart = -1, textEnd = -1;
  for (let i = h; i < lines.length; i++) {
    if (lines[i].includes('return {') && !lines[i].includes('isError')) { returnLine = i; break; }
  }
  for (let i = returnLine; i < lines.length; i++) {
    if (lines[i].includes("content: [{ type: 'text'")) { textStart = i; break; }
  }
  for (let i = returnLine; i < lines.length; i++) {
    if (lines[i].includes('lines.join')) { textEnd = i; break; }
  }
  if (textStart >= 0 && textEnd >= 0) {
    replaceTextBlock(textStart, textEnd, `[
          '── 💰 Savings Report ──',
          '',
          'Total Tasks  : ' + cum.tasks,
          'Tokens Saved : ~' + cum.tokensSaved.toLocaleString(),
          'Cost Saved   : $' + cum.costSaved.toFixed(2),
          'Avg/Task     : ~' + (cum.tasks > 0 ? Math.round(cum.tokensSaved / cum.tasks).toLocaleString() : 0) + ' tokens ($' + (cum.tasks > 0 ? (cum.costSaved / cum.tasks).toFixed(3) : '0.00') + ')',
        ].join('\\n')`);
    console.log('✓ get_savings_report');
  }
}

fs.writeFileSync(filePath, c);
console.log('\nAll handlers replaced!');
