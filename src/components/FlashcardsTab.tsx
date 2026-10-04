import React, { useState, useEffect, useCallback } from 'react';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Sparkles,
  CheckCircle2,
  XCircle,
  Lightbulb,
  List,
  Check,
  Plus,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import { Flashcard, StudyMaterial } from '../types/study';
import { saveMaterialToDatabase } from '../services/supabase';
import { generateMoreFlashcards } from '../services/gemini';
import { cleanPromptArtifacts } from '../utils/formatters';

interface FlashcardsTabProps {
  material: StudyMaterial | null;
  onUpdateMaterial: (updated: StudyMaterial) => void;
  onNavigateToTab: (tab: 'notes' | 'quiz' | 'documents') => void;
}

/**
 * Extracts a complete, untruncated definition paragraph from a flashcard back string
 * without cutting off mid-sentence.
 */
const extractCompleteDefinition = (backText?: string): string => {
  if (!backText) return '';
  const cleaned = cleanPromptArtifacts(backText)
    .replace(/^\*\*[^*]+:\*\*\s*/i, '')
    .trim();
  const firstParagraph = cleaned.split(/\n\s*\n/)[0]?.trim() || cleaned;
  return firstParagraph;
};

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  material,
  onUpdateMaterial,
  onNavigateToTab,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [viewMode, setViewMode] = useState<'deck' | 'list'>('deck');
  const [studyMode, setStudyMode] = useState<'options' | 'flip'>('options');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  const flashcards = material?.flashcards || [];
  const currentCard = flashcards[currentIndex] || flashcards[0];
  const masteredCount = flashcards.filter((f) => f.mastered).length;
  const progressPercent = flashcards.length > 0 ? Math.round((masteredCount / flashcards.length) * 100) : 0;

  // Derive 4 complete, untruncated multiple-choice options
  const getCardOptions = useCallback(
    (card?: Flashcard, cardIdx: number = 0): { options: string[]; correctIdx: number } => {
      if (!card) return { options: [], correctIdx: 0 };
      if (card.options && card.options.length >= 4 && typeof card.correctOptionIndex === 'number') {
        const cleanedOptions = card.options.map((opt, oIdx) => {
          const stripped = cleanPromptArtifacts(opt).replace(/^[A-D]\)\s*/, '');
          // If a legacy stored option ended with "..." or was sliced at 110-120 chars and matches the start of card.back, restore full definition
          if (oIdx === card.correctOptionIndex && card.back && stripped.length >= 100) {
            const fullDef = extractCompleteDefinition(card.back);
            if (fullDef.startsWith(stripped.slice(0, 40))) {
              return `${String.fromCharCode(65 + oIdx)}) ${fullDef}`;
            }
          }
          return `${String.fromCharCode(65 + oIdx)}) ${stripped}`;
        });
        return { options: cleanedOptions, correctIdx: card.correctOptionIndex };
      }

      const correctChoice = extractCompleteDefinition(card.back);
      const otherCards = flashcards.filter((_, idx) => idx !== cardIdx);
      const otherBacks = otherCards.map((c) => extractCompleteDefinition(c.back)).filter(Boolean);
      const distractors =
        otherBacks.length >= 3
          ? otherBacks.slice(0, 3)
          : [
              'Inapplicable condition where primary forces cancel out and destabilize baseline parameters.',
              'Secondary asymptotic limit observed only in isolated closed-loop configurations.',
              'Transient state leading to standard baseline decay under nominal conditions.',
            ];
      const correctIdx = cardIdx % 4;
      const opts = [...distractors];
      opts.splice(correctIdx, 0, correctChoice);
      const letteredOpts = opts.map(
        (opt, oIdx) => `${String.fromCharCode(65 + oIdx)}) ${cleanPromptArtifacts(opt).replace(/^[A-D]\)\s*/, '')}`
      );
      return { options: letteredOpts, correctIdx };
    },
    [flashcards]
  );

  // Reset flashcards state when document changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [material?.id]);

  const { options: currentOptions, correctIdx: currentCorrectIdx } = getCardOptions(currentCard, currentIndex);

  const handleNext = useCallback(() => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    setShowHint(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  }, [flashcards.length]);

  const handlePrev = useCallback(() => {
    if (flashcards.length === 0) return;
    setIsFlipped(false);
    setShowHint(false);
    setSelectedOption(null);
    setIsAnswered(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  }, [flashcards.length]);

  const handleSelectOption = useCallback(
    (optIdx: number) => {
      if (isAnswered || !material || !currentCard) return;
      setSelectedOption(optIdx);
      setIsAnswered(true);

      const isCorrect = optIdx === currentCorrectIdx;
      const updatedCards = [...flashcards];
      updatedCards[currentIndex] = {
        ...currentCard,
        mastered: isCorrect ? true : currentCard.mastered,
        reviewCount: (currentCard.reviewCount || 0) + 1,
        lastReviewed: new Date().toISOString(),
      };

      const updated = { ...material, flashcards: updatedCards };
      onUpdateMaterial(updated);
      saveMaterialToDatabase(updated);
    },
    [isAnswered, material, currentCard, currentCorrectIdx, flashcards, currentIndex, onUpdateMaterial]
  );

  const handleShuffle = () => {
    if (!material) return;
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    const updated = { ...material, flashcards: shuffled };
    onUpdateMaterial(updated);
    saveMaterialToDatabase(updated);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleResetMastery = () => {
    if (!material) return;
    const resetCards = flashcards.map((fc) => ({
      ...fc,
      mastered: false,
      reviewCount: 0,
    }));
    const updated = { ...material, flashcards: resetCards };
    onUpdateMaterial(updated);
    saveMaterialToDatabase(updated);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleRate = useCallback(
    (rating: 'again' | 'hard' | 'good' | 'easy') => {
      if (!material || !currentCard) return;
      const isMastered = rating === 'easy';
      const updatedCards = [...flashcards];
      updatedCards[currentIndex] = {
        ...currentCard,
        mastered: isMastered,
        reviewCount: (currentCard.reviewCount || 0) + 1,
        lastReviewed: new Date().toISOString(),
      };

      const updated = { ...material, flashcards: updatedCards };
      onUpdateMaterial(updated);
      saveMaterialToDatabase(updated);

      setTimeout(() => {
        handleNext();
      }, 200);
    },
    [material, currentCard, flashcards, currentIndex, onUpdateMaterial, handleNext]
  );

  const handleGenerateMore = async () => {
    if (!material) return;
    setIsGeneratingMore(true);
    try {
      const extra = await generateMoreFlashcards(material.rawText, material.flashcards.length);
      const updatedCards = [...material.flashcards, ...extra];
      const updated = { ...material, flashcards: updatedCards };
      onUpdateMaterial(updated);
      await saveMaterialToDatabase(updated);
    } catch (e) {
      console.warn('Failed to generate more flashcards:', e);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== 'deck' || !material || material.flashcards.length === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === '1' || e.key === 'a' || e.key === 'A') {
        if (studyMode === 'options' && !isAnswered) handleSelectOption(0);
        else handleRate('again');
      } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
        if (studyMode === 'options' && !isAnswered) handleSelectOption(1);
        else handleRate('hard');
      } else if (e.key === '3' || e.key === 'c' || e.key === 'C') {
        if (studyMode === 'options' && !isAnswered) handleSelectOption(2);
        else handleRate('good');
      } else if (e.key === '4' || e.key === 'd' || e.key === 'D') {
        if (studyMode === 'options' && !isAnswered) handleSelectOption(3);
        else handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, material, isAnswered, studyMode, handleNext, handlePrev, handleSelectOption, handleRate]);

  if (!material || material.flashcards.length === 0) {
    return (
      <div className="p-16 text-center border-2 border-dashed border-[#262B36] rounded-2xl bg-[#161922]">
        <Sparkles className="w-10 h-10 text-[#7C3AED] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#F9FAFB]">No documents uploaded yet</h3>
        <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto">
          Upload a study document to automatically generate interactive active-recall flashcards.
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161922] border border-[#262B36]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] font-mono tabular-nums">
            <span className="font-sans font-semibold text-[#06B6D4]">
              {material.subject}
            </span>
            <span aria-hidden="true">•</span>
            <span>
              Card {currentIndex + 1} of {flashcards.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#F9FAFB] mt-1">Interactive Flashcards</h2>
        </div>

        {/* View Switcher, Mode Toggle & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#0D0F12] p-1 rounded-xl border border-[#262B36] text-xs font-semibold">
            <button
              onClick={() => setStudyMode('options')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
                studyMode === 'options'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Pick Option</span>
            </button>
            <button
              onClick={() => setStudyMode('flip')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
                studyMode === 'flip'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>3D Flip</span>
            </button>
          </div>

          <div className="flex items-center bg-[#0D0F12] p-1 rounded-xl border border-[#262B36] text-xs font-semibold">
            <button
              onClick={() => setViewMode('deck')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                viewMode === 'deck'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              Deck Mode
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                viewMode === 'list'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
              }`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" />
              List Mode
            </button>
          </div>

          <button
            onClick={handleShuffle}
            title="Shuffle deck randomly"
            className="p-2 rounded-xl bg-[#0D0F12] border border-[#262B36] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#7C3AED] transition"
          >
            <Shuffle className="w-4 h-4 text-[#06B6D4]" />
          </button>
        </div>
      </div>

      {/* Progress & Spaced Repetition Stats Bar */}
      <div className="p-4 rounded-2xl bg-[#161922] border border-[#262B36] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-1/2">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-[#9CA3AF]">Deck Mastery Progress</span>
            <span className="text-[#10B981] font-mono tabular-nums">{progressPercent}%</span>
          </div>
          <div className="w-full bg-[#0D0F12] h-2 rounded-full overflow-hidden border border-[#262B36]">
            <div
              className="bg-[#7C3AED] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium w-full sm:w-auto justify-between sm:justify-end font-mono tabular-nums">
          <div className="flex items-center gap-1.5 text-[#10B981]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{masteredCount} Mastered</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#06B6D4]">
            <RotateCw className="w-4 h-4" />
            <span>{flashcards.length - masteredCount} Learning</span>
          </div>
          <button
            onClick={handleResetMastery}
            className="text-xs font-sans text-[#9CA3AF] hover:text-[#F9FAFB] underline ml-2"
          >
            Reset
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE DECK (OPTIONS PICKER + 3D FLIP) */}
      {viewMode === 'deck' ? (
        <div className="space-y-4">
          <div
            className="relative w-full rounded-2xl cursor-pointer perspective-1000 select-none group"
            onClick={() => {
              if (studyMode === 'flip') setIsFlipped((prev) => !prev);
            }}
          >
            <div
              className={`w-full h-auto min-h-[360px] rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-500 transform-style-3d border bg-[#161922] ${
                studyMode === 'flip' && isFlipped
                  ? 'rotate-y-180 border-[#7C3AED]'
                  : 'border-[#262B36]'
              }`}
            >
              {/* FRONT OF CARD (Or Options Selection View) */}
              {(!isFlipped || studyMode === 'options') && (
                <div className="flex flex-col justify-between h-full space-y-6">
                  {/* Top Card Metadata & Controls */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[#9CA3AF]">
                      <span className="font-bold text-[#7C3AED]">
                        Concept {currentIndex + 1}
                      </span>
                      {currentCard?.difficulty && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-sans capitalize text-[#9CA3AF]">
                            {currentCard.difficulty}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentCard?.hint && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHint(!showHint);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0D0F12] border border-[#262B36] text-[#9CA3AF] hover:text-[#F9FAFB] hover:border-[#7C3AED] text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-[#06B6D4]" />
                          <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
                        </button>
                      )}

                      {currentCard?.mastered && (
                        <span className="text-xs font-semibold text-[#10B981] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question / Prompt Text (Cleaned of any raw AI subtitle artifacts) */}
                  <div className="py-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F9FAFB] tracking-tight leading-snug">
                      {cleanPromptArtifacts(currentCard?.front)}
                    </h3>

                    {showHint && currentCard?.hint && (
                      <div className="mt-4 p-4 rounded-xl bg-[#0D0F12] border border-[#262B36] text-[#06B6D4] text-xs leading-relaxed animate-in fade-in duration-150">
                        <strong className="font-bold text-[#F9FAFB]">Hint: </strong>
                        <span>{cleanPromptArtifacts(currentCard.hint)}</span>
                      </div>
                    )}
                  </div>

                  {/* MULTIPLE CHOICE OPTIONS PICKER (Auto-height p-4 h-auto w-full text-left, zero mid-sentence truncation) */}
                  {studyMode === 'options' ? (
                    <div className="space-y-2.5 mt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-1 gap-2.5">
                        {currentOptions.map((optText, optIdx) => {
                          const isSelected = selectedOption === optIdx;
                          const isCorrect = optIdx === currentCorrectIdx;
                          let btnStyle =
                            'bg-[#0D0F12] hover:bg-[#1C202B] text-[#F9FAFB] border-[#262B36] hover:border-[#7C3AED]';

                          if (isAnswered) {
                            if (isCorrect) {
                              btnStyle =
                                'bg-[#10B981]/15 border-[#10B981] text-[#F9FAFB] ring-1 ring-[#10B981]/40';
                            } else if (isSelected && !isCorrect) {
                              btnStyle =
                                'bg-rose-950/50 border-rose-500 text-rose-100';
                            } else {
                              btnStyle =
                                'opacity-45 border-[#262B36] bg-[#0D0F12] text-[#9CA3AF]';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(optIdx)}
                              disabled={isAnswered}
                              className={`p-4 h-auto w-full text-left rounded-xl border text-xs sm:text-sm font-medium transition flex items-start justify-between gap-3 ${btnStyle}`}
                            >
                              <span className="leading-relaxed whitespace-normal break-words flex-1">
                                {cleanPromptArtifacts(optText)}
                              </span>
                              {isAnswered && isCorrect && (
                                <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                              )}
                              {isAnswered && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Reveal when answered */}
                      {isAnswered && (
                        <div className="mt-3 p-4 rounded-xl bg-[#0D0F12] border border-[#262B36] text-xs text-[#F9FAFB] animate-in fade-in duration-150 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <strong className="text-[#7C3AED] uppercase tracking-wider text-xs font-bold block mb-1">
                              Core Concept Explanation
                            </strong>
                            <span className="text-[#9CA3AF] whitespace-pre-line">
                              {cleanPromptArtifacts(currentCard?.back)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 3D FLIP INSTRUCTION HINT */
                    <div className="flex items-center justify-between text-xs text-[#9CA3AF] pt-4 border-t border-[#262B36]">
                      <span className="flex items-center gap-1.5 text-[#06B6D4]">
                        <RotateCw className="w-3.5 h-3.5" /> Click card or press Space to flip
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-[#9CA3AF]">
                        Card {currentIndex + 1} / {flashcards.length}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* BACK OF CARD (When in 'flip' mode and isFlipped is true) */}
              {isFlipped && studyMode === 'flip' && (
                <div className="flex flex-col justify-between h-full space-y-6 rotate-y-180">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-bold text-[#10B981] uppercase tracking-wider">
                      Explanation & Solution
                    </span>
                    <span className="text-[#9CA3AF]">Card {currentIndex + 1}</span>
                  </div>

                  <div className="my-auto py-2">
                    <p className="text-base sm:text-lg text-[#F9FAFB] font-medium leading-relaxed whitespace-pre-line">
                      {cleanPromptArtifacts(currentCard?.back)}
                    </p>
                  </div>

                  {/* Spaced Repetition Rating Buttons */}
                  <div
                    className="pt-4 border-t border-[#262B36] space-y-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider text-center">
                      Rate Recall Confidence
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleRate('again')}
                        className="py-2.5 px-2 bg-[#0D0F12] hover:bg-rose-950/60 border border-[#262B36] hover:border-rose-500 rounded-xl text-rose-400 text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Again</span>
                        <span className="text-[10px] text-[#9CA3AF] font-normal">1m</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('hard')}
                        className="py-2.5 px-2 bg-[#0D0F12] hover:bg-amber-950/60 border border-[#262B36] hover:border-amber-500 rounded-xl text-amber-400 text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Hard</span>
                        <span className="text-[10px] text-[#9CA3AF] font-normal">6m</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('good')}
                        className="py-2.5 px-2 bg-[#0D0F12] hover:bg-[#06B6D4]/20 border border-[#262B36] hover:border-[#06B6D4] rounded-xl text-[#06B6D4] text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Good</span>
                        <span className="text-[10px] text-[#9CA3AF] font-normal">1d</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('easy')}
                        className="py-2.5 px-2 bg-[#0D0F12] hover:bg-[#10B981]/20 border border-[#262B36] hover:border-[#10B981] rounded-xl text-[#10B981] text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Easy</span>
                        <span className="text-[10px] text-[#9CA3AF] font-normal">4d</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#161922] border border-[#262B36]">
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 bg-[#0D0F12] hover:bg-[#1E222D] border border-[#262B36] rounded-xl text-xs font-semibold text-[#F9FAFB] flex items-center gap-1.5 transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-[400px] px-2 py-1">
              {flashcards.map((f, idx) => (
                <button
                  key={f.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setIsFlipped(false);
                    setShowHint(false);
                    setSelectedOption(null);
                    setIsAnswered(false);
                  }}
                  className={`w-6 h-6 rounded-lg text-[10px] font-mono tabular-nums font-bold transition flex items-center justify-center shrink-0 ${
                    currentIndex === idx
                      ? 'bg-[#7C3AED] text-[#F9FAFB]'
                      : f.mastered
                      ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40'
                      : 'bg-[#0D0F12] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: LIST VIEW (All 30 Cards) */
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#F9FAFB]">
              All Flashcards ({flashcards.length})
            </h3>
            <button
              onClick={handleGenerateMore}
              disabled={isGeneratingMore}
              className="px-3.5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isGeneratingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Generate More Cards
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {flashcards.map((card, idx) => {
              const cardOpts = getCardOptions(card, idx);
              return (
                <div
                  key={card.id || idx}
                  className="p-4 rounded-2xl bg-[#161922] border border-[#262B36] hover:border-[#7C3AED]/60 transition space-y-3"
                >
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-bold text-[#7C3AED]">
                      Card #{idx + 1}
                    </span>
                    {card.mastered && (
                      <span className="text-[#10B981] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#F9FAFB]">
                      {cleanPromptArtifacts(card.front)}
                    </h4>
                    <p className="text-xs text-[#9CA3AF] mt-2 leading-relaxed bg-[#0D0F12] p-3 rounded-xl border border-[#262B36] whitespace-pre-line">
                      {cleanPromptArtifacts(card.back)}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider block">
                      Options
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {cardOpts.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`text-xs p-3 h-auto w-full text-left rounded-xl border leading-relaxed ${
                            oIdx === cardOpts.correctIdx
                              ? 'bg-[#10B981]/15 text-[#F9FAFB] border-[#10B981]/50 font-semibold'
                              : 'bg-[#0D0F12] text-[#9CA3AF] border-[#262B36]'
                          }`}
                        >
                          {cleanPromptArtifacts(opt)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
