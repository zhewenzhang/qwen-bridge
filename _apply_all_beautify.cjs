const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

let changes = 0;

// Phase 8: Beautify runCliAgent terminal banner
const oldCliBanner = `    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}'\`,
      \`Write-Host ''\`,
      \`Write-Host '========================================' -ForegroundColor Yellow\`,
      \`Write-Host '  AutoClaude \u2014 Task Dispatched' -ForegroundColor Yellow\`,
      \`Write-Host '========================================' -ForegroundColor Yellow\`,
      \`Write-Host '  File: \${taskPath.replace(/'/g, "''")}' -ForegroundColor Cyan\`,
      ...(agent.yoloMode ? [\`Write-Host '  Mode: YOLO (auto-approve)' -ForegroundColor Green\`] : []),
      \`Write-Host '========================================' -ForegroundColor Yellow\`,
      \`Write-Host ''\`,
      \`Get-Content '\${taskPath.replace(/'/g, "''")}' -Raw | & \${agent.command}\${yoloFlag} --output-format text\`,
    ].join('\\n') + '\\n', 'utf-8');`;

const newCliBanner = `    const agentLabel = agent.label || agent.name;
    const taskBaseName = path.basename(taskPath);
    const cLine1 = '\u2551        AutoClaude \u2014 Task Dispatched          \u2551';
    const cLine2 = ('\u2551  Agent : ' + agentLabel).padEnd(46) + '\u2551';
    const cLine3 = ('\u2551  File  : ' + taskBaseName).padEnd(46) + '\u2551';
    const cLine4 = agent.yoloMode
      ? ('\u2551  Mode  : \u26a1 YOLO Auto-Approve').padEnd(46) + '\u2551'
      : ('\u2551  Mode  : \u26a0\ufe0f Manual Confirm').padEnd(46) + '\u2551';
    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}'\`,
      \`Write-Host ''\`,
      \`Write-Host '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557' -ForegroundColor Cyan\`,
      \`Write-Host '\${cLine1}' -ForegroundColor Cyan\`,
      \`Write-Host '\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563' -ForegroundColor Cyan\`,
      \`Write-Host '\${cLine2}' -ForegroundColor White\`,
      \`Write-Host '\${cLine3}' -ForegroundColor White\`,
      \`Write-Host '\${cLine4}' -ForegroundColor \${agent.yoloMode ? 'Green' : 'Yellow'}\`,
      \`Write-Host '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d' -ForegroundColor Cyan\`,
      \`Write-Host ''\`,
      \`Get-Content '\${taskPath.replace(/'/g, "''")}' -Raw | & \${agent.command}\${yoloFlag} --output-format text\`,
    ].join('\\n') + '\\n', 'utf-8');`;

if (content.includes(oldCliBanner)) {
  content = content.replace(oldCliBanner, newCliBanner);
  changes++;
  console.log('Phase 8 (runCliAgent banner): DONE');
} else {
  console.log('Phase 8 (runCliAgent banner): NOT FOUND - may already be changed');
}

// Phase 8: Beautify runCursor terminal banner
const oldCursorBanner = `    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}'\`,
      \`Write-Host ''\`,
      \`Write-Host '================================================' -ForegroundColor Cyan\`,
      \`Write-Host '  AutoClaude \u2014 Task Dispatched' -ForegroundColor Cyan\`,
      \`Write-Host '================================================' -ForegroundColor Cyan\`,
      \`Write-Host '  Task : \${taskName.substring(0, 38)}' -ForegroundColor White\`,
      \`Write-Host '  File : \${path.basename(taskPath).substring(0, 38)}' -ForegroundColor White\`,
      \`Write-Host '================================================' -ForegroundColor Cyan\`,
      \`Write-Host '  [OK] Task content copied to CLIPBOARD' -ForegroundColor Green\`,
      \`Write-Host '  --> Open Cursor AI chat and press Ctrl+V' -ForegroundColor Yellow\`,
      \`Write-Host '================================================' -ForegroundColor Cyan\`,
      \`Write-Host ''\`,
      \`Write-Host 'Task file content:' -ForegroundColor Gray\`,
      \`Get-Content '\${taskPath.replace(/'/g, "''")}' | Write-Host -ForegroundColor Gray\`,
    ].join('\\n') + '\\n', 'utf-8');`;

