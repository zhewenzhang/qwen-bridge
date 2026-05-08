# Agent 配置

## 内置 Agent

AutoClaude 预装了 7 个 Agent：

| Agent | 命令 | YOLO 参数 | 类型 | 免费额度 |
|-------|------|-----------|------|----------|
| Qwen Code | `qwen` | `-y` | CLI | OpenRouter |
| Gemini CLI | `gemini` | `--yolo` | CLI | 1,000 次/天 |
| Codex CLI | `codex` | `--approval-mode yolo` | CLI | ChatGPT 订阅 |
| Aider | `aider` | `--yes` | CLI | 自带 Key |
| OpenCode | `opencode` | `-y` | CLI | 75+ 提供商 |
| Cline CLI | `cline` | `-y` | CLI | 模型无关 |
| Cursor AI | `cursor` | — | 剪贴板 | Cursor 订阅 |

## 切换 Agent

在 Claude Code 中：

```
Claude: list_agents
Claude: switch_agent("gemini")
Claude: dispatch_task("TASK.md", "任务描述")
```

当前激活的 Agent 会持久保存在 config.json 中，跨会话生效。

## 添加自定义 Agent

```
Claude: add_custom_agent
  agent_id: "my-tool"
  name: "我的自定义 AI CLI"
  command: "my-ai-cli"
  yolo_flag: "--auto-yes"
  output_flag: "--text"
  install_hint: "npm install -g my-ai-cli"
```

然后切换到它：`Claude: switch_agent("my-tool")`

## 启用/禁用 Agent

编辑 `config.json`，将每个 Agent 的 `"enabled"` 设为 `true` 或 `false`。只有启用的 Agent 才会出现在 `list_agents` 中，并能通过 `switch_agent` 激活。
