# 快速入门

> 5 分钟完成首次任务派发

## 前置条件

- 已安装 **Node.js 20+**
- 已安装并配置 **Claude Code**
- 至少一个 CLI 编程 Agent（Qwen Code、Gemini CLI 等）

## 第一步：安装 AutoClaude

```bash
git clone https://github.com/zhewenzhang/AutoClaude.git
cd AutoClaude
npm install
npm run build
```

## 第二步：注册到 Claude Code

在 `~/.claude/settings.json` 中添加：

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

重启 Claude Code。

## 第三步：验证安装

在 Claude Code 中输入：

```
检查桥接状态
```

Claude 会调用 `qwen_bridge_status` 并报告配置信息。

## 第四步：选择你的 Agent

```
Claude: list_agents
```

你将看到所有可用的 Agent。选择一个：

```
Claude: switch_agent("qwen")
```

## 第五步：派发第一个任务

```
Claude: 写一个任务文件 TEST_HELLO.md，内容是"创建 hello.txt 文件，里面写入 'Hello from AutoClaude!'"
Claude: 然后 dispatch_task("TEST_HELLO.md", "我的第一次派发")
```

AutoClaude 将会：
1. 在后台将任务传给 Qwen Code
2. 发送 Windows 通知
3. 将结果写入 `TEST_HELLO_result.log`
4. 在 `TEST_HELLO_summary.md` 生成流程报告

## 第六步：查看结果

```
Claude: get_task_report("TEST_HELLO.md")
```

## 下一步

- [安装指南](installation.md) — 详细安装步骤
- [工作原理](how-it-works.md) — 理解架构设计
- [Agent 配置](agents.md) — 添加你自己的工具
