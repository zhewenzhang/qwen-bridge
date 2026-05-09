const fs = require('fs');
const f = 'D:/qwen-bridge/src/index.ts';
let s = fs.readFileSync(f, 'utf8');

let replacements = 0;
function rep(oldStr, newStr) {
  if (!s.includes(oldStr)) {
    console.log('WARNING: oldStr not found:', oldStr.substring(0, 80));
    return;
  }
  s = s.replace(oldStr, newStr);
  replacements++;
}

// 1. runCliAgent terminal banner
rep(
`    // Compute padded lines in TypeScript before embedding in PowerShell
    const agentLabel = agent.label || agent.name;
    const taskBaseName = path.basename(taskPath);

    // Compute padded lines in TypeScript before embedding in PowerShell
    const line1 = '\\u2551        AutoClaude \\u2014 Task Dispatched          \\u2551';
    const line2 = padStr('\\u2551  Agent : ' + agentLabel, 44) + '\\u2551';
    const line3 = padStr('\\u2551  File  : ' + taskBaseName, 44) + '\\u2551';
    const line4 = agent.yoloMode
      ? padStr('\\u2551  Mode  : \\u26a1 YOLO Auto-Approve', 44) + '\\u2551'
      : padStr('\\u2551  Mode  : \\u26a0\\ufe0f Manual Confirm', 44) + '\\u2551';

    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}\'\`,
      \`Write-Host ''\`,
      \`Write-Host '\\u2554\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2557' -ForegroundColor Cyan\`,
      \`Write-Host '\${line1}' -ForegroundColor Cyan\`,
      \`Write-Host '\\u2560\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2563' -ForegroundColor Cyan\`,
      \`Write-Host '\${line2}' -ForegroundColor White\`,
      \`Write-Host '\${line3}' -ForegroundColor White\`,
      \`Write-Host '\${line4}' -ForegroundColor \${agent.yoloMode ? 'Green' : 'Yellow'}\`,
      \`Write-Host '\\u255a\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u255d' -ForegroundColor Cyan\`,
      \`Write-Host ''\`,`,
`    // Compute display lines for the banner
    const agentLabel = agent.label || agent.name;
    const taskBaseName = path.basename(taskPath);
    const modeLine = agent.yoloMode
      ? '  Mode  : \\u26a1 YOLO Auto-Approve'
      : '  Mode  : \\u26a0\\ufe0f Manual Confirm';

    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}\'\`,
      \`Write-Host ''\`,
      \`Write-Host '\\u2500\\u2500 AutoClaude \\u2014 Task Dispatched \\u2500\\u2500' -ForegroundColor Cyan\`,
      \`Write-Host '  Agent : \${agentLabel}' -ForegroundColor White\`,
      \`Write-Host '  File  : \${taskBaseName}' -ForegroundColor White\`,
      \`Write-Host '\${modeLine}' -ForegroundColor \${agent.yoloMode ? 'Green' : 'Yellow'}\`,
      \`Write-Host ''\`,`
);

// 2. runCursor terminal banner
rep(
`        // Phase 8: Beautify Cursor terminal banner
    const taskBaseName = path.basename(taskPath);
    const cLine1 = '\\u2551        AutoClaude \\u2014 Task Dispatched          \\u2551';
    const cLine2 = padStr('\\u2551  Task : ' + taskName.substring(0, 35), 46) + '\\u2551';
    const cLine3 = padStr('\\u2551  File : ' + taskBaseName.substring(0, 35), 46) + '\\u2551';
    const cLine4 = padStr('\\u2551  \\u2705 Task content copied to CLIPBOARD', 46) + '\\u2551';
    const cLine5 = padStr('\\u2551  \\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V', 46) + '\\u2551';

    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}\'\`,
      \`Write-Host ''\`,
      \`Write-Host '\\u2554\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2557' -ForegroundColor Cyan\`,
      \`Write-Host '\${cLine1}' -ForegroundColor Cyan\`,
      \`Write-Host '\\u2560\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2563' -ForegroundColor Cyan\`,
      \`Write-Host '\${cLine2}' -ForegroundColor White\`,
      \`Write-Host '\${cLine3}' -ForegroundColor White\`,
      \`Write-Host '\\u2560\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2563' -ForegroundColor Cyan\`,
      \`Write-Host '\${cLine4}' -ForegroundColor Green\`,
      \`Write-Host '\${cLine5}' -ForegroundColor Yellow\`,
      \`Write-Host '\\u255a\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u255d' -ForegroundColor Cyan\`,
      \`Write-Host ''\`,`,
`    // Cursor banner — simple header format
    const taskBaseName = path.basename(taskPath);

    fs.writeFileSync(ps1Path, bom + [
      \`Set-Location '\${config.projectDir.replace(/'/g, "''")}\'\`,
      \`Write-Host ''\`,
      \`Write-Host '\\u2500\\u2500 AutoClaude \\u2014 Task Dispatched \\u2500\\u2500' -ForegroundColor Cyan\`,
      \`Write-Host '  Task  : \${taskName.substring(0, 35)}' -ForegroundColor White\`,
      \`Write-Host '  File  : \${taskBaseName.substring(0, 35)}' -ForegroundColor White\`,
      \`Write-Host '  \\u2705 Task content copied to CLIPBOARD' -ForegroundColor Green\`,
      \`Write-Host '  \\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V' -ForegroundColor Yellow\`,
      \`Write-Host ''\`,`
);

