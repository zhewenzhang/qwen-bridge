# Task: Update README.md and README_CN.md to v5.2

## Context
The README files are outdated. They don't mention v5.0 multi-agent, v5.1 bilingual/docs, v5.2 beautified output, or the new CLAUDE.md discipline rules. Update both English and Chinese versions.

## Phase 1: Update README.md

### 1a. Update the tagline and badges

Change version badge to v5.2:
```
[![Version](https://img.shields.io/badge/version-5.2.0-brightgreen)]
```

### 1b. Update the tools table

Replace the current tools table with:

```markdown
| Tool | Type | Description |
|------|------|-------------|
| `dispatch_task` | **Unified** | Dispatch to the currently active agent |
| `dispatch_to_qwen` | Legacy | Dispatch specifically to Qwen Code |
| `dispatch_to_cursor` | Legacy | Copy task to clipboard for Cursor |
| `list_agents` | Agent Mgmt | List all available agents + status |
| `switch_agent` | Agent Mgmt | Switch the active agent |
| `add_custom_agent` | Agent Mgmt | Register a custom CLI tool |
| `get_task_report` | Reports | Read standardized execution report |
| `get_savings_report` | Reports | View cumulative token & cost savings |
| `qwen_bridge_status` | System | Check bridge status + config |
```

### 1c. Add discipline section after the tools table

Insert after the tools table, before "Why This Exists":

```markdown
## Project Discipline

AutoClaude enforces a strict **Planner-Executor separation** via `CLAUDE.md`:

| Role | System | Allowed Actions |
|------|--------|----------------|
| **Planner** | Claude Code | Read files, design architecture, write task files (QWEN_*.md), dispatch, verify |
| **Executor** | AI Agent (Qwen Code, etc.) | File edits, git commits, builds, deployments — all execution |

> Claude Code reads `CLAUDE.md` on startup and follows these rules automatically. Even one-line fixes go through the agent.
```

### 1d. Add multi-agent section (if not already present)

Make sure Phase 7 from the v5.0 task is present: the Multi-Agent Support section with the agent table and switching instructions.

### 1e. Update the "How Dispatch Works" section

Replace the old terminal-based flow with:
- Headless background flow (default)
- Batch file approach

### 1f. Add "Terminal Output" section

Show an example of the beautified v5.2 terminal output:

```markdown
## Terminal Output (v5.2)

All bridge responses use Unicode box-drawing and emoji for clarity:

```
┌─────────────────────────────────────────────────────┐
│              AutoClaude v5.2 — Status               │
├─────────────────────────────────────────────────────┤
│  Active Agent : Qwen Code                         │
│  YOLO Mode    : ✅ ON                              │
│  Terminal     : headless background               │
├─────────────────────────────────────────────────────┤
│  Agents       : 1 enabled / 7 total               │
│  💰 Savings  : 0 tasks · 0 tokens · $0.00        │
└─────────────────────────────────────────────────────┘
```
```

### 1g. Update the configuration section

Add `activeAgent` and `agents` to the config example. Show a minimal multi-agent config.

### 1h. Update all repository URLs

Ensure ALL URLs point to `zhewenzhang/AutoClaude` (not qwen-bridge).

---

## Phase 2: Update README_CN.md

Make the same updates as Phase 1 but in Chinese:

- 版本号 → v5.2
- 工具表更新（中文描述）
- 添加「项目纪律」章节
- 添加「终端输出」章节（v5.2 美化）
- 更新配置示例
- 更新所有 URL

Key Chinese translations:
- Project Discipline → 项目纪律
- Planner-Executor separation → 规划-执行分离
- Terminal Output → 终端输出
- "Claude reads CLAUDE.md on startup" → "Claude Code 启动时自动读取 CLAUDE.md 并遵守规则"

---

## Phase 3: Add CLAUDE.md reference in both READMEs

At the bottom of both READMEs, add:

```markdown
## Contributing

This project follows a strict **Planner-Executor workflow**. See [CLAUDE.md](CLAUDE.md) for the AI agent rules. Contributions are dispatched through the bridge — not committed directly.
```

---

## Phase 4: Commit and Push

```bash
cd D:\qwen-bridge
git add README.md README_CN.md
git commit -m "docs: Update READMEs to v5.2 — multi-agent, discipline, beautified output"
git push origin main
```
