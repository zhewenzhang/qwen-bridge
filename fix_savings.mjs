import fs from 'node:fs';
const f = 'D:\\qwen-bridge\\src\\index.ts';
let c = fs.readFileSync(f, 'utf-8');

// Fix get_savings_report - replace from the handler comment to the return
c = c.replace(
  /(\/\/ -- get_savings_report[\s\S]*?if \(request\.params\.name === 'get_savings_report'\) \{[\s\S]*?\/\/ Phase 6: Beautify get_savings_report output[\s\S]*?const last5 = all\.slice\(-5\)\.reverse\(\);[\s\S]*?)(const W = 50;[\s\S]*?return \{[\s\S]*?content: \[\{ type: 'text' as const, text: lines\.join\('\\n'\) \}\],[\s\S]*?\};\s*\}\s*\n)(\s*\/\/ -- get_project_report)/,
  (m, before, oldBlock, after) => {
    const newBlock = [
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
    return before + newBlock + '\n' + after;
  }
);

fs.writeFileSync(f, c, 'utf-8');
console.log('get_savings_report fixed');