// 3. dispatch_to_qwen
rep(
`    // Phase 5: Beautify dispatch_to_qwen response
    const agentLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';
    const W = 50;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u250c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510',
          '\\u2502           Task Dispatched to Qwen Code               \\u2502',
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          \`\\u2502  Agent   : \${padStr(agentLabel, W - 12)}\\u2502\`,
          \`\\u2502  File    : \${padStr(path.basename(taskPath), W - 12)}\\u2502\`,
          \`\\u2502  Mode    : \${padStr(modeStr, W - 12)}\\u2502\`,
          \`\\u2502  YOLO    : \${padStr(yoloStr, W - 12)}\\u2502\`,
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          \`\\u2502  \\ud83d\\udcc4 Result : \${padStr(path.basename(resultLog), W - 12)}\\u2502\`,
          \`\\u2502  \\ud83d\\udccb Report : \${padStr(path.basename(summaryPath), W - 12)}\\u2502\`,
          '\\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518',
          '',
          '\\ud83d\\ude80 Agent executing in background. Check _summary.md when done.',
        ].join('\\n'),
      }],
    };`,
`    const agentLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u2500\\u2500 Task Dispatched \\u2500\\u2500',
          '',
          \`Agent    : \${agentLabel}\`,
          \`Task     : \${path.basename(taskPath)}\`,
          \`Mode     : \${modeStr}\`,
          \`YOLO     : \${yoloStr}\`,
          '',
          `\\ud83d\\udcc4 Result Log    : \\${path.basename(resultLog)}\`,
          `\\ud83d\\udccb Process Report : \\${path.basename(summaryPath)}\`,
          '',
          '\\ud83d\\ude80 Agent executing in background. Check report for progress.',
        ].join('\\n'),
      }],
    };`
);

// 4. dispatch_to_cursor
rep(
`    // Phase 5: Beautify dispatch_to_cursor response
    const W = 50;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u250c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510',
          '\\u2502           Task Dispatched to Cursor                  \\u2502',
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          \`\\u2502  File       : \${padStr(path.basename(taskPath), W - 15)}\\u2502\`,
          \`\\u2502  Clipboard  : \${padStr(clipboardOk ? '\\u2705 Copied (Ctrl+V into Cursor)' : '\\u274c Copy failed', W - 15)}\\u2502\`,
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          clipboardOk
            ? \`\\u2502  \\u27a1\\ufe0f \${padStr('Open Cursor AI chat and press Ctrl+V', W - 6)}\\u2502\`
            : \`\\u2502  \\u26a0\\ufe0f \${padStr('Open the task file manually in Cursor', W - 6)}\\u2502\`,
          '\\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518',
          '',
          '\\ud83d\\ude80 Claude is free \\u2014 Cursor AI runs independently using its own tokens.',
        ].join('\\n'),
      }],
    };`,
`    const clipStr = clipboardOk ? '\\u2705 Copied (Ctrl+V into Cursor)' : '\\u274c Copy failed';
    const cursorHint = clipboardOk
      ? '\\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V'
      : '\\u26a0\\ufe0f Open the task file manually in Cursor';

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u2500\\u2500 Task Dispatched to Cursor \\u2500\\u2500',
          '',
          \`File      : \${path.basename(taskPath)}\`,
          \`Clipboard : \${clipStr}\`,
          '',
          cursorHint,
          '',
          '\\ud83d\\ude80 Claude is free \\u2014 Cursor AI runs independently using its own tokens.',
        ].join('\\n'),
      }],
    };`
);