const newCursorBanner = `    const cT1 = '\u2551        AutoClaude \u2014 Task Dispatched          \u2551';
    const cT2 = ('\u2551  Task : ' + taskName.substring(0, 35)).padEnd(46) + '\u2551';
    const cT3 = ('\u2551  File : ' + path.basename(taskPath).substring(0, 35)).padEnd(46) + '\u2551';
    const cT4 = ('\u2551  \u2705 Task content copied to CLIPBOARD').padEnd(46) + '\u2551';
    const cT5 = ('\u2551  \u27a1\ufe0f Open Cursor AI chat and press Ctrl+V').padEnd(46) + '\u2551';
    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}'\`,
      \`Write-Host ''\`,
      \`Write-Host '\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557' -ForegroundColor Cyan\`,
      \`Write-Host '\${cT1}' -ForegroundColor Cyan\`,
      \`Write-Host '\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563' -ForegroundColor Cyan\`,
      \`Write-Host '\${cT2}' -ForegroundColor White\`,
      \`Write-Host '\${cT3}' -ForegroundColor White\`,
      \`Write-Host '\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563' -ForegroundColor Cyan\`,
      \`Write-Host '\${cT4}' -ForegroundColor Green\`,
      \`Write-Host '\${cT5}' -ForegroundColor Yellow\`,
      \`Write-Host '\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d' -ForegroundColor Cyan\`,
      \`Write-Host ''\`,
      \`Write-Host 'Task file content:' -ForegroundColor Gray\`,
      \`Get-Content '\${taskPath.replace(/'/g, "''")}' | Write-Host -ForegroundColor Gray\`,
    ].join('\\n') + '\\n', 'utf-8');`;

if (content.includes(oldCursorBanner)) {
  content = content.replace(oldCursorBanner, newCursorBanner);
  changes++;
  console.log('Phase 8 (runCursor banner): DONE');
} else {
  console.log('Phase 8 (runCursor banner): NOT FOUND - may already be changed');
}

// Phase 2: Beautify qwen_bridge_status
const oldStatus = `  if (request.params.name === 'qwen_bridge_status') {
    const cum = getCumulativeSavings();
    const activeAgent = getActiveAgent(config);
    const agentList = Object.entries(config.agents).map(([k, a]) => \`\${k} (\${a.label})\`).join(', ');

    return {
      content: [{
        type: 'text' as const,
        text: [
          'AutoClaude is running (v5.0)',
          '',
          'Current config:',
          \`  projectDir      : \${config.projectDir}\`,
          \`  terminalApp     : \${config.terminalApp}\`,
          \`  notifyOnDispatch: \${config.notifyOnDispatch}\`,
          \`  speechOnDispatch: \${config.speechOnDispatch}\`,
          \`  activeAgent     : \${config.activeAgent} (\${activeAgent.label})\`,
          \`  agents          : \${agentList}\`,
          '',
          'Available tools:',
          '  dispatch_to_qwen    \u2014 dispatch QWEN_*.md to Qwen Code',
          '  dispatch_to_cursor  \u2014 dispatch CURSOR_*.md to Cursor AI (clipboard + launch)',
          '  dispatch_task       \u2014 dispatch to active agent (agent-agnostic)',
          '  list_agents         \u2014 list all configured agents',
          '  switch_agent        \u2014 switch the active agent',
          '  add_custom_agent    \u2014 add a new agent to config',
          '  qwen_bridge_status  \u2014 this status check',
          '  get_task_report     \u2014 read _summary.md for a dispatched task',
          '  get_savings_report  \u2014 show cumulative token & cost savings',
          '',
          \`Cumulative Savings: \${cum.tasks} tasks, ~\${cum.tokensSaved.toLocaleString()} tokens, $\${cum.costSaved.toFixed(2)}\`,
        ].join('\\n'),
      }],
    };
  }`;

