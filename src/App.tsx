import { useState, useEffect } from 'react';
import {
  LogIn,
  Sparkles,
  Loader2,
  BrainCircuit,
  FileUp,
  Youtube,
  Mic,
  ArrowRight,
  Globe,
  Lock,
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
import { OfflineIndicator } from './components/OfflineIndicator';
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
    showToast('Signed out of Lumina account.');
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
    <div className="min-h-screen bg-[#0D0F12] text-[#F9FAFB] flex flex-col antialiased selection:bg-[#7C3AED]/30 selection:text-[#F9FAFB] relative">
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

      {/* Main Workspace Viewport with extra bottom clearance (pb-36) for FAB */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 relative z-10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-[#9CA3AF]">
            <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
            <p className="text-xs font-medium text-[#9CA3AF]">
              Loading your study workspace...
            </p>
          </div>
        ) : !user ? (
          /* Guest Authentication Enforcement Gate State */
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
            <div className="mb-6 p-4 rounded-2xl bg-[#161922] border border-[#262B36] flex items-center justify-center shadow-lg">
              <LuminaLogo size={76} showText={false} />
            </div>

            <p className="text-xs font-semibold text-[#06B6D4] mb-2">
              Private AI Study Workspace
            </p>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-[#F9FAFB] tracking-tight">
              Unlock Your AI Study Suite
            </h1>

            <p className="text-sm text-[#9CA3AF] mt-3 leading-relaxed max-w-lg">
              Sign in or create a free account to upload private documents, generate 90-item AI study suites, and sync your personalized recall progress across devices.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-8 w-full max-w-md">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:flex-1 py-3.5 px-6 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In to Workspace</span>
              </button>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:flex-1 py-3.5 px-6 bg-[#161922] hover:bg-[#1E222D] text-[#F9FAFB] border border-[#262B36] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4 text-[#06B6D4]" />
              </button>
            </div>

            {/* Feature Highlights Grid - Clean Solid #161922 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14 w-full text-left">
              <div className="p-5 rounded-2xl bg-[#161922] border border-[#262B36]">
                <div className="p-2 rounded-xl bg-[#0D0F12] text-[#A78BFA] border border-[#262B36] w-fit mb-3">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#F9FAFB]">Strict Privacy (RLS)</h2>
                <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                  Personal documents are isolated by Row Level Security so private files remain confidential.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#161922] border border-[#262B36]">
                <div className="p-2 rounded-xl bg-[#0D0F12] text-[#10B981] border border-[#262B36] w-fit mb-3">
                  <Globe className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#F9FAFB]">Community Library</h2>
                <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                  Toggle documents to public to share study guides and clone peer-shared guides into your library.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#161922] border border-[#262B36]">
                <div className="p-2 rounded-xl bg-[#0D0F12] text-[#06B6D4] border border-[#262B36] w-fit mb-3">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#F9FAFB]">90-Item AI Suites</h2>
                <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                  PDFs, YouTube lectures, and audio notes synthesized into Notes, Flashcards, and Adaptive Quizzes.
                </p>
              </div>
            </div>
          </div>
        ) : personalMaterials.length === 0 && activeTab === 'notes' && !currentMaterial ? (
          /* Clean 'No documents uploaded yet' Empty State for Authenticated Users */
          <div className="flex flex-col items-center justify-center min-h-[65vh] text-center max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-200">
            <div className="mb-6 p-3.5 rounded-2xl bg-[#161922] border border-[#262B36] flex items-center justify-center shadow-lg">
              <LuminaLogo size={72} showText={false} />
            </div>

            <p className="text-xs font-semibold text-[#06B6D4] mb-2">
              Welcome back, {user.fullName}
            </p>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F9FAFB] tracking-tight">
              No personal documents uploaded yet
            </h1>

            <p className="text-sm text-[#9CA3AF] mt-2.5 leading-relaxed max-w-lg">
              Import PDFs, YouTube lecture links, or live voice recordings to automatically synthesize 90 comprehensive study items into your private library.
            </p>

            {/* 3 Distinct Input Options in Empty State - Clean Solid #161922 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 w-full">
              <button
                onClick={() => openUploadModal('document')}
                className="p-5 rounded-2xl bg-[#161922] border border-[#262B36] hover:border-[#7C3AED] text-left transition group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-[#0D0F12] text-[#A78BFA] border border-[#262B36] w-fit mb-3 group-hover:bg-[#7C3AED] group-hover:text-[#F9FAFB] transition">
                    <FileUp className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-bold text-[#F9FAFB]">
                    Upload Document
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                    PDFs, Markdown notes, research papers, and text excerpts.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#A78BFA] font-semibold mt-4">
                  <span>Choose File</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </button>

              <button
                onClick={() => openUploadModal('youtube')}
                className="p-5 rounded-2xl bg-[#161922] border border-[#262B36] hover:border-[#06B6D4] text-left transition group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-[#0D0F12] text-[#06B6D4] border border-[#262B36] w-fit mb-3 group-hover:bg-[#06B6D4] group-hover:text-[#0D0F12] transition">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-bold text-[#F9FAFB]">
                    Paste YouTube Link
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                    Transcribe online video lectures and generate full study guides.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#06B6D4] font-semibold mt-4">
                  <span>Import Video</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
                </div>
              </button>

              <button
                onClick={() => openUploadModal('audio')}
                className="p-5 rounded-2xl bg-[#161922] border border-[#262B36] hover:border-[#10B981] text-left transition group flex flex-col justify-between"
              >
                <div>
                  <div className="p-2.5 rounded-xl bg-[#0D0F12] text-[#10B981] border border-[#262B36] w-fit mb-3 group-hover:bg-[#10B981] group-hover:text-[#0D0F12] transition">
                    <Mic className="w-5 h-5" />
                  </div>
                  <h2 className="text-xs font-bold text-[#F9FAFB]">
                    Record / Audio File
                  </h2>
                  <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
                    Live microphone lecture capture or .mp3, .m4a, and .wav files.
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#10B981] font-semibold mt-4">
                  <span>Start Audio</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
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

      {/* Offline Mode Status Banner */}
      <OfflineIndicator />

      {/* Strictly Anchored Bottom-Right Study Tutor FAB */}
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
        onErrorToast={(errMsg) => showToast(errMsg)}
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#161922] border border-[#262B36] text-[#F9FAFB] text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-[#06B6D4] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
