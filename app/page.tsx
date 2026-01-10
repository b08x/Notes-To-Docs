/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChatInterface, Message } from '../components/ChatInterface';
import { LivePreview } from '../components/LivePreview';
import { Creation } from '../components/CreationHistory';
import { SettingsModal } from '../components/SettingsModal';
import { UserSettings, DEFAULT_SETTINGS } from '../lib/types/settings';
import { generateKB, updateApp } from '../lib/gemini';
import { db } from '../db/storage';

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Record<string, Creation>>({});
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  
  const workerRef = useRef<Worker | null>(null);

  // Initialize Worker and Load Settings
  useEffect(() => {
    workerRef.current = new Worker('/pdf.worker.js');
    
    // Load Settings
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
        try {
            setSettings(JSON.parse(savedSettings));
        } catch (e) {
            console.error("Failed to parse settings");
        }
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleSaveSettings = (newSettings: UserSettings) => {
      setSettings(newSettings);
      localStorage.setItem('app_settings', JSON.stringify(newSettings));
  };

  // Helper to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove Data URI prefix for sending to API (if needed, but Vercel AI SDK likes data uris usually, 
          // let's strip it to be safe for our custom handling in server action if we used to, 
          // BUT wait, Vercel AI SDK 'image' part usually expects base64 or url. 
          // Our refactored generateKB expects base64 string without prefix? 
          // Let's check lib/gemini.ts... "content.push({ type: 'image', image: file.base64 })". 
          // Vercel SDK documentation says `image` property can be base64 string or URL. 
          // Often it handles Data URIs too. Let's keep stripping to match previous logic logic just in case).
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const extractPdfText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current) {
        resolve(""); 
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        workerRef.current!.onmessage = (msg) => {
            if (msg.data.type === 'SUCCESS') {
                const fullText = msg.data.payload.map((p: any) => `[Page ${p.page}] ${p.text}`).join('\n\n');
                resolve(fullText);
            } else {
                console.error("PDF Worker Error:", msg.data.error);
                resolve(""); 
            }
        };
        workerRef.current!.postMessage({ data }, [data as ArrayBuffer]);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSendMessage = async (text: string, files: File[]) => {
    const messageId = crypto.randomUUID();
    
    // 1. Add User Message
    const userMsg: Message = {
        id: messageId,
        role: 'user',
        content: text,
        timestamp: new Date(),
        attachments: files.map(f => ({ name: f.name, type: f.type }))
    };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    try {
        // 2. Prepare Payload
        const filesPayload = [];
        let extractedText = "";

        for (const file of files) {
            const base64 = await fileToBase64(file);
            filesPayload.push({
                name: file.name,
                type: file.type,
                base64: base64
            });

            if (file.type === 'application/pdf') {
                extractedText += await extractPdfText(file);
            }
        }

        // 3. Logic Branch: Update vs New
        let html = "";
        
        // If we have an active artifact and no new files, treat as refinement
        if (activeArtifactId && files.length === 0) {
            const currentArtifact = artifacts[activeArtifactId];
            if (currentArtifact) {
                // Pass settings to updateApp
                html = await updateApp(currentArtifact.html, text, settings);
                
                // Update existing artifact
                setArtifacts(prev => ({
                    ...prev,
                    [activeArtifactId]: { ...prev[activeArtifactId], html: html }
                }));
                
                // Add Assistant Response
                const assistantMsg: Message = {
                    id: crypto.randomUUID(),
                    role: 'assistant',
                    content: "I've updated the article based on your feedback.",
                    timestamp: new Date(),
                    artifactId: activeArtifactId
                };
                setMessages(prev => [...prev, assistantMsg]);
                setIsGenerating(false);
                return;
            }
        }

        // Default: Generate New
        // Pass settings to generateKB
        html = await generateKB(text, filesPayload, extractedText, settings);

        if (html) {
            const artifactId = crypto.randomUUID();
            const newArtifact: Creation = {
                id: artifactId,
                name: files[0]?.name || 'Generated Article',
                html: html,
                originalImage: filesPayload[0] ? `data:${filesPayload[0].type};base64,${filesPayload[0].base64}` : undefined,
                timestamp: new Date()
            };

            setArtifacts(prev => ({ ...prev, [artifactId]: newArtifact }));
            setActiveArtifactId(artifactId);

            const assistantMsg: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: "Here is the knowledge base article I generated for you.",
                timestamp: new Date(),
                artifactId: artifactId
            };
            setMessages(prev => [...prev, assistantMsg]);
        }

    } catch (error) {
        console.error("Generation Error:", error);
        const errorMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : "Failed to generate content. Please check your API settings."}`,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#000000] overflow-hidden flex flex-col font-sans">
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        settings={settings}
        onSave={handleSaveSettings}
      />

      <PanelGroup direction="horizontal">
        
        {/* Left Panel: Chat Interface */}
        <Panel defaultSize={40} minSize={25} maxSize={60} className="flex flex-col">
            <ChatInterface 
                messages={messages}
                artifacts={artifacts}
                onSendMessage={handleSendMessage}
                onArtifactClick={setActiveArtifactId}
                onOpenSettings={() => setIsSettingsOpen(true)}
                isGenerating={isGenerating}
                activeArtifactId={activeArtifactId}
            />
        </Panel>

        <PanelResizeHandle className="w-1.5 bg-[#18181b] hover:bg-blue-600 transition-colors flex items-center justify-center group cursor-col-resize">
            <div className="h-8 w-1 bg-zinc-600 rounded-full group-hover:bg-white/80"></div>
        </PanelResizeHandle>

        {/* Right Panel: Live Preview */}
        <Panel className="flex flex-col bg-[#0c0c0e]">
            <LivePreview 
                creation={activeArtifactId ? artifacts[activeArtifactId] : null}
                isLoading={isGenerating && !activeArtifactId} // Only show full loader if no artifact yet
                isFocused={true}
                onReset={() => setActiveArtifactId(null)}
                onUpdate={(id, html) => {
                     setArtifacts(prev => ({ ...prev, [id]: { ...prev[id], html } }));
                }}
                embedded={true}
            />
        </Panel>

      </PanelGroup>
    </div>
  );
}