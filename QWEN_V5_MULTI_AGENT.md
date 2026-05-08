# Task: AutoClaude v5.0 — Multi-CLI Agent Support

## Overview
Refactor the bridge from hardcoded "Qwen Code + Cursor" to a flexible multi-agent system. Users can choose any CLI coding tool (Gemini CLI, Codex, Aider, Cline, etc.) and switch freely.

---

## Phase 1: Rewrite Config & Types in `src/index.ts`

### 1a. Replace the `BridgeConfig` interface

Find the current `interface BridgeConfig` block (around line 97) and replace it entirely with:

```typescript
interface AgentConfig {
  name: string;
  command: string;
  type: "cli" | "clipboard";
  yoloFlag: string;
  outputFlag: string;
  installHint: string;
  enabled: boolean;
}

interface BridgeConfig {
  projectDir: string;
  activeAgent: string;
  speechOnDispatch: boolean;
  speechText: string;
  showTerminal: boolean;
  agents: Record<string, AgentConfig>;
}
```

### 1b. Replace the `loadConfig` function

Replace the current `loadConfig` function with:

```typescript
const DEFAULT_AGENTS: Record<string, AgentConfig> = {
  qwen: {
    name: "Qwen Code",
    command: "qwen",
    type: "cli",
    yoloFlag: "-y",
    outputFlag: "--output-format text",
    installHint: "npm install -g @qwen-code/qwen-code",
    enabled: true,
  },
  gemini: {
    name: "Gemini CLI",
    command: "gemini",
    type: "cli",
    yoloFlag: "--yolo",
    outputFlag: "",
    installHint: "npm install -g @google/gemini-cli",
    enabled: false,
  },
  codex: {
    name: "Codex CLI",
    command: "codex",
    type: "cli",
    yoloFlag: "--approval-mode yolo",
    outputFlag: "",
    installHint: "npm install -g @openai/codex",
    enabled: false,
  },
  aider: {
    name: "Aider",
    command: "aider",
    type: "cli",
    yoloFlag: "--yes",
    outputFlag: "",
    installHint: "pip install aider-chat",
    enabled: false,
  },
  opencode: {
    name: "OpenCode",
    command: "opencode",
    type: "cli",
    yoloFlag: "-y",
    outputFlag: "",
    installHint: "npm install -g @opencode-ai/cli",
    enabled: false,
  },
  cline: {
    name: "Cline CLI",
    command: "cline",
    type: "cli",
    yoloFlag: "-y",
    outputFlag: "",
    installHint: "npm install -g @cline/cli",
    enabled: false,
  },
  cursor: {
    name: "Cursor AI",
    command: "cursor",
    type: "clipboard",
    yoloFlag: "",
    outputFlag: "",
    installHint: "https://cursor.com",
    enabled: false,
  },
};

function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Config not found: ${CONFIG_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  // Merge saved agents with defaults (so new agents in updates appear)
  const savedAgents = raw.agents || {};
  const agents: Record<string, AgentConfig> = { ...DEFAULT_AGENTS };
  for (const [id, cfg] of Object.entries(savedAgents)) {
    agents[id] = { ...agents[id], ...(cfg as Partial<AgentConfig>) } as AgentConfig;
  }
  return {
    projectDir: raw.projectDir || process.cwd(),
    activeAgent: raw.activeAgent || 'qwen',
    speechOnDispatch: raw.speechOnDispatch ?? true,
    speechText: raw.speechText || 'AutoClaude task dispatched',
    showTerminal: raw.showTerminal ?? false,
    agents,
  };
}

function saveConfig(config: BridgeConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    projectDir: config.projectDir,
    activeAgent: config.activeAgent,
    speechOnDispatch: config.speechOnDispatch,
    speechText: config.speechText,
    showTerminal: config.showTerminal,
    agents: config.agents,
  }, null, 2), 'utf-8');
}
```

### 1c. Add agent helper function

After `loadConfig` and `saveConfig`, add:

