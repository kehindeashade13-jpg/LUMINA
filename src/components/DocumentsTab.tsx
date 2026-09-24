import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Clock,
  Layers,
  HelpCircle,
  BookOpen,
  FileCheck,
  Search,
} from 'lucide-react';
import { StudyMaterial } from '../types/study';

interface DocumentsTabProps {
  materials: StudyMaterial[];
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onOpenUploadModal: () => void;
  onNavigateToTab: (tab: 'notes' | 'flashcards' | 'quiz') => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  materials,
  currentMaterial,
  onSelectMaterial,
  onDeleteMaterial,
  onOpenUploadModal,
  onNavigateToTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);

  const subjects = Array.from(new Set(materials.map((m) => m.subject).filter(Boolean)));

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.summary && m.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === 'all' || m.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#8E44AD]/10 border border-[#34495E]/60 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              Document Repository
            </span>
            <span className="text-xs text-neutral-400">
              {materials.length} {materials.length === 1 ? 'Document' : 'Documents'} Loaded
            </span>
          </div>
          <h2 className="text-xl font-bold text-neutral-100 mt-1">Study Materials Library</h2>
          <p className="text-xs text-neutral-400 max-w-xl mt-0.5">
            All documents, notes, flashcards, and quizzes are automatically serialized and synchronized with your single-table Supabase database.
          </p>
        </div>

        <button
          onClick={onOpenUploadModal}
          className="px-4 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#8E44AD]/25 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search documents by title, subject, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                selectedSubject === 'all'
                  ? 'bg-neutral-800 text-white border border-[#34495E]/60'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 ${
                  selectedSubject === subj
                    ? 'bg-[#8E44AD]/20 text-[#a569bd] border border-[#8E44AD]/40'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Material Cards Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#34495E]/60 rounded-2xl bg-neutral-950/50">
          <FileText className="w-10 h-10 text-[#F1C40F] mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-neutral-200">
            {searchQuery ? 'No matching documents found' : 'No documents uploaded yet'}
          </h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search criteria.'
              : 'Upload a study document (PDF, text notes, or markdown) to generate your first AI study suite.'}
          </p>
          <button
            onClick={onOpenUploadModal}
            className="mt-4 px-4 py-2 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-md shadow-[#8E44AD]/25"
          >
            <Plus className="w-3.5 h-3.5" /> Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => {
            const isActive = currentMaterial?.id === mat.id;
            return (
              <div
                key={mat.id}
                className={`flex flex-col justify-between p-5 rounded-2xl border transition group relative bg-neutral-900/90 shadow-sm ${
                  isActive
                    ? 'border-[#8E44AD] ring-1 ring-[#8E44AD]/50 shadow-lg shadow-[#8E44AD]/15'
                    : 'border-[#34495E]/60 hover:border-[#8E44AD]/60'
                }`}
              >
                <div>
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 truncate">
                      {mat.subject}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 flex items-center gap-1">
                        <FileCheck className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>

                  {/* Title & Summary */}
                  <h3 className="text-sm font-bold text-neutral-100 group-hover:text-[#F1C40F] transition line-clamp-2">
                    {mat.title}
                  </h3>
                  <p className="text-xs text-neutral-300 line-clamp-3 mt-2 leading-relaxed">
                    {mat.summary}
                  </p>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-[#34495E]/50 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-neutral-400">Read Time</span>
                      <span className="font-semibold text-neutral-200 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {mat.estimatedReadTimeMinutes || 5}m
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-400">Flashcards</span>
                      <span className="font-semibold text-[#F1C40F] flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3 text-[#a569bd]" />
                        {mat.flashcards.length}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-400">Quiz</span>
                      <span className="font-semibold text-[#2ECC71] flex items-center gap-1 mt-0.5">
                        <HelpCircle className="w-3 h-3 text-[#2ECC71]" />
                        {mat.quiz.length} Qs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onSelectMaterial(mat);
                        onNavigateToTab('notes');
                      }}
                      className="px-3 py-1.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-lg text-xs font-semibold transition shadow-sm"
                    >
                      Study Notes
                    </button>
                    <button
                      onClick={() => {
                        onSelectMaterial(mat);
                        onNavigateToTab('flashcards');
                      }}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium transition border border-[#34495E]/60"
                    >
                      Cards
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPreviewMaterial(mat)}
                      title="Inspect extracted raw text"
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteMaterial(mat.id)}
                      title="Delete document"
                      className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Text Preview Drawer Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-[#34495E]/80 rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#34495E]/50">
              <div>
                <h3 className="text-base font-bold text-neutral-100">{previewMaterial.title}</h3>
                <p className="text-xs text-neutral-400">
                  Extracted Raw Text ({previewMaterial.rawText.split(/\s+/).length} words)
                </p>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto my-4 p-4 bg-neutral-950 rounded-xl border border-[#34495E]/60 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed flex-1">
              {previewMaterial.rawText}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium transition border border-[#34495E]/60"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
