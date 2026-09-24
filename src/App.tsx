import { useState, useEffect } from 'react';
import {
  Plus,
  LogIn,
  Layers,
  HelpCircle,
  Sparkles,
  Loader2,
  BrainCircuit,
} from 'lucide-react';
import { Header } from './components/Header';
import { StudyGuideTab } from './components/StudyGuideTab';
import { FlashcardsTab } from './components/FlashcardsTab';
import { QuizTab } from './components/QuizTab';
import { DocumentsTab } from './components/DocumentsTab';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { AuthModal } from './components/AuthModal';
import { RecentDocumentsSection } from './components/RecentDocumentsSection';
import { SidebarDrawer } from './components/SidebarDrawer';
import LuminaLogo from './components/LuminaLogo';
import { ActiveTab, StudyMaterial, LuminaUser } from './types/study';
import {
  fetchFullStudyDataFromSupabase,
  saveMaterialToDatabase,
  deleteMaterialFromDatabase,
  getCurrentUser,
  signOutUser,
} from './services/supabase';
import { LuminaChatBar } from './components/LuminaChatBar';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [user, setUser] = useState<LuminaUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Rehydrate auth state and sync with Supabase
  useEffect(() => {
    const initApp = async () => {
      setIsLoading(true);
      try {
        const authedUser = await getCurrentUser();
        setUser(authedUser);
        await loadMaterials(authedUser?.id);
      } catch (e) {
        console.error('Initialization error:', e);
        await loadMaterials();
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const loadMaterials = async (userId?: string) => {
    try {
      const { materials: stored } = await fetchFullStudyDataFromSupabase(userId);
      setMaterials(stored);
      if (stored && stored.length > 0) {
        // Default to most recently updated
        setCurrentMaterialId(stored[0].id);
      } else {
        setCurrentMaterialId(null);
      }
    } catch (err) {
      console.warn('Failed to load study data from Supabase:', err);
    }
  };

  const currentMaterial = materials.find((m) => m.id === currentMaterialId) || materials[0] || null;

  const handleSelectMaterial = (material: StudyMaterial) => {
    setCurrentMaterialId(material.id);
    const updated = { ...material, lastAccessedAt: new Date().toISOString() };
    saveMaterialToDatabase(updated, user?.id);
  };

  const handleDocumentCreated = (newMaterial: StudyMaterial) => {
    setMaterials((prev) => [newMaterial, ...prev.filter((m) => m.id !== newMaterial.id)]);
    setCurrentMaterialId(newMaterial.id);
    setActiveTab('notes');
    showToast(`"${newMaterial.title}" generated successfully!`);
  };

  const handleUpdateMaterial = (updated: StudyMaterial) => {
    setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    await loadMaterials();
    showToast('Signed out of LUMINA account.');
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
    <div className="min-h-screen bg-[#0b0f14] text-neutral-100 flex flex-col antialiased selection:bg-[#8E44AD]/30 selection:text-[#a569bd]">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        materials={materials}
        currentMaterial={currentMaterial}
        onSelectMaterial={handleSelectMaterial}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        user={user}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16 sm:pb-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-neutral-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#8E44AD]" />
            <p className="text-xs font-mono tracking-wider text-[#F1C40F]">
              Rehydrating study state from Supabase single-table...
            </p>
          </div>
        ) : materials.length === 0 ? (
          /* Clean 'No documents uploaded yet' Empty State */
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
            {/* Ambient Glow Icon */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#8E44AD]/20 via-[#F1C40F]/15 to-[#2ECC71]/20 rounded-full blur-2xl opacity-75" />
              <div className="relative p-3 rounded-3xl bg-neutral-900 border border-[#34495E]/80 flex items-center justify-center shadow-2xl">
                <LuminaLogo size={80} showText={false} />
              </div>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 mb-3">
              {user ? `Welcome back, ${user.fullName}` : 'LUMINA Study Workspace'}
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
              No documents uploaded yet
            </h2>

            <p className="text-sm text-neutral-300 mt-2.5 leading-relaxed max-w-lg">
              {user
                ? `Welcome to your private study workspace, ${user.fullName.split(' ')[0]}. Upload study documents (PDFs, text files, lecture notes) to automatically generate comprehensive AI study guides, interactive 3D flashcards, and adaptive quizzes with isolated persistence.`
                : 'Upload study documents (PDFs, text files, lecture notes) to automatically generate comprehensive AI study guides, interactive 3D flashcards, and adaptive quizzes. All data persists in your single-table Supabase database.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xl shadow-[#8E44AD]/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> Upload Your First Document
              </button>

              {!user && (
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-[#34495E]/30 hover:bg-[#34495E]/60 border border-[#34495E] text-neutral-200 text-sm font-medium flex items-center justify-center gap-2 transition"
                >
                  <LogIn className="w-4 h-4 text-[#F1C40F]" /> Sign In / Create Account
                </button>
              )}
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-12 w-full text-left">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-[#34495E]/60 shadow-sm">
                <div className="p-2 rounded-xl bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 w-fit mb-3">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-100">AI Study Guides</h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Synthesize executive summaries, modular deep dives, key concepts, and glossary definitions.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-[#34495E]/60 shadow-sm">
                <div className="p-2 rounded-xl bg-[#F1C40F]/15 text-[#F1C40F] border border-[#F1C40F]/30 w-fit mb-3">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-100">3D Flashcards</h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Active recall with smooth 3D flips, spaced repetition feedback (1-4), and mastery metrics.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-[#34495E]/60 shadow-sm">
                <div className="p-2 rounded-xl bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 w-fit mb-3">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-100">Adaptive Quizzes</h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
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

      {/* Floating Conversational Chat Logo in Bottom Right (Shown only when no document is uploaded) */}
      {materials.length === 0 && <LuminaChatBar material={null} />}

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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-neutral-900 border border-[#34495E] text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-[#F1C40F] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
