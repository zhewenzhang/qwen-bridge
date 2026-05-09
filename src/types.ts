export interface AgentConfig {
  name?: string;
  label?: string;
  command: string;
  type: "cli" | "clipboard";
  yoloFlag?: string;
  yoloMode?: boolean;
  outputFlag?: string;
  installHint?: string;
  enabled?: boolean;
  args?: string[];
  showTerminal?: boolean;
}

export interface BridgeConfig {
  projectDir: string;
  activeAgent: string;
  speechOnDispatch: boolean;
  speechText: string;
  showTerminal: boolean;
  agents: Record<string, AgentConfig>;
}

export interface TaskSavings {
  taskName: string;
  timestamp: string;
  claudeTokensIn: number;
  claudeTokensOut: number;
  estimatedExecutionTokensIn: number;
  estimatedExecutionTokensOut: number;
  tokensSaved: number;
  costSaved: number;
}

export const CLAUDE_PRICING = {
  opus4_7: { input: 5.00, output: 25.00 },
  opus4_5: { input: 15.00, output: 75.00 },
};
