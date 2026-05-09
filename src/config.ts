import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BridgeConfig, AgentConfig } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

export const DEFAULT_AGENTS: Record<string, AgentConfig> = {
  qwen: { name: 'Qwen Code', label: 'Qwen Code', command: 'qwen', type: 'cli', yoloFlag: '-y', yoloMode: true, outputFlag: '--output-format text', installHint: 'npm install -g @qwen-code/qwen-code', showTerminal: false, enabled: true },
  gemini: { name: 'Gemini CLI', label: 'Gemini CLI', command: 'gemini', type: 'cli', yoloFlag: '--yolo', yoloMode: true, outputFlag: '', installHint: 'npm install -g @google/gemini-cli', showTerminal: false, enabled: false },
  codex: { name: 'Codex CLI', label: 'Codex CLI', command: 'codex', type: 'cli', yoloFlag: '--approval-mode yolo', yoloMode: true, outputFlag: '', installHint: 'npm install -g @openai/codex', showTerminal: false, enabled: false },
  aider: { name: 'Aider', label: 'Aider', command: 'aider', type: 'cli', yoloFlag: '--yes', yoloMode: true, outputFlag: '', installHint: 'pip install aider-chat', showTerminal: false, enabled: false },
  opencode: { name: 'OpenCode', label: 'OpenCode', command: 'opencode', type: 'cli', yoloFlag: '-y', yoloMode: true, outputFlag: '', installHint: 'npm install -g @opencode-ai/cli', showTerminal: false, enabled: false },
  cline: { name: 'Cline CLI', label: 'Cline CLI', command: 'cline', type: 'cli', yoloFlag: '-y', yoloMode: true, outputFlag: '', installHint: 'npm install -g @cline/cli', showTerminal: false, enabled: false },
  cursor: { name: 'Cursor AI', label: 'Cursor AI', command: 'cursor', type: 'clipboard', yoloFlag: '', yoloMode: false, outputFlag: '', installHint: 'https://cursor.com', showTerminal: false, enabled: false },
};

export function loadConfig(): BridgeConfig {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error(`Config not found: ${CONFIG_PATH}`);
  const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  const savedAgents = raw.agents || {};
  const agents: Record<string, AgentConfig> = { ...DEFAULT_AGENTS };
  for (const [id, cfg] of Object.entries(savedAgents)) {
    agents[id] = { ...agents[id], ...(cfg as Partial<AgentConfig>) } as AgentConfig;
  }
  for (const [id, a] of Object.entries(agents)) {
    if (!a.label) a.label = a.name || id;
  }
  return {
    projectDir: raw.projectDir || process.cwd(),
    activeAgent: raw.activeAgent || 'qwen',
    speechOnDispatch: raw.speechOnDispatch ?? true,
    speechText: raw.speechText || 'AutoClaude task dispatched',
    showTerminal: raw.showTerminal ?? false,
    agents,
  };
}

export function saveConfig(config: BridgeConfig): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    projectDir: config.projectDir,
    activeAgent: config.activeAgent,
    speechOnDispatch: config.speechOnDispatch,
    speechText: config.speechText,
    showTerminal: config.showTerminal,
    agents: config.agents,
  }, null, 2), 'utf-8');
}

export function getActiveAgent(config: BridgeConfig): AgentConfig {
  const agent = config.agents[config.activeAgent];
  if (agent && agent.enabled) return agent;
  for (const [id, a] of Object.entries(config.agents)) {
    if (a.enabled && a.type === 'cli') { config.activeAgent = id; saveConfig(config); return a; }
  }
  throw new Error('No enabled CLI agent found.');
}
