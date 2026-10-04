import React, { useState } from 'react';
import {
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
  Check,
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
      {/* Top Banner & Stats - Clean Solid #161922 Container */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#161922] border border-[#262B36]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] tabular-nums">
            <span className="font-semibold text-[#06B6D4]">Document Repository</span>
            <span aria-hidden="true">·</span>
            <span>{materials.length} Personal</span>
            <span aria-hidden="true">·</span>
            <span>{communityMaterials.length} Community</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#F9FAFB] mt-1">
            Study Materials Library
          </h1>
          <p className="text-xs text-[#9CA3AF] max-w-xl mt-1 leading-relaxed">
            Manage your private research archives or explore verified peer-shared study suites across subjects.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-sm transition active:scale-95 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs: My Library (Personal) vs Community Library (Public) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-[#262B36] pb-4">
        {/* Segmented Control Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0D0F12] rounded-xl border border-[#262B36] text-xs font-semibold">
          <button
            onClick={() => {
              setActiveSection('my');
              setSelectedSubject('all');
            }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
              activeSection === 'my'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1E222D]'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>My Library</span>
            <span
              className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                activeSection === 'my'
                  ? 'bg-white/20 text-[#F9FAFB]'
                  : 'bg-[#0D0F12] text-[#9CA3AF]'
              }`}
            >
              {materials.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSection('community');
              setSelectedSubject('all');
            }}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
              activeSection === 'community'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1E222D]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
            <span>Community Library</span>
            <span
              className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                activeSection === 'community'
                  ? 'bg-white/20 text-[#F9FAFB]'
                  : 'bg-[#0D0F12] text-[#9CA3AF]'
              }`}
            >
              {communityMaterials.length}
            </span>
          </button>
        </div>

        {/* Section Info Description */}
        <div className="text-xs text-[#9CA3AF] flex items-center gap-2">
          {activeSection === 'my' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-[#7C3AED] shrink-0" />
              <span>Private documents accessible only to {user?.fullName || 'your account'}</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
              <span>Public study suites shared by the Lumina academic community</span>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            placeholder={
              activeSection === 'my'
                ? 'Search your personal notes, titles, or subjects...'
                : 'Search community library by topic, author, or discipline...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#161922] border border-[#262B36] rounded-xl text-[#F9FAFB] text-xs focus:outline-none focus:border-[#7C3AED] transition placeholder:text-[#9CA3AF]"
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubject('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                selectedSubject === 'all'
                  ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                  : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36] hover:border-[#7C3AED]/60'
              }`}
            >
              All Subjects
            </button>
            {subjects.map((subj) => (
              <button
                key={subj}
                onClick={() => setSelectedSubject(subj)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] ${
                  selectedSubject === subj
                    ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                    : 'bg-[#161922] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36] hover:border-[#7C3AED]/60'
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
        <div className="p-12 text-center border-2 border-dashed border-[#262B36] rounded-2xl bg-[#161922]">
          {activeSection === 'my' ? (
            <>
              <div className="p-3 bg-[#0D0F12] border border-[#262B36] rounded-2xl w-fit mx-auto mb-3 text-[#06B6D4]">
                <Lock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#F9FAFB]">
                {searchQuery ? 'No matching personal documents found' : 'No personal documents uploaded yet'}
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching by a different term or clear the filter.'
                  : 'Upload your lecture notes, PDFs, YouTube video lectures, or voice recordings to start building your private workspace.'}
              </p>
              <button
                onClick={onOpenUploadModal}
                className="mt-5 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Document</span>
              </button>
            </>
          ) : (
            <>
              <div className="p-3 bg-[#0D0F12] border border-[#262B36] rounded-2xl w-fit mx-auto mb-3 text-[#10B981]">
                <Globe className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#F9FAFB]">
                {searchQuery ? 'No matching community documents found' : 'No community documents available'}
              </h3>
              <p className="text-xs text-[#9CA3AF] mt-1.5 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching by a broader subject or clear your search term.'
                  : 'Be the first to share a study suite with the community by enabling "Make Public" on upload or toggling privacy on your documents.'}
              </p>
              <button
                onClick={onOpenUploadModal}
                className="mt-5 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold inline-flex items-center gap-2 transition shadow-sm"
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
                className={`flex flex-col justify-between p-5 rounded-2xl border transition group relative bg-[#161922] ${
                  isActive
                    ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]/50 shadow-md'
                    : 'border-[#262B36] hover:border-[#7C3AED]/70'
                }`}
              >
                <div>
                  {/* Top Metadata & Privacy Status */}
                  <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                    <span className="font-semibold text-[#06B6D4] truncate">
                      {mat.subject}
                    </span>

                    <div className="flex items-center gap-2 shrink-0 text-[11px] text-[#9CA3AF]">
                      {mat.isPublic ? (
                        <span className="inline-flex items-center gap-1 text-[#10B981] font-medium">
                          <Globe className="w-3 h-3" /> Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#9CA3AF] font-medium">
                          <Lock className="w-3 h-3" /> Private
                        </span>
                      )}

                      {isActive && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 text-[#A78BFA] font-semibold">
                            <FileCheck className="w-3 h-3" /> Active
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="text-base font-bold text-[#F9FAFB] group-hover:text-[#A78BFA] transition line-clamp-2">
                    {mat.title}
                  </h3>

                  {/* Author / Attribution */}
                  {mat.authorName && (
                    <p className="text-xs text-[#9CA3AF] mt-1 flex items-center gap-1">
                      <span>By {mat.authorName}</span>
                      {isMyDocument && <span className="text-[#A78BFA] font-semibold">(You)</span>}
                    </p>
                  )}

                  <p className="text-xs text-[#9CA3AF] line-clamp-3 mt-2 leading-relaxed">
                    {mat.summary}
                  </p>

                  {/* Metrics Bar with Cool Cyan (#06B6D4) and Mint (#10B981) Pill Badges */}
                  <div className="flex flex-wrap items-center gap-2 py-3 my-3 border-y border-[#262B36] text-[11px] font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0D0F12] text-[#9CA3AF] border border-[#262B36] font-medium">
                      <Clock className="w-3 h-3 text-[#9CA3AF]" />
                      {mat.estimatedReadTimeMinutes || 5}m read
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/30 font-semibold">
                      <Layers className="w-3 h-3" />
                      {mat.flashcards?.length || 30} Cards
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 font-semibold">
                      <HelpCircle className="w-3 h-3" />
                      {mat.quiz?.length || 30} Quiz Qs
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onSelectMaterial(mat);
                        onNavigateToTab('notes');
                      }}
                      className="px-3.5 py-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold transition shadow-sm whitespace-nowrap"
                    >
                      Study Notes
                    </button>
                    <button
                      onClick={() => {
                        onSelectMaterial(mat);
                        onNavigateToTab('flashcards');
                      }}
                      className="px-3 py-1.5 bg-[#0D0F12] hover:bg-[#1E222D] text-[#F9FAFB] rounded-xl text-xs font-medium transition border border-[#262B36] whitespace-nowrap"
                    >
                      Cards
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    {!isMyDocument && (
                      <button
                        onClick={() => handleClone(mat)}
                        title="Add copy to My Library"
                        className="p-2 text-[#9CA3AF] hover:text-[#10B981] hover:bg-[#0D0F12] rounded-xl transition flex items-center gap-1 text-xs"
                      >
                        {clonedId === mat.id ? (
                          <Check className="w-4 h-4 text-[#10B981]" />
                        ) : (
                          <BookmarkPlus className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    {isMyDocument && (
                      <button
                        onClick={() => onTogglePrivacy(mat, !mat.isPublic)}
                        title={mat.isPublic ? 'Make Private' : 'Make Public'}
                        className={`p-2 rounded-xl transition ${
                          mat.isPublic
                            ? 'text-[#10B981] hover:bg-[#10B981]/10'
                            : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12]'
                        }`}
                      >
                        {mat.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => setPreviewMaterial(mat)}
                      title="Inspect extracted raw text"
                      className="p-2 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12] rounded-xl transition"
                    >
                      <BookOpen className="w-4 h-4" />
                    </button>

                    {isMyDocument && (
                      <button
                        onClick={() => onDeleteMaterial(mat.id)}
                        title="Delete document"
                        className="p-2 text-[#9CA3AF] hover:text-red-400 hover:bg-[#0D0F12] rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dedicated Upload New Document Dropzone Card in Grid (Clear of floating overlaps) */}
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-[#262B36] hover:border-[#7C3AED] bg-[#161922] hover:bg-[#1C202B] transition group min-h-[220px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            <div className="p-3 rounded-xl bg-[#0D0F12] border border-[#262B36] text-[#06B6D4] group-hover:bg-[#7C3AED] group-hover:text-[#F9FAFB] group-hover:border-[#7C3AED] transition mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#F9FAFB]">
              Upload New Document
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-1 max-w-[220px] leading-relaxed">
              Import PDF, Markdown, YouTube video link, or audio recording
            </p>
          </button>
        </div>
      )}

      {/* Raw Text Preview Modal */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-[#161922] border border-[#262B36] rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#262B36]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#F9FAFB]">{previewMaterial.title}</h3>
                  <span className="text-xs text-[#9CA3AF]">
                    · {previewMaterial.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-0.5 tabular-nums">
                  Extracted Raw Text ({previewMaterial.rawText.split(/\s+/).length} words)
                  {previewMaterial.authorName && ` · By ${previewMaterial.authorName}`}
                </p>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="text-[#9CA3AF] hover:text-[#F9FAFB] p-1.5 rounded-xl hover:bg-[#0D0F12] transition"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto my-4 p-4 bg-[#0D0F12] rounded-xl border border-[#262B36] font-mono text-xs text-[#F9FAFB] whitespace-pre-wrap leading-relaxed flex-1">
              {previewMaterial.rawText}
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setPreviewMaterial(null)}
                className="px-4 py-2 bg-[#0D0F12] hover:bg-[#1E222D] text-[#F9FAFB] rounded-xl text-xs font-semibold transition border border-[#262B36]"
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
