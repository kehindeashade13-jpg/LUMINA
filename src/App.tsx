import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DocumentsTab } from './components/DocumentsTab';
import { StudyGuideTab } from './components/StudyGuideTab';
import { FlashcardsTab } from './components/FlashcardsTab';
import { QuizTab } from './components/QuizTab';
import { DocumentUploadModal } from './components/DocumentUploadModal';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { LuminaChatBar } from './components/LuminaChatBar';
import { ActiveTab, StudyMaterial } from './types/study';
import {
  fetchFullStudyDataFromSupabase,
  saveMaterialToDatabase,
  deleteMaterialFromDatabase,
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
} from 'lucide-react';

export default function App() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [currentMaterialId, setCurrentMaterialId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Status message toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  /**
   * 1. Persistence Architecture (Single-Table JSONB)
   * Loading (fetchFullStudyDataFromSupabase):
   * On initial app load (useEffect), retrieve all materials using:
   * const { data } = await supabase.from('study_materials').select('*')
   * Rehydrate the React application state directly from item.full_data.
   * If empty, initialize to an empty array ([]).
   */
  const loadMaterials = async () => {
    setIsLoading(true);
    try {
      const res = await fetchFullStudyDataFromSupabase();
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

  useEffect(() => {
    loadMaterials();
  }, []);

  const currentMaterial = materials.find((m) => m.id === currentMaterialId) || materials[0] || null;

  /**
   * Saving (saveMaterialToDatabase):
   * When user uploads or updates study content, package the entire item state
   * into a single object and write it into the full_data JSONB column
   */
  const handleDocumentCreated = (newMaterial: StudyMaterial) => {
    setMaterials((prev) => [newMaterial, ...prev]);
    setCurrentMaterialId(newMaterial.id);
    setActiveTab('notes');
    showToast(`"${newMaterial.title}" generated and persisted to Supabase!`);
  };

  const handleUpdateMaterial = (updated: StudyMaterial) => {
    setMaterials((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    saveMaterialToDatabase(updated);
  };

  const handleDeleteMaterial = async (id: string) => {
    const toDelete = materials.find((m) => m.id === id);
    await deleteMaterialFromDatabase(id);
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
        onSelectMaterial={(mat) => setCurrentMaterialId(mat.id)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-32">
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
              LUMINA Study Workspace
            </span>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-100 tracking-tight">
              No documents uploaded yet
            </h2>

            <p className="text-sm text-neutral-400 mt-2.5 leading-relaxed max-w-lg">
              Upload study documents (PDFs, text files, lecture notes) to automatically generate comprehensive AI study guides, interactive 3D flashcards, and adaptive quizzes. All data persists in your single-table Supabase database.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/25 transition active:scale-95"
              >
                <Plus className="w-4 h-4" /> Upload Your First Document
              </button>
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
            {activeTab === 'documents' && (
              <DocumentsTab
                materials={materials}
                currentMaterial={currentMaterial}
                onSelectMaterial={(mat) => setCurrentMaterialId(mat.id)}
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

      {/* Persistent & Floating Conversational Chat Bar across all views */}
      <LuminaChatBar material={currentMaterial} />

      {/* Upload Document Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onDocumentCreated={handleDocumentCreated}
      />

      {/* Supabase & Gemini Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onRefreshData={loadMaterials}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700/80 text-white text-xs font-medium shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
