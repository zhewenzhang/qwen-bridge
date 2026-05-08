# Task: Bilingual Landing Page + GitHub Documentation

## Overview
1. Add Chinese/English language toggle to `index.html` — all text switches dynamically
2. Create `docs/` directory with comprehensive tutorials (EN + ZH)
3. Link docs from landing page navbar

---

## Phase 1: Create `docs/` Tutorial Files on GitHub

Create the following directory structure under `D:\qwen-bridge\docs\`:

```
docs/
├── README.md                    # Docs index (bilingual)
├── en/
│   ├── getting-started.md       # Quick start guide
│   ├── installation.md          # Detailed install
│   ├── how-it-works.md          # Architecture & workflow
│   ├── agents.md                # Agent configuration
│   └── faq.md                   # Troubleshooting
└── zh/
    ├── getting-started.md       # 快速入门
    ├── installation.md          # 安装指南
    ├── how-it-works.md          # 工作原理
    ├── agents.md                # Agent 配置
    └── faq.md                   # 常见问题
```

### 1a. Create `docs/README.md`

```markdown
# AutoClaude Documentation

[English](#english) | [中文](#chinese)

---

## English

Welcome to AutoClaude! Choose a guide:

- [Getting Started](en/getting-started.md) — First dispatch in 5 minutes
- [Installation](en/installation.md) — Full setup walkthrough
- [How It Works](en/how-it-works.md) — Architecture & design
- [Agents](en/agents.md) — Configure CLI tools
- [FAQ](en/faq.md) — Common issues

---

## 中文

欢迎使用 AutoClaude！选择教程：

- [快速入门](zh/getting-started.md) — 5 分钟完成首次派发
- [安装指南](zh/installation.md) — 完整安装步骤
- [工作原理](zh/how-it-works.md) — 架构与设计
- [Agent 配置](zh/agents.md) — 配置 CLI 工具
- [常见问题](zh/faq.md) — 故障排除
```

### 1b. Create `docs/en/getting-started.md`

```markdown
# Getting Started

> First dispatch in 5 minutes

## Prerequisites

- **Node.js 20+** installed
- **Claude Code** installed and configured
- At least one CLI coding agent (Qwen Code, Gemini CLI, etc.)

## Step 1: Install AutoClaude

```bash
git clone https://github.com/zhewenzhang/AutoClaude.git
cd AutoClaude
npm install
npm run build
```

## Step 2: Register with Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "autoclaude": {
      "command": "node",
      "args": ["D:\\AutoClaude\\dist\\index.js"],
      "env": {}
    }
  }
}
```

Restart Claude Code.

## Step 3: Verify Installation

In Claude Code, type:

```
Check if the bridge is running
```

Claude will call `qwen_bridge_status` and report the config.

## Step 4: Choose Your Agent

```
Claude: list_agents
```

You'll see all available agents. Pick one:

```
Claude: switch_agent("qwen")
```

## Step 5: Dispatch Your First Task

```
Claude: Write a task file TEST_HELLO.md that says "Create a hello.txt file with 'Hello from AutoClaude!' inside"
Claude: Then dispatch_task("TEST_HELLO.md", "My first dispatch")
```

AutoClaude will:
1. Pipe the task to Qwen Code in the background
2. Send a Windows notification
3. Write results to `TEST_HELLO_result.log`
4. Generate a process report at `TEST_HELLO_summary.md`

## Step 6: Check Results

```
Claude: get_task_report("TEST_HELLO.md")
```

## Next Steps

- [Installation Guide](installation.md) — Detailed setup
- [How It Works](how-it-works.md) — Understand the architecture
- [Agent Configuration](agents.md) — Add your own tools
```

### 1c. Create `docs/en/installation.md`

```markdown
# Installation Guide

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Windows 10 | Windows 11 |
| Node.js | 20.x | 22.x+ |
| Terminal | Windows Terminal (`wt.exe`) | Latest |
| Disk Space | 50 MB | 100 MB |

## Install AutoClaude

```bash
# Clone the repository
git clone https://github.com/zhewenzhang/AutoClaude.git
cd AutoClaude

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Verify Build

