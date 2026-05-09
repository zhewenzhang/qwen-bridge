const fs = require('fs');
const P = 'D:/qwen-bridge/src/index.ts';
let c = fs.readFileSync(P, 'utf8');

if (!c.includes('function getVersion()')) {
  // Find the line with "const server = new Server("
  const idx = c.indexOf('const server = new Server(');
  const before = c.substring(idx - 4, idx);
  // Insert before "const server"
  const func = `function getVersion(): string {
  try {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '5.5.0';
  } catch {
    return '5.5.0';
  }
}

`;
  c = c.substring(0, idx) + func + c.substring(idx);
  fs.writeFileSync(P, c, 'utf8');
  console.log('Added getVersion() function');
} else {
  console.log('getVersion() already exists');
}

// Verify
console.log('getVersion exists:', c.includes('function getVersion()'));
console.log('version: getVersion():', c.includes('version: getVersion()'));
