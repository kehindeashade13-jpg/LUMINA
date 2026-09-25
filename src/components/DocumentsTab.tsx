import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Clock,
  Layers,
  HelpCircle,
  BookOpen,
  FileCheck,
  Search,
  Globe,
  Lock,
  Users,
  Copy,
  Check,
  Share2,
  Sparkles,
  DownloadCloud,
  BookmarkPlus,
} from 'lucide-react';
import { StudyMaterial, LuminaUser } from '../types/study';

interface DocumentsTabProps {
  materials: StudyMaterial[]; // Personal materials
  communityMaterials: StudyMaterial[]; // Community public materials
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
  onDeleteMaterial: (id: string) => void;
  onTogglePrivacy: (material: StudyMaterial, isPublic: boolean) => void;
  onCloneCommunityMaterial: (material: StudyMaterial) => void;
  onOpenUploadModal: () => void;
  onNavigateToTab: (tab: 'notes' | 'flashcards' | 'quiz') => void;
  user: LuminaUser | null;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  materials,
  communityMaterials,
  currentMaterial,
  onSelectMaterial,
  onDeleteMaterial,
  onTogglePrivacy,
  onCloneCommunityMaterial,
  onOpenUploadModal,
  onNavigateToTab,
  user,
}) => {
  const [activeSection, setActiveSection] = useState<'my' | 'community'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [previewMaterial, setPreviewMaterial] = useState<StudyMaterial | null>(null);
  const [clonedId, setClonedId] = useState<string | null>(null);

  // Active dataset depending on active section
  const currentDataset = activeSection === 'my' ? materials : communityMaterials;

  const subjects = Array.from(new Set(currentDataset.map((m) => m.subject).filter(Boolean)));

  const filteredMaterials = currentDataset.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.authorName && m.authorName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (m.summary && m.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === 'all' || m.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const handleClone = async (mat: StudyMaterial) => {
    setClonedId(mat.id);
    await onCloneCommunityMaterial(mat);
    setTimeout(() => {
      setClonedId(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-[#8E44AD]/15 border border-[#34495E]/60 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              Document Repository
            </span>
            <span className="text-xs text-neutral-400">
              {materials.length} Personal &bull; {communityMaterials.length} Community
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-neutral-100 mt-1.5">
            Study Materials Library
          </h2>
          <p className="text-xs text-neutral-400 max-w-xl mt-0.5 leading-relaxed">
            Manage your private research archives or explore verified peer-shared study suites across subjects.
          </p>
        </div>

        <div className="flex items-center gap-2 relative z-10 shrink-0">
          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-[#8E44AD]/25 transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* Sub-Tabs: My Library (Personal) vs Community Library (Public) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#34495E]/60 pb-3">
        {/* Segmented Control Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-950 rounded-2xl border border-[#34495E]/60 text-xs font-semibold">
          {/* Sub-tab 1: My Library */}
          <button
            onClick={() => {
              setActiveSection('my');
              setSelectedSubject('all');
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeSection === 'my'
                ? 'bg-[#8E44AD] text-white shadow-md shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>My Library</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeSection === 'my'
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {materials.length}
            </span>
          </button>

          {/* Sub-tab 2: Community Library */}
          <button
            onClick={() => {
              setActiveSection('community');
              setSelectedSubject('all');
            }}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition ${
              activeSection === 'community'
                ? 'bg-[#8E44AD] text-white shadow-md shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#2ECC71]" />
            <span>Community Library</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeSection === 'community'
                  ? 'bg-white/20 text-white'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {communityMaterials.length}
            </span>
          </button>
        </div>

        {/* Section Info Description */}
        <div className="text-xs text-neutral-400 flex items-center gap-1.5">
          {activeSection === 'my' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#8E44AD]" />
              <span>Personal documents strictly accessible to your account ({user?.fullName || 'Scholar'})</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#2ECC71]" />
              <span>Public study suites curated and shared by the LUMINA academic community</span>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder={
              activeSection === 'my'
                ? 'Search your personal notes, titles, or subjects...'
                : 'Search community library by topic, author, or discipline...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition placeholder:text-neutral-500"
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                selectedSubject === 'all'
                  ? 'bg-neutral-800 text-white border border-[#34495E]/80 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                  selectedSubject === subj
                    ? 'bg-[#8E44AD]/25 text-[#a569bd] border border-[#8E44AD]/50'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-900/60'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Material Cards Grid */}
      {filteredMaterials.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[#34495E]/60 rounded-3xl bg-neutral-950/50">
          {activeSection === 'my' ? (
            <>
              <div className="p-3 bg-neutral-900 border border-[#34495E]/60 rounded-2xl w-fit mx-auto mb-3 text-neutral-400">
                <Lock className="w-8 h-8 text-[#F1C40F]" />
              </div>
              <h3 className="text-sm font-bold text-neutral-200">
                {searchQuery ? 'No matching personal documents found' : 'No personal documents uploaded yet'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching by a different term or clear the filter.'
                  : 'Upload your lecture notes, PDFs, YouTube video lectures, or voice recordings to start building your private workspace.'}
              </p>
              <button
                onClick={onOpenUploadModal}
                className="mt-5 px-5 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-md shadow-[#8E44AD]/25"
              >
                <Plus className="w-4 h-4" /> Upload Document
              </button>
            </>
          ) : (
            <>
              <div className="p-3 bg-neutral-900 border border-[#34495E]/60 rounded-2xl w-fit mx-auto mb-3 text-neutral-400">
                <Globe className="w-8 h-8 text-[#2ECC71]" />
              </div>
              <h3 className="text-sm font-bold text-neutral-200">
                {searchQuery ? 'No matching community documents found' : 'No community documents available'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching by a broader subject or clear your search term.'
                  : 'Be the first to share a study suite with the community by enabling "Make Public" on upload or toggling privacy on your documents.'}
              </p>
              <button
                onClick={onOpenUploadModal}
                className="mt-5 px-5 py-2.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-md shadow-[#8E44AD]/25"
              >
                <Plus className="w-4 h-4" /> Share First Community Guide
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((mat) => {
            const isActive = currentMaterial?.id === mat.id;
            const isMyDocument = mat.userId === user?.id;

            return (
              <div
                key={mat.id}
                className={`flex flex-col justify-between p-5 rounded-3xl border transition group relative bg-neutral-900/90 shadow-md ${
                  isActive
                    ? 'border-[#8E44AD] ring-1 ring-[#8E44AD]/50 shadow-lg shadow-[#8E44AD]/15'
                    : 'border-[#34495E]/60 hover:border-[#8E44AD]/60'
                }`}
              >
                <div>
                  {/* Top Badges & Privacy Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 truncate">
                      {mat.subject}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Privacy Badge */}
                      {mat.isPublic ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-[#34495E]/60 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}

                      {isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#8E44AD]/25 text-[#a569bd] border border-[#8E44AD]/40 flex items-center gap-1">
                          <FileCheck className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="text-sm font-bold text-neutral-100 group-hover:text-[#F1C40F] transition line-clamp-2">
                    {mat.title}
                  </h3>

                  {/* Author / Attribution */}
                  {mat.authorName && (
                    <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1">
                      <span className="text-neutral-500">By</span>
                      <span className="text-neutral-300 font-medium">{mat.authorName}</span>
                      {isMyDocument && <span className="text-[#a569bd] text-[10px] font-bold">(You)</span>}
                    </p>
                  )}

                  <p className="text-xs text-neutral-300 line-clamp-3 mt-2 leading-relaxed">
                    {mat.summary}
                  </p>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-3 gap-2 py-3 my-3 border-y border-[#34495E]/50 text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-neutral-400">Read Time</span>
                      <span className="font-semibold text-neutral-200 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-neutral-400" />
                        {mat.estimatedReadTimeMinutes || 5}m
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-400">Flashcards</span>
                      <span className="font-semibold text-[#F1C40F] flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3 text-[#a569bd]" />
                        {mat.flashcards?.length || 30}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-400">Quiz</span>
                      <span className="font-semibold text-[#2ECC71] flex items-center gap-1 mt-0.5">
                        <HelpCircle className="w-3 h-3 text-[#2ECC71]" />
                        {mat.quiz?.length || 30} Qs
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#34495E]/30 mt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        onSelectMaterial(mat);
                        onNavigateToTab('notes');
                      }}
                      className="px-3 py-1.5 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold transition shadow-sm"
                    >
                      Study Notes
                    </button>
                    <button
                      onClick={() => {
                        onSelectMaterial(mat);
                        onNavigateToTab('flashcards');
                      }}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium transition border border-[#34495E]/60"
                    >
                      Cards
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Add to My Library action for Community Docs */}
                    {!isMyDocument && (
                      <button
                        onClick={() => handleClone(mat)}
                        title="Add copy to My Library"
                        className="p-1.5 text-neutral-400 hover:text-[#2ECC71] hover:bg-neutral-800 rounded-xl transition flex items-center gap-1 text-xs"
                      >
                        {clonedId === mat.id ? (
                          <Check className="w-4 h-4 text-[#2ECC71]" />
                        ) : (
                          <BookmarkPlus className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {/* Privacy Toggle Action for Personal Documents */}
                    {isMyDocument && (
                      <button
                        onClick={() => onTogglePrivacy(mat, !mat.isPublic)}
                        title={mat.isPublic ? 'Make Private' : 'Make Public'}
                        className={`p-1.5 rounded-xl transition ${
                          mat.isPublic
                            ? 'text-[#2ECC71] hover:bg-[#2ECC71]/15'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        }`}
                      >
                        {mat.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Raw Text Inspector */}
                    <button
                      onClick={() => setPreviewMaterial(mat)}
                      title="Inspect extracted raw text"
                      className="p-1.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-xl transition"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>

                    {/* Delete Action (only personal documents) */}
                    {isMyDocument && (
                      <button
                        onClick={() => onDeleteMaterial(mat.id)}
                        title="Delete document"
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Raw Text Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-neutral-900 border border-[#34495E]/80 rounded-3xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#34495E]/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-neutral-100">{previewMaterial.title}</h3>
                  {previewMaterial.isPublic ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#2ECC71]/15 text-[#2ECC71] border border-[#2ECC71]/30">
                      Public
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-[#34495E]/60">
                      Private
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Extracted Raw Text ({previewMaterial.rawText.split(/\s+/).length} words)
                  {previewMaterial.authorName && ` &bull; By ${previewMaterial.authorName}`}
                </p>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-xl hover:bg-neutral-800 transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto my-4 p-4 bg-neutral-950 rounded-2xl border border-[#34495E]/60 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed flex-1">
              {previewMaterial.rawText}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-medium transition border border-[#34495E]/60"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
