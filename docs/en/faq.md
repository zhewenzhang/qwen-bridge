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