```typescript
function getActiveAgent(config: BridgeConfig): AgentConfig {
  const agent = config.agents[config.activeAgent];
  if (!agent || !agent.enabled) {
    // Fallback to first enabled CLI agent
    for (const [id, a] of Object.entries(config.agents)) {
      if (a.enabled && a.type === 'cli') {
        config.activeAgent = id;
        saveConfig(config);
        return a;
      }
    }
    throw new Error('No enabled CLI agent found. Enable at least one agent with switch_agent or add_custom_agent.');
  }
  return agent;
}
```

---

## Phase 2: Refactor `runQwen` → `runCliAgent`

### 2a. Rename and generalize

Replace the function name `runQwen` with `runCliAgent` everywhere in the file (find all references and update).

The function signature stays the same: `function runCliAgent(config: BridgeConfig, taskPath: string, taskName: string): void`

### 2b. Update the headless path to use agent config

In the headless path (the else block), read the active agent's flags:

```typescript
  } else {
    const agent = getActiveAgent(config);
    const startTime = new Date();
    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    writeTaskSummary(taskPath, taskName, taskName, startTime, agent.name);

    // Prepend format instructions to task content
    const taskContent = fs.readFileSync(taskPath, 'utf-8');
    const formatInstruction = [
      '<!-- AUTOCLAUDE FORMAT INSTRUCTION -->',
      'After completing ALL steps in this task, you MUST output a final section:',
      '',
      '## Completion Checklist',
      '',
      '| Step | Role | Status |',
      '|------|------|--------|',
      '| Planning | Claude | ✅ |',
      '| Dispatching | AutoClaude | ✅ |',
      `| Execute task steps | ${agent.name} | ✅ |`,
      '',
      '## Token Report',
      '- Claude tokens: planning only (~2K-5K input)',
      `- Execution tokens: used by ${agent.name} independently`,
      '',
      '<!-- END FORMAT INSTRUCTION -->',
      '',
    ].join('\n');
    const fullContent = formatInstruction + taskContent;

    // Write task to temp file
    const tmpTaskFile = path.join(os.tmpdir(), `_ac_task_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`);
    fs.writeFileSync(tmpTaskFile, fullContent, 'utf-8');

    // Build the agent command with its specific flags
    const agentFlags = [agent.yoloFlag, agent.outputFlag].filter(Boolean).join(' ');
    const batFile = path.join(os.tmpdir(), `_ac_run_${taskName.replace(/[^a-zA-Z0-9_-]/g, '_')}.bat`);
    const batContent = [
      '@echo off',
      `cd /d "${config.projectDir}"`,
      `type "${tmpTaskFile}" | ${agent.command} ${agentFlags} > "${resultLog}" 2>&1`,
    ].join('\r\n') + '\r\n';
    fs.writeFileSync(batFile, batContent);

    spawn('cmd.exe', ['/c', 'start', '/min', '', batFile], {
      detached: true,
      stdio: 'ignore',
      shell: false,
    }).unref();
  }
```

Also update the terminal mode (showTerminal) path to use `agent.command` instead of `config.qwenCommand`.

### 2c. Update the dispatch response in `dispatch_to_qwen` handler

Update the response text to show the active agent name:

```typescript
    const agent = getActiveAgent(config);
    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    return {
      content: [{
        type: 'text' as const,
        text: [
          `✅ Dispatched to ${agent.name}`,
          `   Task File   : ${taskPath}`,
          `   Description : ${notifMsg}`,
          `   Agent       : ${agent.name} (${config.activeAgent})`,
          `   Mode        : ${config.showTerminal ? 'visible terminal' : 'headless background'}`,
          `   Result Log  : ${resultLog}`,
          `   Summary     : ${summaryPath}`,
          '',
          `AutoClaude dispatched. ${agent.name} executing in background.`,
          'Check _summary.md for the process report and _result.log for raw output.',
        ].join('\n'),
      }],
    };
```

---

## Phase 3: Add New MCP Tools

### 3a. Add `dispatch_task` — unified dispatch to active agent

In the ListTools handler, add:

