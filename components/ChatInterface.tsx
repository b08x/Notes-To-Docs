/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useEffect, useState } from 'react';
import { PaperAirplaneIcon, PaperClipIcon, DocumentTextIcon, SparklesIcon, UserCircleIcon, ComputerDesktopIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  artifactId?: string; // If this message generated an artifact
  attachments?: { name: string; type: string }[];
}

interface ChatInterfaceProps {
  messages: Message[];
  artifacts: Record<string, Creation>;
  onSendMessage: (text: string, files: File[]) => void;
  onArtifactClick: (id: string) => void;
  onOpenSettings: () => void;
  isGenerating: boolean;
  activeArtifactId: string | null;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  artifacts, 
  onSendMessage, 
  onArtifactClick,
  onOpenSettings,
  isGenerating,
  activeArtifactId
}) => {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && files.length === 0) || isGenerating) return;
    
    onSendMessage(input, files);
    setInput('');
    setFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans">
      {/* Header */}
      <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 bg-[#0c0c0e]">
        <span className="font-bold text-sm tracking-wide flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 text-blue-500" />
            Gemini Architect
        </span>
        <button 
          onClick={onOpenSettings} 
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="AI Settings"
        >
          <Cog6ToothIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6" ref={scrollRef}>
        {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 opacity-50">
                <ComputerDesktopIcon className="w-16 h-16" />
                <p>Start by uploading a note or screenshot.</p>
            </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'assistant' ? 'bg-zinc-900/50 p-4 rounded-lg -mx-4' : ''}`}>
            <div className="shrink-0 mt-1">
              {msg.role === 'user' ? (
                <UserCircleIcon className="w-8 h-8 text-zinc-600" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-2 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm text-zinc-300">
                    {msg.role === 'user' ? 'You' : 'Gemini'}
                </span>
                <span className="text-xs text-zinc-600">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Attachments (User) */}
              {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                      {msg.attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded text-xs text-zinc-300 border border-zinc-700">
                              <PaperClipIcon className="w-3 h-3" />
                              <span className="truncate max-w-[200px]">{file.name}</span>
                          </div>
                      ))}
                  </div>
              )}

              {/* Text Content */}
              {msg.content && (
                  <div className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                      {msg.content}
                  </div>
              )}

              {/* Artifact Card (Assistant) */}
              {msg.artifactId && artifacts[msg.artifactId] && (
                <div className="mt-3">
                    <button
                        onClick={() => onArtifactClick(msg.artifactId!)}
                        className={`
                            group flex items-start gap-4 w-full p-4 rounded-xl border transition-all duration-200 text-left
                            ${activeArtifactId === msg.artifactId 
                                ? 'bg-blue-500/10 border-blue-500/50 ring-1 ring-blue-500/20' 
                                : 'bg-zinc-900 border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'
                            }
                        `}
                    >
                        <div className={`p-3 rounded-lg ${activeArtifactId === msg.artifactId ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'}`}>
                            <DocumentTextIcon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className={`text-sm font-bold mb-1 ${activeArtifactId === msg.artifactId ? 'text-blue-200' : 'text-zinc-200'}`}>
                                {artifacts[msg.artifactId].name || 'Generated Article'}
                            </h4>
                            <p className="text-xs text-zinc-500 line-clamp-2">
                                Click to view the generated knowledge base article in the preview panel.
                            </p>
                        </div>
                    </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isGenerating && (
            <div className="flex gap-4 bg-zinc-900/50 p-4 rounded-lg -mx-4 animate-pulse">
                 <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <SparklesIcon className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
                    <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                </div>
            </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
        <form onSubmit={handleSubmit} className="relative">
            {files.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 flex gap-2 overflow-x-auto w-full py-1">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full text-xs text-zinc-200 border border-zinc-700 shadow-lg animate-in slide-in-from-bottom-2">
                            <PaperClipIcon className="w-3 h-3 text-blue-400" />
                            <span className="truncate max-w-[150px]">{f.name}</span>
                            <button 
                                type="button" 
                                onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                                className="ml-1 hover:text-red-400"
                            >
                                &times;
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-700 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 rounded-xl p-2 transition-all shadow-sm">
                <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Attach file"
                    disabled={isGenerating}
                >
                    <PaperClipIcon className="w-5 h-5" />
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    multiple 
                />

                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your request or upload a file..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-zinc-100 placeholder-zinc-500 max-h-32 min-h-[40px] py-2 resize-none"
                    rows={1}
                    disabled={isGenerating}
                />
                
                <button 
                    type="submit"
                    disabled={isGenerating || (!input.trim() && files.length === 0)}
                    className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                >
                    <PaperAirplaneIcon className="w-5 h-5" />
                </button>
            </div>
            <p className="text-[10px] text-zinc-600 mt-2 text-center">
                Gemini 3.0 Pro Preview • Can make mistakes.
            </p>
        </form>
      </div>
    </div>
  );
};