```bash
# Test the MCP server
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

You should see a list of 9 tools.

## Install AI Coding Agents

AutoClaude needs at least one CLI agent to dispatch tasks to:

### Qwen Code (Recommended Starter)

```bash
npm install -g @qwen-code/qwen-code
```

Verify: `qwen --help`

### Gemini CLI (Free Tier Available)

```bash
npm install -g @google/gemini-cli
```

Verify: `gemini --version`

### Codex CLI (OpenAI)

```bash
npm install -g @openai/codex
```

### Aider (Multi-Model)

```bash
pip install aider-chat
```

## Register with Claude Code

### Option A: Global Registration (all projects)

Edit `C:\Users\<YourName>\.claude\settings.json`:

```json
{
  "mcpServers": {
    "autoclaude": {
      "command": "node",
      "args": ["D:\\AutoClaude\\dist\\index.js"],
      "env": {}
    }
  }
}
```

### Option B: Project-Specific

Create `.claude/settings.json` in your project root with the same content.

## Enable the Agent

After installation, enable the agent you installed:

```bash
# Edit config.json and set enabled: true for your agent
# OR use Claude:
Claude: switch_agent("gemini")
# (switch_agent auto-enables the agent)
```

## Test the Bridge

In Claude Code:
```
Claude: Check the bridge status
Claude: List available agents
Claude: Switch to qwen
Claude: Dispatch a test task
```
```

### 1d. Create `docs/en/how-it-works.md`

```markdown
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
```

### 1e. Create `docs/en/agents.md`

```markdown
# Agent Configuration

## Built-in Agents

AutoClaude ships with 7 pre-configured agents:

| Agent | Command | YOLO Flag | Type | Free Tier |
|-------|---------|-----------|------|-----------|
| Qwen Code | `qwen` | `-y` | CLI | OpenRouter |
| Gemini CLI | `gemini` | `--yolo` | CLI | 1,000 req/day |
| Codex CLI | `codex` | `--approval-mode yolo` | CLI | ChatGPT sub |
| Aider | `aider` | `--yes` | CLI | BYO key |
| OpenCode | `opencode` | `-y` | CLI | 75+ providers |
| Cline CLI | `cline` | `-y` | CLI | Model-agnostic |
| Cursor AI | `cursor` | — | Clipboard | Cursor sub |

## Switching Agents

In Claude Code:

```
Claude: list_agents
Claude: switch_agent("gemini")
Claude: dispatch_task("TASK.md", "Description")
```

The active agent persists across sessions (stored in config.json).

## Adding Custom Agents

```
Claude: add_custom_agent
  agent_id: "my-tool"
  name: "My Custom AI CLI"
  command: "my-ai-cli"
  yolo_flag: "--auto-yes"
  output_flag: "--text"
  install_hint: "npm install -g my-ai-cli"
```

Then switch to it: `Claude: switch_agent("my-tool")`

## Enabling/Disabling Agents

Edit `config.json` and set `"enabled": true/false` for each agent. Only enabled agents appear in `list_agents` and can be activated with `switch_agent`.
```

### 1f. Create `docs/en/faq.md`

```markdown
# FAQ

## Q: Why does the result log show 0 bytes while the task is running?

The `.bat` file approach buffers output. The log file will populate when the agent completes. Use `get_task_report` to check — it auto-finalizes the summary when the result log has content.

## Q: Can I dispatch to multiple agents simultaneously?

Yes. Each `dispatch_task` call spawns an independent background process. You can dispatch Task A to Qwen Code and Task B to Gemini CLI at the same time.

## Q: How do I stop a running task?

Find the `cmd.exe` process in Task Manager associated with the task and terminate it. Or restart the agent CLI tool.

## Q: The agent says "command not found"

The agent's CLI tool isn't installed or not in PATH. Install it using the hint from `list_agents`, then enable it in config.json.

## Q: Can I use this on macOS/Linux?

AutoClaude is designed for Windows (Windows Terminal, Toast notifications, PowerShell). It may work on other platforms with modifications to the terminal and notification systems.

## Q: How are tokens counted?

Token counts are conservative estimates based on task file size and result log size. Actual Claude token usage depends on conversation context. The savings report uses Claude Opus 4.7 API pricing ($5/1M input, $25/1M output).
```

### 1g. Create Chinese versions (`docs/zh/*.md`)

For each English file, create a Chinese equivalent. Translate the content naturally. Key translations:

- `getting-started.md` → `快速入门.md`
- `installation.md` → `安装指南.md`
- `how-it-works.md` → `工作原理.md`
- `agents.md` → `Agent 配置.md`
- `faq.md` → `常见问题.md`

The Chinese docs should be complete, well-formatted, and use natural technical Chinese. Not just Google Translate — rewrite for Chinese developer audience.

---

## Phase 2: Bilingual Landing Page (`index.html`)

### 2a. Add i18n system

Add this JavaScript before `</head>`:

