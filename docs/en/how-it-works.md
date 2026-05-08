# How It Works

## Architecture

```
┌─────────────────┐     MCP Protocol     ┌─────────────────┐     Background Spawn    ┌─────────────────┐
│   Claude Code   │ ──────────────────→  │   AutoClaude    │ ────────────────────→  │   AI Coding CLI │
│   (Planner)     │                      │   (Dispatcher)  │                        │   (Executor)    │
│                 │ ←──────────────────  │                 │ ←────────────────────  │                 │
│  Strategy       │    Process Report    │  Validation     │     Result Log         │  File Ops       │
│  Architecture   │    Token Savings     │  Notification   │     Summary            │  Git Commits    │
│  Verification   │                      │  Cost Tracking  │                        │  Builds         │
└─────────────────┘                      └─────────────────┘                        └─────────────────┘
```

## Role Separation

| Role | System | What It Does | Token Source |
|------|--------|-------------|-------------|
| **Planner** | Claude Code | Reads codebase, designs architecture, writes task files, verifies results | Claude API |
| **Dispatcher** | AutoClaude | Validates tasks, spawns agents, captures output, generates reports | None (local) |
| **Executor** | AI CLI Agent | Edits files, runs git, builds, tests — all implementation work | Agent's own token pool |

## Dispatch Flow (CLI Agent)

```
1. Claude calls dispatch_task("MY_TASK.md")
        │
2. AutoClaude reads the task file
        │
3. Generates _summary.md header (metadata + role table)
        │
4. Wraps task with format instructions
        │
5. Writes .bat file: type task.txt | qwen -y > result.log 2>&1
        │
6. Spawns via cmd.exe start /min (headless, survives MCP restart)
        │
7. Returns "✅ Dispatched" to Claude immediately
        │
8. Agent executes in background with YOLO (auto-approve)
        │
9. Output captured to _result.log
        │
10. Claude calls get_task_report() → auto-finalizes _summary.md
```

## Token Economics

Claude only spends tokens on planning (~5K-8K per task). The heavy execution work (code editing, git, builds) is done by the agent using its own token pool. This saves **60-80% of Claude tokens** per task.

See `get_savings_report` for your cumulative savings.
