# 常见问题

## Q：为什么任务运行期间结果日志显示 0 字节？

`.bat` 文件方式会缓冲输出。日志文件会在 Agent 完成后写入内容。使用 `get_task_report` 检查 — 当结果日志有内容时，它会自动完成摘要报告。

## Q：可以同时派发给多个 Agent 吗？

可以。每次 `dispatch_task` 调用都会启动一个独立的后台进程。你可以同时将任务 A 派发给 Qwen Code，任务 B 派发给 Gemini CLI。

## Q：如何停止正在运行的任务？

在任务管理器中找到与该任务关联的 `cmd.exe` 进程并终止它。或者重启 Agent 的 CLI 工具。

## Q：Agent 提示 "command not found"

该 Agent 的 CLI 工具未安装或未添加到 PATH。使用 `list_agents` 中的提示安装它，然后在 config.json 中启用。

## Q：可以在 macOS/Linux 上使用吗？

AutoClaude 专为 Windows 设计（Windows Terminal、Toast 通知、PowerShell）。修改终端和通知系统后，可能在其他平台上也能运行。

## Q：Token 是如何计算的？

Token 数量是基于任务文件大小和结果日志大小的保守估算。Claude 实际 Token 消耗取决于对话上下文。节省报告使用 Claude Opus 4.7 API 定价（$5/1M 输入，$25/1M 输出）。