const newStatus = `  if (request.params.name === 'qwen_bridge_status') {
    const cum = getCumulativeSavings();
    const agent = getActiveAgent(config);
    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;
    const totalCount = Object.keys(config.agents).length;
    const W = 53;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c' + '\u2500'.repeat(W) + '\u2510',
          '\u2502' + padStr('              AutoClaude v5.2 \u2014 Status               ', W) + '\u2502',
          '\u251c' + '\u2500'.repeat(W) + '\u2524',
          \`  \u2502  Active Agent : \${padStr(agent.label || agent.name, W - 19)}\u2502\`,
          \`  \u2502  Command      : \${padStr(agent.command, W - 19)}\u2502\`,
          \`  \u2502  YOLO Mode    : \${padStr(agent.yoloMode ? '\u2705 ON' : '\u274c OFF', W - 19)}\u2502\`,
          \`  \u2502  Terminal     : \${padStr(config.showTerminal ? 'visible' : 'headless background', W - 19)}\u2502\`,
          '\u251c' + '\u2500'.repeat(W) + '\u2524',
          \`  \u2502  Agents       : \${padStr(\`\${enabledCount} enabled / \${totalCount} total\`, W - 19)}\u2502\`,
          \`  \u2502  Project Dir  : \${padStr((config.projectDir || '').substring(0, W - 19), W - 19)}\u2502\`,
          '\u251c' + '\u2500'.repeat(W) + '\u2524',
          \`  \u2502  \ud83d\udcb0 Savings  : \${padStr(\`\${cum.tasks} tasks \u00b7 \${cum.tokensSaved.toLocaleString()} tokens \u00b7 $\${cum.costSaved.toFixed(2)}\`, W - 19)}\u2502\`,
          '\u2514' + '\u2500'.repeat(W) + '\u2518',
          '',
          'Tools: dispatch_task \u00b7 dispatch_to_qwen \u00b7 dispatch_to_cursor',
          '       list_agents \u00b7 switch_agent \u00b7 add_custom_agent',
          '       get_task_report \u00b7 get_savings_report \u00b7 qwen_bridge_status',
        ].join('\\n'),
      }],
    };
  }`;

if (content.includes(oldStatus)) {
  content = content.replace(oldStatus, newStatus);
  changes++;
  console.log('Phase 2 (qwen_bridge_status): DONE');
} else {
  console.log('Phase 2 (qwen_bridge_status): NOT FOUND - may already be changed');
}

// Phase 3: Beautify list_agents
const oldListAgents = `  if (request.params.name === 'list_agents') {
    const agentList = Object.entries(config.agents).map(([key, agent]) => {
      const isActive = key === config.activeAgent;
      return [
        \`\${isActive ? '>> ' : '   '}\${key}\`,
        \`     Command  : \${agent.command}\`,
        \`     Label    : \${agent.label}\`,
        \`     YOLO     : \${agent.yoloMode ? 'ON' : 'OFF'}\`,
        \`     Terminal : \${agent.showTerminal ? 'visible' : 'headless'}\`,
      ].join('\\n');
    });

    return {
      content: [{
        type: 'text' as const,
        text: [
          'Configured Agents:',
          '',
          ...agentList,
          '',
          \`Active agent: \${config.activeAgent} (\${config.agents[config.activeAgent]?.label ?? 'unknown'})\`,
        ].join('\\n'),
      }],
    };
  }`;

