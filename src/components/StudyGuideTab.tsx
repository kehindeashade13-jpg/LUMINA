import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Download,
  Search,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StudyMaterial, PracticeQuestion } from '../types/study';

interface StudyGuideTabProps {
  material: StudyMaterial | null;
  onNavigateToTab: (tab: 'flashcards' | 'quiz' | 'documents') => void;
}

export const StudyGuideTab: React.FC<StudyGuideTabProps> = ({ material, onNavigateToTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'modules' | 'practice' | 'glossary'>('modules');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceDifficulty, setPracticeDifficulty] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [understoodQuestions, setUnderstoodQuestions] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Stop speech synthesis when material changes or unmounts
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    }
    setRevealedAnswers({});
    setUnderstoodQuestions({});
  }, [material?.id]);

  if (!material) {
    return (
      <div className="p-16 text-center border border-dashed border-[#34495E]/60 rounded-2xl bg-neutral-950/50">
        <Sparkles className="w-10 h-10 text-[#F1C40F] mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-100">No documents uploaded yet</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
          Upload a study document (PDF, text notes, or markdown) to generate an exhaustive AI study guide.
        </p>
        <button
          onClick={() => onNavigateToTab('documents')}
          className="mt-4 px-5 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-lg shadow-[#8E44AD]/25"
        >
          Upload Document
        </button>
      </div>
    );
  }

  const practiceQuestions: PracticeQuestion[] = material.practiceQuestions || [];

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
    md += `## High-Yield Key Principles\n`;
    material.keyPoints.forEach((kp) => {
      md += `* ${kp}\n`;
    });
    md += `\n## Step-by-Step Lessons & Deep Dives\n`;
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
    if (practiceQuestions.length > 0) {
      md += `\n## 30 Practice Questions & Model Answers\n`;
      practiceQuestions.forEach((pq, i) => {
        md += `### Q${i + 1}: ${pq.question}\n**Model Answer:**\n${pq.sampleAnswer}\n\n`;
      });
    }
    md += `\n## Glossary of Terms\n`;
    material.glossary.forEach((g) => {
      md += `* **${g.term}:** ${g.definition}\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${material.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_master_guide.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleSection = (idx: number) => {
    setCollapsedSections((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleRevealAnswer = (id: string) => {
    setRevealedAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleUnderstood = (id: string) => {
    setUnderstoodQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter Practice Questions
  const filteredPractice = practiceQuestions.filter((pq) => {
    const matchSearch =
      pq.question.toLowerCase().includes(practiceSearch.toLowerCase()) ||
      pq.sampleAnswer.toLowerCase().includes(practiceSearch.toLowerCase()) ||
      (pq.topic && pq.topic.toLowerCase().includes(practiceSearch.toLowerCase()));
    const matchDiff = practiceDifficulty === 'all' || pq.difficulty === practiceDifficulty;
    return matchSearch && matchDiff;
  });

  const understoodCount = Object.values(understoodQuestions).filter(Boolean).length;

  const filteredGlossary = material.glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      g.definition.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Title & Top Metadata Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              {material.subject}
            </span>
            <span className="text-xs text-neutral-400">
              {material.estimatedReadTimeMinutes || 8} min read • {material.sections.length} Lesson Modules
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#34495E]/40 text-[#F1C40F] border border-[#34495E]/60 font-semibold">
              ★ 30 Cards • 30 Questions • 30 Quizzes
            </span>
          </div>
          <h1 className="text-2xl font-bold text-neutral-100">{material.title}</h1>
          <p className="text-xs text-neutral-400">
            Exhaustive High-Yield Study Suite • Processed all paragraphs, subtopics & formulas
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Audio TTS */}
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border ${
              isPlayingAudio
                ? 'bg-[#F1C40F]/10 border-[#F1C40F]/50 text-[#F1C40F]'
                : 'bg-neutral-800 hover:bg-neutral-700 border-[#34495E]/60 text-neutral-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-[#F1C40F]" />
            <span>
              {isPlayingAudio ? (isPausedAudio ? 'Resume Audio' : 'Pause Audio') : 'Audio Reader'}
            </span>
          </button>
          {isPlayingAudio && (
            <button
              onClick={handleStopAudio}
              className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-red-400 rounded-xl transition border border-[#34495E]/60"
              title="Stop Audio"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}

          {/* Export Markdown */}
          <button
            onClick={handleExportMarkdown}
            title="Download full Markdown study guide"
            className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-[#34495E]/60 text-neutral-200 rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Export MD
          </button>

          {/* Quick study jump to cards (Deep Violet #8E44AD) */}
          <button
            onClick={() => onNavigateToTab('flashcards')}
            className="px-4 py-2 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#8E44AD]/30 transition active:scale-95"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3D Cards ({material.flashcards.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#34495E]/50 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('modules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'modules'
                ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4 text-[#F1C40F]" />
            <span>Step-by-Step Lessons & Summary</span>
          </button>

          <button
            onClick={() => setActiveSubTab('practice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'practice'
                ? 'bg-[#8E44AD] text-white shadow-md shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-[#F1C40F]" />
            <span>30 Practice Questions</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-900/80 text-[#F1C40F] font-bold">
              {practiceQuestions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('glossary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeSubTab === 'glossary'
                ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-transparent'
            }`}
          >
            <FileText className="w-4 h-4 text-[#F1C40F]" />
            <span>Key Concepts & Glossary ({material.glossary.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: Step-by-Step Lessons & Executive Summary */}
      {activeSubTab === 'modules' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Executive Summary Card */}
          <div className="p-6 rounded-2xl bg-neutral-900 border border-[#34495E]/60 space-y-4 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
                <Sparkles className="w-4 h-4 text-[#F1C40F]" />
              </div>
              <h2 className="text-base font-bold text-neutral-100">Exhaustive Executive Summary</h2>
            </div>
            <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {material.summary}
            </div>

            {/* High-Yield Key Takeaways */}
            <div className="pt-4 border-t border-[#34495E]/50">
              <h3 className="text-xs font-bold text-[#F1C40F] uppercase tracking-wider mb-3">
                High-Yield Key Principles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {material.keyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-neutral-950/70 border border-[#34495E]/50 text-xs text-neutral-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chronological Step-by-Step Lesson Modules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-100">
                  Chronological Step-by-Step Lesson Modules
                </h2>
                <p className="text-xs text-neutral-400">
                  Granular breakdowns covering every paragraph, formula, and subtopic
                </p>
              </div>
              <span className="text-xs text-[#F1C40F] font-mono font-semibold">
                {material.sections.length} Detailed Modules
              </span>
            </div>

            {material.sections.map((section, idx) => {
              const isCollapsed = collapsedSections[idx];
              return (
                <div
                  key={idx}
                  className="rounded-2xl bg-neutral-900 border border-[#34495E]/60 overflow-hidden shadow-sm transition hover:border-[#8E44AD]/60"
                >
                  <button
                    onClick={() => toggleSection(idx)}
                    className="w-full p-5 flex items-center justify-between text-left bg-neutral-900/90 hover:bg-neutral-850 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#8E44AD] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-[#8E44AD]/30">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-neutral-100">{section.title}</h3>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="p-6 pt-2 border-t border-[#34495E]/40 space-y-4">
                      <div className="text-xs sm:text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </div>

                      {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-[#34495E]/50">
                          <span className="text-[10px] font-bold text-[#F1C40F] uppercase tracking-wider block mb-2">
                            Module Takeaways
                          </span>
                          <ul className="space-y-1.5 text-xs text-neutral-300">
                            {section.keyTakeaways.map((takeaway, tIdx) => (
                              <li key={tIdx} className="flex items-start gap-2">
                                <span className="text-[#8E44AD] font-bold">•</span>
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
        </div>
      )}

      {/* SUBTAB 2: 30 Practice Questions */}
      {activeSubTab === 'practice' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Filter and Stats Header */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <span>30 Analytical Practice Questions</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 font-bold">
                    {practiceQuestions.length} Total
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Open-ended, conceptual, and situational questions with complete step-by-step model answers.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-300 bg-neutral-950 px-3 py-1.5 rounded-xl border border-[#34495E]/60 shrink-0 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2ECC71]" />
                <span>
                  <strong className="text-[#2ECC71]">{understoodCount}</strong> / {practiceQuestions.length} Understood
                </span>
              </div>
            </div>

            {/* Search and Difficulty Filter Controls */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Search practice questions or topics..."
                  value={practiceSearch}
                  onChange={(e) => setPracticeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#8E44AD] transition"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                {(['all', 'basic', 'intermediate', 'advanced'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setPracticeDifficulty(diff)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition shrink-0 ${
                      practiceDifficulty === diff
                        ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/25'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-[#34495E]/60'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Practice Questions List */}
          <div className="space-y-3.5">
            {filteredPractice.length > 0 ? (
              filteredPractice.map((pq, idx) => {
                const isRevealed = Boolean(revealedAnswers[pq.id]);
                const isUnderstood = Boolean(understoodQuestions[pq.id]);

                return (
                  <div
                    key={pq.id}
                    className={`p-5 rounded-2xl bg-neutral-900 border transition ${
                      isUnderstood ? 'border-[#2ECC71]/50 bg-neutral-900/90 shadow-sm shadow-[#2ECC71]/10' : 'border-[#34495E]/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-[#34495E]/40 text-neutral-200 border border-[#34495E]/60">
                            Q{idx + 1}
                          </span>
                          {pq.topic && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
                              {pq.topic}
                            </span>
                          )}
                          {pq.difficulty && (
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-md capitalize ${
                                pq.difficulty === 'advanced'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : pq.difficulty === 'intermediate'
                                  ? 'bg-[#F1C40F]/10 text-[#F1C40F] border border-[#F1C40F]/20'
                                  : 'bg-[#2ECC71]/10 text-[#2ECC71] border border-[#2ECC71]/20'
                              }`}
                            >
                              {pq.difficulty}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-neutral-100 pt-1 leading-snug">
                          {pq.question}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopyText(pq.id, `${pq.question}\n\nModel Answer:\n${pq.sampleAnswer}`)}
                          title="Copy question and answer"
                          className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
                        >
                          {copiedKey === pq.id ? (
                            <Check className="w-3.5 h-3.5 text-[#2ECC71]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleUnderstood(pq.id)}
                          title={isUnderstood ? 'Mark as needing review' : 'Mark as understood'}
                          className={`p-1.5 rounded-lg transition ${
                            isUnderstood
                              ? 'bg-[#2ECC71]/20 text-[#2ECC71] border border-[#2ECC71]/30'
                              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Reveal Answer Toggle */}
                    <div className="pt-3 mt-3 border-t border-[#34495E]/50">
                      <button
                        onClick={() => toggleRevealAnswer(pq.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#a569bd] hover:text-[#8E44AD] transition"
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide Model Answer
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Reveal Model Answer
                          </>
                        )}
                      </button>

                      {isRevealed && (
                        <div className="mt-2.5 p-4 rounded-xl bg-neutral-950 border border-[#34495E]/60 text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap animate-in fade-in duration-150">
                          <span className="text-[10px] font-bold text-[#F1C40F] uppercase tracking-wider block mb-1">
                            Model Solution & Analysis
                          </span>
                          {pq.sampleAnswer}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-neutral-900 border border-[#34495E]/60 rounded-2xl text-neutral-400 text-xs">
                No practice questions match your filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Key Concepts & Glossary */}
      {activeSubTab === 'glossary' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-lg">
            <div>
              <h2 className="text-base font-bold text-neutral-100">
                Key Concepts & Technical Glossary
              </h2>
              <p className="text-xs text-neutral-400">
                {material.glossary.length} specialized academic terms, formulas, and operational definitions
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Search definitions..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#8E44AD] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredGlossary.map((g, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-neutral-900 border border-[#34495E]/60 hover:border-[#8E44AD] transition flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-bold text-[#F1C40F]">{g.term}</h3>
                    <button
                      onClick={() => handleCopyText(`term_${idx}`, `${g.term}: ${g.definition}`)}
                      title="Copy definition"
                      className="p-1 text-neutral-400 hover:text-white transition"
                    >
                      {copiedKey === `term_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-[#2ECC71]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{g.definition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