```html
<script>
// i18n — AutoClaude Bilingual System
const I18N = {
  en: {
    nav_features: 'Features',
    nav_how: 'How It Works',
    nav_process: 'Process',
    nav_savings: 'Savings',
    nav_agents: 'Agents',
    nav_docs: 'Docs',
    nav_github: 'GitHub',
    nav_start: 'Get Started',
    hero_line1: 'Plan with Claude.',
    hero_line2: 'Execute Everywhere.',
    hero_sub: 'One Claude. Infinite execution. Zero token waste.',
    hero_cta: 'Get Started',
    hero_github: 'View on GitHub',
    how_title: 'How It Works',
    how_sub: 'Claude plans the strategy. AutoClaude dispatches tasks. Your chosen AI agent executes — all in the background, all automatic.',
    how_step1_title: '1. Claude Plans',
    how_step1_desc: 'Claude Code analyzes the problem, designs the architecture, and writes a detailed task file with step-by-step instructions.',
    how_step2_title: '2. AutoClaude Dispatches',
    how_step2_desc: 'With one MCP tool call, AutoClaude pipes the task to your chosen agent. Headless. Auto-approve. Instant.',
    how_step3_title: '3. Agent Executes',
    how_step3_desc: 'Your AI coding agent runs the task independently using its own token pool. Claude is free for the next planning session.',
    process_title: 'Standardized Process',
    process_sub: 'Every task produces a structured report. Clear role separation between Claude (planning) and agent (execution).',
    process_tier_a: 'Strategy',
    process_tier_b: 'Bridge',
    process_tier_c: 'Execution',
    process_claude: 'Claude Code',
    process_claude_desc: 'Architecture design, task planning, code review, and final verification. Zero execution — planning only.',
    process_ac: 'AutoClaude',
    process_ac_desc: 'Validates tasks, dispatches to agents, captures output, generates standardized reports with cost tracking.',
    process_agent: 'AI Agent',
    process_agent_desc: 'File operations, git commits, builds, deployments. Autonomous execution with auto-approve.',
    savings_title: 'Save 60-80% of Your Claude Tokens',
    savings_sub: 'Every task dispatched through AutoClaude is automatically tracked. Claude only spends tokens on planning — your agent handles the heavy execution.',
    savings_t1_title: '~7K',
    savings_t1_desc: 'Claude tokens per task (planning only)',
    savings_t2_title: '~25K',
    savings_t2_desc: 'Equivalent tokens saved (vs. all-Claude execution)',
    savings_t3_title: '~$0.30',
    savings_t3_desc: 'Cost saved per task (Opus 4.7 pricing)',
    savings_footer: 'Based on Claude Opus 4.7 API pricing ($5.00/1M input, $25.00/1M output). Actual savings vary by task complexity.',
    agents_title: 'Choose Your Agent',
    agents_sub: 'AutoClaude supports any terminal-invocable AI coding CLI. Pick the tool that matches your subscription plan.',
    agents_custom: 'Custom',
    agents_custom_desc: 'Your Tool',
    agents_custom_hint: 'add_custom_agent',
    agents_footer: "Don't see your tool? Use add_custom_agent in Claude to register any CLI tool.",
    features_title: 'Features',
    features_sub: 'Everything you need to multiply your coding throughput without multiplying your token costs.',
    f1_title: 'Headless Background',
    f1_desc: 'No terminal windows. No pop-ups. Your agent runs silently in the background while you keep working.',
    f2_title: 'Auto-Approve',
    f2_desc: 'Zero confirmation prompts. Your agent auto-approves all actions for fully autonomous execution.',
    f3_title: 'Multi-Agent',
    f3_desc: '7 built-in agents. Switch freely between Qwen Code, Gemini CLI, Codex, Aider, and more.',
    f4_title: 'Clipboard Bridge',
    f4_desc: 'GUI tools like Cursor are supported too. Task content copied to clipboard automatically.',
    f5_title: 'Windows Native',
    f5_desc: 'Toast notifications, speech synthesis, headless background spawn — built for Windows 10/11.',
    f6_title: 'Token Tracking',
    f6_desc: 'Automatic cost calculation per task. Cumulative savings report. Know exactly what you save.',
    quote: '"The smartest way to code with AI isn\'t using one model for everything — it\'s using the right model for each job. Claude plans. Your agent executes. Everyone wins."',
    getting_title: 'Getting Started',
    getting_sub: 'Three commands to connect Claude Code to any AI coding CLI.',
    step1_label: '# 1. Clone and install',
    step2_label: '# 2. Add to Claude Code settings',
    step3_label: '# 3. Restart Claude Code and dispatch',
    footer_feat: 'Features',
    footer_how: 'How It Works',
    footer_github: 'GitHub',
    footer_docs: 'Docs',
    footer_copyright: '© 2026 AutoClaude. Built with Claude Code + AI Coding Agents.',
  },
  zh: {
    nav_features: '功能',
    nav_how: '工作原理',
    nav_process: '流程',
    nav_savings: '节省',
    nav_agents: 'Agent',
    nav_docs: '文档',
    nav_github: 'GitHub',
    nav_start: '开始使用',
    hero_line1: 'Claude 做规划。',
    hero_line2: '任意 Agent 做执行。',
    hero_sub: '一个 Claude。无限执行。零 Token 浪费。',
    hero_cta: '开始使用',
    hero_github: '在 GitHub 查看',
    how_title: '工作原理',
    how_sub: 'Claude 规划策略。AutoClaude 派发任务。你选择的 AI Agent 在后台静默执行 — 全自动，零交互。',
    how_step1_title: '1. Claude 规划',
    how_step1_desc: 'Claude Code 分析问题，设计架构，编写详细的任务文件，包含分步执行指令。',
    how_step2_title: '2. AutoClaude 派发',
    how_step2_desc: '一次 MCP 工具调用，AutoClaude 将任务通过管道传给 Agent。后台静默，自动批准，即刻完成。',
    how_step3_title: '3. Agent 执行',
    how_step3_desc: 'AI Agent 使用自己的 Token 池独立执行任务。Claude 释放，继续下一个规划。',
    process_title: '标准化流程',
    process_sub: '每次任务生成结构化报告。Claude（规划）和 Agent（执行）角色清晰分离。',
    process_tier_a: '战略层',
    process_tier_b: '桥接层',
    process_tier_c: '执行层',
    process_claude: 'Claude Code',
    process_claude_desc: '架构设计、任务规划、代码审查、最终验证。只做规划，不参与执行。',
    process_ac: 'AutoClaude',
    process_ac_desc: '验证任务、派发 Agent、捕获输出、生成标准化报告和成本追踪。',
    process_agent: 'AI Agent',
    process_agent_desc: '文件操作、Git 提交、构建部署。全自动执行，无需确认。',
    savings_title: '节省 60-80% 的 Claude Token',
    savings_sub: '每次派发自动追踪。Claude 只花 Token 做规划 — Agent 用自己的 Token 池处理繁重工作。',
    savings_t1_title: '~7K',
    savings_t1_desc: '每次任务 Claude Token 消耗（仅规划）',
    savings_t2_title: '~25K',
    savings_t2_desc: '等效节省 Token（对比全 Claude 执行）',
    savings_t3_title: '~$0.30',
    savings_t3_desc: '每次任务节省成本（Opus 4.7 定价）',
    savings_footer: '基于 Claude Opus 4.7 API 定价（$5.00/1M 输入, $25.00/1M 输出）。实际节省因任务复杂度而异。',
    agents_title: '选择你的 Agent',
    agents_sub: 'AutoClaude 支持任何可在终端调用的 AI 编程 CLI。选择匹配你订阅方案的工具。',
    agents_custom: '自定义',
    agents_custom_desc: '你的工具',
    agents_custom_hint: 'add_custom_agent',
    agents_footer: '找不到你的工具？在 Claude 中使用 add_custom_agent 注册任意 CLI 工具。',
    features_title: '功能特性',
    features_sub: '大幅提升编码吞吐量，同时不增加 Token 成本。',
    f1_title: '后台静默',
    f1_desc: '无终端窗口。无弹窗。Agent 在后台静默运行，不影响你的工作流。',
    f2_title: '全自动执行',
    f2_desc: '零确认提示。Agent 自动批准所有操作，实现完全自主执行。',
    f3_title: '多 Agent 支持',
    f3_desc: '7 个内置 Agent。自由切换 Qwen Code、Gemini CLI、Codex、Aider 等。',
    f4_title: '剪贴板桥接',
    f4_desc: 'GUI 工具如 Cursor 同样支持。任务内容自动复制到剪贴板。',
    f5_title: 'Windows 原生',
    f5_desc: 'Toast 通知、语音合成、后台静默启动 — 专为 Windows 10/11 打造。',
    f6_title: 'Token 追踪',
    f6_desc: '每次任务自动计算成本。累计节省报告。清楚了解节省了多少。',
    quote: '「AI 编程最高效的方式不是用一个模型做所有事 — 而是用对的模型做对的事。Claude 规划。Agent 执行。人人受益。」',
    getting_title: '快速开始',
    getting_sub: '三行命令，将 Claude Code 连接到任意 AI 编程 CLI。',
    step1_label: '# 1. 克隆并安装',
    step2_label: '# 2. 添加到 Claude Code 设置',
    step3_label: '# 3. 重启 Claude Code 并派发任务',
    footer_feat: '功能',
    footer_how: '工作原理',
    footer_github: 'GitHub',
    footer_docs: '文档',
    footer_copyright: '© 2026 AutoClaude. Claude Code 规划 + AI Agent 执行。',
  }
};

let currentLang = localStorage.getItem('autoclaude_lang') || 
  (navigator.language.startsWith('zh') ? 'zh' : 'en');

function t(key) {
  return I18N[currentLang]?.[key] || I18N.en[key] || key;
}

function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('autoclaude_lang', lang);
  updateAllText();
  updateLangToggle();
}

function updateLangToggle() {
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = currentLang === 'zh' ? 'EN' : '中文';
}

function updateAllText() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text) el.textContent = text;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const text = t(key);
    if (text) el.setAttribute('placeholder', text);
  });
  // Update nav active state
  document.querySelectorAll('[data-i18n-nav]').forEach(el => {
    const key = el.getAttribute('data-i18n-nav');
    el.textContent = t(key);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateAllText();
  updateLangToggle();
});
</script>
```

