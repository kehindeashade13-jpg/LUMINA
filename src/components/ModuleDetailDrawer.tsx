import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  FileText,
  BookmarkCheck,
  Check,
} from 'lucide-react';
import {
  StudyMaterial,
  ConceptModule,
  Flashcard,
  QuizQuestion,
  ActiveTab,
} from '../types/study';
import { NodePosition, getLinkedFlashcardsForModule } from '../utils/nodeLayoutUtils';

interface ModuleDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  node: NodePosition | null;
  module: ConceptModule | null;
  material: StudyMaterial;
  onNavigateToTab: (tab: ActiveTab) => void;
}

export const ModuleDetailDrawer: React.FC<ModuleDetailDrawerProps> = ({
  isOpen,
  onClose,
  node,
  module,
  material,
  onNavigateToTab,
}) => {
  // Flashcard slider pagination state (guaranteed 10 cards)
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Self-check quiz state
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [isQuizRevealed, setIsQuizRevealed] = useState(false);

  // Reset pagination and quiz when selected node changes
  useEffect(() => {
    setActiveCardIndex(0);
    setIsCardFlipped(false);
    setSelectedQuizOption(null);
    setIsQuizRevealed(false);
  }, [node?.id]);

  // Guaranteed 10 linked flashcards for this primary module or concept
  const flashcards: Flashcard[] = useMemo(() => {
    return getLinkedFlashcardsForModule(module, material, 10);
  }, [module, material]);

  // Keyboard navigation for card slider
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setIsCardFlipped(false);
        setActiveCardIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowLeft') {
        setIsCardFlipped(false);
        setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : flashcards.length - 1));
      } else if (e.key === ' ' || e.key === 'Enter') {
        // Toggle flip if active element is not a button
        if ((document.activeElement as HTMLElement)?.tagName !== 'BUTTON') {
          e.preventDefault();
          setIsCardFlipped((prev) => !prev);
        }
      }
    },
    [isOpen, onClose, flashcards.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !node) return null;

  const currentCard = flashcards[activeCardIndex] || flashcards[0];
  const totalCards = flashcards.length;

  // Synthesized AI Concept / Module Explanation
  const explanation = (() => {
    const label = node.label;

    // Check glossary
    const inGlossary = material.glossary?.find(
      (g) => g.term.toLowerCase() === label.toLowerCase()
    );
    if (inGlossary) return inGlossary.definition;

    // Check notes sections
    const inSection = material.sections?.find(
      (s) =>
        s.title.toLowerCase().includes(label.toLowerCase()) ||
        s.content.toLowerCase().includes(label.toLowerCase())
    );
    if (inSection && inSection.keyTakeaways && inSection.keyTakeaways.length > 0) {
      return inSection.keyTakeaways[0];
    }

    if (node.type === 'root') {
      return material.summary || `Primary core document anchoring all modules in ${material.subject}.`;
    }

    if (node.type === 'module') {
      return `Comprehensive lecture module in ${material.subject} analyzing foundational mechanisms, structural boundaries, and empirical principles of ${node.label}.`;
    }

    return `High-yield operational concept in ${node.moduleLabel || material.subject}. Governs systemic equilibrium, causal kinetics, and real-world application threshold dynamics.`;
  })();

  // Self-check question linked to module or concept
  const quizQuestion: QuizQuestion = (() => {
    const term = node.label.toLowerCase();
    const match = material.quiz?.find((q) => {
      const qText = q.question.toLowerCase();
      const exp = q.explanation.toLowerCase();
      return qText.includes(term) || exp.includes(term);
    });

    if (match) return match;

    // Fallback: pick first quiz question or synthesize
    if (material.quiz && material.quiz.length > 0) {
      return material.quiz[0];
    }

    return {
      id: `quiz_${node.id}`,
      question: `Which fundamental principle is demonstrated by ${node.label}?`,
      options: [
        `Preserves dynamic equilibrium across operational boundaries`,
        `Completely disrupts steady-state without feedback control`,
        `Treats all variables as independent invariant constants`,
        `Bypasses causal constraints through instantaneous decay`,
      ],
      correctAnswerIndex: 0,
      explanation: `${node.label} acts as an essential regulatory factor in ${material.subject}, ensuring operational stability and coordinated feedback modulation.`,
    };
  })();

  // Navigate to previous flashcard
  const goToPreviousCard = () => {
    setIsCardFlipped(false);
    setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : totalCards - 1));
  };

  // Navigate to next flashcard
  const goToNextCard = () => {
    setIsCardFlipped(false);
    setActiveCardIndex((prev) => (prev < totalCards - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Modal Drawer Container */}
      <div
        className="relative w-full max-w-4xl max-h-[90vh] sm:max-h-[86vh] bg-[#161922] border border-[#262B36] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Swipe Grab Indicator */}
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#262B36]" />
        </div>

        {/* 1. Header with Prominent Title Bar & Pill Badge */}
        <div className="px-5 py-4 border-b border-[#262B36] flex items-center justify-between gap-4 shrink-0 bg-[#161922]">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pill Badge: Requirement specifies #06B6D4 background for PRIMARY MODULE */}
            {node.type === 'module' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase bg-[#06B6D4] text-[#0D0F12] shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                PRIMARY MODULE
              </span>
            ) : node.type === 'root' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase bg-[#7C3AED] text-[#F9FAFB] shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                CORE DOCUMENT
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase bg-[#06B6D4] text-[#0D0F12] shadow-sm shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
                KEY CONCEPT
              </span>
            )}

            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-bold text-[#F9FAFB] truncate leading-tight">
                {node.label}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#9CA3AF] truncate mt-0.5">
                {node.type === 'module'
                  ? `${module?.concepts?.length || 0} Key Concepts · Module in ${material.subject}`
                  : node.moduleLabel
                  ? `Branch of ${node.moduleLabel} · ${material.title}`
                  : material.title}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            aria-label="Close detail drawer"
            className="p-2 rounded-xl text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1E222D] bg-[#0D0F12] border border-[#262B36] transition shrink-0"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 2. Scrollable Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* AI Concept & Module Breakdown Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0D0F12] border border-[#262B36] relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#A78BFA] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                <span>AI Conceptual Synthesis</span>
              </div>
              <button
                onClick={() => onNavigateToTab('notes')}
                className="text-[11px] text-[#A78BFA] hover:text-[#F9FAFB] font-medium flex items-center gap-1 transition"
              >
                <span>Read Full Notes</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-[#E5E7EB] leading-relaxed">{explanation}</p>

            {/* Sub-concepts pill tags */}
            {module && module.concepts && module.concepts.length > 0 && (
              <div className="mt-3.5 pt-3 border-t border-[#262B36]/80 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-[#9CA3AF] mr-1">
                  Sub-Concepts:
                </span>
                {module.concepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#161922] border border-[#262B36] text-[#06B6D4]"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Main 2-Column Responsive Section: 10 Linked Flashcards & Quick Self-Check */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
            {/* 3. Card Carousel Container (10 Linked Flashcards) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#161922] border border-[#262B36] flex flex-col justify-between shadow-lg">
              <div>
                {/* Carousel Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#06B6D4]/15 border border-[#06B6D4]/30 text-[#06B6D4]">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#F9FAFB] flex items-center gap-1.5">
                        <span>Linked Flashcards</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#06B6D4]/20 border border-[#06B6D4]/40 text-[#06B6D4] font-bold">
                          10
                        </span>
                      </h3>
                      <span className="text-[11px] text-[#9CA3AF]">
                        Card {activeCardIndex + 1} of {totalCards}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToTab('flashcards')}
                    className="text-[11px] font-semibold text-[#A78BFA] hover:text-[#F9FAFB] flex items-center gap-1 transition"
                  >
                    <span>Study Deck</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Progress Bar (Card X of 10) */}
                <div className="w-full bg-[#0D0F12] h-1.5 rounded-full overflow-hidden mb-3 border border-[#262B36]">
                  <div
                    className="h-full bg-gradient-to-r from-[#06B6D4] to-[#7C3AED] transition-all duration-300"
                    style={{ width: `${((activeCardIndex + 1) / totalCards) * 100}%` }}
                  />
                </div>

                {/* Flip Card Body with Tap-to-Flip Animation */}
                {currentCard ? (
                  <div
                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                    className="group cursor-pointer select-none rounded-xl p-4 sm:p-5 bg-[#0D0F12] border border-[#262B36] hover:border-[#7C3AED] transition-all duration-200 min-h-[160px] flex flex-col justify-between shadow-inner relative overflow-hidden"
                  >
                    {/* Top Status & Hint */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded tracking-wider ${
                          isCardFlipped
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/40'
                        }`}
                      >
                        {isCardFlipped ? 'Answer / Solution' : 'Question / Prompt'}
                      </span>

                      <span className="text-[11px] text-[#9CA3AF] flex items-center gap-1 group-hover:text-[#F9FAFB] transition">
                        <RotateCw className="w-3 h-3 text-[#06B6D4]" />
                        <span>Tap to Flip</span>
                      </span>
                    </div>

                    {/* Card Content Text */}
                    <div className="my-auto py-2">
                      <p
                        className={`text-xs sm:text-sm font-medium leading-relaxed ${
                          isCardFlipped ? 'text-emerald-100' : 'text-[#F9FAFB]'
                        }`}
                      >
                        {isCardFlipped ? currentCard.back : currentCard.front}
                      </p>
                    </div>

                    {/* Bottom Hint */}
                    <div className="pt-2 border-t border-[#262B36]/60 flex items-center justify-between text-[10px] text-[#9CA3AF]">
                      <span>{currentCard.hint || 'Spaced active recall test'}</span>
                      <span className="font-mono">
                        {activeCardIndex + 1} / {totalCards}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Slider Pagination Controls: Previous & Next */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#262B36]">
                <button
                  onClick={goToPreviousCard}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0D0F12] border border-[#262B36] hover:border-[#7C3AED] text-xs font-semibold text-[#9CA3AF] hover:text-[#F9FAFB] transition"
                  aria-label="Previous flashcard"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {/* Direct Dot Indicators for 10 cards */}
                <div className="hidden sm:flex items-center gap-1">
                  {flashcards.map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => {
                        setIsCardFlipped(false);
                        setActiveCardIndex(dotIdx);
                      }}
                      aria-label={`Jump to Card ${dotIdx + 1} of 10`}
                      className={`h-2 rounded-full transition-all ${
                        dotIdx === activeCardIndex
                          ? 'w-5 bg-[#06B6D4]'
                          : 'w-2 bg-[#262B36] hover:bg-[#9CA3AF]'
                      }`}
                    />
                  ))}
                </div>

                <div className="sm:hidden text-xs font-mono text-[#9CA3AF]">
                  {activeCardIndex + 1} of {totalCards}
                </div>

                <button
                  onClick={goToNextCard}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0D0F12] border border-[#262B36] hover:border-[#7C3AED] text-xs font-semibold text-[#9CA3AF] hover:text-[#F9FAFB] transition"
                  aria-label="Next flashcard"
                >
                  <span>Next Card</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 4. Quick Self-Check Section */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#161922] border border-[#262B36] flex flex-col justify-between shadow-lg">
              <div>
                {/* Section Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981]">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-[#F9FAFB]">
                        Quick Self-Check Quiz
                      </h3>
                      <span className="text-[11px] text-[#9CA3AF]">
                        Test retention for this module
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToTab('quiz')}
                    className="text-[11px] font-semibold text-[#A78BFA] hover:text-[#F9FAFB] flex items-center gap-1 transition"
                  >
                    <span>Full Assessment</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Question Prompt */}
                <p className="text-xs sm:text-sm font-semibold text-[#F9FAFB] mb-3 leading-relaxed">
                  {quizQuestion.question}
                </p>

                {/* Multiple-Choice Options with Generous Spacing (space-y-3) */}
                <div className="space-y-3">
                  {quizQuestion.options.map((option, optIdx) => {
                    const isSelected = selectedQuizOption === optIdx;
                    const isCorrect = optIdx === quizQuestion.correctAnswerIndex;
                    const showOutcome = isQuizRevealed;

                    let optionStyle =
                      'bg-[#0D0F12] border-[#262B36] text-[#E5E7EB] hover:border-[#7C3AED] hover:bg-[#1E222D]';

                    if (showOutcome) {
                      if (isCorrect) {
                        optionStyle =
                          'bg-emerald-950/40 border-emerald-500 text-emerald-100 ring-2 ring-emerald-500/30';
                      } else if (isSelected && !isCorrect) {
                        optionStyle =
                          'bg-red-950/40 border-red-500 text-red-100 ring-2 ring-red-500/30';
                      }
                    } else if (isSelected) {
                      optionStyle = 'bg-[#7C3AED]/20 border-[#7C3AED] text-[#F9FAFB]';
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => {
                          setSelectedQuizOption(optIdx);
                          setIsQuizRevealed(true);
                        }}
                        className={`w-full text-left p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm font-medium transition flex items-center justify-between gap-3 ${optionStyle}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[#161922] border border-[#262B36] text-[10px] font-bold flex items-center justify-center shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="leading-snug">{option}</span>
                        </div>

                        {showOutcome && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {showOutcome && isSelected && !isCorrect && (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Instant Feedback / Explanation Box */}
                {isQuizRevealed && (
                  <div className="mt-3.5 p-3 rounded-xl bg-[#0D0F12] border border-[#262B36] text-xs text-[#9CA3AF] animate-in fade-in duration-200">
                    <p className="leading-relaxed">
                      <strong className="text-[#F9FAFB] font-semibold">Explanation: </strong>
                      {quizQuestion.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Quiz Footer */}
              <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#262B36]">
                <span className="text-[11px] text-[#9CA3AF]">
                  {isQuizRevealed
                    ? selectedQuizOption === quizQuestion.correctAnswerIndex
                      ? '✓ Correct answer'
                      : 'Review explanation above'
                    : 'Tap an option to evaluate'}
                </span>

                <button
                  onClick={() => onNavigateToTab('quiz')}
                  className="text-xs font-semibold text-[#10B981] hover:underline flex items-center gap-1"
                >
                  <span>Quiz Dashboard</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Drawer Footer Action Bar */}
        <div className="px-5 py-3.5 border-t border-[#262B36] bg-[#161922] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <BookmarkCheck className="w-4 h-4 text-[#06B6D4]" />
            <span>Mastery Progress: 10 High-Yield Items Linked</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab('notes')}
              className="px-3 py-1.5 rounded-xl bg-[#0D0F12] border border-[#262B36] hover:border-[#7C3AED] text-xs font-medium text-[#F9FAFB] transition flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>Notes View</span>
            </button>
            <button
              onClick={() => onNavigateToTab('flashcards')}
              className="px-4 py-1.5 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-xs font-semibold text-[#F9FAFB] transition flex items-center gap-1.5 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Study 10 Flashcards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
