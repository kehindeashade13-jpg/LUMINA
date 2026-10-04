import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
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
  MessageSquare,
} from 'lucide-react';
import { ChatMessage, StudyMaterial } from '../types/study';
import { askLuminaChat } from '../services/gemini';
import LuminaLogo from './LuminaLogo';
import { truncateTitle } from '../utils/formatters';

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

  // Reset with a clean, badge-formatted welcoming message on material change
  useEffect(() => {
    if (material) {
      const cleanSubj = (material.subject || 'Document Studies').replace(/^\(\*|\*\)$/g, '').replace(/\*/g, '').trim();
      setMessages([
        {
          id: `welcome_${material.id}_${Date.now()}`,
          role: 'assistant',
          content: `Hello! I am **Lumina AI**, your study tutor for **"${truncateTitle(material.title, 32)}"** [badge:${cleanSubj}].\n\nI have indexed the full document text, lesson modules, flashcards, practice questions, and quizzes. You can ask me:\n• Concept explanations, step-by-step breakdowns, or analogies\n• Clarifications on any tricky option or practice question\n• General knowledge and external connections to this topic\n\nHow can I support your study flow today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setMessages([
        {
          id: `welcome_empty_${Date.now()}`,
          role: 'assistant',
          content: `Welcome to **Lumina AI**! I am your interactive academic companion.\n\nAsk me any general study question, request active-recall strategies, or upload a document to unlock deep, context-aware analysis.`,
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
        content: `I ran into an issue connecting with the model. If you're studying **${truncateTitle(material?.title, 24)}**, foundational principles anchor downstream effects. Feel free to rephrase or ask again!`,
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
    const cleanSubj = (material?.subject || 'Document Studies').replace(/^\(\*|\*\)$/g, '').replace(/\*/g, '').trim();
    setMessages([
      {
        id: 'reset_' + Date.now(),
        role: 'assistant',
        content: material
          ? `Chat history cleared. Ready for your questions on **"${truncateTitle(material.title, 28)}"** [badge:${cleanSubj}]!`
          : `Chat cleared. Ask me anything!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text.replace(/\[badge:(.*?)\]/g, '($1)'));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Quick suggestion pills with truncated document titles
  const shortDocTitle = material ? truncateTitle(material.title, 18) : '';
  const suggestions = material
    ? [
        `Summarize "${shortDocTitle}"`,
        `Give me a real-world analogy for the core concept`,
        `Explain the toughest practice question`,
        `Explain the most difficult part simply`,
      ]
    : [
        `What is the most effective spaced repetition strategy?`,
        `How do I study complex academic papers efficiently?`,
        `Explain the difference between recall and recognition`,
      ];

  // Clean inline markdown parser: strips literal (*Subject*) or [badge:Subject] into a styled badge, and renders **bold** / *italic*
  const renderInlineStyles = (text: string) => {
    // Normalize any raw (*Subject*) into [badge:Subject]
    const normalized = text.replace(/\(\*([^*]+)\*\)/g, '[badge:$1]');
    const tokenRegex = /(\[badge:[^\]]+\]|\*\*[^*]+\*\*|\*[^*]+\*)/g;
    const parts = normalized.split(tokenRegex);

    return parts.map((part, i) => {
      if (part.startsWith('[badge:') && part.endsWith(']')) {
        const badgeText = part.slice(7, -1).trim();
        return (
          <span
            key={i}
            className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 text-[11px] font-semibold mx-1 align-baseline"
          >
            {badgeText}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-[#F9FAFB]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#7C3AED]/15 text-[#A78BFA] text-[11px] font-medium mx-0.5">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  const renderFormattedContent = (content: string) => {
    const paragraphs = content.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed text-xs sm:text-[13px]">
        {paragraphs.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;

          if (line.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-[#7C3AED] uppercase tracking-wider text-xs mt-2 mb-1">
                {line.replace('### ', '')}
              </h4>
            );
          }

          if (line.trim().startsWith('• ') || line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const cleanLine = line.trim().replace(/^[•\-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-[#A78BFA] font-bold shrink-0">•</span>
                <span>{renderInlineStyles(cleanLine)}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  return (
    <>
      {/* Dark Backdrop Overlay when Chat Modal is Open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        />
      )}

      {/* Floating Expanded Chat Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Lumina Study Tutor Chat"
          className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] bg-[#161922] border border-[#262B36] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 transition-all ${
            isExpandedFull ? 'h-[85vh] sm:w-[580px]' : 'h-[520px] max-h-[82vh]'
          }`}
        >
          {/* Top Chat Bar Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#262B36] bg-[#0D0F12]">
            <div className="flex items-center gap-2.5 min-w-0">
              <LuminaLogo size={28} showText={false} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#F9FAFB]">Lumina Tutor</h3>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                    Online
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] truncate">
                  {material ? `Context: ${truncateTitle(material.title, 26)}` : 'General Academic Knowledge'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleClearChat}
                title="Clear conversation"
                className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] rounded-lg transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsExpandedFull(!isExpandedFull)}
                title={isExpandedFull ? 'Contract' : 'Expand window'}
                className="hidden sm:block p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] rounded-lg transition"
              >
                {isExpandedFull ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close chat"
                aria-label="Close chat"
                className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Context Banner */}
          {material && (
            <div className="px-4 py-2 bg-[#0D0F12]/60 border-b border-[#262B36] flex items-center justify-between gap-2 text-[11px] text-[#9CA3AF]">
              <span className="flex items-center gap-1.5 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                <span className="truncate text-[#F9FAFB] font-medium">
                  {truncateTitle(material.title, 28)}
                </span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 text-[10px] font-semibold shrink-0">
                {material.subject || 'Document Studies'}
              </span>
            </div>
          )}

          {/* Scrolling Transcript */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-[#F9FAFB]">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                      isUser
                        ? 'bg-[#7C3AED] text-[#F9FAFB]'
                        : 'bg-[#0D0F12] text-[#06B6D4] border border-[#262B36]'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`relative group max-w-[85%] rounded-2xl px-4 py-2.5 ${
                      isUser
                        ? 'bg-[#7C3AED] text-[#F9FAFB] rounded-tr-none'
                        : 'bg-[#0D0F12] border border-[#262B36] text-[#F9FAFB] rounded-tl-none'
                    }`}
                  >
                    {renderFormattedContent(msg.content)}

                    <div className="flex items-center justify-between gap-4 mt-1.5 pt-1 border-t border-white/10 text-[10px] text-[#9CA3AF] font-mono tabular-nums">
                      <span>{msg.timestamp}</span>
                      {!isUser && (
                        <button
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Copy response"
                          className="opacity-0 group-hover:opacity-100 transition text-[#9CA3AF] hover:text-[#F9FAFB] flex items-center gap-1"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-2.5 h-2.5 text-[#10B981]" /> Copied
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

            {isLoading && (
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-[#0D0F12] text-[#06B6D4] border border-[#262B36] flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-[#0D0F12] border border-[#262B36] rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#06B6D4]" />
                  <span className="text-xs text-[#9CA3AF] font-medium">
                    Synthesizing answer...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          <div className="px-4 py-2 overflow-x-auto flex items-center gap-1.5 border-t border-[#262B36] bg-[#0D0F12]">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-lg bg-[#161922] hover:bg-[#7C3AED] border border-[#262B36] hover:border-[#7C3AED] text-[11px] text-[#9CA3AF] hover:text-[#F9FAFB] whitespace-nowrap transition shrink-0 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Input Box with Clean Truncated Placeholder */}
          <div className="p-3 border-t border-[#262B36] bg-[#161922]">
            <div className="flex items-center gap-2 bg-[#0D0F12] border border-[#262B36] rounded-xl px-3 py-1.5 focus-within:border-[#7C3AED] transition">
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  material
                    ? `Ask about "${truncateTitle(material.title, 18)}"...`
                    : 'Ask a study question...'
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                className="flex-1 bg-transparent text-xs text-[#F9FAFB] placeholder-[#9CA3AF] focus:outline-none py-1"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputQuery.trim() || isLoading}
                className="p-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:bg-[#161922] disabled:opacity-40 text-[#F9FAFB] rounded-lg transition active:scale-95 shrink-0"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button — Hidden completely when Chat Modal is Open */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-40 pointer-events-auto">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open Study Tutor"
            title="Ask Study Tutor"
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] border border-[#262B36] shadow-xl transition-transform duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      )}
    </>
  );
};
