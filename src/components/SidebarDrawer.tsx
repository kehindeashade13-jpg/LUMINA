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
import { PWAInstallButton } from './PWAInstallButton';

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
  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S';

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    onClose();
  };

  const handleRecentClick = () => {
    setActiveTab('documents');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      />

      {/* Slide-out Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-[#0D0F12] border-r border-[#262B36] shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#262B36]">
          <LuminaLogo size={36} />

          <button
            onClick={onClose}
            aria-label="Close Navigation Drawer"
            className="p-1.5 rounded-xl text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* User Status Card */}
          <div className="p-4 rounded-2xl bg-[#161922] border border-[#262B36]">
            {user ? (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-[#F9FAFB] font-bold text-sm flex items-center justify-center shrink-0">
                    {userInitial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#F9FAFB] truncate">
                      {user.fullName}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">{user.email}</p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#262B36] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#10B981] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    Authenticated
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onSignOut();
                    }}
                    className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-1">
                <div className="w-10 h-10 rounded-xl bg-[#0D0F12] text-[#06B6D4] flex items-center justify-center mx-auto mb-2 border border-[#262B36]">
                  <User className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-[#F9FAFB]">Guest Scholar</p>
                <p className="text-[11px] text-[#9CA3AF] mb-3">
                  Sign in to access and sync your study workspace
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="w-full py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In / Create Account</span>
                </button>
              </div>
            )}
          </div>

          {/* Secondary "Install App" Action inside Hamburger Drawer */}
          <PWAInstallButton variant="sidebar" />

          {/* Navigation Links */}
          <div className="space-y-1.5">
            <div className="px-2 pb-1 text-[11px] font-semibold text-[#9CA3AF]">
              Workspace Views
            </div>

            <button
              onClick={handleRecentClick}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-[#9CA3AF] hover:text-[#F9FAFB] bg-[#161922] hover:bg-[#1E222D] border border-[#262B36] transition"
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#06B6D4]" />
                <span>Recent Files</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </button>

            <button
              onClick={() => handleNavClick('documents')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'documents'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4" />
                <span>Documents Library</span>
              </div>
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-[#0D0F12] text-[#F9FAFB]">
                {materials.length}
              </span>
            </button>

            <button
              onClick={() => handleNavClick('notes')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'notes'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
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

            <button
              onClick={() => handleNavClick('flashcards')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'flashcards'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4" />
                <span>Flashcards</span>
              </div>
              {currentMaterial && (
                <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-[#06B6D4]/15 text-[#06B6D4] font-semibold">
                  {currentMaterial.flashcards.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('quiz')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'quiz'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4" />
                <span>Adaptive Quizzes</span>
              </div>
              {currentMaterial && (
                <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-[#10B981]/15 text-[#10B981] font-semibold">
                  {currentMaterial.quiz.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Study Switcher */}
          {materials.length > 0 && (
            <div className="space-y-1.5 pt-3 border-t border-[#262B36]">
              <div className="px-2 pb-1 text-[11px] font-semibold text-[#9CA3AF]">
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs truncate transition flex items-center justify-between ${
                      currentMaterial?.id === m.id
                        ? 'bg-[#7C3AED]/20 text-[#F9FAFB] font-semibold border border-[#7C3AED]/40'
                        : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922]'
                    }`}
                  >
                    <span className="truncate text-[#F9FAFB]">{m.title}</span>
                    <span className="text-[10px] text-[#06B6D4] shrink-0 ml-2">
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
            className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        </div>
      </div>
    </div>
  );
};
