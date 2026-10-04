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
import { cleanPromptArtifacts } from '../utils/formatters';

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
        colors: ['#7C3AED', '#06B6D4', '#10B981'],
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
      <div className="p-16 text-center border-2 border-dashed border-[#262B36] rounded-2xl bg-[#161922]">
        <Sparkles className="w-10 h-10 text-[#7C3AED] mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#F9FAFB]">No documents uploaded yet</h3>
        <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto">
          Upload a study document to automatically generate adaptive practice quizzes with detailed explanations.
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
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Quiz Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#161922] border border-[#262B36]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] font-mono tabular-nums">
            <span className="font-sans font-semibold text-[#06B6D4]">
              {material.subject}
            </span>
            <span aria-hidden="true">•</span>
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#F9FAFB] mt-1">Adaptive Mastery Quiz</h2>
        </div>

        <button
          onClick={handleRetakeFull}
          className="px-3.5 py-2 bg-[#0D0F12] hover:bg-[#1E222D] border border-[#262B36] rounded-xl text-xs font-semibold text-[#F9FAFB] flex items-center gap-1.5 transition self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#06B6D4]" />
          <span>Retake Quiz</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#161922] h-2 rounded-full overflow-hidden border border-[#262B36]">
        <div
          className="bg-[#7C3AED] h-full transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {!isQuizCompleted ? (
        /* Active Question Card: Outer rounded-2xl (16px) */
        <div className="p-6 sm:p-8 rounded-2xl bg-[#161922] border border-[#262B36] space-y-6 animate-in fade-in duration-150">
          {/* Question Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono tabular-nums font-bold text-[#7C3AED] uppercase tracking-wider">
                Question #{currentQuestionIndex + 1}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#F9FAFB] mt-1.5 leading-snug">
                {cleanPromptArtifacts(currentQ?.question)}
              </h3>
            </div>
            {currentQ?.difficulty && (
              <span className="text-xs font-medium capitalize text-[#9CA3AF] shrink-0">
                {currentQ.difficulty}
              </span>
            )}
          </div>

          {/* Options Grid: Auto-height (p-4 h-auto w-full text-left) with concentric rounded-xl (12px) */}
          <div className="space-y-2.5">
            {currentQ?.options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctAnswerIndex;

              let btnStyle =
                'bg-[#0D0F12] border-[#262B36] hover:border-[#7C3AED] hover:bg-[#1C202B] text-[#F9FAFB]';

              if (isAnswerSubmitted) {
                if (isCorrect) {
                  btnStyle =
                    'bg-[#10B981]/15 border-[#10B981] text-[#F9FAFB] ring-1 ring-[#10B981]/40';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'bg-rose-950/60 border-rose-500 text-rose-100';
                } else {
                  btnStyle = 'bg-[#0D0F12] opacity-45 border-[#262B36] text-[#9CA3AF]';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswerSubmitted}
                  className={`p-4 h-auto w-full text-left rounded-xl border text-xs sm:text-sm font-medium transition flex items-start justify-between gap-3 ${btnStyle}`}
                >
                  <span className="leading-relaxed whitespace-normal break-words flex-1">
                    {cleanPromptArtifacts(option)}
                  </span>
                  {isAnswerSubmitted && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Section */}
          {isAnswerSubmitted && (
            <div
              className={`p-4 rounded-xl border text-xs leading-relaxed animate-in fade-in duration-150 ${
                selectedOption === currentQ?.correctAnswerIndex
                  ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#F9FAFB]'
                  : 'bg-rose-950/30 border-rose-800/50 text-rose-100'
              }`}
            >
              <strong className="block font-bold text-[#F9FAFB] mb-1">
                {selectedOption === currentQ?.correctAnswerIndex ? '✓ Correct Answer' : '✗ Incorrect'}
              </strong>
              <span className="text-[#9CA3AF]">
                {cleanPromptArtifacts(currentQ?.explanation)}
              </span>
            </div>
          )}

          {/* Footer Action */}
          <div className="flex items-center justify-between pt-4 border-t border-[#262B36]">
            <span className="text-xs text-[#9CA3AF] font-mono tabular-nums">
              Score: <strong className="text-[#F9FAFB]">{score}</strong> / {currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)}
            </span>

            {isAnswerSubmitted && (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
              >
                <span>{currentQuestionIndex + 1 < questions.length ? 'Next Question' : 'Complete Quiz'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Results Card */
        <div className="p-8 sm:p-10 rounded-2xl bg-[#161922] border border-[#262B36] text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="p-4 rounded-2xl bg-[#0D0F12] border border-[#262B36] text-[#06B6D4] w-fit mx-auto">
            <Trophy className="w-12 h-12" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#7C3AED]">
              Quiz Completed
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F9FAFB] mt-1.5">
              {percentage >= 80 ? 'Exceptional Mastery!' : percentage >= 50 ? 'Great Practice!' : 'Keep Studying!'}
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-1 max-w-md mx-auto">
              You correctly answered {score} out of {questions.length} questions on {material.title}.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#0D0F12] border border-[#262B36] max-w-sm mx-auto flex items-center justify-around">
            <div>
              <span className="text-3xl font-extrabold text-[#10B981] font-mono tabular-nums">{percentage}%</span>
              <p className="text-[11px] text-[#9CA3AF] uppercase font-semibold mt-0.5">Accuracy</p>
            </div>
            <div className="h-8 w-px bg-[#262B36]" />
            <div>
              <span className="text-3xl font-extrabold text-[#06B6D4] font-mono tabular-nums">{score}/{questions.length}</span>
              <p className="text-[11px] text-[#9CA3AF] uppercase font-semibold mt-0.5">Correct</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetakeFull}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0D0F12] hover:bg-[#1E222D] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition border border-[#262B36]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#06B6D4]" /> Retake Full Quiz
            </button>

            {score < questions.length && (
              <button
                onClick={handleRetakeMissed}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
              >
                <span>Practice Missed ({questions.length - score})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('notes')}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#0D0F12] hover:bg-[#1E222D] text-[#9CA3AF] hover:text-[#F9FAFB] rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition border border-[#262B36]"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#A78BFA]" /> Review Notes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