```typescript
    {
      name: 'dispatch_task',
      description:
        'Dispatch a task file to the currently active AI coding agent. ' +
        'Use list_agents to see available agents, switch_agent to change. ' +
        'For CLI agents: background pipe execution with auto-approve. ' +
        'For clipboard agents: copies task to clipboard. ' +
        'Use this after writing a task markdown file.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          task_file: {
            type: 'string',
            description: 'Path to the task markdown file. Can be absolute or relative to projectDir.',
          },
          description: {
            type: 'string',
            description: 'One-line description of the task, used in the notification.',
          },
        },
        required: ['task_file'],
      },
    },
```

In the CallTool handler, add:

```typescript
  // ── dispatch_task ─────────────────────────────────────────────────────────
  if (request.params.name === 'dispatch_task') {
    const { task_file, description } = request.params.arguments as {
      task_file: string;
      description?: string;
    };

    const taskPath = path.isAbsolute(task_file)
      ? task_file
      : path.join(config.projectDir, task_file);

    if (!fs.existsSync(taskPath)) {
      return {
        content: [{ type: 'text' as const, text: `❌ File not found: ${taskPath}` }],
        isError: true,
      };
    }

    const agent = getActiveAgent(config);
    const taskName = path.basename(taskPath, '.md');
    const notifMsg = description ?? `Task ready: ${taskName}`;

    if (config.speechOnDispatch) {
      sendWindowsNotification('AutoClaude', `${agent.name}: ${notifMsg}`);
      sendSpeech(config.speechText);
    }

    if (agent.type === 'clipboard') {
      // Clipboard-style dispatch (like Cursor)
      const taskContent = fs.readFileSync(taskPath, 'utf-8');
      let clipboardOk = false;
      try {
        copyToClipboard(taskContent);
        clipboardOk = true;
      } catch {}
      if (config.speechOnDispatch) {
        sendWindowsNotification('AutoClaude', `${agent.name}: ${notifMsg}` + (clipboardOk ? ' — Copied to clipboard' : ''));
      }
      try {
        spawn(agent.command, [config.projectDir], { detached: true, stdio: 'ignore', shell: false }).unref();
      } catch {}
      return {
        content: [{
          type: 'text' as const,
          text: [
            `✅ Dispatched to ${agent.name}`,
            `   Task       : ${taskPath}`,
            `   Clipboard  : ${clipboardOk ? '✓ Copied' : '⚠ Failed'}`,
            '',
            clipboardOk ? `Open ${agent.name} and paste (Ctrl+V) the task.` : 'Open the task file manually.',
          ].join('\n'),
        }],
      };
    }

    // CLI agent dispatch
    runCliAgent(config, taskPath, taskName);
    const resultLog = taskPath.replace(/\.md$/, '_result.log');
    const summaryPath = taskPath.replace(/\.md$/, '_summary.md');
    return {
      content: [{
        type: 'text' as const,
        text: [
          `✅ Dispatched to ${agent.name}`,
          `   Task File   : ${taskPath}`,
          `   Description : ${notifMsg}`,
          `   Agent       : ${agent.name} (${config.activeAgent})`,
          `   Mode        : ${config.showTerminal ? 'visible terminal' : 'headless background'}`,
          `   Result Log  : ${resultLog}`,
          `   Summary     : ${summaryPath}`,
          '',
          `AutoClaude dispatched. ${agent.name} executing in background.`,
          'Check _summary.md for the process report.',
        ].join('\n'),
      }],
    };
  }
```

### 3b. Add `list_agents`

In ListTools:

```typescript
    {
      name: 'list_agents',
      description:
        'List all available AI coding agents. Shows which are enabled, which is active, and install hints. ' +
        'Use this to see what CLI tools are available before dispatching.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
```

In CallTool:

