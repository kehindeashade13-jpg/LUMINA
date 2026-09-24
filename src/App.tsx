import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentsTab } from './components/DocumentsTab';
import { StudyGuideTab } from './components/StudyGuideTab';
import { FlashcardsTab } from './components/FlashcardsTab';
import { QuizTab } from './components/QuizTab';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { LuminaChatBar } from './components/LuminaChatBar';
import { AuthModal } from './components/AuthModal';
import { RecentDocumentsSection } from './components/RecentDocumentsSection';
import { SidebarDrawer } from './components/SidebarDrawer';
import { ActiveTab, StudyMaterial, LuminaUser } from './types/study';
import {
  fetchFullStudyDataFromSupabase,
  saveMaterialToDatabase,
  deleteMaterialFromDatabase,
  getCurrentUser,
  signOutUser,
  subscribeToAuthChanges,
} from './services/supabase';
import {
  Loader2,
  Plus,
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  FileUp,
  Database,
  BrainCircuit,
  LogIn,
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<LuminaUser | null>(null);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Status message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /**
   * 1. Persistence & Multi-User Data Isolation:
   * Retrieve materials filtered by user_id so users only view their own files.
   */
  const loadMaterials = async (uid?: string) => {
    setIsLoading(true);
    const targetUserId = uid !== undefined ? uid : user?.id;
    try {
      const res = await fetchFullStudyDataFromSupabase(targetUserId);
      if (res.materials && res.materials.length > 0) {
        setMaterials(res.materials);
        setCurrentMaterialId(res.materials[0].id);
      } else {
        setMaterials([]);
        setCurrentMaterialId(null);
      }
    } catch (e) {
      console.warn('Supabase fetch returned empty or error, initializing empty state:', e);
      setMaterials([]);
      setCurrentMaterialId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize auth session and subscribe to session changes
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const existingUser = await getCurrentUser();
      if (isMounted) {
        setUser(existingUser);
        loadMaterials(existingUser?.id);
      }
    }

    initAuth();

    const unsubscribe = subscribeToAuthChanges((updatedUser) => {
      setUser(updatedUser);
      loadMaterials(updatedUser?.id);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setMaterials([]);
    setCurrentMaterialId(null);
    showToast('Logged out successfully.');
    loadMaterials('');
  };

  const currentMaterial = materials.find((m) => m.id === currentMaterialId) || materials[0] || null;

  const handleSelectMaterial = (mat: StudyMaterial) => {
    setCurrentMaterialId(mat.id);
    // Mark as accessed
    const touched: StudyMaterial = {
      ...mat,
      lastAccessedAt: new Date().toISOString(),
    };
    setMaterials((prev) => prev.map((m) => (m.id === mat.id ? touched : m)));
    saveMaterialToDatabase(touched, user?.id);
  };

  const handleDocumentCreated = (newMaterial: StudyMaterial) => {
    const stamped = {
      ...newMaterial,
      userId: user?.id,
      lastAccessedAt: new Date().toISOString(),
    };
    setMaterials((prev) => [stamped, ...prev]);
    setCurrentMaterialId(stamped.id);
    setActiveTab('notes');
    showToast(`"${stamped.title}" generated and saved to your private study workspace!`);
  };

  const handleUpdateMaterial = (updated: StudyMaterial) => {
    const stamped = {
      ...updated,
      userId: user?.id || updated.userId,
      lastAccessedAt: new Date().toISOString(),
    };
    setMaterials((prev) => prev.map((m) => (m.id === stamped.id ? stamped : m)));
    saveMaterialToDatabase(stamped, user?.id);
  };

  const handleDeleteMaterial = async (id: string) => {
    const toDelete = materials.find((m) => m.id === id);
    await deleteMaterialFromDatabase(id, user?.id);
    setMaterials((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      if (currentMaterialId === id) {
        setCurrentMaterialId(filtered[0]?.id || null);
      }
      return filtered;
    });
    showToast(`Deleted "${toDelete?.title || 'Material'}".`);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        materials={materials}
        currentMaterial={currentMaterial}
        onSelectMaterial={handleSelectMaterial}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 sm:pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-mono tracking-wider">
              Rehydrating study state from Supabase single-table...
            </p>
          </div>
        ) : materials.length === 0 ? (
          /* Clean 'No documents uploaded yet' Empty State */
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
            {/* Ambient Glow Icon */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-cyan-500/20 rounded-full blur-2xl opacity-75" />
              <div className="relative w-20 h-20 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center shadow-2xl">
                <FileUp className="w-9 h-9 text-indigo-400" />
              </div>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              {user ? `Welcome back, ${user.fullName}` : 'LUMINA Study Workspace'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
              No documents uploaded yet
            </h2>

            <p className="text-sm text-neutral-400 mt-2.5 leading-relaxed max-w-lg">
              {user
                ? `Welcome to your private study workspace, ${user.fullName.split(' ')[0]}. Upload study documents (PDFs, text files, lecture notes) to automatically generate comprehensive AI study guides, interactive 3D flashcards, and adaptive quizzes with isolated persistence.`
                : 'Upload study documents (PDFs, text files, lecture notes) to automatically generate comprehensive AI study guides, interactive 3D flashcards, and adaptive quizzes. All data persists in your single-table Supabase database.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> Upload Your First Document
              </button>

              {!user && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-sm font-medium flex items-center justify-center gap-2 transition"
                >
                  <LogIn className="w-4 h-4 text-indigo-400" /> Sign In / Create Account
                </button>
              )}

              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-sm font-medium flex items-center justify-center gap-2 transition"
              >
                <Database className="w-4 h-4 text-indigo-400" /> Supabase Settings
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-12 w-full text-left">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mb-3">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-200">AI Study Guides</h3>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Synthesize executive summaries, modular deep dives, key concepts, and glossary definitions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-200">3D Flashcards</h3>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Active recall with smooth 3D flips, spaced repetition feedback (1-4), and mastery metrics.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit mb-3">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-200">Adaptive Quizzes</h3>
                <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                  Challenging questions with instant answer explanations, victory confetti, and retake modes.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Recent Files Section */}
            <RecentDocumentsSection
              materials={materials}
              currentMaterial={currentMaterial}
              onSelectMaterial={handleSelectMaterial}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
            />

            {activeTab === 'documents' && (
              <DocumentsTab
                materials={materials}
                currentMaterial={currentMaterial}
                onSelectMaterial={handleSelectMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'notes' && (
              <StudyGuideTab
                material={currentMaterial}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'flashcards' && (
              <FlashcardsTab
                material={currentMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'quiz' && (
              <QuizTab
                material={currentMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}
          </>
        )}
      </main>

      {/* Persistent & Floating Conversational Chat Logo in Bottom Right */}
      <LuminaChatBar material={currentMaterial} />

      {/* Navigation Sidebar Drawer */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        materials={materials}
        currentMaterial={currentMaterial}
        onSelectMaterial={handleSelectMaterial}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentCreated={handleDocumentCreated}
        userId={user?.id}
      />

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          loadMaterials(authedUser.id);
          showToast(`Welcome, ${authedUser.fullName}!`);
        }}
      />

      {/* Supabase & Gemini Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onRefreshData={loadMaterials}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
