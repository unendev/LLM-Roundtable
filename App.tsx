import React, { useState, useEffect, useRef } from 'react';
import { Message, Conversation, ConversationStatus, Settings, DEFAULT_SETTINGS, AgentConfig } from './types';
import { ControlPanel } from './components/ControlPanel';
import { MessageBubble } from './components/MessageBubble';
import { SettingsModal } from './components/SettingsModal';
import { generateAgentTurnStream, parsePartialResponse, generateTitle } from './services/aiService';
import { Settings as SettingsIcon, Sparkles, Trash2, Plus, MessageSquare, History, PanelLeftClose, PanelLeft, Users, Loader2 } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('duomind_parallel_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentId, setCurrentId] = useState<string | null>(localStorage.getItem('duomind_parallel_current_id'));
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('duomind_parallel_settings');
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [showHistory, setShowHistory] = useState(() => window.innerWidth > 1024);
  const [status, setStatus] = useState<ConversationStatus>(ConversationStatus.IDLE);
  const [showSettings, setShowSettings] = useState(false);
  const [initialSettingsTab, setInitialSettingsTab] = useState<'global' | 'workshop'>('global');
  const [draftTopic, setDraftTopic] = useState('');
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  const activeConv = conversations.find(c => c.id === currentId);
  const messages = activeConv?.messages || [];
  const currentAgents = activeConv?.agents || settings.customAgents;

  useEffect(() => { localStorage.setItem('duomind_parallel_v1', JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { currentId ? localStorage.setItem('duomind_parallel_current_id', currentId) : localStorage.removeItem('duomind_parallel_current_id'); }, [currentId]);
  useEffect(() => { localStorage.setItem('duomind_parallel_settings', JSON.stringify(settings)); }, [settings]);

  const scrollToBottom = (force = false) => {
    if ((isAtBottom.current || force) && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: "smooth" });
    }
  };

  useEffect(() => { if (messages.length > 0) scrollToBottom(); }, [messages, status, activeAgentId]);

  const runSequentialRound = async (targetConvId: string, roundNum: number, topic: string, initialHistory: Message[]) => {
    if (!targetConvId || status === ConversationStatus.ACTIVE) return;
    setStatus(ConversationStatus.ACTIVE);
    
    const targetConv = conversations.find(c => c.id === targetConvId);
    const agents = targetConv?.agents || settings.customAgents;
    let currentHistoryForAgents = [...initialHistory];

    try {
      let consensusReached = false;

      for (const agent of agents) {
        if (consensusReached) break;
        
        setActiveAgentId(agent.id);
        const msgId = crypto.randomUUID();
        
        setConversations(prev => prev.map(c => c.id === targetConvId ? {
          ...c, messages: [...c.messages, {
            id: msgId, sender: agent.id, content: '', thought: '', timestamp: Date.now(), round: roundNum
          }]
        } : c));

        let fullText = "";
        const stream = generateAgentTurnStream(topic, currentHistoryForAgents, agent.id, agents, settings, roundNum);
        
        for await (const chunk of stream) {
          fullText += chunk;
          const { thought, content, isConsensus } = parsePartialResponse(fullText);
          
          setConversations(prev => prev.map(c => c.id === targetConvId ? {
            ...c, messages: c.messages.map(m => m.id === msgId ? { ...m, content, thought, isConsensusTrigger: isConsensus } : m)
          } : c));

          if (isConsensus) consensusReached = true;
        }

        const { thought: fThought, content: fContent } = parsePartialResponse(fullText);
        currentHistoryForAgents.push({
           id: msgId, sender: agent.id, content: fContent, thought: fThought, timestamp: Date.now(), round: roundNum
        });
      }

      setActiveAgentId(null);
      setStatus(consensusReached ? ConversationStatus.CONSENSUS_REACHED : ConversationStatus.PAUSED);
    } catch (e) {
      console.error("Round failed", e);
      setStatus(ConversationStatus.ERROR);
      setActiveAgentId(null);
    }
  };

  const handleStart = async () => {
    const topicToUse = draftTopic.trim();
    if (!topicToUse && status !== ConversationStatus.PAUSED) return;

    let targetId = currentId;
    let nextRound = 1;
    let currentTopic = activeConv?.topic || topicToUse;
    let updatedHistory: Message[] = [...messages];

    if (!targetId || !activeConv) {
      const newId = crypto.randomUUID();
      const newConv: Conversation = { 
        id: newId, 
        title: '思考中...', 
        messages: [], 
        topic: topicToUse, 
        createdAt: Date.now(), 
        updatedAt: Date.now(), 
        workflowId: settings.currentWorkflowId,
        agents: [...settings.customAgents]
      };
      setConversations(prev => [newConv, ...prev]);
      setCurrentId(newId);
      targetId = newId;
      currentTopic = topicToUse;
      generateTitle(topicToUse, settings).then(t => setConversations(prev => prev.map(c => c.id === newId ? { ...c, title: t } : c)));
    } else {
      nextRound = (messages.length > 0 ? Math.max(...messages.map(m => m.round || 0)) : 0) + 1;
    }

    if (topicToUse) {
      const userMsg: Message = { id: crypto.randomUUID(), sender: 'USER', content: topicToUse, timestamp: Date.now(), round: nextRound };
      setConversations(prev => prev.map(c => c.id === targetId ? { ...c, messages: [...c.messages, userMsg], updatedAt: Date.now() } : c));
      updatedHistory.push(userMsg);
      setDraftTopic('');
    }

    runSequentialRound(targetId as string, nextRound, currentTopic, updatedHistory);
  };

  const rounds: Record<string, Message[]> = messages.reduce((acc, msg) => {
    const r = (msg.round || 1).toString();
    if (!acc[r]) acc[r] = [];
    acc[r].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  return (
    <div className="h-screen flex relative overflow-hidden text-slate-100 bg-slate-950">
      <aside className={`fixed inset-y-0 left-0 w-72 glass bg-slate-900/98 z-[70] border-r border-white/5 transition-all duration-300 transform shadow-2xl flex flex-col ${showHistory ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2"><History size={16} className="text-blue-400" /><h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">博弈存档</h2></div>
          <button onClick={() => setShowHistory(false)} className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"><PanelLeftClose size={18} /></button>
        </div>
        
        <div className="px-4 mb-6">
          <button onClick={() => { setCurrentId(null); setStatus(ConversationStatus.IDLE); setDraftTopic(''); }} className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-400 transition-all shadow-lg shadow-indigo-500/5"><Plus size={16} /> 新博弈圆桌</button>
        </div>

        <div className="flex-grow overflow-y-auto px-4 space-y-2 pb-20">
          {conversations.map(conv => (
            <div key={conv.id} onClick={() => { if(status === ConversationStatus.ACTIVE) return; setCurrentId(conv.id); setStatus(ConversationStatus.IDLE); }} className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${currentId === conv.id ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-200 shadow-inner shadow-indigo-500/5' : 'bg-white/5 border-transparent hover:border-white/10 text-slate-400'}`}>
              <div className="flex items-start gap-3">
                {currentId === conv.id && status === ConversationStatus.ACTIVE ? (
                  <Loader2 size={14} className="mt-1 flex-none text-indigo-400 animate-spin" />
                ) : (
                  <MessageSquare size={14} className="mt-1 flex-none opacity-50" />
                )}
                <div className="flex-grow overflow-hidden">
                  <p className="text-xs font-medium truncate">{conv.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setConversations(prev => prev.filter(c => c.id !== conv.id)); if(currentId===conv.id) setCurrentId(null); }} className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <div className={`flex-grow flex flex-col relative h-full min-w-0 transition-all duration-300 ${showHistory ? 'ml-72' : 'ml-0'}`}>
        <header className="flex-none h-16 px-6 flex items-center justify-between z-50 glass border-b-white/5 shadow-2xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowHistory(!showHistory)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">{!showHistory && <PanelLeft size={20} />}</button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shadow-lg shadow-indigo-500/20"><Users size={18} className="text-white" /></div>
              <div><h1 className="text-sm font-bold tracking-tight text-white leading-none">DuoMind <span className="text-[10px] font-mono text-indigo-400/80 ml-2 border border-indigo-400/30 px-1.5 py-0.5 rounded-full">Persona Workshop</span></h1></div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setInitialSettingsTab('global'); setShowSettings(true); }} className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all">
              <div className="relative">
                <SettingsIcon size={18} />
                {settings.customAgents.length !== 5 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full"></span>}
              </div>
            </button>
          </div>
        </header>

        <main ref={scrollContainerRef} className="flex-grow overflow-y-auto px-4 scroll-smooth" onScroll={(e) => {
          const target = e.currentTarget;
          isAtBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < 100;
        }}>
          <div className="max-w-4xl mx-auto py-12">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-slide-up">
                <div className="w-20 h-20 bg-indigo-600/10 rounded-3xl flex items-center justify-center mb-8 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                  <Sparkles size={36} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">博弈圆桌：{currentAgents.length}位专家已就位</h2>
                <p className="max-w-md text-slate-400 text-sm leading-relaxed mb-8">输入你的困惑，当前圆桌的 {currentAgents.length} 位智囊将依次登场。你可以在右上角的“设置”中自定义他们的人设与人数。</p>
              </div>
            ) : (
              <div className="space-y-16">
                {(Object.entries(rounds) as [string, Message[]][]).map(([roundNum, roundMessages]) => (
                  <div key={roundNum} className="space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-px flex-grow bg-white/5"></div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-slate-500 px-3 py-1 rounded-full border border-white/5 bg-white/2">Round {roundNum} : {roundNum === '1' ? '独立解构' : '进阶博弈'}</span>
                      <div className="h-px flex-grow bg-white/5"></div>
                    </div>
                    {roundMessages.map(m => <MessageBubble key={m.id} message={m} currentAgents={currentAgents} />)}
                  </div>
                ))}
                {status === ConversationStatus.ACTIVE && activeAgentId && (
                   <div className="flex flex-col gap-4 mt-8">
                     <div className="flex items-center gap-4 mb-4">
                      <div className="h-px flex-grow bg-blue-500/10"></div>
                      <div className="flex items-center gap-2">
                         <Loader2 size={12} className="text-blue-400 animate-spin" />
                         <span className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-blue-400 animate-pulse">
                           {currentAgents.find(a => a.id === activeAgentId)?.name} 正在深度思考中...
                         </span>
                      </div>
                      <div className="h-px flex-grow bg-blue-500/10"></div>
                    </div>
                   </div>
                )}
              </div>
            )}
            <div className="h-48" />
          </div>
        </main>

        <ControlPanel 
          topic={draftTopic} setTopic={setDraftTopic} status={status} 
          onStart={handleStart} onStop={() => setStatus(ConversationStatus.PAUSED)} 
          onReset={() => {setCurrentId(null); setStatus(ConversationStatus.IDLE);}} hasMessages={messages.length > 0} 
        />
      </div>
      {showSettings && <SettingsModal settings={settings} onSave={setSettings} onClose={() => setShowSettings(false)} initialTab={initialSettingsTab} />}
    </div>
  );
}
