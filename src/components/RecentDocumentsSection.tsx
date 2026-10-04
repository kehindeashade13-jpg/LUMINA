import React from 'react';
import {
  Layers,
  HelpCircle,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { StudyMaterial, ActiveTab } from '../types/study';

interface RecentDocumentsSectionProps {
  materials: StudyMaterial[];
  currentMaterial: StudyMaterial | null;
  onSelectMaterial: (material: StudyMaterial) => void;
  onNavigateToTab: (tab: ActiveTab) => void;
  onOpenUploadModal: () => void;
}

export const RecentDocumentsSection: React.FC<RecentDocumentsSectionProps> = ({
  materials,
  currentMaterial,
  onSelectMaterial,
  onNavigateToTab,
  onOpenUploadModal,
}) => {
  if (materials.length === 0) return null;

  // Sort by lastAccessedAt or updatedAt or createdAt descending
  const recentMaterials = [...materials]
    .sort((a, b) => {
      const timeA = new Date(a.lastAccessedAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastAccessedAt || b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    })
    .slice(0, 4);

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return 'Recent';
    const now = Date.now();
    const past = new Date(isoString).getTime();
    const diffMin = Math.round((now - past) / (1000 * 60));

    if (diffMin < 2) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.round(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <section aria-label="Recent Files" className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#161922] border border-[#262B36] text-[#06B6D4]">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F9FAFB]">Recent Files</h2>
            <p className="text-xs text-[#9CA3AF]">
              Pick up right where you left off in your study materials
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('documents')}
          className="text-xs font-semibold text-[#A78BFA] hover:text-[#F9FAFB] flex items-center gap-1 transition whitespace-nowrap"
        >
          <span>View All ({materials.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Cards Horizontal Grid - Clean Solid #161922 Containers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {recentMaterials.map((mat) => {
          const isActive = currentMaterial?.id === mat.id;
          return (
            <div
              key={mat.id}
              onClick={() => onSelectMaterial(mat)}
              className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between bg-[#161922] ${
                isActive
                  ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]/50 shadow-md'
                  : 'border-[#262B36] hover:border-[#7C3AED]/70'
              }`}
            >
              <div>
                {/* Header Metadata: Subject & Relative Timestamp */}
                <div className="flex items-center justify-between gap-2 mb-2 text-[11px] text-[#9CA3AF]">
                  <span className="font-semibold text-[#06B6D4] truncate max-w-[140px]">
                    {mat.subject}
                  </span>
                  <span className="font-mono tabular-nums shrink-0 text-[#9CA3AF]">
                    {formatRelativeTime(mat.lastAccessedAt || mat.updatedAt)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold text-[#F9FAFB] group-hover:text-[#A78BFA] transition line-clamp-1">
                  {mat.title}
                </h3>

                {/* Summary Excerpt */}
                <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-1.5 leading-relaxed">
                  {mat.summary || 'AI-synthesized notes, active recall flashcards, and practice quiz.'}
                </p>
              </div>

              {/* Metrics & Quick Actions */}
              <div className="mt-4 pt-3 border-t border-[#262B36] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono tabular-nums text-[11px]">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#06B6D4]/10 text-[#06B6D4] border border-[#06B6D4]/25 font-semibold">
                    <Layers className="w-3 h-3" />
                    {mat.flashcards.length}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 font-semibold">
                    <HelpCircle className="w-3 h-3" />
                    {mat.quiz.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMaterial(mat);
                      onNavigateToTab('notes');
                    }}
                    className="px-2 py-1 rounded-lg bg-[#0D0F12] hover:bg-[#7C3AED] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36] hover:border-[#7C3AED] transition text-[11px] font-semibold"
                  >
                    Notes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMaterial(mat);
                      onNavigateToTab('flashcards');
                    }}
                    className="px-2 py-1 rounded-lg bg-[#0D0F12] hover:bg-[#7C3AED] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36] hover:border-[#7C3AED] transition text-[11px] font-semibold"
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Upload New Document Dropzone Tile (Clear of floating overlaps) */}
        {recentMaterials.length < 4 && (
          <button
            type="button"
            onClick={onOpenUploadModal}
            className="p-5 rounded-2xl border-2 border-dashed border-[#262B36] hover:border-[#7C3AED] bg-[#161922] hover:bg-[#1C202B] cursor-pointer transition flex flex-col items-center justify-center text-center gap-2.5 group min-h-[148px] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
          >
            <div className="p-2.5 rounded-xl bg-[#0D0F12] border border-[#262B36] text-[#06B6D4] group-hover:bg-[#7C3AED] group-hover:text-[#F9FAFB] group-hover:border-[#7C3AED] transition">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#F9FAFB]">
                Upload New Document
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                PDF, Notes, YouTube, or Audio
              </p>
            </div>
          </button>
        )}
      </div>
    </section>
  );
};
