# Task: Create Project Discipline Files — CLAUDE.md + .claude/settings.json

## Context
AutoClaude's core workflow is "Claude plans, Agent executes." But Claude Code has no instructions telling it to follow this rule. We need to create the files that enforce this discipline.

---

## Phase 1: Create `CLAUDE.md`

Create `D:\qwen-bridge\CLAUDE.md` with EXACTLY this content:

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

### Available MCP Tools

| Tool | Purpose |
|------|---------|
| `dispatch_task` | Dispatch a task to the active agent |
| `dispatch_to_qwen` | Dispatch specifically to Qwen Code |
| `dispatch_to_cursor` | Dispatch to Cursor (clipboard) |
| `list_agents` | See available agents |
| `switch_agent` | Change the active agent |
| `add_custom_agent` | Register a new CLI tool |
| `qwen_bridge_status` | Check bridge status |
| `get_task_report` | Read task execution report |
| `get_savings_report` | View cumulative token savings |

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

Write this to `D:\qwen-bridge\CLAUDE.md`.

---

## Phase 2: Create `.claude/settings.json`

Create `D:\qwen-bridge\.claude\settings.json` with:

```json
{
  "mcpServers": {
    "autoclaude": {
      "command": "node",
      "args": ["D:\\qwen-bridge\\dist\\index.js"],
      "env": {}
    }
  }
}
```

This ensures the AutoClaude bridge MCP server is always available when Claude Code opens this project.

---

## Phase 3: Commit and Push

```bash
cd D:\qwen-bridge
git add CLAUDE.md .claude/settings.json
git commit -m "chore: add CLAUDE.md discipline rules + project MCP settings"
git push origin main
```

---

## Phase 4: Verify

1. `cat D:\qwen-bridge\CLAUDE.md` shows the discipline rules
2. `cat D:\qwen-bridge\.claude\settings.json` shows MCP config
3. `git log --oneline -1` shows the commit
