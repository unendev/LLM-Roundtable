import React, { useState, Suspense } from 'react';
import { Message, AgentConfig } from '../types';
import { BrainCircuit, User, ChevronRight, ChevronDown, Sparkles, Loader2 } from 'lucide-react';

const MarkdownRenderer = React.lazy(() => import('./MarkdownRenderer'));

interface MessageBubbleProps {
  message: Message;
  currentAgents: AgentConfig[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, currentAgents }) => {
  const [userToggled, setUserToggled] = useState<boolean | null>(null);
  const isUser = message.sender === 'USER';

  const agentConfig =
    message.sender === '__mouthpiece__'
      ? ({ id: '__mouthpiece__', name: '嘴替情报官', role: '', color: 'purple', avatar: '嘴', description: '读后追问' } as AgentConfig)
      : message.sender === '__single__'
        ? ({ id: '__single__', name: '助手', role: '', color: 'blue', avatar: 'AI', description: '单对单' } as AgentConfig)
        : currentAgents.find(a => a.id === message.sender);

  const hasThought = (message.thought || '').length > 0;
  const hasContent = (message.content || '').length > 0;
  const isInitialThinking = !hasContent && !hasThought && !isUser;
  const isStreaming = !hasContent && hasThought;
  const shouldShowThought = userToggled !== null ? userToggled : (hasThought && !hasContent);

  const alignClass = isUser ? 'items-center text-center mx-auto' : 'items-start mr-auto';
  
  const getColorClasses = (color: string) => {
    const maps: Record<string, string> = {
      blue: 'bg-blue-600/10 border-blue-500/20 shadow-blue-500/5',
      purple: 'bg-purple-600/10 border-purple-500/20 shadow-purple-500/5',
      emerald: 'bg-emerald-600/10 border-emerald-500/20 shadow-emerald-500/5',
      amber: 'bg-amber-600/10 border-amber-500/20 shadow-amber-500/5',
      rose: 'bg-rose-600/10 border-rose-500/20 shadow-rose-500/5'
    };
    return maps[color] || 'bg-slate-600/10 border-slate-500/20';
  };

  const getAvatarBg = (color: string) => {
    const maps: Record<string, string> = {
      blue: 'bg-blue-600', purple: 'bg-purple-600', emerald: 'bg-emerald-600', amber: 'bg-amber-600', rose: 'bg-rose-600'
    };
    return maps[color] || 'bg-slate-600';
  };

  return (
    <div className={`group flex flex-col w-full animate-slide-up ${alignClass} max-w-3xl mb-8`}>
      {!isUser && agentConfig && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white ${getAvatarBg(agentConfig.color)} shadow-lg`}>
            {agentConfig.avatar}
          </div>
          <span className="text-xs font-bold text-slate-300 tracking-tight">{agentConfig.name}</span>
          <span className="text-[9px] text-slate-500 font-medium px-2 py-0.5 rounded-full bg-white/5 border border-white/5">{agentConfig.description}</span>
          {(isStreaming || isInitialThinking) && <Loader2 size={10} className="animate-spin text-blue-400" />}
        </div>
      )}

      <div className={`relative px-5 py-4 rounded-2xl border glass transition-all duration-300 w-full ${isUser ? 'bg-white/5 border-white/10' : getColorClasses(agentConfig?.color || 'blue')} ${isInitialThinking ? 'animate-pulse opacity-50' : ''}`}>
        {isUser && (
          <div className="flex items-center gap-2 mb-3 text-blue-400 justify-center">
             <User size={14} className="opacity-70" />
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">灵感种子 / 用户</span>
          </div>
        )}

        {isInitialThinking && (
          <div className="flex flex-col gap-3 py-2">
            <div className="h-2 w-3/4 bg-white/5 rounded-full animate-pulse"></div>
            <div className="h-2 w-1/2 bg-white/5 rounded-full animate-pulse"></div>
            <div className="h-2 w-2/3 bg-white/5 rounded-full animate-pulse"></div>
          </div>
        )}

        {hasThought && (
          <div className="mb-4">
            <button onClick={() => setUserToggled(!shouldShowThought)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500/60 hover:text-emerald-400 transition-colors">
              <BrainCircuit size={12} />
              {shouldShowThought ? '收起内心戏' : '查看思考过程'}
              {shouldShowThought ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {shouldShowThought && (
              <div className="mt-3 p-3 bg-black/40 rounded-xl border border-white/5 text-[13px] text-emerald-100/70 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                {message.thought}
              </div>
            )}
          </div>
        )}

        <div className={`prose max-w-none ${isUser ? 'text-lg font-medium text-white text-center' : 'text-slate-200'}`}>
          <Suspense fallback={<div className="text-slate-400 text-sm whitespace-pre-wrap">{message.content}</div>}>
            <MarkdownRenderer>{message.content}</MarkdownRenderer>
          </Suspense>
        </div>

        {message.isConsensusTrigger && (
          <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
              <Sparkles size={12} /> 达成共识 / 总结完成
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
