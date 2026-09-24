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

  const questions = filteredQuestions.length > 0 ? filteredQuestions : material.quiz;
  const currentQ = questions[currentQuestionIndex];

  // Calculate score
  const score = Object.entries(userAnswers).reduce((acc, [qIdxStr, chosenOption]) => {
    const q = questions[parseInt(qIdxStr, 10)];
    return q && q.correctAnswerIndex === chosenOption ? acc + 1 : acc;
  }, 0);

  const percentage = Math.round((score / questions.length) * 100);

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
    setFilteredQuestions(material.quiz);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setUserAnswers({});
    setIsAnswerSubmitted(false);
    setIsQuizCompleted(false);
  };

  const handleRetakeMissed = () => {
    const missed = material.quiz.filter((q, idx) => userAnswers[idx] !== q.correctAnswerIndex);
    if (missed.length > 0) {
      setFilteredQuestions(missed);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setUserAnswers({});
      setIsAnswerSubmitted(false);
      setIsQuizCompleted(false);
    } else {
      handleRetakeFull();
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              {material.subject}
            </span>
            <span className="text-xs text-neutral-400">
              {questions.length} Multiple Choice Questions
            </span>
          </div>
          <h2 className="text-lg font-bold text-neutral-100 mt-1">Adaptive Knowledge Assessment</h2>
        </div>

        {!isQuizCompleted && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-[#F1C40F]">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <button
              onClick={handleRetakeFull}
              title="Restart Quiz"
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition border border-[#34495E]/60"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {!isQuizCompleted ? (
        <>
          {/* Question Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-[#34495E]/70 shadow-xl space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                <span className="font-mono uppercase tracking-wider text-[#F1C40F] font-bold">
                  ★ Concept Challenge #{currentQuestionIndex + 1}
                </span>
                <span>Single Choice</span>
              </div>
              <h3 className="text-base sm:text-xl font-bold text-neutral-100 leading-snug">
                {currentQ.question}
              </h3>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQ.options.map((option, optIdx) => {
                const isSelected = selectedOption === optIdx;
                const isCorrect = optIdx === currentQ.correctAnswerIndex;

                let optionStyles = 'bg-neutral-950/70 border-[#34495E]/60 text-neutral-200 hover:border-[#8E44AD]';

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    optionStyles = 'bg-[#2ECC71]/15 border-[#2ECC71] text-emerald-100 ring-1 ring-[#2ECC71]/50';
                  } else if (isSelected && !isCorrect) {
                    optionStyles = 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/40';
                  } else {
                    optionStyles = 'bg-neutral-950/40 border-[#34495E]/40 text-neutral-400 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyles = 'bg-[#8E44AD]/25 border-[#8E44AD] text-white';
                }

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    disabled={isAnswerSubmitted}
                    className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition flex items-start gap-3.5 ${optionStyles}`}
                  >
                    <div
                      className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 border ${
                        isAnswerSubmitted && isCorrect
                          ? 'bg-[#2ECC71] text-neutral-950 border-[#2ECC71]'
                          : isAnswerSubmitted && isSelected && !isCorrect
                          ? 'bg-rose-500 text-neutral-950 border-rose-400'
                          : 'bg-neutral-900 border-[#34495E]/80 text-neutral-300'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="flex-1 leading-relaxed">{option}</span>
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

            {/* Explanation box revealed after answering */}
            {isAnswerSubmitted && (
              <div
                className={`p-5 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
                  selectedOption === currentQ.correctAnswerIndex
                    ? 'bg-[#2ECC71]/10 border-[#2ECC71]/40 text-emerald-200'
                    : 'bg-[#F1C40F]/10 border-[#F1C40F]/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1.5">
                  {selectedOption === currentQ.correctAnswerIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" /> Correct! Outstanding Recall
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-[#F1C40F]" /> Review Concept Key
                    </>
                  )}
                </div>
                <p className="text-xs text-neutral-200 leading-relaxed font-normal">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Next / Continue Button (Deep Violet #8E44AD) */}
            {isAnswerSubmitted && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#8E44AD]/30 transition active:scale-95"
                >
                  <span>
                    {currentQuestionIndex + 1 === questions.length ? 'View Results' : 'Next Question'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 30-Question Quick Jump Matrix */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 space-y-3 shadow-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-neutral-200">Question Matrix ({questions.length} Items)</span>
              <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2ECC71]" /> Correct
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Incorrect
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#34495E]" /> Unanswered
                </span>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5 pt-1">
              {questions.map((q, qIdx) => {
                const ans = userAnswers[qIdx];
                const isAnswered = ans !== undefined;
                const isCorrect = isAnswered && ans === q.correctAnswerIndex;
                const isCurrent = qIdx === currentQuestionIndex;

                let btnClass = 'bg-neutral-950 border-[#34495E]/60 text-neutral-400 hover:text-white hover:border-[#8E44AD]';

                if (isAnswered) {
                  btnClass = isCorrect
                    ? 'bg-[#2ECC71]/20 border-[#2ECC71] text-[#2ECC71]'
                    : 'bg-rose-950/60 border-rose-600 text-rose-300';
                }

                if (isCurrent) {
                  btnClass += ' ring-2 ring-[#8E44AD] font-bold text-white';
                }

                return (
                  <button
                    key={qIdx}
                    onClick={() => {
                      setCurrentQuestionIndex(qIdx);
                      setSelectedOption(ans !== undefined ? ans : null);
                      setIsAnswerSubmitted(ans !== undefined);
                    }}
                    className={`py-2 rounded-xl text-xs font-mono border transition flex items-center justify-center ${btnClass}`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* QUIZ VICTORY & SUMMARY SCREEN */
        <div className="p-8 sm:p-10 rounded-3xl bg-neutral-900 border border-[#34495E]/60 shadow-2xl text-center space-y-6">
          <div className="relative inline-flex items-center justify-center p-4 rounded-3xl bg-gradient-to-tr from-[#8E44AD]/20 to-[#2ECC71]/20 border border-[#8E44AD]/40">
            <Trophy className="w-12 h-12 text-[#F1C40F] animate-bounce" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-neutral-100">Quiz Completed!</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              You scored <span className="text-[#2ECC71] font-bold">{score}</span> out of{' '}
              <span className="text-white font-bold">{questions.length}</span> correct
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#a569bd] via-white to-[#2ECC71]">
                {percentage}%
              </span>
              <span className="text-[11px] text-neutral-400 uppercase tracking-widest mt-1">Accuracy</span>
            </div>
            <div className="h-10 w-[1px] bg-[#34495E]/60" />
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black font-mono text-[#2ECC71]">
                {percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : 'Needs Review'}
              </span>
              <span className="text-[11px] text-neutral-400 uppercase tracking-widest mt-1">Grade</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetakeFull}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition border border-[#34495E]/60"
            >
              <RotateCcw className="w-4 h-4" /> Retake Entire Quiz
            </button>

            {percentage < 100 && (
              <button
                onClick={handleRetakeMissed}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#F1C40F] hover:bg-[#d4ac0d] text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-[#F1C40F]/20"
              >
                Retake Missed ({questions.length - score})
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('notes')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#8E44AD] hover:bg-[#7D3C98] text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-[#8E44AD]/30"
            >
              <BookOpen className="w-4 h-4" /> Return to Study Notes
            </button>
          </div>

          {/* Question by Question Review */}
          <div className="pt-6 border-t border-[#34495E]/50 text-left space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#F1C40F]">
              Detailed Question Analysis
            </h4>
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const userChoice = userAnswers[idx];
                const isCorrect = userChoice === q.correctAnswerIndex;
                return (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-xl border text-xs ${
                      isCorrect
                        ? 'bg-neutral-950/60 border-[#2ECC71]/30'
                        : 'bg-neutral-950/60 border-rose-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-neutral-100">
                        {idx + 1}. {q.question}
                      </span>
                      {isCorrect ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] shrink-0 border border-[#2ECC71]/30">
                          Correct
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 shrink-0 border border-rose-500/20">
                          Missed
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-300 mt-1">{q.explanation}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
