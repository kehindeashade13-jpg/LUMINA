export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mastered?: boolean;
  reviewCount?: number;
  lastReviewed?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  userAnswerIndex?: number;
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
  title: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
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
  tags: string[];
  estimatedReadTimeMinutes?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type ActiveTab = 'notes' | 'flashcards' | 'quiz' | 'documents';

