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
