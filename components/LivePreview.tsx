/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useState, useRef } from 'react';
import { ArrowDownTrayIcon, PlusIcon, ViewColumnsIcon, DocumentIcon, CodeBracketIcon, XMarkIcon, SparklesIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Creation } from './CreationHistory';
import { updateApp } from '../services/gemini';

interface LivePreviewProps {
  creation: Creation | null;
  isLoading: boolean;
  isFocused: boolean;
  onReset: () => void;
  onUpdate: (id: string, newHtml: string) => void;
}

// Add type definition for the global pdfjsLib
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const LoadingStep = ({ text, active, completed }: { text: string, active: boolean, completed: boolean }) => (
    <div className={`flex items-center space-x-3 transition-all duration-500 ${active || completed ? 'opacity-100 translate-x-0' : 'opacity-30 translate-x-4'}`}>
        <div className={`w-4 h-4 flex items-center justify-center ${completed ? 'text-green-400' : active ? 'text-blue-400' : 'text-zinc-700'}`}>
            {completed ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : active ? (
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            ) : (
                <div className="w-1.5 h-1.5 bg-zinc-700 rounded-full"></div>
            )}
        </div>
        <span className={`font-mono text-xs tracking-wide uppercase ${active ? 'text-zinc-200' : completed ? 'text-zinc-400 line-through' : 'text-zinc-600'}`}>{text}</span>
    </div>
);

