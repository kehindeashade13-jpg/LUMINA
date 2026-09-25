import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  ChevronDown,
  RotateCcw,
  Copy,
  Check,
  Loader2,
  BookOpen,
  Maximize2,
  Minimize2,
  Bot,
  User,
  X,
} from 'lucide-react';
import { ChatMessage, StudyMaterial } from '../types/study';
import { askLuminaChat } from '../services/gemini';
import LuminaLogo from './LuminaLogo';

interface LuminaChatBarProps {
  material: StudyMaterial | null;
}

export const LuminaChatBar: React.FC<LuminaChatBarProps> = ({ material }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpandedFull, setIsExpandedFull] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset with an intelligent welcoming message on material change
  useEffect(() => {
    if (material) {
      setMessages([
        {
          id: `welcome_${material.id}_${Date.now()}`,
          role: 'assistant',
          content: `Hello! I am **LUMINA AI**, your cognitive tutor for **"${material.title}"** (*${material.subject}*).\n\nI have indexed the full document text, lesson modules, flashcards, practice questions, and quizzes. You can ask me:\n• Concept explanations, step-by-step breakdowns or analogies\n• Clarifications on any tricky option or practice question\n• General knowledge and external connections to this topic\n\nHow can I support your study flow today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setMessages([
        {
          id: `welcome_empty_${Date.now()}`,
          role: 'assistant',
          content: `Welcome to **LUMINA AI**! I am your interactive academic companion.\n\nAsk me any general study question, request active-recall strategies, or upload a document to unlock deep, context-aware analysis!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [material?.id]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = (queryText || inputQuery).trim();
    if (!textToSend || isLoading) return;

    setInputQuery('');

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const reply = await askLuminaChat(textToSend, [...messages, userMsg], material);
      const assistantMsg: ChatMessage = {
        id: 'reply_' + Date.now(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.warn('Lumina Chat error:', err);
      const errorMsg: ChatMessage = {
        id: 'reply_' + Date.now(),
        role: 'assistant',
        content: `I ran into an issue connecting with the model. If you're studying **${material?.title || 'this topic'}**, foundational principles anchor downstream effects. Feel free to rephrase or ask again!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'reset_' + Date.now(),
        role: 'assistant',
        content: material
          ? `Chat history cleared. Ready for your questions on **"${material.title}"** or any general study topic!`
          : `Chat cleared. Ask me anything!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preset suggestion chips
  const suggestions = material
    ? [
        `Summarize the key mechanisms in "${material.title}"`,
        `Give me a real-world analogy for the core concept`,
        `Explain how to answer the toughest practice question`,
        `Explain the most difficult part simply`,
      ]
    : [
        `What is the most effective spaced repetition strategy?`,
        `How do I study complex academic papers efficiently?`,
        `Explain the difference between recall and recognition`,
      ];

  // Helper to format basic markdown-style text
  const renderFormattedContent = (content: string) => {
    const paragraphs = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13px]">
        {paragraphs.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;

          // Heading 3 ###
          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-neutral-100 text-sm mt-2 mb-1 text-[#F1C40F]">
                {line.replace('### ', '')}
              </h4>
            );
          }

          // Bullet points
          if (line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const cleanLine = line.trim().replace(/^[•\-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-[#a569bd] font-bold shrink-0">•</span>
                <span>{renderInlineStyles(cleanLine)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineStyles = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-neutral-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Expanded Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[480px] bg-neutral-950/98 border border-[#34495E]/80 rounded-3xl shadow-2xl backdrop-blur-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 transition-all ${
            isExpandedFull ? 'h-[85vh] sm:w-[620px]' : 'h-[520px]'
          }`}
        >
          {/* Top Chat Bar Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#34495E]/60 bg-neutral-900/90">
            <div className="flex items-center gap-2.5 min-w-0">
              <LuminaLogo size={32} showText={false} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-neutral-100">LUMINA AI Tutor</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30">
                    Live
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 truncate">
                  {material ? `Context: ${material.title}` : 'General Academic Knowledge'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpandedFull(!isExpandedFull)}
                title={isExpandedFull ? 'Contract' : 'Expand window'}
                className="hidden sm:block p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
              >
                {isExpandedFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          {material && (
            <div className="px-4 py-1.5 bg-[#8E44AD]/15 border-b border-[#8E44AD]/25 flex items-center justify-between text-[11px] text-[#a569bd]">
              <span className="flex items-center gap-1.5 truncate">
                <BookOpen className="w-3 h-3 text-[#F1C40F] shrink-0" />
                <span className="truncate">Document: {material.title}</span>
              </span>
              <span className="text-[10px] text-[#2ECC71] shrink-0 ml-2 font-mono">
                Full Index Active
              </span>
            </div>
          )}

          {/* Scrolling Transcript */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-neutral-200">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                      isUser
                        ? 'bg-[#8E44AD] text-white'
                        : 'bg-neutral-800 text-[#F1C40F] border border-[#34495E]/60'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`relative group max-w-[85%] rounded-2xl px-4 py-2.5 shadow-md ${
                      isUser
                        ? 'bg-[#8E44AD] text-white rounded-tr-none'
                        : 'bg-neutral-900 border border-[#34495E]/70 text-neutral-200 rounded-tl-none'
                    }`}
                  >
                    {renderFormattedContent(msg.content)}

                    <div className="flex items-center justify-between gap-4 mt-1.5 pt-1 border-t border-[#34495E]/40 text-[9px] text-neutral-400 font-mono">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Copy response"
                          className="opacity-0 group-hover:opacity-100 transition text-neutral-400 hover:text-white flex items-center gap-1"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-[#2ECC71]" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-2.5 h-2.5" /> Copy
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading / Typing Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-neutral-800 text-[#F1C40F] border border-[#34495E]/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-neutral-900 border border-[#34495E]/70 rounded-2xl rounded-tl-none px-4 py-3 shadow-md flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F1C40F]" />
                  <span className="text-xs text-neutral-300 font-medium">
                    LUMINA is analyzing context & synthesizing answer...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-1.5 overflow-x-auto flex items-center gap-1.5 border-t border-[#34495E]/60 bg-neutral-950/60">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-[#8E44AD] border border-[#34495E]/60 text-[11px] text-neutral-300 hover:text-white whitespace-nowrap transition shrink-0 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Box Inside Floating Window */}
          <div className="p-3 border-t border-[#34495E]/60 bg-neutral-950">
            <div className="flex items-center gap-2 bg-neutral-900 border border-[#34495E]/60 rounded-2xl px-3 py-1.5 focus-within:border-[#8E44AD] transition">
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  material
                    ? `Ask about "${material.title}" or general topics...`
                    : 'Ask any academic or study question...'
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none py-1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isLoading}
                className="p-1.5 bg-[#8E44AD] hover:bg-[#7D3C98] disabled:bg-neutral-800 disabled:opacity-40 text-white rounded-xl transition shadow-md shadow-[#8E44AD]/25 active:scale-95 shrink-0"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F1C40F]" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Lumina AI Tutor Chat Button in Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Ask LUMINA AI Tutor"
          className="group relative flex items-center gap-2.5 p-1.5 pr-4 rounded-full bg-neutral-900/95 hover:bg-neutral-900 border border-[#34495E]/80 hover:border-[#8E44AD] shadow-2xl backdrop-blur-xl transition-all duration-200 active:scale-95"
        >
          {/* Ambient Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#8E44AD]/30 to-[#F1C40F]/25 rounded-full blur-md opacity-75 group-hover:opacity-100 transition" />

          {/* Chat Icon Badge with Logo 4 SVG */}
          <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-neutral-950 border border-[#34495E]/80 shadow-lg shadow-[#8E44AD]/25">
            {isOpen ? (
              <X className="w-5 h-5 text-[#F1C40F]" />
            ) : (
              <LuminaLogo size={28} showText={false} />
            )}
          </div>

          {/* Label */}
          <div className="relative text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-neutral-100 group-hover:text-[#a569bd] transition">
                Ask LUMINA AI
              </span>
              <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-ping" />
            </div>
            <span className="text-[10px] text-neutral-400 block -mt-0.5 truncate max-w-[120px]">
              {material ? material.subject : 'Tutor Online'}
            </span>
          </div>
        </button>
      </div>
    </>
  );
};
