
import { GoogleGenAI } from "@google/genai";
import { Message, AgentConfig, AgentId, WORKFLOW_PRESETS } from "../types";

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * Constructs the prompt for the current agent based on history.
 * We pass the entire transcript to the model each time to simulate a continuous multi-turn debate
 * where the model plays a specific role for the next turn.
 */
const buildPrompt = (topic: string, history: Message[], currentAgent: AgentConfig, otherAgent: AgentConfig): string => {
  let transcript = `TOPIC: "${topic}"\n\nTRANSCRIPT:\n`;

  history.forEach(msg => {
    // Determine the sender's display name
    let senderName = msg.sender === 'USER' ? 'User' : 'Unknown';
    if (msg.sender === currentAgent.id) {
      senderName = currentAgent.name;
    } else if (msg.sender === otherAgent.id) {
      senderName = otherAgent.name;
    }
    
    // We only include the public content in the transcript for the other agent to see, 
    // effectively keeping thoughts private unless we want transparency.
    // Let's keep thoughts private to the agent to simulate real "inner monologue".
    transcript += `${senderName}: ${msg.content}\n\n`;
  });

  const instruction = `
You are ${currentAgent.name}.
Your Persona: ${currentAgent.role}
The Other Participant: ${otherAgent.name} (${otherAgent.role})

GOAL: Discuss the TOPIC with the other participant. Analyze their points critically but constructively.
Your objective is to help reach a consensus or a deeper truth. 

INSTRUCTIONS:
1. **THINK FIRST**: Start by analyzing the current state of the conversation, the other agent's arguments, and your own perspective. Enclose this in <thought> tags.
2. **RESPOND**: After thinking, provide your formal response to the group. Enclose this in <response> tags.
3. **CONSENSUS CHECK**: If, and ONLY if, you believe a solid agreement has been reached and no further debate is necessary, add the tag [[CONSENSUS_REACHED]] at the very end of your <response>.

FORMAT:
<thought>
[Your internal monologue, analysis of the previous turn, and strategy formulation]
</thought>
<response>
[Your actual response to the other agent]
[[CONSENSUS_REACHED]] (Only if applicable)
</response>
`;

  return `${instruction}\n\n${transcript}\n\nIt is now your turn, ${currentAgent.name}. Speak.`;
};

export const generateAgentTurn = async (
  topic: string,
  history: Message[],
  currentAgentId: AgentId
): Promise<{ thought: string; content: string; isConsensus: boolean }> => {
  
  // Use the standard debate preset as the fallback for this legacy service
  // Fix: Resolve AGENT_A_CONFIG and AGENT_B_CONFIG errors by using WORKFLOW_PRESETS
  const agents = WORKFLOW_PRESETS[0].agents;
  const currentAgent = agents.find(a => a.id === currentAgentId) || agents[0];
  const otherAgent = agents.find(a => a.id !== currentAgentId) || agents[1];

  const prompt = buildPrompt(topic, history, currentAgent, otherAgent);

  try {
    // Fixed: Create new GoogleGenAI instance right before call to ensure latest API key usage from environment
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt, // Sending as a single turn instructions to ensure persona adherence
      config: {
        temperature: 0.7,
      }
    });

    // Fix: Use .text property instead of text() method
    const text = response.text || '';
    
    // Parse the XML-like tags
    const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/i);
    const responseMatch = text.match(/<response>([\s\S]*?)<\/response>/i);

    let thought = thoughtMatch ? thoughtMatch[1].trim() : "Thinking process not explicitly detailed.";
    let content = responseMatch ? responseMatch[1].trim() : text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();

    // Check for consensus tag
    const isConsensus = content.includes('[[CONSENSUS_REACHED]]');
    
    // Clean the tag from the display content
    content = content.replace('[[CONSENSUS_REACHED]]', '').trim();

    return {
      thought,
      content,
      isConsensus
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate agent response.");
  }
};
