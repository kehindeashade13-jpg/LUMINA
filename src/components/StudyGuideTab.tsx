import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Printer,
  Download,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Share2,
  Bot,
  User,
  RotateCcw,
} from 'lucide-react';
import { StudyMaterial, ChatMessage } from '../types/study';
import { askLuminaChat } from '../services/gemini';

interface StudyGuideTabProps {
  material: StudyMaterial | null;
  onNavigateToTab: (tab: 'flashcards' | 'quiz' | 'documents') => void;
}

export const StudyGuideTab: React.FC<StudyGuideTabProps> = ({ material, onNavigateToTab }) => {
  const [glossarySearch, setGlossarySearch] = useState('');
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  // Conversational Chat state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  useEffect(() => {
    // Reset or seed chat when material changes
    if (material) {
      setChatHistory([
        {
          id: 'guide_init',
          role: 'assistant',
          content: `Hi! I have loaded all notes, glossaries, and original text for **"${material.title}"**.\n\nAsk me to clarify any complex concepts, test your understanding, or answer broader questions connecting to ${material.subject}!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } else {
      setChatHistory([]);
    }

    // Stop speech synthesis when material changes or unmounts
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    }
  }, [material?.id]);

  if (!material) {
    return (
      <div className="p-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50">
        <Sparkles className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-200">No documents uploaded yet</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Upload a study document (PDF, text notes, or markdown) to generate AI-powered study guides.
        </p>
        <button
          onClick={() => onNavigateToTab('documents')}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition"
        >
          Upload Document
        </button>
      </div>
    );
  }

  // Audio Playback
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlayingAudio) {
      if (isPausedAudio) {
        window.speechSynthesis.resume();
        setIsPausedAudio(false);
      } else {
        window.speechSynthesis.pause();
        setIsPausedAudio(true);
      }
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${material.title}. Subject: ${material.subject}. Executive Summary: ${material.summary}. Key points: ${material.keyPoints.join('. ')}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setIsPausedAudio(false);
      };
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
      setIsPausedAudio(false);
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    }
  };

  // Export Markdown
  const handleExportMarkdown = () => {
    let md = `# ${material.title}\n\n`;
    md += `**Subject:** ${material.subject}\n`;
    md += `**Date:** ${new Date(material.createdAt).toLocaleDateString()}\n\n`;
    md += `## Executive Summary\n${material.summary}\n\n`;
    md += `## Key Takeaways\n`;
    material.keyPoints.forEach((kp) => {
      md += `* ${kp}\n`;
    });
    md += `\n## Glossary of Terms\n`;
    material.glossary.forEach((g) => {
      md += `* **${g.term}:** ${g.definition}\n`;
    });
    md += `\n## Detailed Notes\n`;
    material.sections.forEach((s) => {
      md += `### ${s.title}\n${s.content}\n\n`;
      if (s.keyTakeaways && s.keyTakeaways.length > 0) {
        md += `**Key Takeaways:**\n`;
        s.keyTakeaways.forEach((t) => {
          md += `* ${t}\n`;
        });
        md += `\n`;
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${material.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_study_guide.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy glossary term
  const handleCopyTerm = (term: string, def: string) => {
    navigator.clipboard.writeText(`${term}: ${def}`);
    setCopiedTerm(term);
    setTimeout(() => setCopiedTerm(null), 1500);
  };

  // Toggle section collapse
  const toggleSection = (idx: number) => {
    setCollapsedSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Conversational AI Assistant Handler
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuestion.trim() || isAskingAi) return;

    const question = chatQuestion.trim();
    setChatQuestion('');

    const userMsg: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setIsAskingAi(true);

    try {
      const reply = await askLuminaChat(question, [...chatHistory, userMsg], material);
      const assistantMsg: ChatMessage = {
        id: 'reply_' + Date.now(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatHistory((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.warn('Lumina Chat error in study guide:', err);
      setChatHistory((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `In "${material.title}", remember that: ${material.keyPoints[0]}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleCopyChatMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleClearGuideChat = () => {
    setChatHistory([
      {
        id: 'reset_' + Date.now(),
        role: 'assistant',
        content: `Chat history cleared. What would you like to review in **"${material.title}"**?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const filteredGlossary = material.glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      g.definition.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Title & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {material.subject}
            </span>
            <span className="text-xs text-neutral-400">
              {material.estimatedReadTimeMinutes || 5} min read • {material.sections.length} core sections
            </span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100">{material.title}</h1>
          <p className="text-xs text-neutral-400">
            Synthesized AI Study Guide • Last updated {new Date(material.updatedAt).toLocaleDateString()}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio TTS */}
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border ${
              isPlayingAudio
                ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span>
              {isPlayingAudio ? (isPausedAudio ? 'Resume Audio' : 'Pause Audio') : 'Listen Audio'}
            </span>
          </button>
          {isPlayingAudio && (
            <button
              onClick={handleStopAudio}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 rounded-xl transition"
              title="Stop Audio"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}

          {/* Export Markdown */}
          <button
            onClick={handleExportMarkdown}
            title="Download formatted markdown notes"
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export MD
          </button>

          {/* Quick study jump */}
          <button
            onClick={() => onNavigateToTab('flashcards')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95"
          >
            <span>Practice Cards ({material.flashcards.length})</span>
          </button>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/30 border border-indigo-500/20 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
            Executive Summary
          </h2>
        </div>
        <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-line font-normal">
          {material.summary}
        </p>
      </div>

      {/* Key Takeaways Grid */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800">
        <h3 className="text-sm font-bold text-neutral-100 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-indigo-400" />
          High-Yield Key Takeaways
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {material.keyPoints.map((point, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 hover:border-neutral-700 transition"
            >
              <div className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-mono font-bold">
                {index + 1}
              </div>
              <p className="text-xs text-neutral-300 leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Study Note Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-100">Core Subject Breakdown</h3>
          <span className="text-xs text-neutral-400">{material.sections.length} Comprehensive Modules</span>
        </div>

        {material.sections.map((section, idx) => {
          const isCollapsed = collapsedSections[idx];
          return (
            <div
              key={idx}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 overflow-hidden transition"
            >
              <button
                onClick={() => toggleSection(idx)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-850/50 transition border-b border-transparent data-[open=true]:border-neutral-800"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-400 font-mono text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-neutral-200">{section.title}</h4>
                </div>
                <div className="text-neutral-500 hover:text-neutral-300">
                  {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </div>
              </button>

              {!isCollapsed && (
                <div className="p-6 pt-2 space-y-4">
                  <div className="text-xs text-neutral-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {section.content}
                  </div>

                  {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                    <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/30">
                      <div className="text-xs font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> Essential Concepts to Retain:
                      </div>
                      <ul className="space-y-1.5 text-xs text-neutral-300">
                        {section.keyTakeaways.map((takeaway, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2">
                            <span className="text-indigo-400 shrink-0 font-bold">•</span>
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Glossary Section */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-neutral-100">Key Terminology Glossary</h3>
            <p className="text-xs text-neutral-400">
              Essential vocabulary and operational definitions for {material.subject}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search terms..."
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {filteredGlossary.map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-indigo-300 group-hover:text-indigo-200 transition">
                    {item.term}
                  </span>
                  <button
                    onClick={() => handleCopyTerm(item.term, item.definition)}
                    title="Copy definition"
                    className="opacity-0 group-hover:opacity-100 text-neutral-500 hover:text-neutral-300 transition"
                  >
                    {copiedTerm === item.term ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{item.definition}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Conversational Chat Section */}
      <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100">Interactive LUMINA AI Chat</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Document Context Active
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Ask document questions, request analogies, or explore external concepts
              </p>
            </div>
          </div>

          <button
            onClick={handleClearGuideChat}
            title="Clear chat history"
            className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrolling Chat Transcript */}
        <div className="max-h-80 overflow-y-auto space-y-3 p-4 rounded-xl bg-neutral-950 border border-neutral-800">
          {chatHistory.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-neutral-800 text-indigo-400 border border-neutral-700'
                  }`}
                >
                  {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>

                <div
                  className={`relative group max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-xs leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-tl-none whitespace-pre-wrap'
                  }`}
                >
                  <div>{msg.content}</div>

                  <div className="flex items-center justify-between gap-4 mt-1.5 pt-1 border-t border-neutral-800/40 text-[9px] text-neutral-500 font-mono">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopyChatMessage(msg.id, msg.content)}
                        title="Copy response"
                        className="opacity-0 group-hover:opacity-100 transition text-neutral-400 hover:text-white flex items-center gap-1"
                      >
                        {copiedMsgId === msg.id ? (
                          <>
                            <Check className="w-2.5 h-2.5 text-emerald-400" /> Copied
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

          {isAskingAi && (
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-neutral-800 text-indigo-400 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center gap-2 text-xs text-neutral-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>LUMINA is analyzing context and formulating response...</span>
              </div>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            `Explain the core mechanism with an analogy`,
            `What is the most high-yield concept for an exam?`,
            `Give me a multiple choice practice problem`,
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setChatQuestion(prompt);
              }}
              className="px-2.5 py-1 rounded-full bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] text-neutral-400 hover:text-neutral-200 transition shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAskQuestion} className="flex items-center gap-2">
          <input
            type="text"
            placeholder={`Ask about "${material.title}" or any external study question...`}
            value={chatQuestion}
            onChange={(e) => setChatQuestion(e.target.value)}
            disabled={isAskingAi}
            className="flex-1 px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            disabled={isAskingAi || !chatQuestion.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 shadow-md shadow-indigo-600/20 active:scale-95"
          >
            {isAskingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
