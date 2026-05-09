# P1: Output Format Optimization — Markdown Tables Replace Unicode Boxes

## Context
Unicode box-drawing characters (┌─┐│└┘) look good in a real terminal but become `\n` noise when passed through JSON to Claude Code. The user sees escaped strings, not formatted output.

## Strategy
MCP tool responses use **clean Markdown tables** — readable in JSON, Claude's display, AND terminal. Unicode boxes are removed from MCP responses and kept ONLY in the .ps1 terminal banner (showTerminal mode).

## Phase 1: Redesign All MCP Output Formats

### 1a. `qwen_bridge_status` — Replace box with Markdown

FROM:
```
┌─────────────────────────────────────────────────────┐
│              AutoClaude v5.5.0 — Status               │
├─────────────────────────────────────────────────────┤
│  Active Agent : Qwen Code                         │
```

TO:
```
## AutoClaude v5.5.0 — Status

| Field | Value |
|-------|-------|
| Active Agent | Qwen Code (`qwen`) |
| YOLO Mode | ✅ ON |
| Terminal | Headless background |
| Agents | 2 enabled / 7 total |
| Project Dir | `D:\qwen-bridge` |
| 💰 Savings | 15 tasks · 231,500 tokens · $3.00 |

**Tools:** dispatch_task · list_agents · switch_agent · add_custom_agent · check_agent · verify_agent_auth · get_task_report · get_savings_report · get_project_report · qwen_bridge_status
```

### 1b. `list_agents` — Replace box with Markdown table

```
## Configured Agents

| | Agent | Type | YOLO | Command | Status |
|---|-------|------|------|---------|--------|
| ⭐ | Qwen Code | 🖥️ CLI | ✅ | `qwen -y` | Active |
| | Gemini CLI | 🖥️ CLI | ✅ | `gemini --yolo` | Enabled |
| | Codex CLI | 🖥️ CLI | ✅ | `codex` | Disabled |
| | Aider | 🖥️ CLI | ✅ | `aider --yes` | Disabled |
| | Cursor AI | 📋 Clipboard | ❌ | `cursor` | Disabled |

**Active:** Qwen Code — all `dispatch_task` calls use this agent.
Switch with `switch_agent("<id>")` · Add custom with `add_custom_agent(...)`
```

### 1c. `switch_agent` — Replace box with Markdown

```
## Agent Switched

| | |
|---|---|
| From | Qwen Code (`qwen`) |
| To | Gemini CLI (`gemini`) |
| YOLO | ✅ ON |
| Command | `gemini --yolo` |

✅ All `dispatch_task` calls will now use Gemini CLI.
```

### 1d. `dispatch_task` / `dispatch_to_qwen` / `dispatch_to_cursor` — Replace box

```
## ✅ Task Dispatched

| Field | Value |
|-------|-------|
| Agent | Qwen Code |
| Task | `QWEN_EXAMPLE.md` |
| Mode | Headless Background |
| YOLO | ✅ Auto-Approve ON |

| Output | File |
|--------|------|
| 📄 Result Log | `QWEN_EXAMPLE_result.log` |
| 📋 Process Report | `QWEN_EXAMPLE_summary.md` |

🚀 Agent executing in background. Use `get_task_report("QWEN_EXAMPLE.md")` to check progress.
```

### 1e. `check_agent` — Already Markdown, minor polish

Keep the existing table format. Make status more prominent.

### 1f. `verify_agent_auth` — Replace box with Markdown

```
## Auth Verification

| Field | Value |
|-------|-------|
| Agent | Qwen Code |
| Status | ✅ Authenticated & Ready |
| Command | `qwen` |

✅ Ready to dispatch tasks.
```

### 1g. `get_savings_report` — Replace box with Markdown

```
## 💰 Savings Report

### Cumulative
| Metric | Value |
|--------|-------|
| Total Tasks | 15 |
| Tokens Saved | ~231,500 |
| Cost Saved | $3.00 |

### Recent Tasks
| Task | Tokens Saved | Cost Saved |
|------|-------------|------------|
| NPM AUTH | ~13,500 | $0.168 |
| CHANGELOG | ~11,000 | $0.135 |
| ONBOARDING | ~14,000 | $0.180 |

💡 Average: ~15,433 tokens ($0.20) saved per task.
```

### 1h. `get_project_report` — Already Markdown, verify emoji

This was fixed in P0. Double-check all emoji render correctly.

### 1i. `get_task_report` — No changes needed

The _summary.md is already Markdown format.

---

## Phase 2: Implementation Notes

- Find EVERY occurrence of `┌─┐│└┘├┤` in `src/index.ts` and replace with the corresponding Markdown format above
- Keep Unicode boxes ONLY in the .ps1 terminal banner (used when showTerminal is true)
- Keep emoji (✅❌⭐💰📋🧠🔗⚡) — they work fine in Markdown
- Use `\n` for line breaks within the JSON string (as before) but without box chars
- Make sure tables use proper Markdown alignment: `| left | right |`

## Phase 3: Rebuild, Commit

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "P1: Replace Unicode boxes with Markdown tables in all MCP outputs"
git push origin main
```

## Phase 4: Verify

1. All 12 MCP tools return clean Markdown (no `┌─┐`)
2. Tables render correctly in JSON text
3. .ps1 terminal banner still uses Unicode boxes (for real terminal display)
4. No compilation errors
