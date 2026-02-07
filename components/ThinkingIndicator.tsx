import React from 'react';
import { AgentConfig } from '../types';

interface ThinkingIndicatorProps {
  agent: AgentConfig;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({ agent }) => {
  return (
    <div className="flex flex-col items-start mr-auto animate-slide-up w-full max-w-2xl">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[8px] font-bold text-white bg-slate-700`}>
          {agent.avatar}
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{agent.name} is reasoning...</span>
      </div>
      
      <div className="px-5 py-4 rounded-2xl glass bg-white/5 border-white/5">
        <div className="flex space-x-1.5">
          <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot shadow-[0_0_8px_rgba(59,130,246,0.5)]`}></div>
          <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot shadow-[0_0_8px_rgba(59,130,246,0.5)]`}></div>
          <div className={`w-1.5 h-1.5 rounded-full bg-blue-500 typing-dot shadow-[0_0_8px_rgba(59,130,246,0.5)]`}></div>
        </div>
      </div>
    </div>
  );
};