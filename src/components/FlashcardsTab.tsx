import React, { useState, useEffect } from 'react';
import {
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  List,
  Eye,
  Check,
  Plus,
  Loader2,
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
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

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
      } else if (e.key === '1') {
        handleRate('again');
      } else if (e.key === '2') {
        handleRate('hard');
      } else if (e.key === '3') {
        handleRate('good');
      } else if (e.key === '4') {
        handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentIndex, material]);

  if (!material || material.flashcards.length === 0) {
    return (
      <div className="p-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50">
        <Sparkles className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-200">No documents uploaded yet</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Upload a study document to automatically generate active-recall 3D flashcards.
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

  const flashcards = material.flashcards;
  const currentCard = flashcards[currentIndex] || flashcards[0];
  const masteredCount = flashcards.filter((f) => f.mastered).length;
  const progressPercent = Math.round((masteredCount / flashcards.length) * 100);

  const handleNext = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setShowHint(false);
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const handleShuffle = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    const updated = { ...material, flashcards: shuffled };
    onUpdateMaterial(updated);
    saveMaterialToDatabase(updated);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleResetMastery = () => {
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
  };

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
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
    }, 250);
  };

  const handleGenerateMore = async () => {
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {material.subject}
            </span>
            <span className="text-xs text-neutral-400">
              Card {currentIndex + 1} of {flashcards.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mt-1">Interactive Flashcards</h2>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'deck' ? 'list' : 'deck')}
            className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium flex items-center gap-1.5 transition"
          >
            {viewMode === 'deck' ? (
              <>
                <List className="w-3.5 h-3.5" /> List View
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" /> 3D Deck View
              </>
            )}
          </button>

          <button
            onClick={handleShuffle}
            title="Shuffle Deck"
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handleGenerateMore}
            disabled={isGeneratingMore}
            title="Generate +5 more flashcards with Gemini"
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
          >
            {isGeneratingMore ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Add +5 Cards</span>
          </button>
        </div>
      </div>

      {/* Mastery Progress Bar */}
      <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>
            <strong>{masteredCount}</strong> of <strong>{flashcards.length}</strong> mastered (
            {progressPercent}%)
          </span>
        </div>
        <div className="flex-1 max-w-xs bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <button
          onClick={handleResetMastery}
          className="text-neutral-500 hover:text-neutral-300 text-[11px] underline transition"
        >
          Reset Mastery
        </button>
      </div>

      {viewMode === 'deck' ? (
        <>
          {/* 3D Flip Card Container */}
          <div className="perspective-1000 w-full min-h-[380px] sm:min-h-[420px] cursor-pointer">
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className={`relative w-full min-h-[380px] sm:min-h-[420px] transition-transform duration-500 preserve-3d rounded-3xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT OF CARD */}
              <div className="absolute inset-0 backface-hidden w-full h-full p-8 rounded-3xl bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 shadow-2xl flex flex-col justify-between select-none">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        currentCard.difficulty === 'hard'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : currentCard.difficulty === 'easy'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                      }`}
                    >
                      {currentCard.difficulty || 'Medium'}
                    </span>
                    {currentCard.mastered && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Mastered
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-widest block mb-2">
                    Active Recall Prompt
                  </span>
                  <h3 className="text-lg sm:text-2xl font-bold text-neutral-100 leading-snug">
                    {currentCard.front}
                  </h3>
                </div>

                <div>
                  {currentCard.hint && (
                    <div
                      className="mb-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowHint(!showHint);
                      }}
                    >
                      {showHint ? (
                        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>{currentCard.hint}</span>
                        </div>
                      ) : (
                        <button className="text-xs text-neutral-400 hover:text-amber-300 flex items-center gap-1.5 transition">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Show Hint</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-4 border-t border-neutral-800/60">
                    <span className="flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> Click or press Space to flip
                    </span>
                    <span>Reviewed: {currentCard.reviewCount || 0} times</span>
                  </div>
                </div>
              </div>

              {/* BACK OF CARD */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 w-full h-full p-8 rounded-3xl bg-gradient-to-b from-neutral-900 to-indigo-950/20 border border-indigo-500/30 shadow-2xl flex flex-col justify-between select-none">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-widest">
                      Explanation & Context
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      Card {currentIndex + 1}
                    </span>
                  </div>

                  <p className="text-base sm:text-lg text-neutral-200 leading-relaxed font-normal">
                    {currentCard.back}
                  </p>
                </div>

                <div className="pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-500">
                  <span className="flex items-center gap-1">
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> Click to flip back
                  </span>
                  <span>Rate your recall below (keys 1-4)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation & Spaced Repetition Rating Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            {/* Prev / Next controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition"
                title="Previous Card (Left Arrow)"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFlipped(!isFlipped)}
                className="px-4 py-2.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-medium flex items-center gap-2 transition"
              >
                <RotateCw className="w-4 h-4 text-indigo-400" /> Flip Card
              </button>
              <button
                onClick={handleNext}
                className="p-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 transition"
                title="Next Card (Right Arrow)"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Spaced Repetition Feedback Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRate('again')}
                className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-xs font-semibold transition"
                title="Rate: Again (1)"
              >
                Again (1)
              </button>
              <button
                onClick={() => handleRate('hard')}
                className="px-3 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/40 text-amber-300 text-xs font-semibold transition"
                title="Rate: Hard (2)"
              >
                Hard (2)
              </button>
              <button
                onClick={() => handleRate('good')}
                className="px-3 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-800/40 text-indigo-300 text-xs font-semibold transition"
                title="Rate: Good (3)"
              >
                Good (3)
              </button>
              <button
                onClick={() => handleRate('easy')}
                className="px-4 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-300 text-xs font-semibold transition shadow-md shadow-emerald-900/20"
                title="Rate: Easy / Mastered (4)"
              >
                Easy / Master (4)
              </button>
            </div>
          </div>
        </>
      ) : (
        /* LIST VIEW OF ALL FLASHCARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flashcards.map((card, idx) => (
            <div
              key={card.id}
              className={`p-5 rounded-2xl border transition bg-neutral-900 flex flex-col justify-between ${
                card.mastered
                  ? 'border-emerald-500/30'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                  {card.mastered ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Mastered
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-neutral-500">Learning</span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-neutral-200 mb-2">{card.front}</h4>
                <p className="text-xs text-neutral-400 leading-relaxed">{card.back}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                <span>Reviews: {card.reviewCount || 0}</span>
                <button
                  onClick={() => {
                    setCurrentIndex(idx);
                    setViewMode('deck');
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Practice in 3D &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