```typescript
  // ── list_agents ───────────────────────────────────────────────────────────
  if (request.params.name === 'list_agents') {
    const lines = ['🤖 Available AI Coding Agents', ''];
    lines.push('| Agent | Type | Status | Install |');
    lines.push('|-------|------|--------|---------|');
    for (const [id, agent] of Object.entries(config.agents)) {
      const active = id === config.activeAgent ? ' ⭐ ACTIVE' : '';
      const status = agent.enabled ? `✅ Enabled${active}` : '⏸️ Disabled';
      lines.push(`| **${agent.name}** (\`${id}\`) | ${agent.type} | ${status} | \`${agent.installHint}\` |`);
    }
    lines.push('');
    lines.push(`**Active agent: ${config.activeAgent}** — all dispatch_task calls will use this.`);
    lines.push('');
    lines.push('Use `switch_agent("<id>")` to switch. Use `add_custom_agent` to add your own tool.');

    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  }
```

### 3c. Add `switch_agent`

In ListTools:

```typescript
    {
      name: 'switch_agent',
      description:
        'Switch the active AI coding agent. All subsequent dispatch_task calls will use this agent. ' +
        'Use list_agents to see available agent IDs. The agent must be enabled.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          agent_id: {
            type: 'string',
            description: 'The agent ID to switch to (e.g., "qwen", "gemini", "codex", "aider").',
          },
        },
        required: ['agent_id'],
      },
    },
```

In CallTool:

```typescript
  // ── switch_agent ──────────────────────────────────────────────────────────
  if (request.params.name === 'switch_agent') {
    const { agent_id } = request.params.arguments as { agent_id: string };

    if (!config.agents[agent_id]) {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ Unknown agent: "${agent_id}". Available: ${Object.keys(config.agents).join(', ')}`,
        }],
        isError: true,
      };
    }

    if (!config.agents[agent_id].enabled) {
      return {
        content: [{
          type: 'text' as const,
          text: [
            `⚠️ Agent "${agent_id}" (${config.agents[agent_id].name}) is not enabled.`,
            `Install: \`${config.agents[agent_id].installHint}\``,
            '',
            'Enable it with: switch_agent with enable=true, or edit config.json manually.',
          ].join('\n'),
        }],
      };
    }

    const oldAgent = config.activeAgent;
    config.activeAgent = agent_id;
    saveConfig(config);

    return {
      content: [{
        type: 'text' as const,
        text: [
          `✅ Switched agent: ${config.agents[oldAgent]?.name || oldAgent} → **${config.agents[agent_id].name}**`,
          '',
          `All dispatch_task calls will now use: ${config.agents[agent_id].name}`,
          `Command: \`${config.agents[agent_id].command} ${config.agents[agent_id].yoloFlag} ${config.agents[agent_id].outputFlag}\``.trim(),
        ].join('\n'),
      }],
    };
  }
```

### 3d. Add `add_custom_agent`

In ListTools:

```typescript
    {
      name: 'add_custom_agent',
      description:
        'Add a custom CLI coding agent to AutoClaude. ' +
        'Provide the agent ID, name, command, and flags so AutoClaude can dispatch to it. ' +
        'After adding, use switch_agent to make it active.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          agent_id: {
            type: 'string',
            description: 'Short ID for the agent (e.g., "my-tool"). Lowercase, no spaces.',
          },
          name: {
            type: 'string',
            description: 'Display name (e.g., "My Custom Tool").',
          },
          command: {
            type: 'string',
            description: 'The CLI command to invoke (e.g., "my-ai-cli").',
          },
          yolo_flag: {
            type: 'string',
            description: 'The flag for auto-approve/YOLO mode (e.g., "-y" or "--yolo"). Leave empty if not supported.',
          },
          output_flag: {
            type: 'string',
            description: 'Output format flag (e.g., "--output-format text"). Leave empty if not needed.',
          },
          install_hint: {
            type: 'string',
            description: 'How to install this tool (e.g., "npm install -g my-tool").',
          },
        },
        required: ['agent_id', 'name', 'command'],
      },
    },
