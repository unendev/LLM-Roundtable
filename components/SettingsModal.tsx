import React, { useState, useEffect } from 'react';
import { X, Settings as SettingsIcon, Database, Globe, UserPlus, Trash2, RotateCcw, Save, Users } from 'lucide-react';
import { Settings, AIProvider, AgentConfig, DEFAULT_AGENTS } from '../types';

interface SettingsModalProps {
  settings: Settings;
  onSave: (s: Settings) => void;
  onClose: () => void;
  initialTab?: 'global' | 'workshop';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onSave, onClose, initialTab = 'global' }) => {
  const [localSettings, setLocalSettings] = useState<Settings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'global' | 'workshop'>(initialTab);

  // Sync activeTab if initialTab changes while open
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const addAgent = () => {
    const newAgent: AgentConfig = {
      id: crypto.randomUUID(),
      name: '新智囊',
      role: '你是一个专业的...',
      color: 'blue',
      avatar: '智',
      description: '角色职能'
    };
    setLocalSettings({ ...localSettings, customAgents: [...localSettings.customAgents, newAgent] });
  };

  const removeAgent = (id: string) => {
    setLocalSettings({ 
      ...localSettings, 
      customAgents: localSettings.customAgents.filter(a => a.id !== id) 
    });
  };

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setLocalSettings({
      ...localSettings,
      customAgents: localSettings.customAgents.map(a => a.id === id ? { ...a, ...updates } : a)
    });
  };

  const resetAgents = () => {
    if (confirm('确定要恢复默认的五维硬核角色配置吗？这会覆盖你当前的自定义设置。')) {
      setLocalSettings({ ...localSettings, customAgents: [...DEFAULT_AGENTS] });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-white/10 w-full max-w-2xl h-[85vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/2">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30">
              <SettingsIcon size={20} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">系统配置与车间</h2>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Protocol & Persona Workshop</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-white/5 bg-white/2">
          <button 
            onClick={() => setActiveTab('global')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'global' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            全局引擎设置
          </button>
          <button 
            onClick={() => setActiveTab('workshop')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'workshop' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            角色车间 ({localSettings.customAgents.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6">
          {activeTab === 'global' ? (
            <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              {/* Provider Selector */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-widest text-slate-500">模型供应商</label>
                <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-950 rounded-xl border border-white/5">
                  {(['gemini', 'openai'] as AIProvider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setLocalSettings({ ...localSettings, provider: p })}
                      className={`py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        localSettings.provider === p 
                          ? 'bg-indigo-600 text-white shadow-lg' 
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-400 uppercase font-mono">
                    <Database size={12}/> 模型 ID
                  </label>
                  <input
                    type="text"
                    value={localSettings.provider === 'gemini' ? localSettings.geminiModelId : localSettings.openaiModelId}
                    onChange={(e) => setLocalSettings({ 
                      ...localSettings, 
                      [localSettings.provider === 'gemini' ? 'geminiModelId' : 'openaiModelId']: e.target.value 
                    })}
                    placeholder={localSettings.provider === 'gemini' ? "gemini-3-pro-preview" : "gpt-4o"}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-400 uppercase font-mono">
                    <Database size={12}/> API Key
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={localSettings.provider === 'gemini' ? localSettings.geminiApiKey : localSettings.openaiApiKey}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      [localSettings.provider === 'gemini' ? 'geminiApiKey' : 'openaiApiKey']: e.target.value
                    })}
                    placeholder={localSettings.provider === 'gemini' ? "AIza..." : "sk-..."}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-slate-400 uppercase font-mono">
                    <Globe size={12}/> Base URL
                  </label>
                  <input
                    type="text"
                    value={localSettings.provider === 'gemini' ? localSettings.geminiBaseURL : localSettings.openaiBaseURL}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      [localSettings.provider === 'gemini' ? 'geminiBaseURL' : 'openaiBaseURL']: e.target.value
                    })}
                    placeholder={localSettings.provider === 'gemini' ? "https://your-proxy.example.com" : "https://your-openai-proxy.example.com/v1"}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                  />
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-[10px] text-blue-400 font-medium leading-relaxed uppercase tracking-wider">
                    注意：可按供应商分别配置模型 ID、API Key 与 Base URL（用于反向代理）。留空 API Key 时将回退到系统环境变量。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300 pb-20">
              <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">圆桌顺序：从上至下依次发言</p>
                 <button onClick={resetAgents} className="flex items-center gap-1.5 text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-widest transition-colors">
                   <RotateCcw size={10} /> 恢复默认
                 </button>
              </div>

              {localSettings.customAgents.map((agent, index) => (
                <div key={agent.id} className="p-4 rounded-2xl bg-white/2 border border-white/5 space-y-4 relative group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-grow">
                      <div className="text-[10px] font-mono text-slate-600 w-4">{index + 1}</div>
                      <input 
                        value={agent.avatar}
                        onChange={(e) => updateAgent(agent.id, { avatar: e.target.value.slice(0, 2) })}
                        className="w-10 h-10 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-center text-sm focus:border-indigo-500 outline-none"
                      />
                      <input 
                        value={agent.name}
                        onChange={(e) => updateAgent(agent.id, { name: e.target.value })}
                        placeholder="角色名称"
                        className="flex-grow bg-transparent border-b border-white/5 text-sm font-bold focus:border-indigo-500 outline-none px-1 py-1"
                      />
                      <select 
                        value={agent.color}
                        onChange={(e) => updateAgent(agent.id, { color: e.target.value })}
                        className="bg-slate-950 border border-white/10 rounded-lg text-[10px] px-2 py-1 outline-none text-slate-400"
                      >
                        <option value="blue">蓝色</option>
                        <option value="purple">紫色</option>
                        <option value="emerald">翠绿</option>
                        <option value="amber">琥珀</option>
                        <option value="rose">玫瑰</option>
                      </select>
                    </div>
                    <button onClick={() => removeAgent(agent.id)} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <input 
                      value={agent.description}
                      onChange={(e) => updateAgent(agent.id, { description: e.target.value })}
                      placeholder="职能简述 (如: 意图拆解)"
                      className="w-full bg-slate-950/50 border border-white/5 rounded-lg p-2 text-[10px] text-slate-400 focus:border-indigo-500 outline-none"
                    />
                    <textarea 
                      value={agent.role}
                      onChange={(e) => updateAgent(agent.id, { role: e.target.value })}
                      placeholder="核心人设与系统提示词..."
                      className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-3 text-xs text-slate-300 min-h-[80px] focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>
                </div>
              ))}

              <button 
                onClick={addAgent}
                className="w-full py-4 rounded-2xl border-2 border-dashed border-white/5 text-slate-500 hover:border-indigo-500/30 hover:text-indigo-400 flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-widest"
              >
                <UserPlus size={16} /> 添加智囊
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950/80 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
            <Users size={12} /> {localSettings.customAgents.length} 位智囊配置中
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-xs text-slate-400 hover:text-white transition-colors">取消</button>
            <button
              onClick={() => {
                onSave(localSettings);
                onClose();
              }}
              className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all border border-indigo-400/20"
            >
              <Save size={14} /> 保存并应用车间配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
