# 安装指南

## 系统要求

| 要求 | 最低配置 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Windows 10 | Windows 11 |
| Node.js | 20.x | 22.x+ |
| 终端 | Windows Terminal (`wt.exe`) | 最新版 |
| 磁盘空间 | 50 MB | 100 MB |

## 安装 AutoClaude

```bash
# 克隆仓库
git clone https://github.com/zhewenzhang/AutoClaude.git
cd AutoClaude

# 安装依赖
npm install

# 构建 TypeScript
npm run build
```

## 验证构建

```bash
# 测试 MCP 服务器
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | node dist/index.js
```

你应该能看到 9 个工具列表。

## 安装 AI 编程 Agent

AutoClaude 需要至少一个 CLI Agent 来派发任务：

### Qwen Code（推荐入门）

```bash
npm install -g @qwen-code/qwen-code
```

验证：`qwen --help`

### Gemini CLI（有免费额度）

```bash
npm install -g @google/gemini-cli
```

验证：`gemini --version`

### Codex CLI（OpenAI）

```bash
npm install -g @openai/codex
```

### Aider（多模型支持）

```bash
pip install aider-chat
```

## 注册到 Claude Code

### 方案 A：全局注册（所有项目可用）

编辑 `C:\Users\<你的用户名>\.claude\settings.json`：

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

### 方案 B：项目级注册

在项目根目录创建 `.claude/settings.json`，内容同上。

## 启用 Agent

安装完成后，启用你安装的 Agent：

```bash
# 编辑 config.json，将对应 Agent 的 enabled 设为 true
# 或者让 Claude 操作：
Claude: switch_agent("gemini")
# （switch_agent 会自动启用该 Agent）
```

## 测试桥接

在 Claude Code 中：
```
Claude: 检查桥接状态
Claude: 列出可用的 Agent
Claude: 切换到 qwen
Claude: 派发一个测试任务
```