// 5. dispatch_task
rep(
`    // Phase 5: Beautify dispatch_task response
    const agentLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';
    const W = 50;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u250c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510',
          '\\u2502           Task Dispatched                        \\u2502',
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          \`\\u2502  Agent   : \${padStr(agentLabel, W - 12)}\\u2502\`,
          \`\\u2502  File    : \${padStr(path.basename(taskPath), W - 12)}\\u2502\`,
          \`\\u2502  Mode    : \${padStr(modeStr, W - 12)}\\u2502\`,
          \`\\u2502  YOLO    : \${padStr(yoloStr, W - 12)}\\u2502\`,
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          \`\\u2502  \\ud83d\\udcc4 Result : \${padStr(path.basename(resultLog), W - 12)}\\u2502\`,
          \`\\u2502  \\ud83d\\udccb Report : \${padStr(path.basename(summaryPath), W - 12)}\\u2502\`,
          '\\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518',
          '',
          '\\ud83d\\ude80 Agent executing in background. Check _summary.md when done.',
        ].join('\\n'),
      }],
    };`,
`    const agentLabel = agent.label || agent.name;
    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';
    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u2500\\u2500 Task Dispatched \\u2500\\u2500',
          '',
          \`Agent    : \${agentLabel}\`,
          \`Task     : \${path.basename(taskPath)}\`,
          \`Mode     : \${modeStr}\`,
          \`YOLO     : \${yoloStr}\`,
          '',
          `\\ud83d\\udcc4 Result Log    : \\${path.basename(resultLog)}\`,
          `\\ud83d\\udccb Process Report : \\${path.basename(summaryPath)}\`,
          '',
          '\\ud83d\\ude80 Agent executing in background. Check report for progress.',
        ].join('\\n'),
      }],
    };`
);

// 6. list_agents
rep(
`  // -- list_agents ------------------------------------------------------------
  if (request.params.name === 'list_agents') {
    // Phase 3: Beautify list_agents output
    const W = 74;
    const lines = [
      '\\u250c' + '\\u2500'.repeat(W) + '\\u2510',
      '\\u2502' + padStr('                         Configured Agents                               ', W) + '\\u2502',
      '\\u251c' + '\\u2500'.repeat(W) + '\\u2524',
    ];

    for (const [id, agent] of Object.entries(config.agents)) {
      const active = id === config.activeAgent ? '\\u2b50' : '  ';
      const yolo = agent.yoloMode ? '\\u2705' : '\\u274c';
      const typeIcon = agent.type === 'clipboard' ? '\\ud83d\\udccb' : '\\ud83d\\udda5\\ufe0f';
      const name = padStr(agent.label || agent.name || id, 18);
      const cmd = padStr(agent.command, 14);
      const enabled = agent.enabled !== false;
      const hint = enabled ? '' : ' (disabled)';
      const row = \` \${active} \${name} \${typeIcon} YOLO:\${yolo}  \${cmd}\${hint}\`;
      lines.push('\\u2502' + padStr(row, W) + '\\u2502');
    }

    lines.push('\\u251c' + '\\u2500'.repeat(W) + '\\u2524');
    const activeAgent = config.agents[config.activeAgent];
    const activeInfo = \`  \\u2b50 Active: \${activeAgent?.label || activeAgent?.name || config.activeAgent} \\u2014 dispatch_task will use this agent\`;
    lines.push('\\u2502' + padStr(activeInfo, W) + '\\u2502');
    lines.push('\\u2514' + '\\u2500'.repeat(W) + '\\u2518');
    lines.push('');
    lines.push('Switch: switch_agent("<id>")  |  Add custom: add_custom_agent(...)');`,
`  // -- list_agents ------------------------------------------------------------
  if (request.params.name === 'list_agents') {
    const lines: string[] = [
      '\\u2500\\u2500 Configured Agents \\u2500\\u2500',
      '',
    ];

    for (const [id, agent] of Object.entries(config.agents)) {
      const active = id === config.activeAgent ? '\\u2b50' : '  ';
      const yolo = agent.yoloMode ? '\\u2705' : '\\u274c';
      const typeIcon = agent.type === 'clipboard' ? '\\ud83d\\udccb' : '\\ud83d\\udda5\\ufe0f';
      const name = (agent.label || agent.name || id).padEnd(16);
      const cmd = agent.command;
      const enabled = agent.enabled !== false;
      const hint = enabled ? '' : ' (disabled)';
      lines.push(\`  \${active} \${name} \${typeIcon} YOLO:\${yolo}  \\`\${cmd}\\`\${hint}\`);
    }

    lines.push('');
    const activeAgent = config.agents[config.activeAgent];
    lines.push(\`Active: \${activeAgent?.label || activeAgent?.name || config.activeAgent} \\u2014 switch_agent("<id>") to change\`);`
);

