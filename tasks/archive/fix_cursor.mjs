import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, 'src', 'index.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Fix dispatch_to_cursor handler
const oldCursor = `    runCursor(config, taskPath, taskName, clipboardOk);

    // Phase 5: Beautify dispatch_to_cursor response
    const W = 50;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '\\u250c\\u2500'.repeat(0) + '\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2500\\u2510',
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
    };
  }

  // -- dispatch_task (agent-agnostic)`;

// Simpler approach: use regex to find and replace the dispatch_to_cursor block
content = content.replace(
  /(runCursor\(config, taskPath, taskName, clipboardOk\);[\s\S]*?\/\/ Phase 5: Beautify dispatch_to_cursor response[\s\S]*?const W = 50;[\s\S]*?return \{[\s\S]*?content: \[\{[\s\S]*?type: 'text' as const,[\s\S]*?text: \[)[\s\S]*?(\]\.join\('\\n'\),[\s\S]*?\}\],\s*\};\s*\}\s*\n\s*\/\/ -- dispatch_task)/,
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

fs.writeFileSync(filePath, content, 'utf-8');
console.log('dispatch_to_cursor handler replaced.');
