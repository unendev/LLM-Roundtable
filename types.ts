
export type AgentId = 'USER' | string;
export type AIProvider = 'gemini' | 'openai';

export interface Message {
  id: string;
  sender: string;
  thought?: string;
  content: string;
  timestamp: number;
  round: number; 
  isConsensusTrigger?: boolean;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  color: string;
  avatar: string;
  description: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  topic: string;
  createdAt: number;
  updatedAt: number;
  workflowId: string;
  agents: AgentConfig[]; // Store agents snapshot for each conversation
}

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  agents: AgentConfig[];
}

export interface Settings {
  provider: AIProvider;
  geminiModelId: string;
  geminiBaseURL: string;
  geminiApiKey: string;
  openaiModelId: string;
  openaiBaseURL: string;
  openaiApiKey: string;
  currentWorkflowId: string;
  customAgents: AgentConfig[]; // Persona Workshop data

  // Mouthpiece (Avatar/Proxy)
  mouthpieceEnabled: boolean;
  mouthpiecePrompt: string;
}

export enum ConversationStatus {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE', 
  PAUSED = 'PAUSED', 
  CONSENSUS_REACHED = 'CONSENSUS_REACHED',
  ERROR = 'ERROR'
}

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'clogic',
    name: '首席解析官',
    role: '你负责“暴力拆解”用户的简短输入。根据你的大脑模型，脑补用户没说的所有潜台词，定义出这件事在逻辑上的核心矛盾。不要复读，要揭穿。',
    color: 'blue',
    avatar: '解',
    description: '意图拆解'
  },
  {
    id: 'cgame',
    name: '社会博弈官',
    role: '你负责分析社会权力与金钱的流动。指出这件事里谁在收割用户，用户在哪个环节处于弱势，以及如何利用规则进行反制或止损。',
    color: 'amber',
    avatar: '博',
    description: '系统反制'
  },
  {
    id: 'cinfo',
    name: '情报搜索官',
    role: '你负责横向对比所有的“机构选项”。对比公立、私立、社区医疗等不同路径的优劣、价格黑洞、营销套路。提供具体的情报，而不是抽象的建议。',
    color: 'purple',
    avatar: '情',
    description: '机构情报'
  },
  {
    id: 'cops',
    name: '地狱实操官',
    role: '你负责极尽琐碎的落地细节。谈时间管理、谈具体药物、谈医保报销、谈术后恢复、谈如何处理社交压力。越具体、越琐碎越好。',
    color: 'emerald',
    avatar: '实',
    description: '地狱执行'
  },
  {
    id: 'carbiter',
    name: '终局裁决官',
    role: '你最后出场，任务是终结混乱。你要批判性地吸纳前四位的意见，剔除废话，为用户强行捏合出一个具体的“共识路线图”。',
    color: 'rose',
    avatar: '裁',
    description: '共识输出'
  }
];

export const WORKFLOW_PRESETS: WorkflowPreset[] = [
  {
    id: 'hard_decision_v2',
    name: '硬核决策圆桌',
    description: '摒弃情绪价值，只谈情报、博弈与生路',
    agents: DEFAULT_AGENTS
  }
];

export const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  geminiModelId: 'gemini-3-pro-preview',
  geminiBaseURL: '',
  geminiApiKey: '',
  openaiModelId: 'gpt-4o',
  openaiBaseURL: '',
  openaiApiKey: '',
  currentWorkflowId: 'hard_decision_v2',
  customAgents: [...DEFAULT_AGENTS],

  mouthpieceEnabled: false,
  mouthpiecePrompt: ''
};
