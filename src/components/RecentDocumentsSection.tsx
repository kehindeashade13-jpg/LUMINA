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
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
            <Clock className="w-4 h-4 text-[#F1C40F]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-100">Recent Files</h3>
            <p className="text-[11px] text-neutral-400">
              Pick up right where you left off in your study materials
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('documents')}
          className="text-xs font-semibold text-[#a569bd] hover:text-[#8E44AD] flex items-center gap-1 transition"
        >
          <span>View All ({materials.length})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Cards Horizontal Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {recentMaterials.map((mat) => {
          const isActive = currentMaterial?.id === mat.id;
          return (
            <div
              key={mat.id}
              onClick={() => onSelectMaterial(mat)}
              className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                isActive
                  ? 'bg-neutral-900 border-[#8E44AD] shadow-lg shadow-[#8E44AD]/15 ring-1 ring-[#8E44AD]/40'
                  : 'bg-neutral-900/70 hover:bg-neutral-900 border-[#34495E]/60 hover:border-[#8E44AD]/60'
              }`}
            >
              <div>
                {/* Header Badge & Time */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30 truncate max-w-[120px]">
                    {mat.subject}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                    {formatRelativeTime(mat.lastAccessedAt || mat.updatedAt)}
                  </span>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-neutral-100 group-hover:text-[#F1C40F] transition line-clamp-1">
                  {mat.title}
                </h4>

                {/* Summary Excerpt */}
                <p className="text-[11px] text-neutral-300 line-clamp-2 mt-1 leading-relaxed">
                  {mat.summary || 'AI-synthesized notes, active recall flashcards, and practice quiz.'}
                </p>
              </div>

              {/* Stats & Quick Actions */}
              <div className="mt-3.5 pt-2.5 border-t border-[#34495E]/50 flex items-center justify-between text-[10px] text-neutral-400">
                <div className="flex items-center gap-2 font-mono">
                  <span className="flex items-center gap-1 text-[#F1C40F] font-semibold">
                    <Layers className="w-3 h-3 text-[#a569bd]" />
                    {mat.flashcards.length}
                  </span>
                  <span className="flex items-center gap-1 text-[#2ECC71] font-semibold">
                    <HelpCircle className="w-3 h-3 text-[#2ECC71]" />
                    {mat.quiz.length}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMaterial(mat);
                      onNavigateToTab('notes');
                    }}
                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-[#8E44AD] text-neutral-200 hover:text-white transition font-medium"
                  >
                    Notes
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMaterial(mat);
                      onNavigateToTab('flashcards');
                    }}
                    className="px-1.5 py-0.5 rounded bg-neutral-800 hover:bg-[#8E44AD] text-neutral-200 hover:text-white transition font-medium"
                  >
                    Cards
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Document Quick Tile if fewer than 4 */}
        {recentMaterials.length < 4 && (
          <div
            onClick={onOpenUploadModal}
            className="p-4 rounded-2xl border-2 border-dashed border-[#34495E]/60 hover:border-[#8E44AD]/60 bg-neutral-950/40 hover:bg-neutral-900/40 cursor-pointer transition flex flex-col items-center justify-center text-center gap-2 group min-h-[130px]"
          >
            <div className="p-2 rounded-xl bg-neutral-900 border border-[#34495E]/60 text-neutral-400 group-hover:text-[#F1C40F] transition">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                Upload New Document
              </p>
              <p className="text-[10px] text-neutral-400">PDF, Notes, or Markdown</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
