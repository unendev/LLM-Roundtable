
import { GoogleGenAI } from "@google/genai";
import { Message, AgentConfig, AgentId, Settings } from "../types";

const buildPrompt = (topic: string, history: Message[], currentAgent: AgentConfig, allAgents: AgentConfig[], round: number): string => {
  const otherAgents = allAgents.filter(a => a.id !== currentAgent.id);
  const othersText = otherAgents.map(a => `${a.name}(${a.description})`).join('、');
  
  let transcript = `灵感种子: "${topic}"\n\n圆桌当前阶段: 第 ${round} 轮讨论\n\n【博弈纪要】:\n`;
  
  history.forEach(msg => {
    const agent = allAgents.find(a => a.id === msg.sender);
    const senderName = msg.sender === 'USER' ? '用户种子' : (agent?.name || msg.sender);
    if (msg.content) {
      transcript += `[Round ${msg.round || 0}] ${senderName}: ${msg.content}\n\n`;
    }
  });

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

export const generateTitle = async (prompt: string, settings: Settings): Promise<string> => {
  const instruction = `你是一个高级议题精炼专家。请将以下输入转化为 3-4 个字的硬核中文标题。
禁止回复任何解释或标点。严禁超过 5 个字。风格：冷峻、干练。
输入：“${prompt}”`;

  try {
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
