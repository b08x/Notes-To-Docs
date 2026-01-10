import React, { useState } from 'react';
import { XMarkIcon, KeyIcon, CpuChipIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { UserSettings, PROVIDERS, AIProvider, ModelTier } from '../lib/types/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<UserSettings>(settings);

  if (!isOpen) return null;

  const handleKeyChange = (provider: AIProvider, value: string) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [provider]: value }
    }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#18181b] border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5 text-blue-500" />
            AI Configuration
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Active Provider</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PROVIDERS) as AIProvider[]).map((pid) => (
                <button
                  key={pid}
                  onClick={() => setFormData({ ...formData, activeProvider: pid })}
                  className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                    formData.activeProvider === pid
                      ? 'bg-blue-500/10 border-blue-500 text-blue-400'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {PROVIDERS[pid].name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Model Tier */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Model Strategy</label>
            <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-700">
              <button
                onClick={() => setFormData({ ...formData, activeModelTier: 'fast' })}
                className={`flex-1 py-1.5 px-3 rounded text-sm transition-all ${
                  formData.activeModelTier === 'fast'
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Fast (Speed)
              </button>
              <button
                onClick={() => setFormData({ ...formData, activeModelTier: 'reasoning' })}
                className={`flex-1 py-1.5 px-3 rounded text-sm transition-all ${
                  formData.activeModelTier === 'reasoning'
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Smart (Quality)
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
               Using: <span className="text-zinc-300 font-mono">{PROVIDERS[formData.activeProvider].models[formData.activeModelTier]}</span>
            </p>
          </div>

          {/* API Keys */}
          <div className="space-y-4 pt-2">
            <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">API Keys</label>
            {(Object.keys(PROVIDERS) as AIProvider[]).map((pid) => (
              <div key={pid} className="space-y-1">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">{PROVIDERS[pid].name}</span>
                    {formData.apiKeys[pid] && <CheckBadgeIcon className="w-3 h-3 text-green-500" />}
                </div>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                  <input
                    type="password"
                    value={formData.apiKeys[pid]}
                    onChange={(e) => handleKeyChange(pid, e.target.value)}
                    placeholder={`sk-...`}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
            <button 
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
                Save Configuration
            </button>
        </div>
      </div>
    </div>
  );
};