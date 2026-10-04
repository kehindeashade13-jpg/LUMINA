import React, { useState } from 'react';
import {
  Plus,
  Search,
  Globe,
  Lock,
} from 'lucide-react';
import { StudyMaterial, LuminaUser } from '../types/study';
import { DocumentCard } from './DocumentCard';
import { calculateReadTime, formatAuthorName } from '../utils/formatters';

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
    <div className="space-y-6 pb-36">
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
              <span>
                Private documents accessible only to{' '}
                <span className="capitalize font-medium text-[#F9FAFB]">
                  {formatAuthorName(user?.fullName)}
                </span>
              </span>
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
                className="mt-5 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Share First Community Guide</span>
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
              <DocumentCard
                key={mat.id}
                material={mat}
                isActive={isActive}
                isMyDocument={isMyDocument}
                isCloned={clonedId === mat.id}
                onOpenStudySuite={(selected) => {
                  onSelectMaterial(selected);
                  onNavigateToTab('notes');
                }}
                onTogglePrivacy={onTogglePrivacy}
                onClone={handleClone}
                onPreviewRawText={(selected) => setPreviewMaterial(selected)}
                onDelete={onDeleteMaterial}
              />
            );
          })}

          {/* Dedicated Upload New Document Dropzone Card in Grid */}
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
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#F9FAFB] line-clamp-2 break-words">
                    {previewMaterial.title}
                  </h3>
                  <span className="text-xs text-[#9CA3AF] shrink-0">
                    · {previewMaterial.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-0.5 tabular-nums">
                  {calculateReadTime(previewMaterial.rawText, previewMaterial)} (
                  {previewMaterial.rawText ? previewMaterial.rawText.trim().split(/\s+/).filter(Boolean).length : 0}{' '}
                  words)
                  {previewMaterial.authorName && ` · By ${formatAuthorName(previewMaterial.authorName)}`}
                </p>
              </div>
              <button
                onClick={() => setPreviewMaterial(null)}
                className="text-[#9CA3AF] hover:text-[#F9FAFB] p-1.5 rounded-xl hover:bg-[#0D0F12] transition shrink-0"
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
