import React from 'react';
import {
  X,
  BookOpen,
  Layers,
  HelpCircle,
  FileText,
  Plus,
  User,
  LogOut,
  LogIn,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { ActiveTab, StudyMaterial, LuminaUser } from '../types/study';
import LuminaLogo from './LuminaLogo';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: LuminaUser | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenUploadModal: () => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  materials: StudyMaterial[];
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  user,
  activeTab,
  setActiveTab,
  onOpenUploadModal,
  onOpenAuthModal,
  onSignOut,
  materials,
  currentMaterial,
  onSelectMaterial,
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
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Slide-out Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-neutral-950/98 border-r border-[#34495E]/80 shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#34495E]/50">
          <LuminaLogo size={40} />

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* User Status Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-[#34495E]/60 shadow-sm">
            {user ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#8E44AD] text-white font-bold text-sm flex items-center justify-center shadow-md shadow-[#8E44AD]/25 shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-neutral-100 truncate">
                      {user.fullName}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#34495E]/50 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#2ECC71] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-pulse" />
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
                <div className="w-10 h-10 rounded-xl bg-neutral-800 text-[#F1C40F] flex items-center justify-center mx-auto mb-2 border border-[#34495E]/60">
                  <User className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-neutral-100">Guest Scholar</p>
                <p className="text-[11px] text-neutral-400 mb-3">
                  Sign in to access and sync your study workspace
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="w-full py-2 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-[#8E44AD]/25 transition active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[10px] font-bold text-[#F1C40F] uppercase tracking-wider">
              Workspace Views
            </div>

            {/* Recent Files Link */}
            <button
              onClick={handleRecentClick}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#F1C40F]" />
                <span>Recent Files</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
            </button>

            {/* Documents */}
            <button
              onClick={() => handleNavClick('documents')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'documents'
                  ? 'bg-neutral-900 text-white border border-[#34495E]'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-[#a569bd]" />
                <span>Documents</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                {materials.length}
              </span>
            </button>

            {/* Notes */}
            <button
              onClick={() => handleNavClick('notes')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'notes'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Study Notes</span>
              </div>
              {currentMaterial && (
                <span className="text-[10px] truncate max-w-[90px] opacity-85">
                  {currentMaterial.title}
                </span>
              )}
            </button>

            {/* Flashcards */}
            <button
              onClick={() => handleNavClick('flashcards')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'flashcards'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>3D Flashcards</span>
              </div>
              {currentMaterial && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-[#F1C40F] font-semibold">
                  {currentMaterial.flashcards.length}
                </span>
              )}
            </button>

            {/* Quiz */}
            <button
              onClick={() => handleNavClick('quiz')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                activeTab === 'quiz'
                  ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>Adaptive Quizzes</span>
              </div>
              {currentMaterial && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-[#2ECC71] font-semibold">
                  {currentMaterial.quiz.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Study Switcher */}
          {materials.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[#34495E]/50">
              <div className="px-2 pb-1 text-[10px] font-bold text-[#F1C40F] uppercase tracking-wider">
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
                        ? 'bg-[#8E44AD]/20 text-[#a569bd] font-semibold border border-[#8E44AD]/30'
                        : 'text-neutral-300 hover:text-white hover:bg-neutral-900'
                    }`}
                  >
                    <span className="truncate">{m.title}</span>
                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
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
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 border border-[#34495E]/80 text-neutral-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4 text-[#F1C40F]" />
            <span>Upload New Document</span>
          </button>
        </div>
      </div>
    </div>
  );
};