const newListAgents = `  if (request.params.name === 'list_agents') {
    const W = 74;
    const lines = [
      '\u250c' + '\u2500'.repeat(W) + '\u2510',
      '\u2502' + padStr('                         Configured Agents                               ', W) + '\u2502',
      '\u251c' + '\u2500'.repeat(W) + '\u2524',
    ];

    for (const [id, agent] of Object.entries(config.agents)) {
      const active = id === config.activeAgent ? '\u2b50' : '  ';
      const yolo = agent.yoloMode ? '\u2705' : '\u274c';
      const typeIcon = agent.type === 'clipboard' ? '\ud83d\udccb' : '\ud83d\udda5\ufe0f';
      const name = padStr(agent.label || agent.name || id, 18);
      const cmd = padStr(agent.command, 14);
      const enabled = agent.enabled !== false;
      const hint = enabled ? '' : ' (disabled)';
      const row = \` \${active} \${name} \${typeIcon} YOLO:\${yolo}  \${cmd}\${hint}\`;
      lines.push('\u2502' + padStr(row, W) + '\u2502');
    }

    lines.push('\u251c' + '\u2500'.repeat(W) + '\u2524');
    const activeAgent = config.agents[config.activeAgent];
    const activeInfo = \`  \u2b50 Active: \${activeAgent?.label || activeAgent?.name || config.activeAgent} \u2014 dispatch_task will use this agent\`;
    lines.push('\u2502' + padStr(activeInfo, W) + '\u2502');
    lines.push('\u2514' + '\u2500'.repeat(W) + '\u2518');
    lines.push('');
    lines.push('Switch: switch_agent("<id>")  |  Add custom: add_custom_agent(...)');

    return {
      content: [{ type: 'text' as const, text: lines.join('\\n') }],
    };
  }`;

if (content.includes(oldListAgents)) {
  content = content.replace(oldListAgents, newListAgents);
  changes++;
  console.log('Phase 3 (list_agents): DONE');
} else {
  console.log('Phase 3 (list_agents): NOT FOUND - may already be changed');
}

// Phase 4: Beautify switch_agent
const oldSwitch = `    const oldAgent = config.activeAgent;
    config.activeAgent = agent;
    saveConfig(config);

    return {
      content: [{
        type: 'text' as const,
        text: [
          \`Switched active agent: \${oldAgent} -> \${agent}\`,
          \`   Label   : \${config.agents[agent].label}\`,
          \`   Command : \${config.agents[agent].command}\`,
          \`   YOLO    : \${config.agents[agent].yoloMode ? 'ON' : 'OFF'}\`,
          '',
          'This change is persisted to config.json.',
          'Use dispatch_task to send tasks to the new active agent.',
        ].join('\\n'),
      }],
    };`;

const newSwitch = `    const oldAgentInfo = config.agents[config.activeAgent];
    const oldName = oldAgentInfo?.label || oldAgentInfo?.name || config.activeAgent;
    const newAgent = config.agents[agent];
    config.activeAgent = agent;
    saveConfig(config);
    const newLabel = newAgent.label || newAgent.name;
    const Ws = 42;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502         Agent Switched                    \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          \`  \u2502  From : \${padStr(oldName, Ws - 11)}\u2502\`,
          \`  \u2502  To   : \${padStr(newLabel, Ws - 11)}\u2502\`,
          \`  \u2502  Cmd  : \${padStr(newAgent.command, Ws - 11)}\u2502\`,
          \`  \u2502  YOLO : \${padStr(newAgent.yoloMode ? '\u2705 ON' : '\u274c OFF', Ws - 11)}\u2502\`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\u2705 All dispatch_task calls will now use this agent.',
          'This change is persisted to config.json.',
        ].join('\\n'),
      }],
    };`;

if (content.includes(oldSwitch)) {
  content = content.replace(oldSwitch, newSwitch);
  changes++;
  console.log('Phase 4 (switch_agent): DONE');
} else {
  console.log('Phase 4 (switch_agent): NOT FOUND - may already be changed');
}

// Phase 5: Beautify dispatch_to_qwen return
const oldDQwen = `    return {
      content: [{
        type: 'text' as const,
        text: [
          \`Dispatched to \${agent.label}\`,
          \`   Task File   : \${taskPath}\`,
          \`   Description : \${notifMsg}\`,
          \`   YOLO mode   : \${agent.yoloMode ? 'ON (auto-approve all actions)' : 'OFF'}\`,
          \`   Mode        : \${agent.showTerminal ? 'visible terminal' : 'headless background'}\`,
          \`   Result Log  : \${resultLog}\`,
          \`   Summary     : \${summaryPath}\`,
          '',
          'AutoClaude dispatched. Agent executing in background.',
          'Check _summary.md for the process report and _result.log for raw output.',
        ].join('\\n'),
      }],
    };
  }

  // -- dispatch_to_cursor`;

