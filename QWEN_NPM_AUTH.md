# Task: NPM Publishing Setup + Auth Pre-Flight Check

## Phase 1: NPM Publishing Setup

### 1a. Update `package.json`

Update `D:\qwen-bridge\package.json` with NPM publishing fields:

```json
{
  "name": "autoclaude",
  "version": "5.4.0",
  "description": "AutoClaude — Plan with Claude, Execute Everywhere. MCP bridge connecting Claude Code to Qwen Code, Gemini CLI, and more.",
  "private": false,
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "autoclaude": "./dist/index.js"
  },
  "files": [
    "dist/",
    "config.json",
    "README.md",
    "README_CN.md",
    "CHANGELOG.md",
    "CLAUDE.md",
    "i18n.js",
    "index.html"
  ],
  "keywords": [
    "claude",
    "claude-code",
    "mcp",
    "model-context-protocol",
    "ai",
    "coding",
    "agent",
    "qwen",
    "gemini",
    "codex",
    "aider",
    "bridge",
    "automation",
    "token-savings",
    "headless"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/zhewenzhang/AutoClaude.git"
  },
  "homepage": "https://github.com/zhewenzhang/AutoClaude#readme",
  "bugs": {
    "url": "https://github.com/zhewenzhang/AutoClaude/issues"
  },
  "license": "MIT",
  "author": "zhewenzhang",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "prepublishOnly": "npm run build"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Keep existing `dependencies` and `devDependencies` from the current package.json. Only add/update the fields above.

### 1b. Test npm pack

```bash
cd D:\qwen-bridge
npm pack --dry-run
```

Verify the package includes only the files listed in `"files"`.

### 1c. Create `.npmignore`

```
src/
node_modules/
.claude/
*.log
QWEN_*.md
QWEN_*_result.log
QWEN_*_summary.md
test_*.cjs
test_*.js
_*
nul
```

---

## Phase 2: Auth Pre-Flight Check Tool

### 2a. Add `verify_agent_auth` MCP tool to `src/index.ts`

Add this tool definition in ListTools handler:

```typescript
    {
      name: 'verify_agent_auth',
      description:
        'Check if the active (or specified) agent can authenticate and run successfully. ' +
        'Sends a minimal test prompt ("Say OK") to the agent and checks if it responds correctly. ' +
        'If auth fails, returns the error message so Claude can guide the user. ' +
        'Use this before dispatching important tasks to ensure the agent is ready.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          agent_id: {
            type: 'string',
            description: 'Optional. The agent ID to verify. Defaults to the active agent.',
          },
        },
      },
    },
