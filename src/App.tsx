import { useState, useEffect } from 'react';
import {
  Plus,
  LogIn,
  Layers,
  HelpCircle,
  Sparkles,
  Loader2,
  BrainCircuit,
  FileUp,
  Youtube,
  Mic,
  ArrowRight,
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
  const [uploadInitialTab, setUploadInitialTab] = useState<'document' | 'youtube' | 'audio'>('document');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [user, setUser] = useState<LuminaUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const openUploadModal = (tab: 'document' | 'youtube' | 'audio' = 'document') => {
    setUploadInitialTab(tab);
    setIsUploadModalOpen(true);
  };

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

  const currentMaterial = currentMaterialId
    ? materials.find((m) => m.id === currentMaterialId) || null
    : null;

  const handleSelectMaterial = (material: StudyMaterial) => {
    // Clear out all previous notes, cards, and quizzes from memory before populating workspace
    setCurrentMaterialId(null);
    setTimeout(() => {
      setCurrentMaterialId(material.id);
      const updated = { ...material, lastAccessedAt: new Date().toISOString() };
      saveMaterialToDatabase(updated, user?.id);
    }, 15);
  };

  const handleDocumentCreated = (newMaterial: StudyMaterial) => {
    // Clear out all previous notes, cards, and quizzes from memory before populating workspace
    setCurrentMaterialId(null);
    setMaterials((prev) => [newMaterial, ...prev.filter((m) => m.id !== newMaterial.id)]);
    setTimeout(() => {
      setCurrentMaterialId(newMaterial.id);
      setActiveTab('notes');
      showToast(`"${newMaterial.title}" generated successfully!`);
    }, 15);
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
        onOpenUploadModal={() => openUploadModal('document')}
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
                ? `Welcome to your private study workspace, ${user.fullName.split(' ')[0]}. Import PDFs, YouTube lecture links, or live voice recordings to automatically synthesize 90 comprehensive study items (Notes, Flashcards, Practice Questions & Quizzes).`
                : 'Import PDFs, YouTube lecture links, or live voice recordings to automatically synthesize 90 comprehensive study items (Notes, Flashcards, Practice Questions & Quizzes) with persistent storage.'}
            </p>

            {/* 3 Distinct Input Options in Empty State */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 w-full">
              {/* Option 1: Document */}
              <button
                onClick={() => openUploadModal('document')}
                className="p-4 rounded-2xl bg-neutral-900 border border-[#34495E]/80 hover:border-[#8E44AD] hover:bg-neutral-850 text-left transition group shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 w-fit mb-3 group-hover:bg-[#8E44AD] group-hover:text-white transition">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-100 group-hover:text-[#a569bd] transition">
                    Upload Document
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    PDFs, Markdown notes, research papers, and text excerpts.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#a569bd] font-semibold mt-3">
                  <span>Choose File</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                </div>
              </button>

              {/* Option 2: YouTube Link */}
              <button
                onClick={() => openUploadModal('youtube')}
                className="p-4 rounded-2xl bg-neutral-900 border border-[#34495E]/80 hover:border-red-500/80 hover:bg-neutral-850 text-left transition group shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-red-950/50 text-red-400 border border-red-800/40 w-fit mb-3 group-hover:bg-red-600 group-hover:text-white transition">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-100 group-hover:text-red-400 transition">
                    Paste YouTube Link
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Transcribe online video lectures and generate full study guides.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-red-400 font-semibold mt-3">
                  <span>Import Video</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                </div>
              </button>

              {/* Option 3: Audio / Record */}
              <button
                onClick={() => openUploadModal('audio')}
                className="p-4 rounded-2xl bg-neutral-900 border border-[#34495E]/80 hover:border-[#F1C40F]/80 hover:bg-neutral-850 text-left transition group shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-[#F1C40F]/15 text-[#F1C40F] border border-[#F1C40F]/30 w-fit mb-3 group-hover:bg-[#F1C40F] group-hover:text-black transition">
                    <Mic className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-bold text-neutral-100 group-hover:text-[#F1C40F] transition">
                    Record / Audio File
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Live microphone lecture capture or .mp3, .m4a, and .wav files.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-[#F1C40F] font-semibold mt-3">
                  <span>Start Audio</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition" />
                </div>
              </button>
            </div>

            {/* Auth CTA when signed out */}
            {!user && (
              <div className="mt-6">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#34495E]/30 hover:bg-[#34495E]/60 border border-[#34495E] text-neutral-200 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F1C40F]" /> Sign In to Save Workspace & Streaks
                </button>
              </div>
            )}

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

            {activeTab === 'notes' && currentMaterial && (
              <StudyGuideTab
                key={`notes_${currentMaterial.id}`}
                material={currentMaterial}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'flashcards' && currentMaterial && (
              <FlashcardsTab
                key={`flashcards_${currentMaterial.id}`}
                material={currentMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'quiz' && currentMaterial && (
              <QuizTab
                key={`quiz_${currentMaterial.id}`}
                material={currentMaterial}
                onUpdateMaterial={handleUpdateMaterial}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Interactive Lumina AI Tutor in Bottom Right (Always Available Everywhere) */}
      <LuminaChatBar key={`chat_${currentMaterial?.id || 'empty'}`} material={currentMaterial} />

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
        onOpenUploadModal={() => openUploadModal('document')}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentCreated={handleDocumentCreated}
        onClearActiveWorkspace={() => setCurrentMaterialId(null)}
        userId={user?.id}
        initialTab={uploadInitialTab}
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