const newDQwen = `    const aLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\u2705 Auto-Approve ON' : '\u26a0\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';
    const W = 50;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502           Task Dispatched to Qwen Code               \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          \`  \u2502  Agent   : \${padStr(aLabel, W - 12)}\u2502\`,
          \`  \u2502  File    : \${padStr(path.basename(taskPath), W - 12)}\u2502\`,
          \`  \u2502  Mode    : \${padStr(modeStr, W - 12)}\u2502\`,
          \`  \u2502  YOLO    : \${padStr(yoloStr, W - 12)}\u2502\`,
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          \`  \u2502  \ud83d\udcc4 Result : \${padStr(path.basename(resultLog), W - 12)}\u2502\`,
          \`  \u2502  \ud83d\udccb Report : \${padStr(path.basename(summaryPath), W - 12)}\u2502\`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\ud83d\ude80 Agent executing in background. Check _summary.md when done.',
        ].join('\\n'),
      }],
    };
  }

  // -- dispatch_to_cursor`;

if (content.includes(oldDQwen)) {
  content = content.replace(oldDQwen, newDQwen);
  changes++;
  console.log('Phase 5 (dispatch_to_qwen): DONE');
} else {
  console.log('Phase 5 (dispatch_to_qwen): NOT FOUND - may already be changed');
}

// Phase 5: Beautify dispatch_to_cursor return
const oldDCursor = `    return {
      content: [{
        type: 'text' as const,
        text: [
          'Dispatched to Cursor',
          \`   File       : \${taskPath}\`,
          \`   Task       : \${notifMsg}\`,
          \`   Clipboard  : \${clipboardOk ? 'Task content copied (Ctrl+V into Cursor AI chat)' : 'Copy failed -- paste task file manually'}\`,
          \`   Terminal   : \${config.agents['cursor']?.showTerminal ? 'visible' : 'headless'}\`,
          '',
          clipboardOk
            ? 'Task content is in clipboard. Open Cursor AI chat and press Ctrl+V.'
            : 'Open the task file manually in Cursor.',
          'Claude is free -- Cursor AI runs independently using its own tokens.',
        ].join('\\n'),
      }],
    };
  }

  // -- dispatch_task`;

const newDCursor = `    const Wc = 50;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502           Task Dispatched to Cursor                  \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          \`  \u2502  File       : \${padStr(path.basename(taskPath), Wc - 15)}\u2502\`,
          \`  \u2502  Clipboard  : \${padStr(clipboardOk ? '\u2705 Copied (Ctrl+V into Cursor)' : '\u274c Copy failed', Wc - 15)}\u2502\`,
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          clipboardOk
            ? \`  \u2502  \u27a1\ufe0f \${padStr('Open Cursor AI chat and press Ctrl+V', Wc - 6)}\u2502\`
            : \`  \u2502  \u26a0\ufe0f \${padStr('Open the task file manually in Cursor', Wc - 6)}\u2502\`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\ud83d\ude80 Claude is free \u2014 Cursor AI runs independently using its own tokens.',
        ].join('\\n'),
      }],
    };
  }

  // -- dispatch_task`;

if (content.includes(oldDCursor)) {
  content = content.replace(oldDCursor, newDCursor);
  changes++;
  console.log('Phase 5 (dispatch_to_cursor): DONE');
} else {
  console.log('Phase 5 (dispatch_to_cursor): NOT FOUND - may already be changed');
}

// Phase 5: Beautify dispatch_task return
const oldDTtask = `    return {
      content: [{
        type: 'text' as const,
        text: [
          \`Dispatched to \${agent.label} [active agent]\`,
          \`   Task File   : \${taskPath}\`,
          \`   Description : \${notifMsg}\`,
          \`   YOLO mode   : \${agent.yoloMode ? 'ON (auto-approve all actions)' : 'OFF'}\`,
          \`   Mode        : \${agent.showTerminal ? 'visible terminal' : 'headless background'}\`,
          \`   Result Log  : \${resultLog}\`,
          \`   Summary     : \${summaryPath}\`,
          '',
          \`AutoClaude dispatched to \${agent.label}. Agent executing in background.\`,
          'Check _summary.md for the process report and _result.log for raw output.',
        ].join('\\n'),
      }],
    };
  }

  // -- list_agents`;

