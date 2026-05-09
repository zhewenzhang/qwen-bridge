# P1: Simplify Output Format — Minimalist Headers

## Strategy
Replace heavy Unicode box-drawing (6-line `┌─┐│└┘` boxes) with simple 2-line `── Title ──` headers. Same information, much cleaner in JSON.

## Change EVERY MCP tool response in src/index.ts

### Pattern to follow for all handlers:

**Before** (6+ lines of box chars):
```
┌────────────────────────────────┐
│         Title                  │
├────────────────────────────────┤
│  Field : Value                 │
└────────────────────────────────┘
```

**After** (simple separator line):
```
── Title ──

Field    : Value
Status   : ✅ Ready
```

### Specific changes for each handler:

### 1. qwen_bridge_status
```
── AutoClaude v5.5.0 ──

Active Agent : Qwen Code (`qwen`)
Command      : qwen
YOLO Mode    : ✅ ON
Terminal     : headless background
Agents       : 2 enabled / 7 total
Project Dir  : D:\qwen-bridge
💰 Savings   : 15 tasks · 231,500 tokens · $3.00

Tools: dispatch_task · list_agents · switch_agent · add_custom_agent
       check_agent · verify_agent_auth · get_task_report · get_savings_report
       get_project_report · qwen_bridge_status
```

### 2. list_agents
```
── Configured Agents ──

⭐ Qwen Code      🖥️ CLI  YOLO:✅  `qwen`
  Gemini CLI     🖥️ CLI  YOLO:✅  `gemini --yolo`
  Codex CLI      🖥️ CLI  YOLO:✅  `codex`  (disabled)
  Aider          🖥️ CLI  YOLO:✅  `aider --yes`  (disabled)
  OpenCode       🖥️ CLI  YOLO:✅  `opencode`  (disabled)
  Cline CLI      🖥️ CLI  YOLO:✅  `cline`  (disabled)
  Cursor AI      📋 Clip  YOLO:❌  `cursor`  (disabled)

Active: Qwen Code — switch_agent("<id>") to change
```

### 3. switch_agent
```
── Agent Switched ──

From : Qwen Code
To   : Gemini CLI (`gemini --yolo`)
YOLO : ✅ ON

✅ All dispatch_task calls will now use Gemini CLI.
```

### 4. dispatch_task / dispatch_to_qwen
```
── Task Dispatched ──

Agent    : Qwen Code
Task     : QWEN_EXAMPLE.md
Mode     : Headless Background
YOLO     : ✅ Auto-Approve ON

📄 Result Log    : QWEN_EXAMPLE_result.log
📋 Process Report : QWEN_EXAMPLE_summary.md

🚀 Agent executing in background. Check report for progress.
```

### 5. verify_agent_auth (success)
```
── Auth Verified ──

Agent   : Qwen Code
Status  : ✅ Authenticated & Ready
Command : qwen
```

### 6. verify_agent_auth (failure)
```
── Auth Failed ──

Agent  : Gemini CLI
Status : ❌ Needs Authentication

Run: gemini auth
Then: verify_agent_auth("gemini") to retry.
```

### 7. check_agent
Keep existing format but remove box chars, use simple separator.

### 8. get_savings_report
```
── 💰 Savings Report ──

Total Tasks     : 15
Tokens Saved    : ~231,500
Cost Saved      : $3.00
Avg Per Task    : ~15,433 tokens ($0.20)
```

## Implementation Method

Do NOT use a script. Edit src/index.ts DIRECTLY.
- Find each handler function
- Replace the `text: [` array with the new format
- Keep emoji (✅❌⭐💰📋🧠🔗⚡)
- Remove ALL `┌─┐│└┘├┤` characters everywhere
- Use `── Title ──` for section headers

## Rebuild, Commit

```bash
cd D:\qwen-bridge
npx tsc
git add -A
git commit -m "P1: Simplify output — minimalist headers replace Unicode boxes"
git push origin main
```

## Verify
1. `npx tsc` compiles error-free
2. All tools return clean output with `──` separators
3. No `┌─┐│└┘├┤` characters remain
4. Emoji display correctly