// 7. switch_agent
rep(
`    // Phase 4: Capture old agent name before switching
    const oldAgent = config.agents[config.activeAgent];
    const oldName = oldAgent?.label || oldAgent?.name || config.activeAgent;
    const newAgent = config.agents[agent];

    config.activeAgent = agent;
    saveConfig(config);

    const newLabel = newAgent.label || newAgent.name;
    const W = 42;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u250c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510',
          '\\u2502         Agent Switched                    \\u2502',
          '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
          \`\\u2502  From : \${padStr(oldName, W - 11)}\\u2502\`,
          \`\\u2502  To   : \${padStr(newLabel, W - 11)}\\u2502\`,
          \`\\u2502  Cmd  : \${padStr(newAgent.command, W - 11)}\\u2502\`,
          \`\\u2502  YOLO : \${padStr(newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF', W - 11)}\\u2502\`,
          '\\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518',
          '',
          '\\u2705 All dispatch_task calls will now use this agent.',
          'This change is persisted to config.json.',
        ].join('\\n'),
      }],
    };`,
`    // Phase 4: Capture old agent name before switching
    const oldAgent = config.agents[config.activeAgent];
    const oldName = oldAgent?.label || oldAgent?.name || config.activeAgent;
    const newAgent = config.agents[agent];

    config.activeAgent = agent;
    saveConfig(config);

    const newLabel = newAgent.label || newAgent.name;
    const yoloLabel = newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF';

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u2500\\u2500 Agent Switched \\u2500\\u2500',
          '',
          \`From : \${oldName}\`,
          \`To   : \${newLabel}\`,
          \`YOLO : \${yoloLabel}\`,
          '',
          `\\u2705 All dispatch_task calls will now use \${newLabel}.\`,
        ].join('\\n'),
      }],
    };`
);

// 8. qwen_bridge_status
rep(
`  // -- qwen_bridge_status -----------------------------------------------------
  if (request.params.name === 'qwen_bridge_status') {
    // Phase 2: Beautify qwen_bridge_status output
    const cum = getCumulativeSavings();
    const agent = getActiveAgent(config);
    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;
    const totalCount = Object.keys(config.agents).length;
    const W = 53;

    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u2502' + padStr(\`              AutoClaude v\${getVersion()} \\u2014 Status               \`, W) + '\\u2502',
          '\\u251c' + '\\u2500'.repeat(W) + '\\u2524',
          \`\\u2502  Active Agent : \${padStr(agent.label || agent.name, W - 19)}\\u2502\`,
          \`\\u2502  Command      : \${padStr(agent.command, W - 19)}\\u2502\`,
          \`\\u2502  YOLO Mode    : \${padStr(agent.yoloMode ? '\\u2705 ON' : '\\u274c OFF', W - 19)}\\u2502\`,
          \`\\u2502  Terminal     : \${padStr(config.showTerminal ? 'visible' : 'headless background', W - 19)}\\u2502\`,
          '\\u251c' + '\\u2500'.repeat(W) + '\\u2524',
          \`\\u2502  Agents       : \${padStr(\`\${enabledCount} enabled / \${totalCount} total\`, W - 19)}\\u2502\`,
          \`\\u2502  Project Dir  : \${padStr((config.projectDir || '').substring(0, W - 19), W - 19)}\\u2502\`,
          '\\u251c' + '\\u2500'.repeat(W) + '\\u2524',
          \`\\u2502  \\ud83d\\udcb0 Savings  : \${padStr(\`\${cum.tasks} tasks \\u00b7 \${cum.tokensSaved.toLocaleString()} tokens \\u00b7 $\${cum.costSaved.toFixed(2)}\`, W - 19)}\\u2502\`,
          '\\u2514' + '\\u2500'.repeat(W) + '\\u2518',
          '',
          'Tools: dispatch_task \\u00b7 dispatch_to_qwen \\u00b7 dispatch_to_cursor',
          '       list_agents \\u00b7 switch_agent \\u00b7 add_custom_agent',
          '       get_task_report \\u00b7 get_savings_report \\u00b7 qwen_bridge_status',
        ].join('\\n'),
      }],
    };
  }`,
`  // -- qwen_bridge_status -----------------------------------------------------
  if (request.params.name === 'qwen_bridge_status') {
    const cum = getCumulativeSavings();
    const agent = getActiveAgent(config);
    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;
    const totalCount = Object.keys(config.agents).length;

    return {
      content: [{
        type: 'text' as const,
        text: [
          \`\\u2500\\u2500 AutoClaude v\${getVersion()} \\u2500\\u2500\`,
          '',
          \`Active Agent : \${agent.label || agent.name}\`,
          \`Command      : \${agent.command}\`,
          \`YOLO Mode    : \${agent.yoloMode ? '\\u2705 ON' : '\\u274c OFF'}\`,
          \`Terminal     : \${config.showTerminal ? 'visible' : 'headless background'}\`,
          \`Agents       : \${enabledCount} enabled / \${totalCount} total\`,
          \`Project Dir  : \${config.projectDir || ''}\`,
          \`\\ud83d\\udcb0 Savings   : \${cum.tasks} tasks \\u00b7 \${cum.tokensSaved.toLocaleString()} tokens \\u00b7 $\${cum.costSaved.toFixed(2)}\`,
          '',
          'Tools: dispatch_task \\u00b7 list_agents \\u00b7 switch_agent \\u00b7 add_custom_agent',
          '       check_agent \\u00b7 verify_agent_auth \\u00b7 get_task_report \\u00b7 get_savings_report',
          '       get_project_report \\u00b7 qwen_bridge_status',
        ].join('\\n'),
      }],
    };
  }`
);

