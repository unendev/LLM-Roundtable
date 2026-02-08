
import { Message, AgentConfig, Settings } from "../types";

const getSenderDisplayName = (sender: string, allAgents: AgentConfig[]) => {
  if (sender === 'USER') return '用户种子';
  if (sender === '__mouthpiece__') return '嘴替情报官';
  if (sender === '__single__') return '助手';
  const agent = allAgents.find(a => a.id === sender);
  return agent?.name || sender;
};

const buildTranscript = (topic: string, history: Message[], allAgents: AgentConfig[], round: number) => {
  let transcript = `灵感种子: "${topic}"\n\n圆桌当前阶段: 第 ${round} 轮讨论\n\n【博弈纪要】:\n`;
  history.forEach(msg => {
    const senderName = getSenderDisplayName(msg.sender, allAgents);
    if (msg.content) {
      transcript += `[Round ${msg.round || 0}] ${senderName}: ${msg.content}\n\n`;
    }
  });
  return transcript;
};

const buildPrompt = (topic: string, history: Message[], currentAgent: AgentConfig, allAgents: AgentConfig[], round: number): string => {
  const otherAgents = allAgents.filter(a => a.id !== currentAgent.id);
  const othersText = otherAgents.map(a => `${a.name}(${a.description})`).join('、');
  
  const transcript = buildTranscript(topic, history, allAgents, round);

  return `
你现在是【硬核决策圆桌】的专家：【${currentAgent.name}】。
你的核心定位：${currentAgent.role}

【圆桌语境】
种子: "${topic}"
当前圆桌成员: ${othersText}

【你的任务】
1. 始终保持你的人设，提供独特的维度。
2. 即使是第 1 轮，也要尝试深度拆解。
3. 如果是后续轮次，必须回应或质疑前人的观点。

【输出规范】
1. <thought> (英文) 你的逻辑推演和对他人观点的批判。 </thought>
2. <response> (中文) 你的圆桌发言。拒绝温情，只谈硬核干货。 </response>

只有当你是最后一位发言人且认为方案已经完美闭环时，在回复末尾标记: [[CONSENSUS_REACHED]]。

${transcript}

  请开始你的博弈，${currentAgent.name}。`;
};

const buildMouthpiecePrompt = (
  topic: string,
  history: Message[],
  allAgents: AgentConfig[],
  round: number,
  questionCount: number,
  customPrompt?: string
): string => {
  const transcript = buildTranscript(topic, history, allAgents, round);
  const extra = (customPrompt || '').trim();
  return `
你是一个“嘴替代理”（Avatar/Proxy），模拟真实用户在【读完圆桌回复】后的反应。

【核心目标】
基于圆桌已经产出的信息：
1) 指出还缺哪些关键信息（信息缺口）。
2) 只提出能显著提高决策质量的追问（深挖、可验证、可执行）。
3) 不要重复已回答的内容；不要泛泛地问“还有别的吗”。

【你必须做到】
- 问题要像人类一样：短、明确、可直接回答。
- 优先问：时间/预算/约束/风险偏好/已有尝试/关键事实（可核实）。
- 如果圆桌给了多条路线，必须问清：用户要走哪条，以及用于选择的硬阈值。

【输出规范】
 1) <thought> (英文) 你判断信息缺口的逻辑（简短）。 </thought>
 2) <response> (中文) 输出 ${questionCount} 个问题（编号 1-${questionCount}）。只输出问题本身，不要解释。 </response>

 ${extra ? `【嘴替提示词 / 额外约束】\n${extra}\n` : ''}
 
 ${transcript}
 
 现在开始输出你的追问。`;
};

const buildSingleAssistantPrompt = (history: Message[]) => {
  const transcript = history
    .filter(m => m.content)
    .map(m => {
      const sender = m.sender === 'USER' ? '用户' : (m.sender === '__single__' ? '助手' : m.sender);
      return `${sender}: ${m.content}`;
    })
    .join('\n\n');

  return `
你是一个冷静、强执行的助手。

【规则】
- 先思考，再回答。
- 追求可操作性与可验证性，不给情绪安慰。

【输出规范】
<thought> (英文，简短) </thought>
<response> (中文，给出结构化可执行建议) </response>

【对话】
${transcript}

现在轮到你回复。`;
};

export const parsePartialResponse = (text: string) => {
  const thoughtMatch = text.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/i);
  const responseMatch = text.match(/<response>([\s\S]*?)(?:<\/response>|$)/i);
  
  let thought = thoughtMatch ? thoughtMatch[1].trim() : "";
  let content = responseMatch ? responseMatch[1].trim() : "";
  
  if (text.length > 0 && !thought && !content) {
    if (text.includes('<thought>')) {
      const parts = text.split('<thought>');
      thought = parts[parts.length - 1].split('</thought>')[0].trim();
    } else if (text.includes('<response>')) {
       const parts = text.split('<response>');
       content = parts[parts.length - 1].split('</response>')[0].trim();
    } else {
      thought = text.trim();
    }
  }

  const isConsensus = content.includes('[[CONSENSUS_REACHED]]');
  const cleanContent = content.replace('[[CONSENSUS_REACHED]]', '').trim();
  
  return { thought, content: cleanContent, isConsensus };
};

