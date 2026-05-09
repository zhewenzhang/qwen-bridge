const fs = require('fs');
const f = 'D:/qwen-bridge/src/index.ts';
let s = fs.readFileSync(f, 'utf8');
const CRLF = '\r\n';
let lines = s.split(CRLF);

function replaceRange(startIdx, endIdx, newLinesArr) {
  const before = lines.slice(0, startIdx);
  const after = lines.slice(endIdx + 1);
  lines = before.concat(newLinesArr, after);
}

function findLineIdx(anchor, fromIdx) {
  fromIdx = fromIdx || 0;
  for (let i = fromIdx; i < lines.length; i++) {
    if (lines[i].includes(anchor)) return i;
  }
  return -1;
}

function findExactLine(anchor) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === anchor) return i;
  }
  return -1;
}

const BT = String.fromCharCode(96);
const DQ = String.fromCharCode(34);

// Helper to build template literal lines safely
function tl(inner) {
  return '          ' + BT + inner + BT + ',';
}
function tl4(inner) {
  return '      ' + BT + inner + BT + ',';
}

// ===================== SECTION 1: runCliAgent terminal banner =====================
{
  const startIdx = findLineIdx('    // Compute padded lines in TypeScript before embedding in PowerShell');
  if (startIdx < 0) { console.log('SKIP 1'); }
  else {
    let endIdx = startIdx;
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].includes('\u255a') && lines[i].includes('Write-Host')) {
        if (i + 1 < lines.length && lines[i + 1].includes("Write-Host ''")) {
          endIdx = i + 1;
          break;
        }
      }
    }

    const SQ = String.fromCharCode(39);
    const psLine1 = '      ' + BT + 'Set-Location ' + SQ + '$' + '{config.projectDir.replace(/' + SQ + '/g, ' + DQ + "''" + DQ + ')}' + SQ + BT + ',';
    const NB = [
      '    // Compute display lines for the banner',
      '    const agentLabel = agent.label || agent.name;',
      '    const taskBaseName = path.basename(taskPath);',
      '    const modeLine = agent.yoloMode',
      "      ? '  Mode  : \\u26a1 YOLO Auto-Approve'",
      "      : '  Mode  : \\u26a0\\ufe0f Manual Confirm';",
      '',
      '    fs.writeFileSync(ps1Path, bom + [',
      psLine1,
      "      " + BT + "Write-Host ''" + BT + ",",
      "      " + BT + "Write-Host '\\u2500\\u2500 AutoClaude \\u2014 Task Dispatched \\u2500\\u2500' -ForegroundColor Cyan" + BT + ",",
      "      " + BT + "Write-Host '  Agent : ${agentLabel}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '  File  : ${taskBaseName}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '${modeLine}' -ForegroundColor ${agent.yoloMode ? 'Green' : 'Yellow'}" + BT + ",",
      "      " + BT + "Write-Host ''" + BT + ",",
    ];

    console.log('SEC 1: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 2: runCursor terminal banner =====================
{
  const startIdx = findLineIdx('        // Phase 8: Beautify Cursor terminal banner');
  if (startIdx < 0) { console.log('SKIP 2'); }
  else {
    let endIdx = startIdx;
    for (let i = startIdx; i < lines.length; i++) {
      if (lines[i].includes('\u255a') && lines[i].includes('Write-Host')) {
        if (i + 1 < lines.length && lines[i + 1].includes("Write-Host ''")) {
          endIdx = i + 1;
          break;
        }
      }
    }

    const SQ = String.fromCharCode(39);
    const psLine1 = '      ' + BT + 'Set-Location ' + SQ + '$' + '{config.projectDir.replace(/' + SQ + '/g, ' + DQ + "''" + DQ + ')}' + SQ + BT + ',';
    const NB = [
      '    // Cursor banner \u2014 simple header format',
      '    const taskBaseName = path.basename(taskPath);',
      '',
      '    fs.writeFileSync(ps1Path, bom + [',
      psLine1,
      "      " + BT + "Write-Host ''" + BT + ",",
      "      " + BT + "Write-Host '\\u2500\\u2500 AutoClaude \\u2014 Task Dispatched \\u2500\\u2500' -ForegroundColor Cyan" + BT + ",",
      "      " + BT + "Write-Host '  Task  : ${taskName.substring(0, 35)}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '  File  : ${taskBaseName.substring(0, 35)}' -ForegroundColor White" + BT + ",",
      "      " + BT + "Write-Host '  \\u2705 Task content copied to CLIPBOARD' -ForegroundColor Green" + BT + ",",
      "      " + BT + "Write-Host '  \\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V' -ForegroundColor Yellow" + BT + ",",
      "      " + BT + "Write-Host ''" + BT + ",",
    ];

    console.log('SEC 2: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 3: dispatch_to_qwen =====================
{
  const startIdx = findExactLine('    // Phase 5: Beautify dispatch_to_qwen response');
  if (startIdx < 0) { console.log('SKIP 3'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0) { endIdx = i; break; }
    }

    const NB = [
      '    const agentLabel = agent.label || agent.name;',
      "    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';",
      "    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';",
      '',
      '    return {',
      '      content: [{',
      "        type: 'text' as const,",
      '        text: [',
      "          '\\u2500\\u2500 Task Dispatched \\u2500\\u2500',",
      "          '',",
      tl('Agent    : ${agentLabel}'),
      tl('Task     : ${path.basename(taskPath)}'),
      tl('Mode     : ${modeStr}'),
      tl('YOLO     : ${yoloStr}'),
      "          '',",
      tl('\\ud83d\\udcc4 Result Log    : ${path.basename(resultLog)}'),
      tl('\\ud83d\\udccb Process Report : ${path.basename(summaryPath)}'),
      "          '',",
      "          '\\ud83d\\ude80 Agent executing in background. Check report for progress.',",
      "        ].join('\\n'),",
      '      }],',
      '    };',
    ];

    console.log('SEC 3: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 4: dispatch_to_cursor =====================
{
  const startIdx = findExactLine('    // Phase 5: Beautify dispatch_to_cursor response');
  if (startIdx < 0) { console.log('SKIP 4'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0) { endIdx = i; break; }
    }

    const NB = [
      "    const clipStr = clipboardOk ? '\\u2705 Copied (Ctrl+V into Cursor)' : '\\u274c Copy failed';",
      '    const cursorHint = clipboardOk',
      "      ? '\\u27a1\\ufe0f Open Cursor AI chat and press Ctrl+V'",
      "      : '\\u26a0\\ufe0f Open the task file manually in Cursor';",
      '',
      '    return {',
      '      content: [{',
      "        type: 'text' as const,",
      '        text: [',
      "          '\\u2500\\u2500 Task Dispatched to Cursor \\u2500\\u2500',",
      "          '',",
      tl('File      : ${path.basename(taskPath)}'),
      tl('Clipboard : ${clipStr}'),
      "          '',",
      '          cursorHint,',
      "          '',",
      "          '\\ud83d\\ude80 Claude is free \\u2014 Cursor AI runs independently using its own tokens.',",
      "        ].join('\\n'),",
      '      }],',
      '    };',
    ];

    console.log('SEC 4: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 5: dispatch_task =====================
{
  const startIdx = findExactLine('    // Phase 5: Beautify dispatch_task response');
  if (startIdx < 0) { console.log('SKIP 5'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0) { endIdx = i; break; }
    }

    const NB = [
      '    const agentLabel = agent.label || agent.name;',
      "    const yoloStr = agent.yoloMode ? '\\u2705 Auto-Approve ON' : '\\u26a0\\ufe0f Manual Confirm';",
      "    const modeStr = agent.showTerminal ? 'Visible Terminal' : 'Headless Background';",
      '',
      '    return {',
      '      content: [{',
      "        type: 'text' as const,",
      '        text: [',
      "          '\\u2500\\u2500 Task Dispatched \\u2500\\u2500',",
      "          '',",
      tl('Agent    : ${agentLabel}'),
      tl('Task     : ${path.basename(taskPath)}'),
      tl('Mode     : ${modeStr}'),
      tl('YOLO     : ${yoloStr}'),
      "          '',",
      tl('\\ud83d\\udcc4 Result Log    : ${path.basename(resultLog)}'),
      tl('\\ud83d\\udccb Process Report : ${path.basename(summaryPath)}'),
      "          '',",
      "          '\\ud83d\\ude80 Agent executing in background. Check report for progress.',",
      "        ].join('\\n'),",
      '      }],',
      '    };',
    ];

    console.log('SEC 5: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 6: list_agents =====================
{
  const startIdx = findLineIdx("  if (request.params.name === 'list_agents') {");
  if (startIdx < 0) { console.log('SKIP 6'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 10) { endIdx = i; break; }
    }

    const NB = [
      '    const lines: string[] = [',
      "      '\\u2500\\u2500 Configured Agents \\u2500\\u2500',",
      "      '',",
      '    ];',
      '',
      '    for (const [id, agent] of Object.entries(config.agents)) {',
      "      const active = id === config.activeAgent ? '\\u2b50' : '  ';",
      "      const yolo = agent.yoloMode ? '\\u2705' : '\\u274c';",
      "      const typeIcon = agent.type === 'clipboard' ? '\\ud83d\\udccb' : '\\ud83d\\udda5\\ufe0f';",
      '      const name = (agent.label || agent.name || id).padEnd(16);',
      '      const cmd = agent.command;',
      '      const enabled = agent.enabled !== false;',
      "      const hint = enabled ? '' : ' (disabled)';",
      '      lines.push(' + BT + '  ${active} ${name} ${typeIcon} YOLO:${yolo}  ' + BT + BT + BT + '{cmd}' + BT + BT + '${hint}' + BT + ');',
      '    }',
      '',
      '    const activeAgent = config.agents[config.activeAgent];',
      '    lines.push(' + BT + 'Active: ${activeAgent?.label || activeAgent?.name || config.activeAgent} \\u2014 switch_agent("<id>") to change' + BT + ');',
      '',
      '    return {',
      "      content: [{ type: 'text' as const, text: lines.join('\\n') }],",
      '    };',
    ];

    console.log('SEC 6: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 7: switch_agent =====================
{
  const startIdx = findLineIdx('    // Phase 4: Capture old agent name before switching');
  if (startIdx < 0) { console.log('SKIP 7'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 5) { endIdx = i; break; }
    }

    const NB = [
      '    // Phase 4: Capture old agent name before switching',
      '    const oldAgent = config.agents[config.activeAgent];',
      '    const oldName = oldAgent?.label || oldAgent?.name || config.activeAgent;',
      '    const newAgent = config.agents[agent];',
      '',
      '    config.activeAgent = agent;',
      '    saveConfig(config);',
      '',
      '    const newLabel = newAgent.label || newAgent.name;',
      "    const yoloLabel = newAgent.yoloMode ? '\\u2705 ON' : '\\u274c OFF';",
      '',
      '    return {',
      '      content: [{',
      "        type: 'text' as const,",
      '        text: [',
      "          '\\u2500\\u2500 Agent Switched \\u2500\\u2500',",
      "          '',",
      tl('From : ${oldName}'),
      tl('To   : ${newLabel}'),
      tl('YOLO : ${yoloLabel}'),
      "          '',",
      tl('\\u2705 All dispatch_task calls will now use ${newLabel}.'),
      "        ].join('\\n'),",
      '      }],',
      '    };',
    ];

    console.log('SEC 7: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 8: qwen_bridge_status =====================
{
  const startIdx = findLineIdx("  if (request.params.name === 'qwen_bridge_status') {");
  if (startIdx < 0) { console.log('SKIP 8'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 10) { endIdx = i; break; }
    }

    const NB = [
      '    const cum = getCumulativeSavings();',
      '    const agent = getActiveAgent(config);',
      '    const enabledCount = Object.values(config.agents).filter(a => a.enabled !== false).length;',
      '    const totalCount = Object.keys(config.agents).length;',
      '',
      '    return {',
      '      content: [{',
      "        type: 'text' as const,",
      '        text: [',
      tl('\\u2500\\u2500 AutoClaude v${getVersion()} \\u2500\\u2500'),
      "          '',",
      tl('Active Agent : ${agent.label || agent.name}'),
      tl('Command      : ${agent.command}'),
      "          " + BT + 'YOLO Mode    : ${agent.yoloMode ? ' + "'\\u2705 ON' : '\\u274c OFF'" + '}' + BT + ',',
      "          " + BT + 'Terminal     : ${config.showTerminal ? ' + "'visible' : 'headless background'" + '}' + BT + ',',
      tl('Agents       : ${enabledCount} enabled / ${totalCount} total'),
      "          " + BT + "Project Dir  : ${config.projectDir || ''}" + BT + ',',
      "          " + BT + '\\ud83d\\udcb0 Savings   : ${cum.tasks} tasks \\u00b7 ${cum.tokensSaved.toLocaleString()} tokens \\u00b7 $' + BT + BT + '{cum.costSaved.toFixed(2)}' + BT + ',',
      "          '',",
      "          'Tools: dispatch_task \\u00b7 list_agents \\u00b7 switch_agent \\u00b7 add_custom_agent',",
      "          '       check_agent \\u00b7 verify_agent_auth \\u00b7 get_task_report \\u00b7 get_savings_report',",
      "          '       get_project_report \\u00b7 qwen_bridge_status',",
      "        ].join('\\n'),",
      '      }],',
      '    };',
    ];

    console.log('SEC 8: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 9: get_task_report not-found =====================
{
  const startIdx = findExactLine("    if (!fs.existsSync(summaryPath)) {");
  if (startIdx < 0) { console.log('SKIP 9'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 5) { endIdx = i; break; }
    }

    const NB = [
      "    if (!fs.existsSync(summaryPath)) {",
      "      const rawLogStatus = fs.existsSync(resultLog) ? path.basename(resultLog) + ' exists' : 'No result log yet';",
      '      return {',
      '        content: [{',
      "          type: 'text' as const,",
      '          text: [',
      "            '\\u2500\\u2500 \\ud83d\\udccb Task Report \\u2500\\u2500',",
      "            '',",
      tl('Task  : ${path.basename(taskPath)}').replace('          ', '            '),
      "            " + BT + 'Status: \\u23f3 Still running...' + BT + ',',
      "            '',",
      tl('\\ud83d\\udcc4 Raw log: ${rawLogStatus}').replace('          ', '            '),
      "            '\\ud83d\\udca1 The report will auto-finalize when output',",
      "            '   is detected in the result log.',",
      "          ].join('\\n'),",
      '        }],',
      '      };',
      '    }',
    ];

    console.log('SEC 9: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 10: get_savings_report =====================
{
  const startIdx = findLineIdx("  if (request.params.name === 'get_savings_report') {");
  if (startIdx < 0) { console.log('SKIP 10'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 10) { endIdx = i; break; }
    }

    const NB = [
      '    const cum = getCumulativeSavings();',
      '    const all = loadSavings();',
      '    const last5 = all.slice(-5).reverse();',
      '',
      '    const lines: string[] = [',
      "      '\\u2500\\u2500 \\ud83d\\udcb0 Savings Report \\u2500\\u2500',",
      "      '',",
      tl4('Tasks     : ${cum.tasks}'),
      tl4('Tokens    : ${cum.tokensSaved.toLocaleString()} saved'),
      "      " + BT + 'Cost      : $' + BT + BT + '{cum.costSaved.toFixed(2)} saved' + BT + ',',
      '    ];',
      '',
      '    if (last5.length > 0) {',
      "      lines.push('');",
      "      lines.push('  Recent Tasks:');",
      '      for (const s of last5.slice(0, 5)) {',
      '        const shortName = s.taskName.substring(0, 25);',
      '        lines.push(' + BT + '  \\ud83d\\udccb ${shortName.padEnd(25)} ${s.tokensSaved.toLocaleString().padStart(8)} tk  $' + BT + BT + '{s.costSaved.toFixed(2).padStart(6)}' + BT + ');',
      '      }',
      '    }',
      '',
      '    if (cum.tasks > 0) {',
      "      lines.push('');",
      '      lines.push(' + BT + '\\ud83d\\udca1 Average: ~${Math.round(cum.tokensSaved / cum.tasks).toLocaleString()} tokens ($' + BT + BT + '{(cum.costSaved / cum.tasks).toFixed(3)}) saved per task' + BT + ');',
      '    }',
      '',
      '    return {',
      "      content: [{ type: 'text' as const, text: lines.join('\\n') }],",
      '    };',
    ];

    console.log('SEC 10: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 11: verify_agent_auth success =====================
{
  const startIdx = findExactLine('    if (success) {');
  if (startIdx < 0) { console.log('SKIP 11'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 5) { endIdx = i; break; }
    }

    const NB = [
      '    if (success) {',
      '      return {',
      '        content: [{',
      "          type: 'text' as const,",
      '          text: [',
      "            '\\u2500\\u2500 Auth Verified \\u2500\\u2500',",
      "            '',",
      tl('Agent   : ${agent.name || targetId}').replace('          ', '            '),
      "            " + BT + 'Status  : \\u2705 Authenticated & Ready' + BT + ',',
      tl('Command : ${agent.command}').replace('          ', '            '),
      "            '',",
      tl('${agent.name || targetId} is authenticated and responding. Ready to dispatch tasks.').replace('          ', '            '),
      "          ].join('\\n'),",
      '        }],',
      '      };',
      '    }',
    ];

    console.log('SEC 11: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== SECTION 12: verify_agent_auth failure =====================
{
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'const lines = [') {
      const context = lines.slice(Math.max(0, i - 10), i).join('\n');
      if (context.includes('timedOut') || context.includes('Auth failed')) {
        startIdx = i;
        break;
      }
    }
  }
  if (startIdx < 0) { console.log('SKIP 12'); }
  else {
    let endIdx = startIdx;
    let depth = 0, started = false;
    for (let i = startIdx; i < lines.length; i++) {
      for (const ch of lines[i]) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') depth--;
      }
      if (started && depth === 0 && i > startIdx + 3) { endIdx = i; break; }
    }

    const NB = [
      "    const lines = [",
      "      '\\u2500\\u2500 Auth Failed \\u2500\\u2500',",
      "      '',",
      "      `Agent  : ${agent.name || targetId}`,",
      "      `Status : \\u274c ${timedOut ? 'Needs Authentication / Timed Out' : 'Failed'}`,",
      "      '',",
      '    ];',
    ];

    console.log('SEC 12: replacing lines', startIdx + 1, '-', endIdx + 1);
    replaceRange(startIdx, endIdx, NB);
  }
}

// ===================== WRITE BACK =====================
const output = lines.join(CRLF);
fs.writeFileSync(f, output, 'utf8');

// Verify
const boxCount = (output.match(/[\u2500-\u257F]/g) || []).length;
const padStrCount = (output.match(/padStr/g) || []).length;
console.log('');
console.log('=== Verification ===');
console.log('Box-drawing chars remaining:', boxCount);
console.log('padStr references remaining:', padStrCount);
console.log('Total lines:', lines.length);