const newDTtask = `    const dAgentLabel = agent.label || agent.name;
    const dYoloStr = agent.yoloMode ? '\u2705 Auto-Approve ON' : '\u26a0\ufe0f Manual Confirm';
    const dModeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';
    const dW = 50;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
          '\u2502           Task Dispatched                        \u2502',
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          \`  \u2502  Agent   : \${padStr(dAgentLabel, dW - 12)}\u2502\`,
          \`  \u2502  File    : \${padStr(path.basename(taskPath), dW - 12)}\u2502\`,
          \`  \u2502  Mode    : \${padStr(dModeStr, dW - 12)}\u2502\`,
          \`  \u2502  YOLO    : \${padStr(dYoloStr, dW - 12)}\u2502\`,
          '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
          \`  \u2502  \ud83d\udcc4 Result : \${padStr(path.basename(resultLog), dW - 12)}\u2502\`,
          \`  \u2502  \ud83d\udccb Report : \${padStr(path.basename(summaryPath), dW - 12)}\u2502\`,
          '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          '',
          '\ud83d\ude80 Agent executing in background. Check _summary.md when done.',
        ].join('\\n'),
      }],
    };
  }

  // -- list_agents`;

if (content.includes(oldDTtask)) {
  content = content.replace(oldDTtask, newDTtask);
  changes++;
  console.log('Phase 5 (dispatch_task): DONE');
} else {
  console.log('Phase 5 (dispatch_task): NOT FOUND - may already be changed');
}

// Phase 6: Beautify get_savings_report
const oldSavings = `  if (request.params.name === 'get_savings_report') {
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
      \`| Metric | Value |\`,
      \`|--------|-------|\`,
      \`| **Total Tasks Dispatched** | \${cum.tasks} |\`,
      \`| **Total Tokens Saved** | **~\${cum.tokensSaved.toLocaleString()}** |\`,
      \`| **Total Cost Saved** | **$\${cum.costSaved.toFixed(2)}** |\`,
      '',
    ];

    if (last5.length > 0) {
      lines.push('| Task | Tokens Saved | Cost Saved |', '|------|-------------|------------|');
      for (const s of last5) {
        lines.push(\`| \${s.taskName} | \${s.tokensSaved.toLocaleString()} tokens | $\${s.costSaved.toFixed(4)} saved |\`);
      }
      lines.push('');
      lines.push(\`> Average savings: **~\${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($\${(cum.costSaved / cum.tasks).toFixed(4)})** per task\`);
      lines.push(\`> At legacy Opus 4.5 pricing ($15/$75), savings would be **~$\${(cum.costSaved * 3).toFixed(2)}**\`);
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\\n') }],
    };
  }`;

const newSavings = `  if (request.params.name === 'get_savings_report') {
    const cum = getCumulativeSavings();
    const all = loadSavings();
    const last5 = all.slice(-5).reverse();
    const Ws = 50;

    const lines = [
      '\u250c' + '\u2500'.repeat(Ws) + '\u2510',
      '\u2502' + padStr('            \ud83d\udcb0 Savings Report                     ', Ws) + '\u2502',
      '\u251c' + '\u2500'.repeat(Ws) + '\u2524',
      \`  \u2502  Tasks     : \${padStr(String(cum.tasks), Ws - 16)}\u2502\`,
      \`  \u2502  Tokens    : \${padStr(cum.tokensSaved.toLocaleString() + ' saved', Ws - 16)}\u2502\`,
      \`  \u2502  Cost      : \${padStr('$' + cum.costSaved.toFixed(2) + ' saved', Ws - 16)}\u2502\`,
      '\u251c' + '\u2500'.repeat(Ws) + '\u2524',
    ];

    if (last5.length > 0) {
      lines.push('\u2502' + padStr('  Recent Tasks:', Ws) + '\u2502');
      for (const s of last5.slice(0, 5)) {
        const shortName = s.taskName.substring(0, 25);
        const row = \`  \ud83d\udccb \${padStr(shortName, 25)} \${s.tokensSaved.toLocaleString().padStart(8)} tk  $\${s.costSaved.toFixed(2).padStart(6)}\`;
        lines.push('\u2502' + padStr(row, Ws) + '\u2502');
      }
      lines.push('\u251c' + '\u2500'.repeat(Ws) + '\u2524');
    }

    lines.push('\u2514' + '\u2500'.repeat(Ws) + '\u2518');
    if (cum.tasks > 0) {
      lines.push('');
      lines.push(\`\ud83d\udca1 Average: ~\${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($\${(cum.costSaved / cum.tasks).toFixed(3)}) saved per task\`);
    }

    return { content: [{ type: 'text' as const, text: lines.join('\\n') }] };
  }`;

