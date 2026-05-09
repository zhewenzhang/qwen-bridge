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
      "args": ["<path-to-AutoClaude>\\dist\\index.js"],
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
