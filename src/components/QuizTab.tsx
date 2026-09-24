import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
  ChevronRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QuizQuestion, StudyMaterial } from '../types/study';
import { saveMaterialToDatabase } from '../services/supabase';

interface QuizTabProps {
  material: StudyMaterial | null;
  onUpdateMaterial: (updated: StudyMaterial) => void;
  onNavigateToTab: (tab: 'notes' | 'flashcards' | 'documents') => void;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  material,
  onUpdateMaterial,
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
      <div className="p-16 text-center border border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50">
        <Sparkles className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-neutral-200">No documents uploaded yet</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
          Upload a study document to automatically generate adaptive practice quizzes with detailed explanations.
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
        colors: ['#6366f1', '#10b981', '#38bdf8', '#f59e0b'],
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

    // Trigger celebration if correct
    if (optIndex === currentQ.correctAnswerIndex) {
      // subtle audio feedback or visual effect
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
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
            <span className="text-xs font-mono font-medium text-neutral-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <button
              onClick={handleRetakeFull}
              title="Restart Quiz"
              className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {!isQuizCompleted ? (
        <>
          {/* Question Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                <span className="font-mono uppercase tracking-wider text-indigo-400">
                  Concept Challenge #{currentQuestionIndex + 1}
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

                let optionStyles = 'bg-neutral-950/70 border-neutral-800 text-neutral-200 hover:border-neutral-700';

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    optionStyles = 'bg-emerald-950/40 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/40';
                  } else if (isSelected && !isCorrect) {
                    optionStyles = 'bg-rose-950/40 border-rose-500 text-rose-200 ring-1 ring-rose-500/40';
                  } else {
                    optionStyles = 'bg-neutral-950/40 border-neutral-800/60 text-neutral-500 opacity-60';
                  }
                } else if (isSelected) {
                  optionStyles = 'bg-indigo-950/40 border-indigo-500 text-white';
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
                          ? 'bg-emerald-500 text-neutral-950 border-emerald-400'
                          : isAnswerSubmitted && isSelected && !isCorrect
                          ? 'bg-rose-500 text-neutral-950 border-rose-400'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <span className="flex-1 leading-relaxed">{option}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
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
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider mb-1.5">
                  {selectedOption === currentQ.correctAnswerIndex ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Correct! Outstanding Recall
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-amber-400" /> Review Concept Key
                    </>
                  )}
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed font-normal">
                  {currentQ.explanation}
                </p>
              </div>
            )}

            {/* Next / Continue Button */}
            {isAnswerSubmitted && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleNextQuestion}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-95"
                >
                  <span>
                    {currentQuestionIndex + 1 === questions.length ? 'View Results' : 'Next Question'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        /* QUIZ VICTORY & SUMMARY SCREEN */
        <div className="p-8 sm:p-10 rounded-3xl bg-neutral-900 border border-neutral-800 shadow-2xl text-center space-y-6">
          <div className="relative inline-flex items-center justify-center p-4 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-emerald-500/20 border border-indigo-500/30">
            <Trophy className="w-12 h-12 text-amber-400 animate-bounce" />
          </div>

          <div>
            <h3 className="text-2xl font-bold text-neutral-100">Quiz Completed!</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              You scored <span className="text-white font-bold">{score}</span> out of{' '}
              <span className="text-white font-bold">{questions.length}</span> correct
            </p>
          </div>

          {/* Score Badge */}
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-white to-emerald-300">
                {percentage}%
              </span>
              <span className="text-[11px] text-neutral-500 uppercase tracking-widest mt-1">Accuracy</span>
            </div>
            <div className="h-10 w-[1px] bg-neutral-800" />
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black font-mono text-emerald-400">
                {percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : 'Needs Review'}
              </span>
              <span className="text-[11px] text-neutral-500 uppercase tracking-widest mt-1">Grade</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRetakeFull}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4" /> Retake Entire Quiz
            </button>

            {percentage < 100 && (
              <button
                onClick={handleRetakeMissed}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-amber-600/20"
              >
                Retake Missed Questions ({questions.length - score})
              </button>
            )}

            <button
              onClick={() => onNavigateToTab('notes')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/20"
            >
              <BookOpen className="w-4 h-4" /> Return to Study Notes
            </button>
          </div>

          {/* Question by Question Review */}
          <div className="pt-6 border-t border-neutral-800 text-left space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
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
                        ? 'bg-neutral-950/60 border-emerald-900/30'
                        : 'bg-neutral-950/60 border-rose-900/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-neutral-200">
                        {idx + 1}. {q.question}
                      </span>
                      {isCorrect ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 shrink-0">
                          Correct
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 shrink-0">
                          Missed
                        </span>
                      )}
                    </div>
                    <p className="text-neutral-400 mt-1">{q.explanation}</p>
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