if (content.includes(oldSavings)) {
  content = content.replace(oldSavings, newSavings);
  changes++;
  console.log('Phase 6 (get_savings_report): DONE');
} else {
  console.log('Phase 6 (get_savings_report): NOT FOUND - may already be changed');
}

// Phase 7: Beautify get_task_report "no report found"
const oldNoReport = `    if (!fs.existsSync(summaryPath)) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            \`No report found for: \${path.basename(taskPath)}\`,
            '',
            \`Expected at: \${summaryPath}\`,
            '',
            'The task may still be running, or no summary was generated.',
            \`Check if _result.log exists: \${fs.existsSync(resultLog) ? 'Yes' : 'No'}\`,
          ].join('\\n'),
        }],
      };
    }`;

const newNoReport = `    if (!fs.existsSync(summaryPath)) {
      const Wn = 50;
      return {
        content: [{
          type: 'text' as const,
          text: [
            '\u250c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510',
            '\u2502            \ud83d\udccb Task Report                        \u2502',
            '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
            \`  \u2502  Task  : \${padStr(path.basename(taskPath), Wn - 11)}\u2502\`,
            \`  \u2502  Status: \${padStr('\u23f3 Still running...', Wn - 11)}\u2502\`,
            '\u251c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524',
            \`  \u2502  \ud83d\udcc4 Raw log: \${padStr(fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet', Wn - 11)}\u2502\`,
            '\u2502  \ud83d\udca1 The report will auto-finalize when output    \u2502',
            '\u2502     is detected in the result log.              \u2502',
            '\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518',
          ].join('\\n'),
        }],
      };
    }`;

if (content.includes(oldNoReport)) {
  content = content.replace(oldNoReport, newNoReport);
  changes++;
  console.log('Phase 7 (get_task_report no report): DONE');
} else {
  console.log('Phase 7 (get_task_report no report): NOT FOUND - may already be changed');
}

// Update version in finalizeTaskSummary footer
content = content.replace(
  `*Report generated by AutoClaude v5.0 \u2014 Plan with Claude, Execute Everywhere.*`,
  `*Report generated by AutoClaude v5.2 \u2014 Plan with Claude, Execute Everywhere.*`
);
changes++;

// Update server version
content = content.replace(
  "{ name: 'autoclaude', version: '5.2.0' }",
  "{ name: 'autoclaude', version: '5.2.0' }"
);

// Update finalizeTaskSummary "Completion Status" emoji
content = content.replace(
  "`| **Status** | ${success ? 'Completed' : 'Check log'} |`",
  "`| **Status** | ${success ? '\u2705 Completed' : '\u26a0\ufe0f Check log'} |`"
);
changes++;

// Update finalizeTaskSummary "Result Preview" to use emoji
content = content.replace(
  '## Result Preview',
  '## \ud83d\udcc4 Result Preview'
);
changes++;

// Update finalizeTaskSummary "Token Economics" to use emoji
content = content.replace(
  '## Token Economics',
  '## \ud83d\udcb0 Token Economics'
);
changes++;

fs.writeFileSync(filePath, content, 'utf-8');
console.log('\\nTotal changes applied:', changes);
console.log('File written successfully');