export async function* generateAgentTurnStream(
  topic: string,
  history: Message[],
  currentAgentId: string,
  allAgents: AgentConfig[],
  settings: Settings,
  round: number
): AsyncGenerator<string> {
  // Lazy-load GenAI SDK to reduce initial bundle cost (improves first load time).
  const { GoogleGenAI } = await import('@google/genai');
  const currentAgent = allAgents.find(a => a.id === currentAgentId);
  if (!currentAgent) throw new Error("Agent not found");

  const prompt = buildPrompt(topic, history, currentAgent, allAgents, round);
  // Support custom base URL for reverse proxy
  const geminiBaseURL = settings.geminiBaseURL?.trim();
  const geminiApiKey = settings.geminiApiKey?.trim() || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const apiKeySource = settings.geminiApiKey?.trim() ? 'settings.geminiApiKey' : (process.env.API_KEY ? 'process.env.API_KEY' : (process.env.GEMINI_API_KEY ? 'process.env.GEMINI_API_KEY' : 'none'));
  console.debug('[DuoMind] Gemini request config', {
    baseUrl: geminiBaseURL || '(sdk default)',
    apiKeySource,
    model: settings.geminiModelId || 'gemini-3-pro-preview'
  });
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {})
  });
  
  try {
    const result = await ai.models.generateContentStream({
      model: settings.geminiModelId || 'gemini-3-pro-preview',
      contents: prompt,
      ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {}),
      config: { 
        temperature: 0.8, 
        thinkingConfig: { thinkingBudget: 16000 }
      }
    });
    for await (const chunk of result) {
      // Fix: Use .text property instead of text() method
      if (chunk.text) yield chunk.text;
    }
  } catch (e) {
    console.error("API Call failed:", e);
    throw e;
  }
}

export async function* generateMouthpieceTurnStream(
  topic: string,
  history: Message[],
  allAgents: AgentConfig[],
  settings: Settings,
  round: number,
  questionCount = 3
): AsyncGenerator<string> {
  // Lazy-load GenAI SDK to reduce initial bundle cost (improves first load time).
  const { GoogleGenAI } = await import('@google/genai');
  const prompt = buildMouthpiecePrompt(
    topic,
    history,
    allAgents,
    round,
    questionCount,
    settings.mouthpiecePrompt
  );

  const geminiBaseURL = settings.geminiBaseURL?.trim();
  const geminiApiKey = settings.geminiApiKey?.trim() || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {})
  });

  try {
    const result = await ai.models.generateContentStream({
      model: settings.geminiModelId || 'gemini-3-pro-preview',
      contents: prompt,
      ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {}),
      config: {
        temperature: 0.6,
        thinkingConfig: { thinkingBudget: 8000 }
      }
    });
    for await (const chunk of result) {
      if (chunk.text) yield chunk.text;
    }
  } catch (e) {
    console.error("Mouthpiece call failed:", e);
    throw e;
  }
}

export async function* generateSingleTurnStream(
  history: Message[],
  settings: Settings
): AsyncGenerator<string> {
  // Lazy-load GenAI SDK to reduce initial bundle cost (improves first load time).
  const { GoogleGenAI } = await import('@google/genai');
  const prompt = buildSingleAssistantPrompt(history);
  const geminiBaseURL = settings.geminiBaseURL?.trim();
  const geminiApiKey = settings.geminiApiKey?.trim() || process.env.API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {})
  });

  try {
    const result = await ai.models.generateContentStream({
      model: settings.geminiModelId || 'gemini-3-pro-preview',
      contents: prompt,
      ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {}),
      config: {
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 12000 }
      }
    });
    for await (const chunk of result) {
      if (chunk.text) yield chunk.text;
    }
  } catch (e) {
    console.error("Single call failed:", e);
    throw e;
  }
}

export const generateTitle = async (prompt: string, settings: Settings): Promise<string> => {
  const instruction = `你是一个高级议题精炼专家。请将以下输入转化为 3-4 个字的硬核中文标题。
禁止回复任何解释或标点。严禁超过 5 个字。风格：冷峻、干练。
输入：“${prompt}”`;

  try {
    // Lazy-load GenAI SDK to reduce initial bundle cost (improves first load time).
    const { GoogleGenAI } = await import('@google/genai');
    const geminiBaseURL = settings.geminiBaseURL?.trim();
    const geminiApiKey = settings.geminiApiKey?.trim() || process.env.API_KEY || process.env.GEMINI_API_KEY;
    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {})
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: instruction,
      ...(geminiBaseURL ? { httpOptions: { baseUrl: geminiBaseURL } } : {}),
    });
    // Fix: Use .text property instead of text() method
    let title = response.text?.trim() || "硬核决策";
    title = title.replace(/[#*`"“”]/g, '').slice(0, 10);
    return title;
  } catch (e) {
    return "灵感圆桌";
  }
};