```

Add this handler in CallTool handler:

```typescript
  if (request.params.name === 'verify_agent_auth') {
    const { agent_id } = (request.params.arguments || {}) as { agent_id?: string };
    const targetId = agent_id || config.activeAgent;
    
    if (!config.agents[targetId]) {
      return {
        content: [{ type: 'text' as const, text: `❌ Unknown agent: "${targetId}"` }],
        isError: true,
      };
    }
    
    const agent = config.agents[targetId];
    
    if (agent.type === 'clipboard') {
      return {
        content: [{
          type: 'text' as const,
          text: [
            `📋 ${agent.name || agent.label || targetId} is a clipboard-based tool.`,
            '',
            'Auth verification is not applicable. Task content is copied to clipboard — the user authenticates in the GUI app.',
          ].join('\n'),
        }],
      };
    }
    
    // Run a minimal test: pipe "Say OK only. No files. No commands." to the agent
    const testPrompt = 'Say "AUTOCLAUDE_AUTH_OK" only. Do not create files. Do not run commands.';
    const tmpFile = path.join(os.tmpdir(), '_ac_auth_test.txt');
    fs.writeFileSync(tmpFile, testPrompt, 'utf-8');
    
    const yoloFlag = agent.yoloMode ? (agent.yoloFlag || '-y') : '';
    const outputFlag = agent.outputFlag || '';
    const cmd = `type "${tmpFile}" | ${agent.command} ${yoloFlag} ${outputFlag}`.trim();
    
    let result = '';
    let error = '';
    let timedOut = false;
    
    try {
      result = execSync(cmd, { timeout: 30000, encoding: 'utf-8', stdio: 'pipe', shell: true });
    } catch (e: any) {
      error = e.stderr || e.stdout || e.message || 'Unknown error';
      if (e.killed) timedOut = true;
    }
    
    try { fs.unlinkSync(tmpFile); } catch {}
    
    const success = result.includes('AUTOCLAUDE_AUTH_OK');
    
    if (success) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            '┌──────────────────────────────────────────┐',
            '│        Auth Verification                  │',
            '├──────────────────────────────────────────┤',
            `│  Agent   : ${(agent.name || targetId).padEnd(34)} │`,
            `│  Status  : ✅ Authenticated & Ready        │`,
            `│  Command : ${agent.command}`.padEnd(50) + ' │',
            '└──────────────────────────────────────────┘',
            '',
            `✅ ${agent.name || targetId} is authenticated and responding. Ready to dispatch tasks.`,
          ].join('\n'),
        }],
      };
    }
    
    // Auth failed — analyze the error
    const isAuthError = error.toLowerCase().includes('auth') 
      || error.toLowerCase().includes('login')
      || error.toLowerCase().includes('api key')
      || error.toLowerCase().includes('unauthorized')
      || error.toLowerCase().includes('401')
      || error.toLowerCase().includes('403')
      || error.toLowerCase().includes('token');
    
    const isRateLimit = error.toLowerCase().includes('rate limit')
      || error.toLowerCase().includes('429')
      || error.toLowerCase().includes('quota');
    
    const isNotInstalled = error.toLowerCase().includes('not found')
      || error.toLowerCase().includes('not recognized')
      || error.toLowerCase().includes('enoent');
    
    const lines = [
      '┌──────────────────────────────────────────┐',
      '│        Auth Verification                  │',
      '├──────────────────────────────────────────┤',
      `│  Agent   : ${(agent.name || targetId).padEnd(34)} │`,
      `│  Status  : ${timedOut ? '⏰ Timed Out'.padEnd(34) : '❌ Failed'.padEnd(34)} │`,
      '└──────────────────────────────────────────┘',
      '',
    ];
    
    if (timedOut) {
      lines.push('⏰ The agent did not respond within 30 seconds. Possible issues:');
      lines.push('- The agent may be waiting for interactive input');
      lines.push('- The agent may require login/auth before use');
      lines.push('- Run `check_agent("' + targetId + '")` to verify the CLI is installed');
    } else if (isAuthError) {
      lines.push('🔐 **Authentication Required**');
      lines.push('');
      lines.push('The agent returned an auth error. The user needs to authenticate:');
      lines.push('');
      lines.push('```');
      lines.push(error.substring(0, 300));
      lines.push('```');
      lines.push('');
      lines.push('**Actions for the user:**');
      if (targetId === 'gemini') lines.push('1. Run: `gemini auth` and follow the OAuth flow');
      if (targetId === 'qwen') lines.push('1. Run: `qwen auth` and configure OpenRouter or API key');
      if (targetId === 'codex') lines.push('1. Run: `codex auth` and login with OpenAI/ChatGPT');
      lines.push('2. Then run `verify_agent_auth("' + targetId + '")` again to confirm');
    } else if (isRateLimit) {
      lines.push('⚠️ **Rate Limit Hit**');
      lines.push('');
      lines.push('The agent is rate-limited. Wait a few minutes and try again.');
      lines.push('');
      lines.push('```');
      lines.push(error.substring(0, 200));
      lines.push('```');
    } else if (isNotInstalled) {
      lines.push('❌ **Command Not Found**');
      lines.push('');
      lines.push(`The command \`${agent.command}\` is not in PATH.`);
      lines.push(`Install: \`${agent.installHint || 'Check the agent documentation'}\``);
    } else {
      lines.push('❌ **Verification Failed**');
      lines.push('');
      lines.push('```');
      lines.push(error.substring(0, 300) || '(no output)');
      lines.push('```');
    }
    
    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  }
```

---

## Phase 3: Rebuild, Test, Commit

```bash
cd D:\qwen-bridge
npx tsc
```

Fix any TypeScript errors. The `execSync` shell option and error handling may need type adjustments.

Test with:
```bash
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"verify_agent_auth","arguments":{"agent_id":"qwen"}},"id":1}' | node dist/index.js
```

Then commit:
```bash
git add -A
git commit -m "feat: NPM publish config + verify_agent_auth tool"
git push origin main
```

---

## Phase 4: Update README.md — NPM Install Section

In the Installation section of both README.md and README_CN.md, add NPM as the PRIMARY install method:

```markdown
## Installation

### Quick Install (NPM)

```bash
npm install -g autoclaude
```

### From GitHub

```bash
git clone https://github.com/zhewenzhang/AutoClaude.git
cd AutoClaude
npm install && npm run build
```
```

---

## Phase 5: Update CHANGELOG.md

Add this entry at the top:

```markdown
## v5.5 — NPM Package + Auth Verification (2026-05-09)

**Planner**: Claude Code | **Executor**: Qwen Code

- 📦 NPM publishing config — `npm install -g autoclaude`
- 🔐 `verify_agent_auth` tool — pre-flight auth check before dispatching
- 🔍 Auto-detects auth errors, rate limits, missing installations
- 📋 Guides user through auth setup for each agent
```
