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
