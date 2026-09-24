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
  Eye,
  Check,
  Plus,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import { Flashcard, StudyMaterial } from '../types/study';
import { saveMaterialToDatabase } from '../services/supabase';
import { generateMoreFlashcards } from '../services/gemini';

interface FlashcardsTabProps {
  material: StudyMaterial | null;
  onUpdateMaterial: (updated: StudyMaterial) => void;
  onNavigateToTab: (tab: 'notes' | 'quiz' | 'documents') => void;
}

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

  // Derive 4 multiple-choice options if missing on card
  const getCardOptions = useCallback((card?: Flashcard, cardIdx: number = 0): { options: string[]; correctIdx: number } => {
    if (!card) return { options: [], correctIdx: 0 };
    if (card.options && card.options.length >= 4 && typeof card.correctOptionIndex === 'number') {
      return { options: card.options, correctIdx: card.correctOptionIndex };
    }
    const correctChoice = (card.back || '').slice(0, 110);
    const otherCards = flashcards.filter((_, idx) => idx !== cardIdx);
    const otherBacks = otherCards.map((c) => (c.back || '').slice(0, 110));
    const distractors = otherBacks.length >= 3
      ? otherBacks.slice(0, 3)
      : [
          'Inapplicable condition where primary forces cancel out and destabilize baseline parameters.',
          'Secondary asymptotic limit observed only in isolated closed-loop configurations.',
          'Transient state leading to standard baseline decay under nominal conditions.',
        ];
    const correctIdx = cardIdx % 4;
    const opts = [...distractors];
    opts.splice(correctIdx, 0, correctChoice);
    const letteredOpts = opts.map((opt, oIdx) => `${String.fromCharCode(65 + oIdx)}) ${opt.replace(/^[A-D]\)\s*/, '')}`);
    return { options: letteredOpts, correctIdx };
  }, [flashcards]);

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

  const handleSelectOption = useCallback((optIdx: number) => {
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
  }, [isAnswered, material, currentCard, currentCorrectIdx, flashcards, currentIndex, onUpdateMaterial]);

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

  const handleRate = useCallback((rating: 'again' | 'hard' | 'good' | 'easy') => {
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

    // Auto advance after small flip animation
    setTimeout(() => {
      handleNext();
    }, 200);
  }, [material, currentCard, flashcards, currentIndex, onUpdateMaterial, handleNext]);

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
      <div className="p-16 text-center border border-dashed border-[#34495E]/60 rounded-2xl bg-neutral-950/50">
        <Sparkles className="w-10 h-10 text-[#F1C40F] mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-100">No documents uploaded yet</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
          Upload a study document to automatically generate interactive active-recall flashcards with option pickers.
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              {material.subject}
            </span>
            <span className="text-xs text-neutral-400">
              Card {currentIndex + 1} of {flashcards.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mt-1">Interactive Flashcards with Options</h2>
        </div>

        {/* View Switcher, Mode Toggle & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Study Mode Selector (Pick Option vs 3D Flip) */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-[#34495E]/60 text-xs font-semibold">
            <button
              onClick={() => setStudyMode('options')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                studyMode === 'options'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/25'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-[#F1C40F]" />
              <span>Pick Option</span>
            </button>
            <button
              onClick={() => setStudyMode('flip')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                studyMode === 'flip'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/25'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>3D Flip</span>
            </button>
          </div>

          <div className="flex items-center bg-neutral-950 p-1 rounded-xl border border-[#34495E]/60 text-xs font-semibold">
            <button
              onClick={() => setViewMode('deck')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'deck'
                  ? 'bg-[#34495E] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Deck Mode
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-[#34495E] text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <List className="w-3.5 h-3.5 inline mr-1" />
              List Mode
            </button>
          </div>

          <button
            onClick={handleShuffle}
            title="Shuffle deck randomly"
            className="p-2 rounded-xl bg-neutral-950 border border-[#34495E]/60 text-neutral-400 hover:text-white hover:border-[#8E44AD] transition"
          >
            <Shuffle className="w-4 h-4 text-[#F1C40F]" />
          </button>
        </div>
      </div>

      {/* Progress & Spaced Repetition Stats Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900 border border-[#34495E]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-1/2">
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-neutral-300">Deck Mastery Progress</span>
            <span className="text-[#2ECC71] font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-[#34495E]/40">
            <div
              className="bg-gradient-to-r from-[#8E44AD] via-[#F1C40F] to-[#2ECC71] h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-[#2ECC71]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{masteredCount} Mastered</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <RotateCw className="w-4 h-4 text-[#F1C40F]" />
            <span>{flashcards.length - masteredCount} Learning</span>
          </div>
          <button
            onClick={handleResetMastery}
            className="text-[11px] text-neutral-400 hover:text-neutral-200 underline ml-2"
          >
            Reset
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: INTERACTIVE DECK (OPTIONS PICKER + 3D FLIP) */}
      {viewMode === 'deck' ? (
        <div className="space-y-4">
          {/* Card Container */}
          <div
            className="relative w-full min-h-[380px] sm:min-h-[420px] rounded-3xl cursor-pointer perspective-1000 select-none group"
            onClick={() => {
              if (studyMode === 'flip') setIsFlipped((prev) => !prev);
            }}
          >
            <div
              className={`w-full h-full min-h-[380px] sm:min-h-[420px] rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-500 transform-style-3d border ${
                studyMode === 'flip' && isFlipped
                  ? 'rotate-y-180 bg-neutral-900 border-[#8E44AD] shadow-2xl shadow-[#8E44AD]/20'
                  : 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border-[#34495E]/80 shadow-2xl'
              }`}
            >
              {/* FRONT OF CARD (Or Options Selection View) */}
              {(!isFlipped || studyMode === 'options') && (
                <div className="flex flex-col justify-between h-full space-y-6">
                  {/* Top Card Badge / Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#8E44AD]/20 text-[#a569bd] border border-[#8E44AD]/40">
                        Concept {currentIndex + 1}
                      </span>
                      {currentCard?.difficulty && (
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                            currentCard.difficulty === 'easy'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                              : currentCard.difficulty === 'hard'
                              ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                              : 'bg-amber-950/60 text-[#F1C40F] border-amber-800/40'
                          }`}
                        >
                          {currentCard.difficulty}
                        </span>
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
                          className="px-2.5 py-1 rounded-lg bg-neutral-950 border border-[#34495E]/60 text-neutral-400 hover:text-[#F1C40F] hover:border-[#F1C40F]/40 text-xs font-semibold flex items-center gap-1.5 transition"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-[#F1C40F]" />
                          <span>{showHint ? 'Hide Hint' : 'Hint'}</span>
                        </button>
                      )}

                      {currentCard?.mastered && (
                        <span className="text-xs font-bold text-[#2ECC71] flex items-center gap-1 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Mastered
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question / Prompt Text */}
                  <div className="my-auto py-3">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-neutral-100 tracking-tight leading-snug">
                      {currentCard?.front}
                    </h3>

                    {showHint && currentCard?.hint && (
                      <div className="mt-4 p-3.5 rounded-xl bg-[#F1C40F]/10 border border-[#F1C40F]/30 text-[#F1C40F] text-xs leading-relaxed animate-in fade-in duration-150">
                        <strong className="font-bold">Hint:</strong> {currentCard.hint}
                      </div>
                    )}
                  </div>

                  {/* MULTIPLE CHOICE OPTIONS PICKER (When in 'options' mode) */}
                  {studyMode === 'options' ? (
                    <div className="space-y-2 mt-4" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Select the correct definition / answer:</span>
                        <span className="text-[10px] text-neutral-400">Keys: 1/A, 2/B, 3/C, 4/D</span>
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {currentOptions.map((optText, optIdx) => {
                          const isSelected = selectedOption === optIdx;
                          const isCorrect = optIdx === currentCorrectIdx;
                          let btnStyle = 'bg-neutral-950/80 hover:bg-neutral-800 text-neutral-200 border-[#34495E]/60';

                          if (isAnswered) {
                            if (isCorrect) {
                              btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-900/30';
                            } else if (isSelected && !isCorrect) {
                              btnStyle = 'bg-rose-950/80 border-rose-500 text-rose-100';
                            } else {
                              btnStyle = 'opacity-40 border-neutral-800 bg-neutral-950 text-neutral-500';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleSelectOption(optIdx)}
                              disabled={isAnswered}
                              className={`w-full p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between gap-3 ${btnStyle}`}
                            >
                              <span className="leading-relaxed">{optText}</span>
                              {isAnswered && isCorrect && (
                                <Check className="w-4 h-4 text-[#2ECC71] shrink-0" />
                              )}
                              {isAnswered && isSelected && !isCorrect && (
                                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation Reveal when answered */}
                      {isAnswered && (
                        <div className="mt-3 p-3.5 rounded-xl bg-[#8E44AD]/10 border border-[#8E44AD]/30 text-xs text-purple-200 animate-in fade-in duration-150 flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#2ECC71] shrink-0 mt-0.5" />
                          <div>
                            <strong className="text-white font-semibold">Core Concept: </strong>
                            <span>{currentCard?.back}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* 3D FLIP INSTRUCTION HINT */
                    <div className="flex items-center justify-between text-xs text-neutral-400 pt-3 border-t border-[#34495E]/50">
                      <span className="flex items-center gap-1.5 text-[#F1C40F]">
                        <RotateCw className="w-3.5 h-3.5" /> Click or Press Space to flip
                      </span>
                      <span className="font-mono text-[11px] text-neutral-400">
                        Card {currentIndex + 1} / {flashcards.length}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* BACK OF CARD (When in 'flip' mode and isFlipped is true) */}
              {isFlipped && studyMode === 'flip' && (
                <div className="flex flex-col justify-between h-full space-y-6 rotate-y-180">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-950/60 text-[#2ECC71] border border-emerald-800/40">
                      Explanation & Solution
                    </span>
                    <span className="text-xs text-neutral-400">Card {currentIndex + 1}</span>
                  </div>

                  <div className="my-auto py-2">
                    <p className="text-base sm:text-lg text-neutral-100 font-medium leading-relaxed whitespace-pre-line">
                      {currentCard?.back}
                    </p>
                  </div>

                  {/* Spaced Repetition Rating Buttons */}
                  <div
                    className="pt-4 border-t border-[#34495E]/50 space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider text-center">
                      Rate Recall Difficulty (Keys: 1, 2, 3, 4)
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleRate('again')}
                        className="py-2 px-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Again</span>
                        <span className="text-[10px] text-rose-400 font-normal">1 min</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('hard')}
                        className="py-2 px-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-800/60 rounded-xl text-[#F1C40F] text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Hard</span>
                        <span className="text-[10px] text-amber-400 font-normal">6 mins</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('good')}
                        className="py-2 px-2 bg-blue-950/60 hover:bg-blue-900 border border-blue-800/60 rounded-xl text-blue-300 text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Good</span>
                        <span className="text-[10px] text-blue-400 font-normal">1 day</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRate('easy')}
                        className="py-2 px-2 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/60 rounded-xl text-[#2ECC71] text-xs font-bold transition flex flex-col items-center"
                      >
                        <span>Easy</span>
                        <span className="text-[10px] text-emerald-400 font-normal">4 days</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-md">
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 bg-neutral-950 hover:bg-neutral-800 border border-[#34495E]/60 rounded-xl text-xs font-semibold text-neutral-200 flex items-center gap-1.5 transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {/* Jump Buttons Matrix */}
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
                  className={`w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition flex items-center justify-center shrink-0 ${
                    currentIndex === idx
                      ? 'bg-[#8E44AD] text-white shadow-md'
                      : f.mastered
                      ? 'bg-emerald-950/80 text-[#2ECC71] border border-emerald-800/40'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white border border-[#34495E]/40'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#8E44AD]/30 transition active:scale-95"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: EXHAUSTIVE LIST VIEW (All 30 Cards) */
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-neutral-200">
              All 30 Flashcards & Options ({flashcards.length})
            </h3>
            <button
              onClick={handleGenerateMore}
              disabled={isGeneratingMore}
              className="px-3 py-1.5 bg-[#8E44AD]/20 hover:bg-[#8E44AD]/30 border border-[#8E44AD]/40 text-[#a569bd] hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              {isGeneratingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> Generate +10 Flashcards
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {flashcards.map((card, idx) => {
              const cardOpts = getCardOptions(card, idx);
              return (
                <div
                  key={card.id || idx}
                  className="p-4 rounded-2xl bg-neutral-900 border border-[#34495E]/60 hover:border-[#8E44AD]/60 transition shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
                      Card #{idx + 1}
                    </span>
                    {card.mastered && (
                      <span className="text-[10px] font-bold text-[#2ECC71] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Mastered
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-neutral-100">{card.front}</h4>
                    <p className="text-xs text-neutral-300 mt-1.5 leading-relaxed bg-neutral-950 p-2.5 rounded-xl border border-[#34495E]/40 whitespace-pre-line">
                      {card.back}
                    </p>
                  </div>

                  {/* 4 Choices preview in list mode */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-neutral-400">Available Options:</span>
                    <div className="grid grid-cols-1 gap-1">
                      {cardOpts.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                            oIdx === cardOpts.correctIdx
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40 font-semibold'
                              : 'bg-neutral-950/60 text-neutral-400 border-[#34495E]/30'
                          }`}
                        >
                          {opt}
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