### 2b. Add language toggle button to navbar

In the navbar, add this button right before the "Get Started" button:

```html
<button id="lang-toggle" onclick="switchLang(currentLang === 'zh' ? 'en' : 'zh')" 
  class="text-sm font-medium text-on-surface-variant hover:text-primary-container transition-all duration-300 px-3 py-1.5 rounded-lg hover:bg-white/10">
  EN
</button>
```

### 2c. Add Docs link to navbar

Add after the "Agents" link:

```html
<a class="text-on-surface-variant hover:text-primary-container transition-all duration-300" href="https://github.com/zhewenzhang/AutoClaude/tree/main/docs" target="_blank" data-i18n-nav="nav_docs">Docs</a>
```

### 2d. Update ALL text elements with data-i18n attributes

Go through EVERY section of index.html and replace hardcoded English text with `data-i18n="key"` attributes. Key sections:

- Navbar links → `data-i18n-nav="nav_*"`
- Hero heading/paragraph/buttons → `data-i18n="hero_*"`
- How It Works → `data-i18n="how_*"`
- Process section → `data-i18n="process_*"`
- Savings section → `data-i18n="savings_*"`
- Agents section → `data-i18n="agents_*"`
- Features section → `data-i18n="f*_*"`
- Quote → `data-i18n="quote"`
- Getting Started → `data-i18n="getting_*"`
- Footer → `data-i18n-nav="footer_*"`