// 9. get_task_report (not found case)
rep(
`    if (!fs.existsSync(summaryPath)) {
      // Phase 7: Beautify auto-finalize / not-found message
      const W = 50;
      return {
        content: [{
          type: 'text' as const,
          text: [
            '\\u250c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510',
            '\\u2502            \\ud83d\\udccb Task Report                        \\u2502',
            '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
            \`\\u2502  Task  : \${padStr(path.basename(taskPath), W - 11)}\\u2502\`,
            \`\\u2502  Status: \${padStr('\\u23f3 Still running...', W - 11)}\\u2502\`,
            '\\u251c\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2524',
            \`\\u2502  \\ud83d\\udcc4 Raw log: \${padStr(fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet', W - 11)}\\u2502\`,
            '\\u2502  \\ud83d\\udca1 The report will auto-finalize when output    \\u2502',
            '\\u2502     is detected in the result log.              \\u2502',
            '\\u2514\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2518',
          ].join('\\n'),
        }],
      };
    }`,
`    if (!fs.existsSync(summaryPath)) {
      const rawLogStatus = fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet';
      return {
        content: [{
          type: 'text' as const,
          text: [
            '\\u2500\\u2500 \\ud83d\\udccb Task Report \\u2500\\u2500',
            '',
            \`Task  : \${path.basename(taskPath)}\`,
            \`Status: \\u23f3 Still running...\`,
            '',
            \`\\ud83d\\udcc4 Raw log: \${rawLogStatus}\`,
            '\\ud83d\\udca1 The report will auto-finalize when output',
            '   is detected in the result log.',
          ].join('\\n'),
        }],
      };
    }`
);

