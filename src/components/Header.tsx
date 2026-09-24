import React from 'react';
import {
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  Plus,
  Database,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { ActiveTab, StudyMaterial } from '../types/study';
import { isSupabaseConfigured } from '../services/supabase';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  materials: StudyMaterial[];
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
  onOpenUploadModal: () => void;
  onOpenSettingsModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  materials,
  currentMaterial,
  onSelectMaterial,
  onOpenUploadModal,
  onOpenSettingsModal,
}) => {
  const supabaseConnected = isSupabaseConfigured();

  const flashcardCount = currentMaterial?.flashcards.length || 0;
  const quizCount = currentMaterial?.quiz.length || 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-800/80 bg-neutral-950/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Desktop & Tablet Single-Row Bar (md and up) */}
        <div className="hidden md:flex items-center justify-between h-16 gap-3 lg:gap-4">
          {/* Brand Logo & Name + Document Selector */}
          <div className="flex items-center gap-3 lg:gap-5 shrink-0 min-w-0">
            <div
              className="flex items-center gap-2 cursor-pointer shrink-0"
              onClick={() => setActiveTab('notes')}
            >
              <div className="relative flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base lg:text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-indigo-200">
                  LUMINA
                </span>
                <span className="text-[9px] font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  AI
                </span>
              </div>
            </div>

            {/* Document Selector Dropdown */}
            {materials.length > 0 && (
              <div className="relative group shrink min-w-0 max-w-[150px] lg:max-w-[220px]">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white hover:border-neutral-700 transition w-full">
                  <span className="truncate text-left">
                    {currentMaterial ? currentMaterial.title : 'Select Document'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-auto" />
                </button>

                <div className="absolute left-0 top-full mt-1.5 w-64 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-1.5 hidden group-hover:block hover:block z-50 animate-in fade-in duration-100">
                  <div className="text-[10px] font-semibold text-neutral-500 uppercase px-2.5 py-1">
                    Study Materials ({materials.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => onSelectMaterial(mat)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex flex-col ${
                          currentMaterial?.id === mat.id
                            ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                            : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <span className="truncate">{mat.title}</span>
                        <span className="text-[10px] text-neutral-500">{mat.subject}</span>
                      </button>
                    ))}
                  </div>
                  <div className="pt-1 mt-1 border-t border-neutral-800">
                    <button
                      onClick={onOpenUploadModal}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-indigo-400 hover:bg-neutral-800 flex items-center gap-1.5 font-medium transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> Upload New Document
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="flex items-center gap-1 bg-neutral-900/80 p-1 rounded-xl border border-neutral-800/80 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Docs</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Flashcards</span>
              {flashcardCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-950/60 font-mono">
                  {flashcardCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Quiz</span>
              {quizCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-950/60 font-mono">
                  {quizCount}
                </span>
              )}
            </button>
          </nav>

          {/* Right Action Tools - Desktop */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Supabase Status Pill */}
            <button
              onClick={onOpenSettingsModal}
              title={
                supabaseConnected
                  ? 'Supabase Persistence: Connected'
                  : 'Using Local Storage. Click to configure Supabase'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition ${
                supabaseConnected
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300 hover:bg-emerald-950/50'
                  : 'bg-amber-950/30 border-amber-800/40 text-amber-300 hover:bg-amber-950/50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  supabaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <Database className="w-3 h-3" />
              <span className="hidden xl:inline">
                {supabaseConnected ? 'Supabase Synced' : 'Local Cache'}
              </span>
            </button>

            {/* Settings Modal Toggle */}
            <button
              onClick={onOpenSettingsModal}
              title="Settings & Credentials"
              className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Upload Document Primary CTA */}
            <button
              onClick={onOpenUploadModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs shadow-md shadow-indigo-600/25 transition active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
          </div>
        </div>

        {/* Mobile & Small Screens View (< md): Two-Row Clean Layout */}
        <div className="flex md:hidden flex-col py-2.5 gap-2">
          {/* Top Bar: Brand, Document Selector & Fast Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Brand Logo */}
            <div
              className="flex items-center gap-1.5 cursor-pointer shrink-0"
              onClick={() => setActiveTab('notes')}
            >
              <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px]">
                <div className="w-full h-full bg-neutral-950 rounded-[7px] flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
              <span className="text-sm font-black tracking-wider text-white">LUMINA</span>
            </div>

            {/* Document Selector on Mobile */}
            {materials.length > 0 && (
              <div className="relative group flex-1 max-w-[170px] min-w-0">
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] font-medium text-neutral-300 w-full truncate">
                  <span className="truncate">
                    {currentMaterial ? currentMaterial.title : 'Select Doc'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-500 shrink-0 ml-auto" />
                </button>

                <div className="absolute left-0 top-full mt-1 w-60 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl p-1.5 hidden group-hover:block hover:block z-50">
                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {materials.map((mat) => (
                      <button
                        key={mat.id}
                        onClick={() => onSelectMaterial(mat)}
                        className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition ${
                          currentMaterial?.id === mat.id
                            ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                            : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        <div className="truncate">{mat.title}</div>
                        <div className="text-[10px] text-neutral-500">{mat.subject}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onOpenSettingsModal}
                title="Settings"
                className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 transition"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onOpenUploadModal}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white font-medium text-xs shadow-sm transition active:scale-95"
              >
                <Plus className="w-3" />
                <span>Upload</span>
              </button>
            </div>
          </div>

          {/* Bottom Bar: 100% Screen-Fitted Full Navigation Tabs */}
          <nav className="grid grid-cols-4 gap-1 bg-neutral-900/90 p-1 rounded-xl border border-neutral-800/80 text-xs w-full">
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Docs</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Notes</span>
            </button>

            <button
              onClick={() => setActiveTab('flashcards')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Cards</span>
              {flashcardCount > 0 && (
                <span className="px-1 py-0.1 rounded-full text-[9px] bg-neutral-950/60 font-mono">
                  {flashcardCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex items-center justify-center gap-1 py-1.5 rounded-lg font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Quiz</span>
              {quizCount > 0 && (
                <span className="px-1 py-0.1 rounded-full text-[9px] bg-neutral-950/60 font-mono">
                  {quizCount}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
