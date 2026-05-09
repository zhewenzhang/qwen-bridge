# Task: First-Run Onboarding Wizard

## Context
When a new user opens AutoClaude, there's no guidance. Claude doesn't know to ask about installed tools, preferences, or project setup. We need:
1. A `check_agent` tool to verify CLI tools exist in PATH
2. A first-run detection mechanism
3. CLAUDE.md instructions for the onboarding flow

## Phase 1: Add `check_agent` MCP Tool

### 1a. In `src/index.ts` — ListTools handler

Add tool definition:

```typescript
    {
      name: 'check_agent',
      description:
        'Verify whether a CLI agent command exists in the system PATH. ' +
        'Returns the command path and version info if found. ' +
        'Use this during onboarding to check which tools the user has installed.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          agent_id: {
            type: 'string',
            description: 'The agent ID to check (e.g., "qwen", "gemini", "codex"). Uses the command from config.agents[id].command.',
          },
        },
        required: ['agent_id'],
      },
    },
```

### 1b. In `src/index.ts` — CallTool handler

Add handler before the unknown-tool fallback:

```typescript
  if (request.params.name === 'check_agent') {
    const { agent_id } = request.params.arguments as { agent_id: string };
    
    if (!config.agents[agent_id]) {
      return {
        content: [{ type: 'text' as const, text: `❌ Unknown agent: "${agent_id}". Available: ${Object.keys(config.agents).join(', ')}` }],
        isError: true,
      };
    }
    
    const agent = config.agents[agent_id];
    const command = agent.command;
    
    // Check if command exists using Windows 'where' command
    let found = false;
    let path_info = '';
    let version_info = '';
    
    try {
      const whereResult = execSync(`where ${command}`, { timeout: 3000, encoding: 'utf-8', stdio: 'pipe' });
      found = true;
      path_info = whereResult.trim().split('\n')[0];
    } catch {
      found = false;
    }
    
    // Try to get version
    if (found) {
      try {
        const versionCmds: Record<string, string> = {
          qwen: `${command} --version`,
          gemini: `${command} --version`,
          codex: `${command} --version`,
          aider: `${command} --version`,
          opencode: `${command} --version`,
          cline: `${command} --version`,
        };
        const vCmd = versionCmds[agent_id] || `${command} --version`;
        version_info = execSync(vCmd, { timeout: 5000, encoding: 'utf-8', stdio: 'pipe' }).trim().split('\n')[0].substring(0, 80);
      } catch {
        version_info = '(version check failed)';
      }
    }
    
    const installHint = agent.installHint || `Install ${command}`;
    
    // Auto-enable if found and currently disabled
    if (found && !agent.enabled) {
      agent.enabled = true;
      saveConfig(config);
    }
    
    const lines = [
      found 
        ? `✅ **${agent.name || agent.label || agent_id}** is installed`
        : `❌ **${agent.name || agent.label || agent_id}** is NOT installed`,
      '',
      `| Field | Value |`,
      `|-------|-------|`,
      `| Command | \`${command}\` |`,
      `| Found | ${found ? 'Yes ✅' : 'No ❌'} |`,
    ];
    
    if (found && path_info) lines.push(`| Path | \`${path_info}\` |`);
    if (found && version_info) lines.push(`| Version | ${version_info} |`);
    if (!found) lines.push(`| Install | \`${installHint}\` |`);
    
    if (found && agent.type === 'clipboard') {
      lines.push(`| Type | Clipboard (no CLI pipe) |`);
    }
    
    lines.push('');
    lines.push(found 
      ? `✅ Ready to use. Auto-enabled in config.`
      : `💡 Install with: \`${installHint}\`, then run \`check_agent("${agent_id}")\` again.`);
    
    return {
      content: [{ type: 'text' as const, text: lines.join('\n') }],
    };
  }
```

Add `execSync` to the import if not already imported (it should be — used by notifications).

---

## Phase 2: Update `CLAUDE.md` — Add Onboarding Section

Replace the ENTIRE content of `D:\qwen-bridge\CLAUDE.md` with the updated version below. KEEP all existing sections and ADD the onboarding section after the "CRITICAL" header:

```markdown
# AutoClaude Project — AI Agent Rules

## CRITICAL: Claude Plans, Agent Executes

**Claude Code MUST NOT directly edit, write, or modify any file in this project.**

All implementation work — including file creation, editing, building, committing, and pushing — MUST be dispatched to an AI coding agent through the AutoClaude bridge.

### The ONLY workflow Claude may use:

1. **Read & Plan** — Read files, analyze requirements, design the approach
2. **Write Task File** — Create a `QWEN_*.md` task file with step-by-step instructions
3. **Dispatch** — Call `dispatch_to_qwen` or `dispatch_task` to send the task to the agent
4. **Wait** — The agent executes in the background. Do NOT poll aggressively.
5. **Verify** — After the agent completes, call `get_task_report` to review results