const PdfRenderer = ({ dataUrl }: { dataUrl: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderPdf = async () => {
      if (!window.pdfjsLib) {
        setError("PDF library not initialized");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Load the document
        const loadingTask = window.pdfjsLib.getDocument(dataUrl);
        const pdf = await loadingTask.promise;
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        
        // Calculate scale to make it look good (High DPI)
        const viewport = page.getViewport({ scale: 2.0 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        setLoading(false);
      } catch (err) {
        console.error("Error rendering PDF:", err);
        setError("Could not render PDF preview.");
        setLoading(false);
      }
    };

    renderPdf();
  }, [dataUrl]);

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500 p-6 text-center">
            <DocumentIcon className="w-12 h-12 mb-3 opacity-50 text-red-400" />
            <p className="text-sm mb-2 text-red-400/80">{error}</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        )}
        <canvas 
            ref={canvasRef} 
            className={`max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
        />
    </div>
  );
};

export const LivePreview: React.FC<LivePreviewProps> = ({ creation, isLoading, isFocused, onReset, onUpdate }) => {
    const [loadingStep, setLoadingStep] = useState(0);
    const [showSplitView, setShowSplitView] = useState(false);
    const [showEditPanel, setShowEditPanel] = useState(false);
    const [editPrompt, setEditPrompt] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Handle loading animation steps
    useEffect(() => {
        if (isLoading) {
            setLoadingStep(0);
            const interval = setInterval(() => {
                setLoadingStep(prev => (prev < 3 ? prev + 1 : prev));
            }, 2000); 
            return () => clearInterval(interval);
        } else {
            setLoadingStep(0);
        }
    }, [isLoading]);

    // Default to Split View when a new creation with an image is loaded
    useEffect(() => {
        if (creation?.originalImage) {
            setShowSplitView(true);
        } else {
            setShowSplitView(false);
        }
    }, [creation]);

    const handleExport = () => {
        if (!creation) return;
        const dataStr = JSON.stringify(creation, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_artifact.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSendEdit = async () => {
      if (!editPrompt.trim() || !creation) return;
      setIsUpdating(true);
      try {
          const newHtml = await updateApp(creation.html, editPrompt);
          onUpdate(creation.id, newHtml);
          setEditPrompt("");
      } catch (error) {
          console.error("Failed to update app:", error);
          alert("Could not update the app. Please try again.");
      } finally {
          setIsUpdating(false);
      }
    };

  return (
    <div
      className={`
        fixed z-40 flex flex-col
        rounded-lg overflow-hidden border border-zinc-800 bg-[#0E0E10] shadow-2xl
        transition-all duration-700 cubic-bezier(0.2, 0.8, 0.2, 1)
        ${isFocused
          ? 'inset-2 md:inset-4 opacity-100 scale-100'
          : 'top-1/2 left-1/2 w-[90%] h-[60%] -translate-x-1/2 -translate-y-1/2 opacity-0 scale-95 pointer-events-none'
        }
      `}
    >
      {/* Minimal Technical Header */}
      <div className="bg-[#121214] px-4 py-3 flex items-center justify-between border-b border-zinc-800 shrink-0">
        {/* Left: Controls */}
        <div className="flex items-center space-x-3 w-32">
           <div className="flex space-x-2 group/controls">
                <button 
                  onClick={onReset}
                  className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-red-500 hover:!bg-red-600 transition-colors flex items-center justify-center focus:outline-none"
                  title="Close Preview"
                >
                  <XMarkIcon className="w-2 h-2 text-black opacity-0 group-hover/controls:opacity-100" />
                </button>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-yellow-500 transition-colors"></div>
                <div className="w-3 h-3 rounded-full bg-zinc-700 group-hover/controls:bg-green-500 transition-colors"></div>
           </div>
        </div>
        
        {/* Center: Title */}
        <div className="flex items-center space-x-2 text-zinc-500">
            <CodeBracketIcon className="w-3 h-3" />
            <span className="text-[11px] font-mono uppercase tracking-wider">
                {isLoading ? 'System Processing...' : creation ? creation.name : 'Preview Mode'}
            </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end space-x-1 w-auto">
            {!isLoading && creation && (
                <>
                    <button 
                        onClick={() => {
                          setShowEditPanel(!showEditPanel);
                          // Optional: Auto-hide split view on mobile if opening edit
                          if (!showEditPanel && window.innerWidth < 768) setShowSplitView(false);
                        }}
                        title="Refine with AI"
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all border border-transparent ${showEditPanel ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="text-xs font-medium">Refine</span>
                    </button>
                    
                    <div className="w-px h-4 bg-zinc-800 mx-1"></div>

                    {creation.originalImage && (
                         <button 
                            onClick={() => setShowSplitView(!showSplitView)}
                            title={showSplitView ? "Show App Only" : "Compare with Original"}
                            className={`p-1.5 rounded-md transition-all ${showSplitView ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}`}
                        >
                            <ViewColumnsIcon className="w-4 h-4" />
                        </button>
                    )}

                    <button 
                        onClick={handleExport}
                        title="Export Artifact (JSON)"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors p-1.5 rounded-md hover:bg-zinc-800"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={onReset}
                        title="New Upload"
                        className="ml-2 flex items-center space-x-1 text-xs font-bold bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                        <PlusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">New</span>
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative w-full flex-1 bg-[#09090b] flex overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 w-full">
             {/* Technical Loading State */}
             <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 mb-6 text-blue-500 animate-spin-slow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-zinc-100 font-mono text-lg tracking-tight">Constructing Environment</h3>
                    <p className="text-zinc-500 text-sm mt-2">Interpreting visual data...</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_3s_ease-in-out_infinite] w-1/3"></div>
                </div>

                 {/* Terminal Steps */}
                 <div className="border border-zinc-800 bg-black/50 rounded-lg p-4 space-y-3 font-mono text-sm">
                     <LoadingStep text="Analyzing visual inputs" active={loadingStep === 0} completed={loadingStep > 0} />
                     <LoadingStep text="Identifying UI patterns" active={loadingStep === 1} completed={loadingStep > 1} />
                     <LoadingStep text="Generating functional logic" active={loadingStep === 2} completed={loadingStep > 2} />
                     <LoadingStep text="Compiling preview" active={loadingStep === 3} completed={loadingStep > 3} />
                 </div>
             </div>
          </div>
        ) : creation?.html ? (
          <>
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
               <div className="flex-1 flex relative">
                  {/* Split View: Left Panel (Original Image) */}
                  {showSplitView && creation.originalImage && (
                      <div className="w-full md:w-1/2 h-1/2 md:h-full border-b md:border-b-0 md:border-r border-zinc-800 bg-[#0c0c0e] relative flex flex-col shrink-0">
                          <div className="absolute top-4 left-4 z-10 bg-black/80 backdrop-blur text-zinc-400 text-[10px] font-mono uppercase px-2 py-1 rounded border border-zinc-800">
                              Input Source
                          </div>
                          <div className="w-full h-full p-6 flex items-center justify-center overflow-hidden">
                              {creation.originalImage.startsWith('data:application/pdf') ? (
                                  <PdfRenderer dataUrl={creation.originalImage} />
                              ) : (
                                  <img 
                                      src={creation.originalImage} 
                                      alt="Original Input" 
                                      className="max-w-full max-h-full object-contain shadow-xl border border-zinc-800/50 rounded"
                                  />
                              )}
                          </div>
                      </div>
                  )}

                  {/* App Preview Panel */}
                  <div className={`relative h-full bg-white transition-all duration-500 flex flex-col ${showSplitView && creation.originalImage ? 'w-full md:w-1/2 h-1/2 md:h-full' : 'w-full'}`}>
                      {isUpdating && (
                         <div className="absolute inset-0 bg-zinc-900/50 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                            <div className="bg-black/80 border border-zinc-700 rounded-lg px-6 py-4 flex items-center space-x-4 shadow-2xl">
                               <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                               <div className="text-zinc-200 text-sm font-medium">Updating Code...</div>
                            </div>
                         </div>
                      )}
                      <iframe
                          title="Gemini Live Preview"
                          srcDoc={creation.html}
                          className="w-full h-full flex-1"
                          sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
                      />
                  </div>
               </div>
            </div>

            {/* Edit Panel Sidebar */}
            {showEditPanel && (
                <div className="w-80 md:w-96 border-l border-zinc-800 bg-[#0E0E10] flex flex-col shrink-0 transition-all z-30 shadow-xl">
                    <div className="p-4 border-b border-zinc-800 bg-[#0E0E10]">
                       <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center">
                          <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                          Chat with Code
                       </h3>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto">
                       <div className="space-y-4">
                          <div className="flex gap-3">
                             <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                                <SparklesIcon className="w-4 h-4 text-blue-400" />
                             </div>
                             <div className="text-sm text-zinc-400 bg-zinc-800/50 p-3 rounded-lg rounded-tl-none border border-zinc-800">
                                <p>I can help you refine this app. Tell me what to change, add, or fix.</p>
                             </div>
                          </div>
                       </div>
                    </div>
                    <div className="p-4 border-t border-zinc-800 bg-[#0E0E10]">
                       <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                          <div className="relative">
                              <textarea 
                                 value={editPrompt}
                                 onChange={e => setEditPrompt(e.target.value)}
                                 className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 pr-10 text-sm text-zinc-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 resize-none h-24 placeholder-zinc-600"
                                 placeholder="e.g. Change the background color to dark blue..."
                                 disabled={isUpdating}
                                 onKeyDown={e => {
                                     if(e.key === 'Enter' && !e.shiftKey) {
                                         e.preventDefault();
                                         handleSendEdit();
                                     }
                                 }}
                              />
                              <button 
                                 onClick={handleSendEdit}
                                 disabled={isUpdating || !editPrompt.trim()}
                                 className="absolute bottom-3 right-3 p-1.5 bg-blue-600 rounded-md hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20"
                              >
                                 {isUpdating ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PaperAirplaneIcon className="w-3.5 h-3.5 text-white" />}
                              </button>
                          </div>
                       </div>
                       <p className="text-[10px] text-zinc-600 mt-2 text-center">
                          Powered by Gemini 3.0 Pro
                       </p>
                    </div>
                </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};