```

In CallTool:

```typescript
  // ── add_custom_agent ──────────────────────────────────────────────────────
  if (request.params.name === 'add_custom_agent') {
    const { agent_id, name, command, yolo_flag, output_flag, install_hint } = request.params.arguments as {
      agent_id: string;
      name: string;
      command: string;
      yolo_flag?: string;
      output_flag?: string;
      install_hint?: string;
    };

    if (!/^[a-z0-9_-]+$/.test(agent_id)) {
      return {
        content: [{ type: 'text' as const, text: '❌ agent_id must be lowercase alphanumeric with hyphens/underscores only.' }],
        isError: true,
      };
    }

    if (config.agents[agent_id] && config.agents[agent_id].enabled) {
      return {
        content: [{ type: 'text' as const, text: `⚠️ Agent "${agent_id}" already exists. Remove it first or choose a different ID.` }],
        isError: true,
      };
    }

    config.agents[agent_id] = {
      name,
      command,
      type: 'cli',
      yoloFlag: yolo_flag || '',
      outputFlag: output_flag || '',
      installHint: install_hint || `Install ${command}`,
      enabled: true,
    };
    saveConfig(config);

    return {
      content: [{
        type: 'text' as const,
        text: [
          `✅ Custom agent added: **${name}** (\`${agent_id}\`)`,
          `   Command: ${command} ${yolo_flag || ''} ${output_flag || ''}`.trim(),
          '',
          `Use switch_agent("${agent_id}") to make it active.`,
        ].join('\n'),
      }],
    };
  }
```

---

## Phase 4: Update `config.json`

Replace the entire content of `config.json` with:

```json
{
  "projectDir": "D:\\qwen-bridge",
  "activeAgent": "qwen",
  "speechOnDispatch": true,
  "speechText": "AutoClaude task dispatched",
  "showTerminal": false,
  "agents": {
    "qwen": {
      "name": "Qwen Code",
      "command": "qwen",
      "type": "cli",
      "yoloFlag": "-y",
      "outputFlag": "--output-format text",
      "installHint": "npm install -g @qwen-code/qwen-code",
      "enabled": true
    },
    "gemini": {
      "name": "Gemini CLI",
      "command": "gemini",
      "type": "cli",
      "yoloFlag": "--yolo",
      "outputFlag": "",
      "installHint": "npm install -g @google/gemini-cli",
      "enabled": false
    },
    "codex": {
      "name": "Codex CLI",
      "command": "codex",
      "type": "cli",
      "yoloFlag": "--approval-mode yolo",
      "outputFlag": "",
      "installHint": "npm install -g @openai/codex",
      "enabled": false
    },
    "aider": {
      "name": "Aider",
      "command": "aider",
      "type": "cli",
      "yoloFlag": "--yes",
      "outputFlag": "",
      "installHint": "pip install aider-chat",
      "enabled": false
    },
    "opencode": {
      "name": "OpenCode",
      "command": "opencode",
      "type": "cli",
      "yoloFlag": "-y",
      "outputFlag": "",
      "installHint": "npm install -g @opencode-ai/cli",
      "enabled": false
    },
    "cline": {
      "name": "Cline CLI",
      "command": "cline",
      "type": "cli",
      "yoloFlag": "-y",
      "outputFlag": "",
      "installHint": "npm install -g @cline/cli",
      "enabled": false
    },
    "cursor": {
      "name": "Cursor AI",
      "command": "cursor",
      "type": "clipboard",
      "yoloFlag": "",
      "outputFlag": "",
      "installHint": "https://cursor.com",
      "enabled": false
    }
  }
}
```

---

## Phase 5: Update `src/index.ts` version and status

### 5a. Update server version

```typescript
{ name: 'autoclaude', version: '5.0.0' },
```

### 5b. Update qwen_bridge_status

In the status handler, update to show active agent and agent count:

```typescript
  // ── qwen_bridge_status ────────────────────────────────────────────────────
  if (request.params.name === 'qwen_bridge_status') {
    const cum = getCumulativeSavings();
    const agent = getActiveAgent(config);
    const enabledCount = Object.values(config.agents).filter(a => a.enabled).length;
    return {
      content: [{
        type: 'text' as const,
        text: [
          '✅ AutoClaude is running (v5.0)',
          '',
          `Active Agent: ${agent.name} (${config.activeAgent})`,
          `Agents: ${enabledCount} enabled / ${Object.keys(config.agents).length} total`,
          '',
          'Current config:',
          `  projectDir      : ${config.projectDir}`,
          `  activeAgent     : ${config.activeAgent}`,
          `  speechOnDispatch: ${config.speechOnDispatch}`,
          `  showTerminal    : ${config.showTerminal}`,
          '',
          `💰 Cumulative Savings: ${cum.tasks} tasks, ~${cum.tokensSaved.toLocaleString()} tokens, $${cum.costSaved.toFixed(2)}`,
          '',
          'Tools (9): dispatch_task, dispatch_to_qwen, dispatch_to_cursor, list_agents,',
          '          switch_agent, add_custom_agent, get_task_report, get_savings_report,',
          '          qwen_bridge_status',
        ].join('\n'),
      }],
    };
  }
