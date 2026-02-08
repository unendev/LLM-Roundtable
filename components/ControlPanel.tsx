import React from 'react';
import { Send, Square, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { ConversationStatus } from '../types';

interface ControlPanelProps {
  topic: string;
  setTopic: (t: string) => void;
  status: ConversationStatus;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  hasMessages: boolean;
  isInputActive?: boolean;
  onInputActiveChange?: (active: boolean) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  topic, 
  setTopic, 
  status, 
  onStart, 
  onStop, 
  onReset,
  hasMessages,
  isInputActive = false,
  onInputActiveChange
}) => {
  const isRunning = status === ConversationStatus.ACTIVE;
  const isError = status === ConversationStatus.ERROR;
  const canInput = status !== ConversationStatus.ACTIVE;

  const shouldAutoHide = !isRunning && !isError && !isInputActive && !topic.trim();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      if (canInput && topic.trim()) onStart();
    }
  };

  return (
    <div className={`fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur-xl border-t border-white/5 p-4 md:p-6 z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] transition-all duration-300 ${
      shouldAutoHide ? 'md:translate-y-10 md:opacity-40 hover:md:translate-y-0 hover:md:opacity-100 focus-within:md:translate-y-0 focus-within:md:opacity-100' : 'opacity-100'
    }`}
      onMouseEnter={() => onInputActiveChange?.(true)}
      onMouseLeave={() => { if (!topic.trim()) onInputActiveChange?.(false); }}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-3">
        
        {status !== ConversationStatus.IDLE && (
           <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-indigo-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <span className={isRunning ? 'text-indigo-400' : 'text-slate-500'}>
                  {status === ConversationStatus.ACTIVE ? '五维同步计算中...' : '圆桌已就绪'}
                </span>
              </div>
              {!isRunning && hasMessages && (
                  <button onClick={onReset} className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1.5">
                      <RefreshCw size={10} /> 开启新博弈
                  </button>
              )}
           </div>
        )}

        <div className="flex gap-3 items-stretch">
          <div className="relative flex-grow group">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => onInputActiveChange?.(true)}
              onBlur={() => { if (!topic.trim()) onInputActiveChange?.(false); }}
              placeholder={hasMessages ? "追问或引导圆桌方向..." : "在此投下你的灵感种子（例如：该不该回老家？/ 牙疼去哪看？）"}
              disabled={!canInput}
              className="w-full bg-slate-950/80 text-slate-200 border border-white/5 rounded-2xl p-4 pr-12 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 outline-none resize-none h-16 md:h-20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner placeholder:text-slate-600"
            />
            {!hasMessages && (
              <div className="absolute right-4 top-4 text-indigo-500/30 group-focus-within:text-indigo-500/50 transition-colors">
                <Sparkles size={18} />
              </div>
            )}
            {isError && (
                <div className="absolute right-4 top-4 text-rose-500">
                    <AlertCircle size={18} />
                </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {isRunning ? (
              <button
                onClick={onStop}
                className="flex-grow px-6 bg-rose-600/90 hover:bg-rose-500 text-white font-bold rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 min-w-[100px] border border-rose-500/20"
              >
                <Square size={18} fill="currentColor" />
                <span className="text-[10px] uppercase tracking-wider">停止</span>
              </button>
            ) : (
              <button
                onClick={onStart}
                disabled={!topic.trim() && status !== ConversationStatus.PAUSED}
                className={`flex-grow px-6 ${hasMessages ? 'bg-indigo-600/90 hover:bg-indigo-500' : 'bg-blue-600/90 hover:bg-blue-500'} disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 min-w-[100px] border border-white/5`}
              >
                <Send size={18} />
                <span className="text-[10px] uppercase tracking-wider">
                  {status === ConversationStatus.PAUSED ? '下一轮博弈' : hasMessages ? '发送' : '开启圆桌'}
                </span>
              </button>
            )}
          </div>
        </div>
        <div className="text-[10px] text-center text-slate-600 font-mono tracking-tighter opacity-50">
          无需长篇大论，把思考交给圆桌。
        </div>
      </div>
    </div>
  );
};
