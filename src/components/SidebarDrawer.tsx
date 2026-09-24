import React from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  FileText,
  Layers,
  HelpCircle,
  Clock,
  User,
  LogOut,
  LogIn,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, StudyMaterial, LuminaUser } from '../types/study';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: LuminaUser | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  materials: StudyMaterial[];
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
  onOpenUploadModal: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  user,
  activeTab,
  setActiveTab,
  materials,
  currentMaterial,
  onSelectMaterial,
  onOpenUploadModal,
  onOpenAuthModal,
  onSignOut,
}) => {
  if (!isOpen) return null;

  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S';

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleRecentClick = () => {
    setActiveTab('documents');
    onClose();
    // Smooth scroll to top of workspace
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Slide-out Sidebar Panel */}
      <div className="relative w-80 max-w-[85vw] bg-neutral-950/98 border-r border-neutral-800/90 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px]">
              <div className="w-full h-full bg-neutral-950 rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div>
              <span className="text-base font-black tracking-wider text-white">LUMINA</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Profile Section */}
          <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800">
            {user ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-100 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Authenticated
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto mb-2">
                  <User className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-neutral-200">Guest Scholar</p>
                <p className="text-[11px] text-neutral-500 mb-3">
                  Sign in to access and sync your study workspace
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Workspace Views
            </div>

            {/* Recent Files Link */}
            <button
              onClick={handleRecentClick}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Recent Files</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
            </button>

            {/* Documents */}
            <button
              onClick={() => handleNavClick('documents')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-neutral-900 text-white border border-neutral-800'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Documents</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                {materials.length}
              </span>
            </button>

            {/* Notes */}
            <button
              onClick={() => handleNavClick('notes')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Study Notes</span>
              </div>
              {currentMaterial && (
                <span className="text-[10px] truncate max-w-[90px] opacity-75">
                  {currentMaterial.title}
                </span>
              )}
            </button>

            {/* Flashcards */}
            <button
              onClick={() => handleNavClick('flashcards')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'flashcards'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>3D Flashcards</span>
              </div>
              {currentMaterial && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                  {currentMaterial.flashcards.length}
                </span>
              )}
            </button>

            {/* Quiz */}
            <button
              onClick={() => handleNavClick('quiz')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>Adaptive Quizzes</span>
              </div>
              {currentMaterial && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                  {currentMaterial.quiz.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Study Switcher */}
          {materials.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-neutral-800/80">
              <div className="px-2 pb-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                Switch Document
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {materials.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMaterial(m);
                      onClose();
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs truncate transition flex items-center justify-between ${
                      currentMaterial?.id === m.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                    }`}
                  >
                    <span className="truncate">{m.title}</span>
                    <span className="text-[10px] text-neutral-500 shrink-0 ml-2">
                      {m.subject}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button inside Sidebar */}
          <button
            onClick={() => {
              onClose();
              onOpenUploadModal();
            }}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Upload New Document</span>
          </button>
        </div>
      </div>
    </div>
  );
};
