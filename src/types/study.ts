export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mastered?: boolean;
  reviewCount?: number;
  lastReviewed?: string;
  options?: string[];
  correctOptionIndex?: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  userAnswerIndex?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface PracticeQuestion {
  id: string;
  question: string;
  sampleAnswer: string;
  topic?: string;
  keyTakeaway?: string;
  difficulty?: 'basic' | 'intermediate' | 'advanced';
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
}

export interface StudyNoteSection {
  title: string;
  content: string;
  keyTakeaways: string[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface StudyMaterial {
  id: string;
  userId?: string;
  title: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  lastAccessedAt?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  rawText: string;
  summary: string;
  keyPoints: string[];
  glossary: GlossaryTerm[];
  sections: StudyNoteSection[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  practiceQuestions?: PracticeQuestion[];
  tags: string[];
  estimatedReadTimeMinutes?: number;
}

export interface LuminaUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type ActiveTab = 'notes' | 'flashcards' | 'quiz' | 'documents';
