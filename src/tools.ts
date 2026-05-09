export function getToolDefinitions() {
  return [
    {
      name: 'dispatch_task',
      description: 'Dispatch a task file to the currently active AI coding agent. Use list_agents to see available agents, switch_agent to change. CLI agents run in background with auto-approve. Clipboard agents copy task to clipboard.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the task markdown file.' }, description: { type: 'string', description: 'One-line task description.' } }, required: ['task_file'] },
    },
    {
      name: 'dispatch_to_qwen',
      description: 'Dispatch a task to Qwen Code specifically (legacy). Prefer dispatch_task for agent-agnostic dispatching.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string' }, description: { type: 'string' } }, required: ['task_file'] },
    },
    {
      name: 'dispatch_to_cursor',
      description: 'Dispatch a task to Cursor AI (clipboard). Copies task content to clipboard.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string' }, description: { type: 'string' } }, required: ['task_file'] },
    },
    {
      name: 'list_agents',
      description: 'List all configured AI coding agents. Shows which are enabled, disabled, and active.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'switch_agent',
      description: 'Switch the active agent. All subsequent dispatch_task calls use this agent.',
      inputSchema: { type: 'object' as const, properties: { agent: { type: 'string', description: 'Agent ID to switch to (e.g. "qwen", "gemini").' } }, required: ['agent'] },
    },
    {
      name: 'add_custom_agent',
      description: 'Register a custom CLI tool as an agent.',
      inputSchema: { type: 'object' as const, properties: { name: { type: 'string' }, command: { type: 'string' }, yolo_flag: { type: 'string' }, output_flag: { type: 'string' }, install_hint: { type: 'string' } }, required: ['name', 'command'] },
    },
    {
      name: 'check_agent',
      description: 'Verify a CLI agent command exists in PATH. Auto-enables found agents.',
      inputSchema: { type: 'object' as const, properties: { agent_id: { type: 'string' } }, required: ['agent_id'] },
    },
    {
      name: 'verify_agent_auth',
      description: 'Check if an agent can authenticate and run. Sends a test prompt.',
      inputSchema: { type: 'object' as const, properties: { agent_id: { type: 'string' } } },
    },
    {
      name: 'get_task_report',
      description: 'Read the standardized execution report (_summary.md) for a dispatched task.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string' } }, required: ['task_file'] },
    },
    {
      name: 'get_savings_report',
      description: 'Show cumulative token and cost savings across all tasks.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'get_project_report',
      description: 'Read the master project report (PROJECT_REPORT.md).',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'qwen_bridge_status',
      description: 'Check AutoClaude status and current configuration.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'verify_project',
      description: 'Verify project health: TypeScript compilation, module integrity, orphaned helper scripts. Run this after each task dispatch to ensure the project is clean.',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'check_task_status',
      description: 'Check if a dispatched task needs user intervention (auth, login, permissions, rate limits). Scans the result log for common auth/error patterns. Use this after dispatch to see if the agent needs help.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the task file.' } }, required: ['task_file'] },
    },
    {
      name: 'task_preflight',
      description: 'Run pre-flight checks BEFORE dispatching a task. Checks agent auth, git config, GitHub CLI, NPM login based on task content. Fix all issues before dispatch.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the task file to check.' } }, required: ['task_file'] },
    },
    {
      name: 'task_continue',
      description: 'Create a continuation task (_v2.md) for a task that was blocked. Reads the original task and result log, creates a focused mini-task with only the remaining steps.',
      inputSchema: { type: 'object' as const, properties: { task_file: { type: 'string', description: 'Path to the original task file.' } }, required: ['task_file'] },
    },
  ];
}