IMPORTANT: The agent names (Qwen Code, Gemini CLI, etc.) and technical terms (YOLO, CLI, Opus 4.7) should NOT be translated — they're proper nouns.

The `data-i18n-nav` attribute is for navigational elements and uses `updateAllText()` for updating. The `data-i18n` attribute is for body content.

### 2e. Add CSS for language toggle animation

```css
#lang-toggle {
    min-width: 48px;
    text-align: center;
    transition: all 0.2s ease;
}
#lang-toggle:hover {
    background: rgba(49, 168, 255, 0.1);
    color: #31a8ff;
}
```

---

## Phase 3: Build and Deploy

### 3a. No TypeScript rebuild needed for doc/HTML changes

These changes only affect markdown files and index.html. No `npx tsc` needed.

### 3b. Commit and Push

```bash
cd D:\qwen-bridge
git add -A
git commit -m "v5.1: Bilingual landing page (EN/中文) + comprehensive GitHub docs"
git push origin main
```

---

## Phase 4: Verify

1. `docs/` folder visible at https://github.com/zhewenzhang/AutoClaude/tree/main/docs
2. Landing page shows language toggle button
3. Clicking "中文" switches all text to Chinese
4. Clicking "EN" switches back to English
5. Navbar "Docs" link opens GitHub docs
6. Language preference persists across page reloads (localStorage)
7. Chinese README linked correctly

---

## Checklist
- [ ] 13 markdown files created in docs/
- [ ] index.html i18n system added
- [ ] Language toggle button added
- [ ] All text elements have data-i18n attributes
- [ ] Docs nav link added
- [ ] CSS for toggle added
- [ ] Committed and pushed
