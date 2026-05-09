# AutoClaude Changelog

> Every version built through Claude planning + Agent execution.

---

## v6.0 — Roadmap (Planned)

**Target**: Enhanced planning + parallel execution + quality gates

### Planning Layer
- 🧠 Superpowers Skills integration (brainstorming → writing-plans → dispatch)
- 📋 Task template library (feature, bugfix, refactor, test, deploy) ← **DONE**
- 🤝 Multi-model planning review (Gemini CLI reviews Claude's plans)

### Execution Layer
- ⚡ Parallel dispatch (multiple agents simultaneously)
- 🔄 Incremental edit mode (Aider-style diff/patch)
- 🔁 Auto-retry on failure (max 3 attempts)
- 🏗️ CI integration (GitHub Actions trigger on push)

### Quality Layer
- 🔍 Diff review in verify_project ← **DONE**
- 📊 Verification report ← **DONE**
- 🔒 Security scan for secrets, SQL injection, XSS
- 🧪 Auto-test runner integration

---

## v5.5 — verify_project + Templates + Verification Report (2026-05-09)

**Planner**: Claude Code | **Executor**: Claude Code + Qwen Code

- 🩺 `verify_project` tool — 6 checks: TS, modules, orphans, dist, config, git diff
- 📏 CLAUDE.md task quality rules (7 rules from failure analysis of 15 tasks)
- 📋 5 task templates: feature, bugfix, refactor, test, deploy
- 🧠 CLAUDE.md Superpowers Skills integration guide
- 📊 VERIFICATION_REPORT.md — complete system verification
- 📈 v6.0 roadmap published in CHANGELOG
- 🐛 Fix: verify_project handler missing in index.ts (multi-file coordination bug #8)

---

## v5.5 — NPM Package + Auth Verification (2026-05-09)

**Planner**: Claude Code | **Executor**: Qwen Code

- 📦 NPM publishing config — `npm install -g autoclaude`
- 🔐 `verify_agent_auth` tool — pre-flight auth check before dispatching
- 🔍 Auto-detects auth errors, rate limits, missing installations
- 📋 Guides user through auth setup for each agent
- 🌙 Dark mode toggle on landing page — persistent preference via localStorage

---

## v5.4 — First-Run Onboarding (2026-05-09)

**Planner**: Claude Code | **Executor**: Qwen Code

- ✨ `check_agent` tool — verify CLI tools exist in PATH, auto-enable working ones
- 📋 CLAUDE.md onboarding flow — Claude guides new users through setup
- 🔍 Auto-detects Qwen Code, Gemini CLI, Codex, Aider in PATH

---

## v5.3 — Project Report System (2026-05-09)

**Planner**: Claude Code | **Executor**: Qwen Code

- 📊 `updateProjectReport()` — auto-generates PROJECT_REPORT.md after each task
- 🛠️ `get_project_report` MCP tool — read master report from Claude
- 🐛 Fix: `get_task_report` auto-finalize now works when result log has content
- 🐛 Fix: `.autoclaude_savings.json` now correctly records all tasks

---

## v5.2 — Terminal Output Beautification (2026-05-09)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🎨 All MCP tool responses now use Unicode box-drawing (┌─┐│└┘├┤)
- 😀 Emoji icons for status (✅❌⭐💰📋👥)
- 🏷️ Fix: "Label: undefined" bug — agents now show proper names
- 📊 Structured tables for list_agents, switch_agent, dispatch_task

---

## v5.1 — Bilingual Landing + Docs (2026-05-09)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🌐 i18n system — 100+ bilingual keys (EN/中文)
- 🔤 Language toggle on landing page (persists via localStorage)
- 📚 10 documentation files (5 EN + 5 ZH) in docs/
- 📖 Docs cover: Getting Started, Installation, How It Works, Agents, FAQ

---

## v5.0 — Multi-Agent System (2026-05-08)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🤖 7 built-in agents: Qwen Code, Gemini CLI, Codex CLI, Aider, OpenCode, Cline CLI, Cursor AI
- 🔄 `dispatch_task` — unified dispatch to active agent
- 📋 `list_agents` — show all agents with status
- 🔀 `switch_agent` — change active agent (persists to config.json)
- ➕ `add_custom_agent` — register any CLI tool

---

## v4.2 — Token Cost Tracking (2026-05-08)

**Planner**: Claude Code | **Executor**: Qwen Code

- 💰 Token Economics engine — estimateTokenSavings()
- 📊 Cumulative cost tracking in `.autoclaude_savings.json`
- 🛠️ `get_savings_report` MCP tool
- 📄 README_CN.md — complete Chinese documentation
- 📈 Savings display on landing page

---

## v4.1 — Standardized Output Format (2026-05-08)

**Planner**: Claude Code | **Executor**: Qwen Code

- 📋 `writeTaskSummary()` + `finalizeTaskSummary()` — structured _summary.md
- 👥 Role Separation table in every report
- 🛠️ `get_task_report` MCP tool
- 📊 Process section on landing page with role cards

---

## v4.0 — Rebrand to AutoClaude (2026-05-08)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🎨 New name: Qwen Bridge → AutoClaude
- 🌐 Landing page with glassmorphism design (Tailwind + Inter + Material Symbols)
- 📄 Polished English README with badges, mermaid diagrams
- 🚀 GitHub Pages deployed

---

## v3.0 — Headless Background + YOLO (2026-05-08)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🔇 Headless background execution (no terminal windows)
- ⚡ YOLO mode by default (auto-approve all actions)
- 📦 Direct spawn + stdin pipe (replaced inline -Command)
- 🐛 Fix: Unicode box-drawing chars broke Windows command-line parsing

---

## v2.0 — Multi-Tool Bridge (2026-05-04)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🔗 `dispatch_to_qwen` — pipe tasks to Qwen Code
- 📋 `dispatch_to_cursor` — clipboard + Cursor launch
- 🔔 Windows Toast notifications + speech synthesis
- 🖥️ Windows Terminal integration

---

## v1.0 — Initial Release (2026-05-04)

**Planner**: Claude Code | **Executor**: Qwen Code

- 🏗️ MCP Server skeleton (Model Context Protocol)
- 📄 Basic task dispatching to Qwen Code
- ⚙️ JSON configuration