// 10. get_savings_report
rep(
`  // -- get_savings_report -----------------------------------------------------
  if (request.params.name === 'get_savings_report') {
    // Phase 6: Beautify get_savings_report output
    const cum = getCumulativeSavings();
    const all = loadSavings();
    const last5 = all.slice(-5).reverse();
    const W = 50;

    const lines = [
      '\\u250c' + '\\u2500'.repeat(W) + '\\u2510',
      '\\u2502' + padStr('            \\ud83d\\udcb0 Savings Report                     ', W) + '\\u2502',
      '\\u251c' + '\\u2500'.repeat(W) + '\\u2524',
      \`\\u2502  Tasks     : \${padStr(String(cum.tasks), W - 16)}\\u2502\`,
      \`\\u2502  Tokens    : \${padStr(cum.tokensSaved.toLocaleString() + ' saved', W - 16)}\\u2502\`,
      \`\\u2502  Cost      : \${padStr('$' + cum.costSaved.toFixed(2) + ' saved', W - 16)}\\u2502\`,
      '\\u251c' + '\\u2500'.repeat(W) + '\\u2524',
    ];

    if (last5.length > 0) {
      lines.push('\\u2502' + padStr('  Recent Tasks:', W) + '\\u2502');
      for (const s of last5.slice(0, 5)) {
        const shortName = s.taskName.substring(0, 25);
        const row = \`  \\ud83d\\udccb \${padStr(shortName, 25)} \${s.tokensSaved.toLocaleString().padStart(8)} tk  $\${s.costSaved.toFixed(2).padStart(6)}\`;
        lines.push('\\u2502' + padStr(row, W) + '\\u2502');
      }
      lines.push('\\u251c' + '\\u2500'.repeat(W) + '\\u2524');
    }

    lines.push('\\u2514' + '\\u2500'.repeat(W) + '\\u2518');
    if (cum.tasks > 0) {
      lines.push('');
      lines.push(\`\\ud83d\\udca1 Average: ~\${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($\${(cum.costSaved / cum.tasks).toFixed(3)}) saved per task\`);
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\\n') }],
    };
  }`,
`  // -- get_savings_report -----------------------------------------------------
  if (request.params.name === 'get_savings_report') {
    const cum = getCumulativeSavings();
    const all = loadSavings();
    const last5 = all.slice(-5).reverse();

    const lines: string[] = [
      '\\u2500\\u2500 \\ud83d\\udcb0 Savings Report \\u2500\\u2500',
      '',
      \`Tasks     : \${cum.tasks}\`,
      \`Tokens    : \${cum.tokensSaved.toLocaleString()} saved\`,
      \`Cost      : $\${cum.costSaved.toFixed(2)} saved\`,
    ];

    if (last5.length > 0) {
      lines.push('');
      lines.push('  Recent Tasks:');
      for (const s of last5.slice(0, 5)) {
        const shortName = s.taskName.substring(0, 25);
        lines.push(\`  \\ud83d\\udccb \${shortName.padEnd(25)} \${s.tokensSaved.toLocaleString().padStart(8)} tk  $\${s.costSaved.toFixed(2).padStart(6)}\`);
      }
    }

    if (cum.tasks > 0) {
      lines.push('');
      lines.push(\`\\ud83d\\udca1 Average: ~\${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($\${(cum.costSaved / cum.tasks).toFixed(3)}) saved per task\`);
    }

    return {
      content: [{ type: 'text' as const, text: lines.join('\\n') }],
    };
  }`
);

// 11. verify_agent_auth success case
rep(
`    if (success) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            'Auth Verified',
            '',
            \`Agent   : \${agent.name || targetId}\`,
            \`Status  : Authenticated and Ready\`,
            \`Command : \${agent.command}\`,
            '',
            \`\${agent.name || targetId} is authenticated and responding. Ready to dispatch tasks.\`,
          ].join('\\n'),
        }],
      };
    }`,
`    if (success) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            '\\u2500\\u2500 Auth Verified \\u2500\\u2500',
            '',
            \`Agent   : \${agent.name || targetId}\`,
            \`Status  : \\u2705 Authenticated & Ready\`,
            \`Command : \${agent.command}\`,
            '',
            \`\${agent.name || targetId} is authenticated and responding. Ready to dispatch tasks.\`,
          ].join('\\n'),
        }],
      };
    }`
);

// 12. verify_agent_auth failure case
rep(
`    const lines = [
      'Auth Verification Failed',
      '',
      \`Agent   : \${agent.name || targetId}\`,
      \`Status  : \${timedOut ? 'Timed Out (30s)' : 'Failed'}\`,
      '',
    ];`,
`    const lines = [
      '\\u2500\\u2500 Auth Failed \\u2500\\u2500',
      '',
      \`Agent  : \${agent.name || targetId}\`,
      \`Status : \\u274c \${timedOut ? 'Needs Authentication / Timed Out' : 'Failed'}\`,
      '',
    ];`
);

// Verify no box-drawing characters remain
const boxChars = s.match(/[\u2500-\u257F]/g);
console.log('Replacements made:', replacements);
console.log('Box-drawing chars remaining:', boxChars ? boxChars.length : 0);
if (boxChars) {
  const unique = [...new Set(boxChars)];
  console.log('Unique box chars left:', unique.map(c => `U+${c.charCodeAt(0).toString(16).toUpperCase()}`));
}

fs.writeFileSync(f, s, 'utf8');
console.log('File written successfully');
