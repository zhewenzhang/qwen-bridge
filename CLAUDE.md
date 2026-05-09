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

### Superpowers Skills Integration

When planning complex tasks, Claude SHOULD invoke these skills BEFORE writing the task file:

| Skill | When to Use | Purpose |
|-------|------------|---------|
| `superpowers:brainstorming` | Before any creative/design work | Explore alternatives, validate approach |
| `superpowers:writing-plans` | Multi-step implementation | Generate structured plan before task file |
| `superpowers:systematic-debugging` | Bug fix tasks | Root cause analysis before coding |
| `superpowers:verification-before-completion` | Before claiming "done" | Run verify_project, check results |

**Integration flow:**

```
1. User requests feature/bugfix
2. Claude invokes brainstorming → validates approach
3. Claude invokes writing-plans → generates structured plan
4. Claude converts plan → QWEN_*.md task file (using templates/)
5. Claude dispatches → Qwen Code executes
6. Qwen Code completes → Claude runs verify_project
7. Claude checks diff review → reports to user
```

This ensures every task follows the **Plan → Template → Dispatch → Verify → Report** cycle.

### Auth Forwarding Protocol

When a dispatched agent encounters authentication errors, Claude MUST follow this protocol:

1. **Check status after dispatch** — Call `check_task_status("QWEN_TASK.md")` 30-60s after dispatching
2. **If auth detected** — `check_task_status` returns 🔐 with the specific issue and fix instructions
3. **Notify user** — Claude MUST immediately tell the user:
   ```
   ⚠️ <Agent> needs your attention:
   
   Issue: <auth label>
   Fix: <specific command to run>
   
   Please run this command, then I'll re-dispatch the task.
   ```
4. **Wait for user** — Do NOT re-dispatch until the user confirms the fix
5. **Verify fix** — Call `verify_agent_auth("<agent_id>")` after user fixes
6. **Re-dispatch** — Only after verification passes

### Common auth scenarios and fixes:

| Agent | Auth Issue | User Action |
|-------|-----------|-------------|
| NPM | `npm login` needed | User runs `npm login` in terminal |
| GitHub | `gh auth login` needed | User runs `gh auth login` |
| Gemini CLI | Folder not trusted | User runs `gemini trust` |
| Qwen Code | API key not set | User runs `qwen auth` |
| Any agent | 401/403 error | User checks subscription/API key |

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

### Task Quality Rules (from failure analysis)

Based on 15 dispatched tasks, these rules prevent the 7 known failure patterns:

1. **<200 lines** — Tasks over 400 lines fail 60% of the time. Split large tasks.
2. **Exact code, not descriptions** — Provide the exact replacement text, not "change X to Y style"
3. **One file per phase** — If a phase touches 3+ files, split into sub-phases
4. **Forbid helper scripts** — Agent MUST edit files directly. Do NOT write .cjs/.mjs/.py scripts to "do the edits"
5. **Require build verification** — Every phase MUST end with: verify `npx tsc` passes before continuing
6. **Forbid config refactoring** — Only change config.json when the task EXPLICITLY asks for config changes
7. **Single goal per task** — If the task description contains "and also", split it

### Cleanup Rule
After every task completion, Claude MUST check for and remove orphaned helper scripts:
- `ls *.cjs *.mjs *.py 2>/dev/null` in project root
- Move any found to `tasks/archive/`

### Emergency Exception

If the bridge itself is broken and cannot dispatch, Claude may do direct fixes. This MUST be:
1. Documented with a reason
2. Limited to fixing the bridge's dispatch mechanism only
3. Followed by immediately returning to the dispatch workflow
