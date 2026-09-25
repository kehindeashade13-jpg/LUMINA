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
  Globe,
  Lock,
  ShieldAlert,
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
  toggleMaterialPrivacy,
  cloneCommunityMaterial,
  getCurrentUser,
  signOutUser,
} from './services/supabase';
import { LuminaChatBar } from './components/LuminaChatBar';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [personalMaterials, setPersonalMaterials] = useState<StudyMaterial[]>([]);
  const [communityMaterials, setCommunityMaterials] = useState<StudyMaterial[]>([]);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<'document' | 'youtube' | 'audio'>('document');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [user, setUser] = useState<LuminaUser | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // All combined materials for search/quick lookup with guaranteed unique IDs
  const materials = Array.from(
    new Map([...personalMaterials, ...communityMaterials].map((m) => [m.id, m])).values()
  );

  const openUploadModal = (tab: 'document' | 'youtube' | 'audio' = 'document') => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
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
        await loadData(authedUser?.id);
      } catch (e) {
        console.error('Initialization error:', e);
        await loadData();
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  const loadData = async (userId?: string) => {
    try {
      const result = await fetchFullStudyDataFromSupabase(userId);
      setPersonalMaterials(result.personalMaterials || []);
      setCommunityMaterials(result.communityMaterials || []);

      if (result.personalMaterials && result.personalMaterials.length > 0) {
        setCurrentMaterialId(result.personalMaterials[0].id);
      } else if (result.communityMaterials && result.communityMaterials.length > 0) {
        setCurrentMaterialId(result.communityMaterials[0].id);
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
    setCurrentMaterialId(null);
    setTimeout(() => {
      setCurrentMaterialId(material.id);
      if (material.userId === user?.id) {
        const updated = { ...material, lastAccessedAt: new Date().toISOString() };
        saveMaterialToDatabase(updated, user?.id, user?.fullName);
      }
    }, 15);
  };

  const handleDocumentCreated = (newMaterial: StudyMaterial) => {
    setCurrentMaterialId(null);
    setPersonalMaterials((prev) => [newMaterial, ...prev.filter((m) => m.id !== newMaterial.id)]);
    if (newMaterial.isPublic) {
      setCommunityMaterials((prev) => [newMaterial, ...prev.filter((m) => m.id !== newMaterial.id)]);
    }
    setTimeout(() => {
      setCurrentMaterialId(newMaterial.id);
      setActiveTab('notes');
      showToast(`"${newMaterial.title}" generated successfully!`);
    }, 15);
  };

  const handleUpdateMaterial = (updated: StudyMaterial) => {
    setPersonalMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (updated.isPublic) {
      setCommunityMaterials((prev) => {
        const exists = prev.some((m) => m.id === updated.id);
        if (exists) return prev.map((m) => (m.id === updated.id ? updated : m));
        return [updated, ...prev];
      });
    } else {
      setCommunityMaterials((prev) => prev.filter((m) => m.id !== updated.id));
    }
  };

  const handleTogglePrivacy = async (material: StudyMaterial, newIsPublic: boolean) => {
    try {
      const updated = await toggleMaterialPrivacy(material, newIsPublic, user?.id);
      handleUpdateMaterial(updated);
      showToast(
        newIsPublic
          ? `"${updated.title}" is now Public in the Community Library.`
          : `"${updated.title}" is now strictly Private in My Library.`
      );
    } catch (e) {
      console.error('Failed to toggle privacy:', e);
      showToast('Failed to update document privacy.');
    }
  };

  const handleCloneCommunityDoc = async (communityMat: StudyMaterial) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const cloned = await cloneCommunityMaterial(communityMat, user.id, user.fullName);
      setPersonalMaterials((prev) => [cloned, ...prev]);
      setCurrentMaterialId(cloned.id);
      setActiveTab('notes');
      showToast(`Successfully added "${cloned.title}" to your My Library!`);
    } catch (e) {
      console.error('Failed to clone community document:', e);
      showToast('Failed to add document to My Library.');
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setPersonalMaterials([]);
    setCurrentMaterialId(null);
    await loadData();
    showToast('Signed out of LUMINA account.');
  };

  const handleDeleteMaterial = async (id: string) => {
    const toDelete = personalMaterials.find((m) => m.id === id);
    if (!toDelete) return;
    await deleteMaterialFromDatabase(id, user?.id);
    setPersonalMaterials((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      if (currentMaterialId === id) {
        setCurrentMaterialId(filtered[0]?.id || communityMaterials[0]?.id || null);
      }
      return filtered;
    });
    setCommunityMaterials((prev) => prev.filter((m) => m.id !== id));
    showToast(`Deleted "${toDelete.title}".`);
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
        ) : !user ? (
          /* Strict Guest Authentication Enforcement Gate State */
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#8E44AD]/25 via-[#F1C40F]/15 to-[#2ECC71]/25 rounded-full blur-2xl opacity-75" />
              <div className="relative p-4 rounded-3xl bg-neutral-900 border border-[#34495E]/80 flex items-center justify-center shadow-2xl">
                <LuminaLogo size={88} showText={false} />
              </div>
            </div>

            <span className="text-xs font-semibold px-3.5 py-1 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#F1C40F]" /> Authentication Required for Study Workspace
            </span>

            <h2 className="text-2xl sm:text-4xl font-extrabold text-neutral-100 tracking-tight">
              Unlock Your Private AI Study Suite
            </h2>

            <p className="text-sm text-neutral-300 mt-3 leading-relaxed max-w-lg">
              Lumina enforces strict user privacy. Sign in or create a free account to upload private documents, generate 90-item AI study suites, and sync your personalized recall progress across devices.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-8 w-full max-w-md">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:flex-1 py-3.5 px-6 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#8E44AD]/30 transition active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4 text-[#F1C40F]" />
                <span>Sign In to Access Workspace</span>
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:flex-1 py-3.5 px-6 bg-neutral-900 hover:bg-neutral-850 text-neutral-200 border border-[#34495E]/80 rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4 text-[#a569bd]" />
              </button>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-14 w-full text-left">
              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-[#34495E]/60 shadow-sm">
                <div className="p-2 rounded-xl bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 w-fit mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-100">Strict Privacy (RLS)</h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Personal documents are isolated by Row Level Security so private files remain strictly confidential.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-[#34495E]/60 shadow-sm">
                <div className="p-2 rounded-xl bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 w-fit mb-3">
                  <Globe className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-100">Community Library</h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Toggle documents to public to share study guides and clone peer-shared guides into your library.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900/60 border border-[#34495E]/60 shadow-sm">
                <div className="p-2 rounded-xl bg-[#F1C40F]/15 text-[#F1C40F] border border-[#F1C40F]/30 w-fit mb-3">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-neutral-100">90-Item AI Suites</h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  PDFs, YouTube lectures, and audio notes synthesized into Notes, Flashcards, and Adaptive Quizzes.
                </p>
              </div>
            </div>
          </div>
        ) : personalMaterials.length === 0 && activeTab === 'notes' && !currentMaterial ? (
          /* Clean 'No documents uploaded yet' Empty State for Authenticated Users */
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-[#8E44AD]/20 via-[#F1C40F]/15 to-[#2ECC71]/20 rounded-full blur-2xl opacity-75" />
              <div className="relative p-3 rounded-3xl bg-neutral-900 border border-[#34495E]/80 flex items-center justify-center shadow-2xl">
                <LuminaLogo size={80} showText={false} />
              </div>
            </div>

            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 mb-3">
              Welcome back, {user.fullName}
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
              No personal documents uploaded yet
            </h2>

            <p className="text-sm text-neutral-300 mt-2.5 leading-relaxed max-w-lg">
              Import PDFs, YouTube lecture links, or live voice recordings to automatically synthesize 90 comprehensive study items into your private library.
            </p>

            {/* 3 Distinct Input Options in Empty State */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-8 w-full">
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
          </div>
        ) : (
          <>
            {/* Recent Files Section */}
            <RecentDocumentsSection
              materials={personalMaterials}
              currentMaterial={currentMaterial}
              onSelectMaterial={handleSelectMaterial}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onOpenUploadModal={() => openUploadModal('document')}
            />

            {activeTab === 'documents' && (
              <DocumentsTab
                materials={personalMaterials}
                communityMaterials={communityMaterials}
                currentMaterial={currentMaterial}
                onSelectMaterial={handleSelectMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                onTogglePrivacy={handleTogglePrivacy}
                onCloneCommunityMaterial={handleCloneCommunityDoc}
                onOpenUploadModal={() => openUploadModal('document')}
                onNavigateToTab={(tab) => setActiveTab(tab)}
                user={user}
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

      {/* Floating Interactive Lumina AI Tutor in Bottom Right (Always Available for Authenticated Users) */}
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
        userFullName={user?.fullName}
        initialTab={uploadInitialTab}
      />

      {/* Auth Modal (Sign In / Sign Up) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={(authedUser) => {
          setUser(authedUser);
          loadData(authedUser.id);
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