### What Claude MUST NOT do:

- ❌ Edit any source file directly (src/index.ts, config.json, etc.)
- ❌ Write any file directly (except QWEN_*.md task files)
- ❌ Run `git commit` or `git push` directly
- ❌ Run `npm run build` or `npx tsc` directly
- ❌ Make "quick fixes" — even one-line changes go through the agent
- ❌ Say "this is simple, I'll just do it myself"

---

## 🆕 First-Run Onboarding

### When to trigger

Claude MUST run the onboarding flow when:
1. `config.json` has `activeAgent: "qwen"` AND only Qwen Code is enabled (other agents are all disabled) — this is the default state
2. OR the user says something like "I'm new", "first time", "get started", "setup"
3. OR `check_agent("qwen")` returns "not found" — the default agent isn't installed

### Onboarding Script

Claude MUST follow this conversation flow:

**Step 1: Welcome**
```
Welcome to AutoClaude! 🚀

I'll help you connect Claude Code to your AI coding tools. Let me check what you have installed...
```

**Step 2: Discover installed agents**
Call `check_agent` for each built-in agent: qwen, gemini, codex, aider. For each one that's found, it will be auto-enabled. For ones not found, note the install command.

**Step 3: Present findings**
```
Here's what I found:

✅ Installed:
  - Qwen Code (qwen) — v1.2.3
  - Gemini CLI (gemini) — v0.9.0

❌ Not installed (but available):
  - Codex CLI — npm install -g @openai/codex
  - Aider — pip install aider-chat

Your active agent is Qwen Code. You can switch anytime with switch_agent.

Do you have any other CLI tools you'd like to add?
```

**Step 4: Confirm project directory**
```
AutoClaude works in: D:\qwen-bridge (current directory)

Tasks files (QWEN_*.md) will be created here. Change this by editing config.json → projectDir.

Is this correct?
```

**Step 5: Confirm preferences**
```
Current settings:
  - Mode: Headless background (no terminal windows)
  - YOLO: ON (auto-approve all actions)
  - Notifications: ON (Windows toast + speech)

Ready to dispatch your first task! Just say "I want to..." and I'll plan it.
```

### Key MCP tools for onboarding

| Tool | Use |
|------|-----|
| `check_agent("id")` | Verify CLI tool exists in PATH |
| `list_agents` | Show all agents + status |
| `switch_agent("id")` | Set active agent |
| `add_custom_agent(...)` | Register user's own tool |

---

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `dispatch_task` | Dispatch a task to the active agent |
| `dispatch_to_qwen` | Dispatch specifically to Qwen Code |
| `dispatch_to_cursor` | Dispatch to Cursor (clipboard) |
| `list_agents` | See available agents |
| `switch_agent` | Change the active agent |
| `add_custom_agent` | Register a new CLI tool |
| `check_agent` | Verify a CLI tool is installed |
| `qwen_bridge_status` | Check bridge status |
| `get_task_report` | Read task execution report |
| `get_savings_report` | View cumulative token savings |
| `get_project_report` | View master project report |

### Dispatch Command Pattern

```
Claude writes: QWEN_TASK_NAME.md (detailed step-by-step instructions)
Claude calls: dispatch_to_qwen("QWEN_TASK_NAME.md", "Short description")
Claude waits for: _result.log to populate or _summary.md to finalize
Claude verifies: get_task_report("QWEN_TASK_NAME.md")
```

### Project Structure Awareness

- This project IS the AutoClaude bridge itself
- The bridge code lives in `src/index.ts` and `config.json`
- When modifying the bridge, you are modifying the tool that dispatches you
- If the bridge is broken, Claude may do emergency direct fixes but MUST document why
- The config.json `projectDir` points to `D:\qwen-bridge` (this directory)

### Task File Guidelines

Every task file should:
1. Start with `# Task: <title>`
2. Include a `## Context` section explaining WHY
3. Break work into numbered `## Phase N` sections
4. Include exact code, file paths, and commands
5. End with a `## Checklist` for the agent to verify
6. Specify `## Phase N: Commit and Push` as the final step

### Emergency Exception

If the bridge itself is broken and cannot dispatch, Claude may do direct fixes. This MUST be:
1. Documented with a reason
2. Limited to fixing the bridge's dispatch mechanism only
3. Followed by immediately returning to the dispatch workflow
```

Write this to `D:\qwen-bridge\CLAUDE.md` (overwrite the existing file).

---

## Phase 3: Rebuild, Commit, Push

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "feat: First-run onboarding wizard — check_agent tool + CLAUDE.md onboarding flow"
git push origin main
```

## Phase 4: Verify

1. `check_agent("qwen")` returns ✅ with version
2. `check_agent("nonexistent")` returns ❌ with install hint
3. `check_agent` auto-enables found agents
4. CLAUDE.md contains the onboarding section
5. MCP server lists 11 tools
