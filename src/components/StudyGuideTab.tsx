import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  Download,
  Search,
  CheckCircle2,
  XCircle,
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
  RotateCcw,
} from 'lucide-react';
import { StudyMaterial, PracticeQuestion } from '../types/study';
import { calculateReadTime } from '../utils/formatters';

interface StudyGuideTabProps {
  material: StudyMaterial | null;
  onNavigateToTab: (tab: 'flashcards' | 'quiz' | 'documents') => void;
}

/**
 * Strips any internal AI prompt parenthetical instructions from headings or lines.
 */
const stripPromptInstructions = (text: string): string => {
  return text
    .replace(/\s*\(\d+\s*[-–to]+\s*\d+\s+core\s+concepts?\)/gi, '')
    .replace(/\s*\(\d+\s*[-–to]+\s*\d+\s+items?\)/gi, '')
    .trim();
};

export const StudyGuideTab: React.FC<StudyGuideTabProps> = ({ material, onNavigateToTab }) => {
  const [activeSubTab, setActiveSubTab] = useState<'modules' | 'practice' | 'glossary'>('modules');
  const [glossarySearch, setGlossarySearch] = useState('');
  const [practiceSearch, setPracticeSearch] = useState('');
  const [practiceDifficulty, setPracticeDifficulty] = useState<'all' | 'basic' | 'intermediate' | 'advanced'>('all');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  const [userSelectedOptions, setUserSelectedOptions] = useState<Record<string, number>>({});
  const [understoodQuestions, setUnderstoodQuestions] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      setIsPausedAudio(false);
    }
    setRevealedAnswers({});
    setUserSelectedOptions({});
    setUnderstoodQuestions({});
  }, [material?.id]);

  if (!material) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-[#262B36] rounded-2xl bg-[#161922]">
        <Sparkles className="w-10 h-10 text-[#7C3AED] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#F9FAFB]">No documents uploaded yet</h3>
        <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto">
          Upload a study document (PDF, text notes, or markdown) to generate a complete AI study guide.
        </p>
        <button
          onClick={() => onNavigateToTab('documents')}
          className="mt-4 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-sm"
        >
          Upload Document
        </button>
      </div>
    );
  }

  const practiceQuestions: PracticeQuestion[] = material.practiceQuestions || [];

  const getQuestionOptions = (pq: PracticeQuestion, idx: number): { options: string[]; correctIdx: number } => {
    if (pq.options && pq.options.length >= 4 && typeof pq.correctOptionIndex === 'number') {
      return { options: pq.options, correctIdx: pq.correctOptionIndex };
    }
    const correctIdx = idx % 4;
    const correctSummary = pq.sampleAnswer.split('.')[0] || 'Foundational dynamic governing system state';
    const opts = [
      'Invert the primary causal variables without checking boundary constraints',
      'Treat dynamic continuous variations as discrete invariant constants',
      'Bypass baseline equilibrium calculations and assume asymptotic decay',
    ];
    opts.splice(correctIdx, 0, correctSummary);
    const letteredOpts = opts.map((o, oIdx) => `${String.fromCharCode(65 + oIdx)}) ${o.replace(/^[A-D]\)\s*/, '')}`);
    return { options: letteredOpts, correctIdx };
  };

  // Audio Playback
  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
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
    md += `## High-Yield Principles\n`;
    material.keyPoints.forEach((kp) => {
      md += `* ${kp}\n`;
    });
    md += `\n## Step-by-Step Lessons & Deep Dives\n`;
    material.sections.forEach((s) => {
      md += `### ${stripPromptInstructions(s.title)}\n${s.content}\n\n`;
      if (s.keyTakeaways && s.keyTakeaways.length > 0) {
        md += `**Key Takeaways:**\n`;
        s.keyTakeaways.forEach((t) => {
          md += `* ${stripPromptInstructions(t)}\n`;
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

  const handlePickPracticeOption = (questionId: string, optIdx: number, correctIdx: number) => {
    setUserSelectedOptions((prev) => ({ ...prev, [questionId]: optIdx }));
    setRevealedAnswers((prev) => ({ ...prev, [questionId]: true }));
    if (optIdx === correctIdx) {
      setUnderstoodQuestions((prev) => ({ ...prev, [questionId]: true }));
    }
  };

  const handleResetPracticeQuestion = (questionId: string) => {
    setUserSelectedOptions((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
    setRevealedAnswers((prev) => ({ ...prev, [questionId]: false }));
  };

  const toggleUnderstood = (id: string) => {
    setUnderstoodQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#161922] border border-[#262B36]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#9CA3AF] font-mono tabular-nums">
            <span className="font-sans font-semibold text-[#06B6D4]">
              {material.subject}
            </span>
            <span aria-hidden="true">•</span>
            <span>{calculateReadTime(material.rawText, material)}</span>
            <span aria-hidden="true">•</span>
            <span>{material.sections.length} Lesson Modules</span>
            <span aria-hidden="true">•</span>
            <span className="text-[#06B6D4] font-medium">{material.flashcards.length} Cards</span>
            <span aria-hidden="true">•</span>
            <span className="text-[#10B981] font-medium">{material.quiz.length} Quizzes</span>
          </div>
          <h1 className="text-2xl font-bold text-[#F9FAFB] leading-snug">{material.title}</h1>
          <p className="text-xs text-[#9CA3AF]">
            High-Yield Study Suite • Structured modules, key takeaways, and technical definitions
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleToggleAudio}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              isPlayingAudio
                ? 'bg-[#7C3AED]/15 border-[#7C3AED] text-[#F9FAFB]'
                : 'bg-[#0D0F12] hover:bg-[#1E222D] border-[#262B36] text-[#F9FAFB]'
            }`}
          >
            <Volume2 className="w-4 h-4 text-[#7C3AED]" />
            <span>
              {isPlayingAudio ? (isPausedAudio ? 'Resume Audio' : 'Pause Audio') : 'Audio Reader'}
            </span>
          </button>
          {isPlayingAudio && (
            <button
              onClick={handleStopAudio}
              className="p-2 bg-[#0D0F12] hover:bg-[#1E222D] text-[#9CA3AF] hover:text-red-400 rounded-xl transition border border-[#262B36]"
              title="Stop Audio"
            >
              <VolumeX className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleExportMarkdown}
            title="Download full Markdown study guide"
            className="px-3 py-2 bg-[#0D0F12] hover:bg-[#1E222D] border border-[#262B36] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Export MD</span>
          </button>

          <button
            onClick={() => onNavigateToTab('flashcards')}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Cards ({material.flashcards.length})</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-[#262B36] pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('modules')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'modules'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
            }`}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Step-by-Step Lessons & Summary</span>
          </button>

          <button
            onClick={() => setActiveSubTab('practice')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'practice'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
            }`}
          >
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Practice Questions ({practiceQuestions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('glossary')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
              activeSubTab === 'glossary'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Key Concepts & Glossary ({material.glossary.length})</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: Step-by-Step Lessons & Executive Summary */}
      {activeSubTab === 'modules' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Outer Executive Summary Container: rounded-2xl (16px) with p-3 (12px) inner sub-card spacing */}
          <div className="p-3 rounded-2xl bg-[#161922] border border-[#262B36] space-y-3">
            {/* Executive Summary Inner Sub-Card: rounded-xl (12px) */}
            <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#262B36] space-y-2.5">
              <h2 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
                Executive Summary
              </h2>
              <div className="text-xs sm:text-sm text-[#F9FAFB] leading-relaxed whitespace-pre-wrap">
                {material.summary}
              </div>
            </div>

            {/* High-Yield Principles Inner Sub-Card: rounded-xl (12px) */}
            <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#262B36] space-y-3">
              <h3 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider">
                High-Yield Principles
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {material.keyPoints.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-[#161922] border border-[#262B36] text-xs text-[#F9FAFB]"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{stripPromptInstructions(point)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chronological Step-by-Step Lesson Modules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Chronological Step-by-Step Lesson Modules
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Granular breakdowns covering every paragraph, formula, and subtopic
                </p>
              </div>
              <span className="text-xs text-[#9CA3AF] font-mono tabular-nums font-semibold">
                {material.sections.length} Modules
              </span>
            </div>

            {material.sections.map((section, idx) => {
              const isCollapsed = collapsedSections[idx];
              return (
                /* Outer Module Container: rounded-2xl (16px) */
                <div
                  key={idx}
                  className="rounded-2xl bg-[#161922] border border-[#262B36] overflow-hidden transition hover:border-[#7C3AED]/60"
                >
                  <button
                    onClick={() => toggleSection(idx)}
                    className="w-full p-4 flex items-center justify-between text-left bg-[#161922] hover:bg-[#1C202B] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-lg bg-[#7C3AED] text-[#F9FAFB] font-bold text-xs flex items-center justify-center shrink-0 font-mono tabular-nums">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-[#F9FAFB]">
                        {stripPromptInstructions(section.title)}
                      </h3>
                    </div>
                    {isCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
                    )}
                  </button>

                  {!isCollapsed && (
                    /* Consistent 12px padding (p-3) between inner sub-cards and outer container borders */
                    <div className="p-3 border-t border-[#262B36] space-y-3">
                      {(() => {
                        const lines = section.content.split('\n').map((l) => l.trim()).filter(Boolean);
                        const takeaways: string[] =
                          section.keyTakeaways && section.keyTakeaways.length > 0
                            ? section.keyTakeaways.map(stripPromptInstructions)
                            : [];
                        const steps: string[] = [];
                        const vitalConcepts: { term: string; definition: string }[] = [];

                        let currentSection = 'steps';

                        for (const line of lines) {
                          const lower = line.toLowerCase();
                          if (lower.includes('takeaway') || lower.includes('key point')) {
                            currentSection = 'takeaways';
                            continue;
                          }
                          if (lower.includes('step') || lower.includes('lesson') || lower.includes('sequence')) {
                            currentSection = 'steps';
                            continue;
                          }
                          if (lower.includes('vital') || lower.includes('formula') || lower.includes('concept')) {
                            currentSection = 'vital';
                            continue;
                          }

                          if (
                            currentSection === 'takeaways' &&
                            (line.startsWith('*') || line.startsWith('-') || /^\d+\./.test(line))
                          ) {
                            const cleaned = stripPromptInstructions(line.replace(/^[\*\-\d\.\s]+/, ''));
                            if (cleaned && !takeaways.includes(cleaned)) {
                              takeaways.push(cleaned);
                            }
                          } else if (currentSection === 'steps' || /^\d+\./.test(line)) {
                            steps.push(stripPromptInstructions(line.replace(/^[\*\-\d\.\s]+/, '')));
                          } else if (currentSection === 'vital' || line.includes(':')) {
                            const parts = line.replace(/^[\*\-\d\.\s]+/, '').split(':');
                            if (parts.length >= 2) {
                              vitalConcepts.push({
                                term: stripPromptInstructions(parts[0].replace(/\*\*/g, '').trim()),
                                definition: stripPromptInstructions(parts.slice(1).join(':').trim()),
                              });
                            } else {
                              steps.push(stripPromptInstructions(line.replace(/^[\*\-\d\.\s]+/, '')));
                            }
                          } else {
                            steps.push(stripPromptInstructions(line));
                          }
                        }

                        if (steps.length === 0) {
                          steps.push(stripPromptInstructions(section.content));
                        }

                        if (vitalConcepts.length === 0 && material.glossary.length > 0) {
                          material.glossary.slice(0, 3).forEach((g) => {
                            vitalConcepts.push({ term: g.term, definition: g.definition });
                          });
                        }

                        return (
                          <>
                            {/* 1. Step-by-Step Lessons Inner Sub-Card: rounded-xl (12px) */}
                            <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#262B36]">
                              <h4 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-3">
                                Step-by-Step Lessons
                              </h4>
                              <ol className="space-y-2.5 text-xs sm:text-sm text-[#F9FAFB]">
                                {steps.map((step, sIdx) => (
                                  <li key={sIdx} className="flex items-start gap-2.5 leading-relaxed">
                                    <span className="w-5 h-5 rounded-md bg-[#7C3AED]/20 text-[#A78BFA] font-mono tabular-nums font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5 border border-[#7C3AED]/40">
                                      {sIdx + 1}
                                    </span>
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* 2. Key Takeaways Inner Sub-Card: rounded-xl (12px) */}
                            {takeaways.length > 0 && (
                              <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#262B36]">
                                <h4 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-3">
                                  Key Takeaways
                                </h4>
                                <ul className="space-y-2 text-xs sm:text-sm text-[#F9FAFB]">
                                  {takeaways.slice(0, 5).map((t, tIdx) => (
                                    <li
                                      key={tIdx}
                                      className="flex items-start gap-2.5 p-3 rounded-xl bg-[#161922] border border-[#262B36] leading-relaxed"
                                    >
                                      <CheckCircle2 className="w-4 h-4 text-[#7C3AED] shrink-0 mt-0.5" />
                                      <span>{t}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* 3. Vital Concepts & Formulas Inner Sub-Card: rounded-xl (12px) */}
                            {vitalConcepts.length > 0 && (
                              <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#262B36]">
                                <h4 className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider mb-3">
                                  Vital Concepts & Formulas
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {vitalConcepts.slice(0, 4).map((vc, vIdx) => (
                                    <div
                                      key={vIdx}
                                      className="p-3 rounded-xl bg-[#161922] border border-[#262B36] text-xs"
                                    >
                                      <strong className="text-[#F9FAFB] font-semibold block mb-1">
                                        {vc.term}
                                      </strong>
                                      <span className="text-[#9CA3AF] leading-relaxed">
                                        {vc.definition}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 2: 30 Practice Questions with Pick-an-Option UI */}
      {activeSubTab === 'practice' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="p-5 rounded-2xl bg-[#161922] border border-[#262B36] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB] flex items-center gap-2">
                  <span>Practice Questions</span>
                  <span className="text-xs font-mono tabular-nums text-[#9CA3AF] font-normal">
                    · {practiceQuestions.length} Total
                  </span>
                </h2>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Select an option (A, B, C, D) to test active understanding, then inspect model solutions.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-[#F9FAFB] bg-[#0D0F12] px-3 py-1.5 rounded-xl border border-[#262B36] shrink-0 font-mono tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span>
                  <strong className="text-[#10B981]">{understoodCount}</strong> / {practiceQuestions.length} Understood
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <div className="relative flex-1 w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search practice questions or topics..."
                  value={practiceSearch}
                  onChange={(e) => setPracticeSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#0D0F12] border border-[#262B36] rounded-xl text-xs text-[#F9FAFB] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] transition"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {(['all', 'basic', 'intermediate', 'advanced'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setPracticeDifficulty(diff)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition shrink-0 ${
                      practiceDifficulty === diff
                        ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                        : 'bg-[#0D0F12] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredPractice.length > 0 ? (
              filteredPractice.map((pq, idx) => {
                const { options: qOptions, correctIdx } = getQuestionOptions(pq, idx);
                const selectedOpt = userSelectedOptions[pq.id];
                const hasSelected = selectedOpt !== undefined;
                const isRevealed = Boolean(revealedAnswers[pq.id]) || hasSelected;
                const isUnderstood = Boolean(understoodQuestions[pq.id]);

                return (
                  <div
                    key={pq.id}
                    className={`p-5 rounded-2xl bg-[#161922] border transition ${
                      isUnderstood
                        ? 'border-[#10B981]/50'
                        : 'border-[#262B36]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap text-xs text-[#9CA3AF] font-mono tabular-nums">
                          <span className="font-bold text-[#7C3AED]">Q{idx + 1}</span>
                          {pq.topic && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-sans text-[#06B6D4] font-semibold">{pq.topic}</span>
                            </>
                          )}
                          {pq.difficulty && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-sans capitalize text-[#9CA3AF]">{pq.difficulty}</span>
                            </>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-[#F9FAFB] pt-1 leading-snug">
                          {pq.question}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasSelected && (
                          <button
                            onClick={() => handleResetPracticeQuestion(pq.id)}
                            title="Reset question options"
                            className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] rounded-lg hover:bg-[#0D0F12] transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleCopyText(pq.id, `${pq.question}\n\nModel Answer:\n${pq.sampleAnswer}`)}
                          title="Copy question and answer"
                          className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] rounded-lg hover:bg-[#0D0F12] transition"
                        >
                          {copiedKey === pq.id ? (
                            <Check className="w-3.5 h-3.5 text-[#10B981]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => toggleUnderstood(pq.id)}
                          title={isUnderstood ? 'Mark as needing review' : 'Mark as understood'}
                          className={`p-1.5 rounded-lg transition ${
                            isUnderstood
                              ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30'
                              : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider block">
                        Select Option
                      </span>
                      {qOptions.map((opt, oIdx) => {
                        const isChosen = selectedOpt === oIdx;
                        const isThisCorrect = oIdx === correctIdx;

                        let btnStyles =
                          'bg-[#0D0F12] border-[#262B36] text-[#F9FAFB] hover:border-[#7C3AED] hover:bg-[#1C202B]';

                        if (hasSelected) {
                          if (isThisCorrect) {
                            btnStyles =
                              'bg-[#10B981]/15 border-[#10B981] text-[#F9FAFB] ring-1 ring-[#10B981]/50 font-semibold';
                          } else if (isChosen && !isThisCorrect) {
                            btnStyles =
                              'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/40';
                          } else {
                            btnStyles = 'bg-[#0D0F12]/50 border-[#262B36] text-[#9CA3AF] opacity-60';
                          }
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handlePickPracticeOption(pq.id, oIdx, correctIdx)}
                            disabled={hasSelected}
                            className={`w-full p-3 rounded-xl border text-left text-xs sm:text-[13px] transition flex items-start gap-3 ${btnStyles}`}
                          >
                            <div
                              className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border ${
                                hasSelected && isThisCorrect
                                  ? 'bg-[#10B981] text-[#0D0F12] border-[#10B981]'
                                  : hasSelected && isChosen && !isThisCorrect
                                  ? 'bg-rose-500 text-[#0D0F12] border-rose-400'
                                  : 'bg-[#161922] border-[#262B36] text-[#F9FAFB]'
                              }`}
                            >
                              {String.fromCharCode(65 + oIdx)}
                            </div>
                            <span className="flex-1 leading-relaxed">{opt.replace(/^[A-D]\)\s*/, '')}</span>
                            {hasSelected && isThisCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                            )}
                            {hasSelected && isChosen && !isThisCorrect && (
                              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-3 mt-3 border-t border-[#262B36]">
                      <button
                        onClick={() => toggleRevealAnswer(pq.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#A78BFA] hover:text-[#F9FAFB] transition"
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" /> Hide Model Solution
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" /> Reveal Model Solution & Analysis
                          </>
                        )}
                      </button>

                      {isRevealed && (
                        <div className="mt-2.5 p-4 rounded-xl bg-[#0D0F12] border border-[#262B36] text-xs text-[#F9FAFB] leading-relaxed space-y-2 animate-in fade-in duration-150">
                          {hasSelected && (
                            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider pb-1 border-b border-[#262B36]">
                              {selectedOpt === correctIdx ? (
                                <span className="text-[#10B981] flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" /> Correct Option Selected
                                </span>
                              ) : (
                                <span className="text-amber-400 flex items-center gap-1.5">
                                  <XCircle className="w-4 h-4" /> Option Review & Takeaway
                                </span>
                              )}
                            </div>
                          )}

                          {pq.explanation && (
                            <p className="text-[#A78BFA] font-medium leading-relaxed">
                              {pq.explanation}
                            </p>
                          )}

                          <div>
                            <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider block mb-1">
                              Model Solution
                            </span>
                            <div className="whitespace-pre-wrap text-[#9CA3AF]">
                              {pq.sampleAnswer}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-[#161922] border border-[#262B36] rounded-2xl text-[#9CA3AF] text-xs">
                No practice questions match your filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Key Concepts & Glossary */}
      {activeSubTab === 'glossary' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#161922] border border-[#262B36]">
            <div>
              <h2 className="text-base font-bold text-[#F9FAFB]">
                Key Concepts & Technical Glossary
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                {material.glossary.length} specialized academic terms, formulas, and operational definitions
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="text"
                placeholder="Search definitions..."
                value={glossarySearch}
                onChange={(e) => setGlossarySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#0D0F12] border border-[#262B36] rounded-xl text-xs text-[#F9FAFB] placeholder-[#9CA3AF] focus:outline-none focus:border-[#7C3AED] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((g, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#161922] border border-[#262B36] hover:border-[#7C3AED] transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-sm font-bold text-[#F9FAFB]">{g.term}</h3>
                    <button
                      onClick={() => handleCopyText(`term_${idx}`, `${g.term}: ${g.definition}`)}
                      title="Copy definition"
                      className="p-1 text-[#9CA3AF] hover:text-[#F9FAFB] transition"
                    >
                      {copiedKey === `term_${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed">{g.definition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