```

---

## Phase 6: Build & Fix Compilation Errors

### 6a. Rebuild

```bash
cd D:\qwen-bridge
npx tsc
```

Fix any TypeScript compilation errors:
- Ensure all `runQwen` references are updated to `runCliAgent`
- Ensure `getActiveAgent` is called where needed
- Ensure `saveConfig` is imported/used

### 6b. Keep backward compatibility

Make sure `dispatch_to_qwen` still works by calling `runCliAgent` internally. The `dispatch_to_cursor` handler should still work for the clipboard path. Both should use their respective agent configs from `config.agents`.

---

## Phase 7: Update README.md

### 7a. Add Multi-Agent section after the tools table

Replace the tools table to include the new tools and add a multi-agent section:

```markdown
## Multi-Agent Support (v5.0)

AutoClaude supports any terminal-invocable AI coding CLI. Choose the tool that matches your subscription and token plan.

### Built-in Agents

| Agent | Command | Type | YOLO Flag | Install |
|-------|---------|------|-----------|---------|
| **Qwen Code** | `qwen` | CLI | `-y` | `npm i -g @qwen-code/qwen-code` |
| **Gemini CLI** | `gemini` | CLI | `--yolo` | `npm i -g @google/gemini-cli` |
| **Codex CLI** | `codex` | CLI | `--approval-mode yolo` | `npm i -g @openai/codex` |
| **Aider** | `aider` | CLI | `--yes` | `pip install aider-chat` |
| **OpenCode** | `opencode` | CLI | `-y` | `npm i -g @opencode-ai/cli` |
| **Cline CLI** | `cline` | CLI | `-y` | `npm i -g @cline/cli` |
| **Cursor AI** | `cursor` | Clipboard | — | [cursor.com](https://cursor.com) |

### Switching Agents

```
Claude: list_agents → see what's available
User: "I want to use Gemini CLI"
Claude: switch_agent("gemini")
Claude: dispatch_task("MY_TASK.md", "Build feature X")
→ AutoClaude pipes task to gemini --yolo in the background
```

### Adding Custom Agents

```json
Claude: add_custom_agent("my-tool", "My Agent", "my-ai", "-y", "--text")
```
```

### 7b. Update tools table

Add these rows to the tools table:
- `dispatch_task` — Unified dispatch to the active agent
- `list_agents` — Show all available agents
- `switch_agent` — Switch the active agent
- `add_custom_agent` — Register a custom CLI tool

---

## Phase 8: Update `README_CN.md`

Make the same updates as Phase 7 but in Chinese. Add a Chinese Multi-Agent section.

Title the section: `## 多 Agent 支持（v5.0）`

Translate the agent table and workflow descriptions to Chinese.

---

## Phase 9: Update `index.html` — Add Agent Selector

### 9a. Add Agent Showcase section

After the Savings section (before Features), add:

```html
<!-- Agent Showcase -->
<section id="agents" class="space-y-12">
    <div class="text-center space-y-4">
        <h2 class="text-3xl md:text-4xl font-black tracking-tight text-on-background">Choose Your Agent</h2>
        <p class="text-lg text-on-surface-variant max-w-2xl mx-auto">AutoClaude supports any terminal-invocable AI coding CLI. Pick the tool that matches your subscription plan.</p>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-primary-container">
            <div class="text-2xl font-black text-primary-container">QW</div>
            <h3 class="font-bold text-on-background">Qwen Code</h3>
            <span class="text-xs px-2 py-1 bg-primary-container/10 rounded-full text-primary-container">CLI</span>
            <p class="text-xs text-on-surface-variant">Alibaba / OpenRouter</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-blue-400">
            <div class="text-2xl font-black text-blue-500">GM</div>
            <h3 class="font-bold text-on-background">Gemini CLI</h3>
            <span class="text-xs px-2 py-1 bg-blue-50 rounded-full text-blue-600">CLI · Free Tier</span>
            <p class="text-xs text-on-surface-variant">Google · 1M context</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-green-400">
            <div class="text-2xl font-black text-green-500">CX</div>
            <h3 class="font-bold text-on-background">Codex CLI</h3>
            <span class="text-xs px-2 py-1 bg-green-50 rounded-full text-green-600">CLI · OpenAI</span>
            <p class="text-xs text-on-surface-variant">OpenAI · Apache 2.0</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-orange-400">
            <div class="text-2xl font-black text-orange-500">AI</div>
            <h3 class="font-bold text-on-background">Aider</h3>
            <span class="text-xs px-2 py-1 bg-orange-50 rounded-full text-orange-600">CLI · BYO Key</span>
            <p class="text-xs text-on-surface-variant">Multi-model · Git native</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-purple-400">
            <div class="text-2xl font-black text-purple-500">OC</div>
            <h3 class="font-bold text-on-background">OpenCode</h3>
            <span class="text-xs px-2 py-1 bg-purple-50 rounded-full text-purple-600">CLI · 75+ Models</span>
            <p class="text-xs text-on-surface-variant">Privacy-first</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-pink-400">
            <div class="text-2xl font-black text-pink-500">CL</div>
            <h3 class="font-bold text-on-background">Cline CLI</h3>
            <span class="text-xs px-2 py-1 bg-pink-50 rounded-full text-pink-600">CLI · Agnostic</span>
            <p class="text-xs text-on-surface-variant">Model-agnostic</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-gray-400">
            <div class="text-2xl font-black text-gray-500">CS</div>
            <h3 class="font-bold text-on-background">Cursor AI</h3>
            <span class="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">Clipboard</span>
            <p class="text-xs text-on-surface-variant">GUI · Manual paste</p>
        </div>
        <div class="glass-card rounded-2xl p-6 text-center space-y-3 border-t-4 border-t-slate-300 border-dashed">
            <span class="material-symbols-outlined text-3xl text-on-surface-variant">add_circle</span>
            <h3 class="font-bold text-on-background">Custom</h3>
            <span class="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-600">Your Tool</span>
            <p class="text-xs text-on-surface-variant">add_custom_agent</p>
        </div>
    </div>
    <p class="text-center text-xs text-on-surface-variant">
        Don't see your tool? Use <code class="bg-surface-container px-2 py-0.5 rounded">add_custom_agent</code> in Claude to register any CLI tool.
    </p>
</section>
```

### 9b. Update navbar

Add `<a class="text-on-surface-variant hover:text-primary-container transition-all duration-300" href="#agents">Agents</a>` to the nav.

---

## Phase 10: Commit and Push

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "v5.0: Multi-CLI agent support — dispatch_task, list_agents, switch_agent, add_custom_agent"
git push origin main
```

---

## Phase 11: Verify

1. `npx tsc` compiles without errors
2. MCP server lists 9 tools: dispatch_task, dispatch_to_qwen, dispatch_to_cursor, list_agents, switch_agent, add_custom_agent, get_task_report, get_savings_report, qwen_bridge_status
3. `list_agents` shows all built-in agents
4. `switch_agent("gemini")` updates activeAgent
5. `dispatch_task("test.md", "test")` works for both CLI and clipboard agents
6. README.md and README_CN.md have Multi-Agent sections
7. index.html has Agent Showcase section
8. Commit pushed to GitHub
