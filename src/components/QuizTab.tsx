import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  ArrowRight,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion, StudyMaterial } from '../types/study';

interface QuizTabProps {
  material: StudyMaterial | null;
  onUpdateMaterial: (updated: StudyMaterial) => void;
  onNavigateToTab: (tab: 'notes' | 'flashcards' | 'documents') => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  material,
  onNavigateToTab,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [filteredQuestions, setFilteredQuestions] = useState<QuizQuestion[]>([]);

  useEffect(() => {
    if (material && material.quiz) {
      setFilteredQuestions(material.quiz);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setUserAnswers({});
      setIsAnswerSubmitted(false);
      setIsQuizCompleted(false);
    }
  }, [material?.id]);

  const questions = (filteredQuestions.length > 0 ? filteredQuestions : material?.quiz) || [];
  const currentQ = questions[currentQuestionIndex];

  // Calculate score
  const score = Object.entries(userAnswers).reduce((acc, [qIdxStr, chosenOption]) => {
    const q = questions[parseInt(qIdxStr, 10)];
    return q && q.correctAnswerIndex === chosenOption ? acc + 1 : acc;
  }, 0);

  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8E44AD', '#F1C40F', '#2ECC71', '#34495E'],
      });
    } catch {
      // Confetti fallback
    }
  };

  const handleSelectOption = (optIndex: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(optIndex);
    setIsAnswerSubmitted(true);
    setUserAnswers((prev) => ({
      ...prev,
      [currentQuestionIndex]: optIndex,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      const nextAnswer = userAnswers[currentQuestionIndex + 1];
      setSelectedOption(nextAnswer !== undefined ? nextAnswer : null);
      setIsAnswerSubmitted(nextAnswer !== undefined);
    } else {
      setIsQuizCompleted(true);
      if (percentage >= 70) {
        triggerConfetti();
      }
    }
  };

  const handleRetakeFull = () => {
    if (!material) return;
    setFilteredQuestions(material.quiz);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setIsAnswerSubmitted(false);
    setIsQuizCompleted(false);
  };

  const handleRetakeMissed = () => {
    if (!material) return;
    const missed = questions.filter((q, idx) => {
      const userAns = userAnswers[idx];
      return userAns === undefined || userAns !== q.correctAnswerIndex;
    });

    if (missed.length === 0) {
      handleRetakeFull();
      return;
    }

    setFilteredQuestions(missed);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setIsAnswerSubmitted(false);
    setIsQuizCompleted(false);
  };

  if (!material || material.quiz.length === 0) {
    return (
      <div className="p-16 text-center border border-dashed border-[#34495E]/60 rounded-2xl bg-neutral-950/50">
        <Sparkles className="w-10 h-10 text-[#F1C40F] mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-100">No documents uploaded yet</h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
          Upload a study document to automatically generate adaptive practice quizzes with detailed explanations.
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
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              {material.subject}
            </span>
            <span className="text-xs text-neutral-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mt-1">Adaptive Mastery Quiz</h2>
        </div>

        <button
          onClick={handleRetakeFull}
          className="px-3 py-1.5 bg-neutral-950 hover:bg-neutral-800 border border-[#34495E]/60 rounded-xl text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#F1C40F]" /> Retake Quiz
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-neutral-900 h-2.5 rounded-full overflow-hidden border border-[#34495E]/50">
        <div
          className="bg-gradient-to-r from-[#8E44AD] via-[#F1C40F] to-[#2ECC71] h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {!isQuizCompleted ? (
        /* Active Question Card */
        <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-[#34495E]/80 shadow-2xl space-y-6 animate-in fade-in duration-150">
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono font-bold text-[#a569bd] uppercase tracking-wider">
                Question #{currentQuestionIndex + 1}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-neutral-100 mt-1.5 leading-snug">
                {currentQ?.question}
              </h3>
            </div>
            {currentQ?.difficulty && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg border shrink-0 ${
                  currentQ.difficulty === 'easy'
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                    : currentQ.difficulty === 'hard'
                    ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                    : 'bg-amber-950/60 text-[#F1C40F] border-amber-800/40'
                }`}
              >
                {currentQ.difficulty}
              </span>
            )}
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentQ?.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctAnswerIndex;

              let btnStyle = 'bg-neutral-950 border-[#34495E]/70 hover:border-[#8E44AD] text-neutral-200';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-950/80 border-[#2ECC71] text-emerald-100 shadow-lg shadow-emerald-900/30';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-950/80 border-rose-600 text-rose-100';
                } else {
                  btnStyle = 'bg-neutral-950 opacity-40 border-neutral-800 text-neutral-500';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswerSubmitted}
                  className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between gap-3 ${btnStyle}`}
                >
                  <span className="leading-relaxed">{option}</span>
                  {isAnswerSubmitted && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-[#2ECC71] shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Section */}
          {isAnswerSubmitted && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-200 ${
                selectedOption === currentQ?.correctAnswerIndex
                  ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-800/50 text-rose-200'
              }`}
            >
              <strong className="block font-bold text-white mb-1">
                {selectedOption === currentQ?.correctAnswerIndex ? '✓ Correct Answer!' : '✗ Incorrect'}
              </strong>
              <span>{currentQ?.explanation}</span>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-4 border-t border-[#34495E]/50">
            <span className="text-xs text-neutral-400 font-mono">
              Score: {score} / {currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)}
            </span>

            {isAnswerSubmitted && (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#8E44AD]/30 transition active:scale-95"
              >
                <span>{currentQuestionIndex + 1 < questions.length ? 'Next Question' : 'Complete Quiz'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Card */
        <div className="p-8 sm:p-10 rounded-3xl bg-neutral-900 border border-[#34495E]/80 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="p-4 rounded-3xl bg-[#8E44AD]/15 border border-[#8E44AD]/30 text-[#F1C40F] w-fit mx-auto shadow-xl">
            <Trophy className="w-12 h-12" />
          </div>

          <div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#8E44AD]/20 text-[#a569bd] border border-[#8E44AD]/40">
              Quiz Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 mt-2">
              {percentage >= 80 ? 'Exceptional Mastery!' : percentage >= 50 ? 'Great Practice!' : 'Keep Studying!'}
            </h2>
            <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
              You correctly answered {score} out of {questions.length} questions on {material.title}.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-950 border border-[#34495E]/60 max-w-sm mx-auto flex items-center justify-around">
            <div>
              <span className="text-3xl font-extrabold text-[#2ECC71] font-mono">{percentage}%</span>
              <p className="text-[11px] text-neutral-400 uppercase font-semibold mt-0.5">Accuracy</p>
            </div>
            <div className="h-8 w-px bg-[#34495E]" />
            <div>
              <span className="text-3xl font-extrabold text-[#F1C40F] font-mono">{score}/{questions.length}</span>
              <p className="text-[11px] text-neutral-400 uppercase font-semibold mt-0.5">Correct</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetakeFull}
              className="w-full sm:w-auto px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition border border-[#34495E]/60"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#F1C40F]" /> Retake Full Quiz
            </button>

            {score < questions.length && (
              <button
                onClick={handleRetakeMissed}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8E44AD]/30 transition"
              >
                <span>Practice Missed ({questions.length - score})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('notes')}
              className="w-full sm:w-auto px-5 py-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition border border-[#34495E]/50"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#a569bd]" /> Review Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
