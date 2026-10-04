import React from 'react';
import {
  Clock,
  Layers,
  HelpCircle,
  BookOpen,
  FileCheck,
  Globe,
  Lock,
  Check,
  BookmarkPlus,
  Share2,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { StudyMaterial } from '../types/study';
import { calculateReadTime, formatAuthorName } from '../utils/formatters';

export interface DocumentCardProps {
  material: StudyMaterial;
  isActive: boolean;
  isMyDocument: boolean;
  isCloned?: boolean;
  onOpenStudySuite: (material: StudyMaterial) => void;
  onTogglePrivacy?: (material: StudyMaterial, isPublic: boolean) => void;
  onClone?: (material: StudyMaterial) => void;
  onPreviewRawText?: (material: StudyMaterial) => void;
  onDelete?: (id: string) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  material,
  isActive,
  isMyDocument,
  isCloned = false,
  onOpenStudySuite,
  onTogglePrivacy,
  onClone,
  onPreviewRawText,
  onDelete,
}) => {
  const readTimeLabel = calculateReadTime(material.rawText, material);
  const formattedAuthor = formatAuthorName(material.authorName);
  const cardsCount = material.flashcards?.length || 30;
  const quizzesCount = material.quiz?.length || 30;

  return (
    <div
      className={`flex flex-col justify-between p-5 rounded-2xl border transition group relative bg-[#161922] ${
        isActive
          ? 'border-[#7C3AED] ring-1 ring-[#7C3AED]/50 shadow-md'
          : 'border-[#262B36] hover:border-[#7C3AED]/70'
      }`}
    >
      <div>
        {/* Top Row: Subject & Privacy Metadata on Left | Action Icons (Bookmark / Share / Inspect / Delete) in Top-Right */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-wrap text-xs">
            <span className="font-semibold text-[#06B6D4] truncate max-w-[160px]">
              {material.subject || 'General Studies'}
            </span>
            <span aria-hidden="true" className="text-[#262B36]">•</span>
            {material.isPublic ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981] font-medium">
                <Globe className="w-3 h-3 shrink-0" />
                <span>Public</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF] font-medium">
                <Lock className="w-3 h-3 shrink-0" />
                <span>Private</span>
              </span>
            )}
            {isActive && (
              <>
                <span aria-hidden="true" className="text-[#262B36]">•</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#A78BFA] font-semibold">
                  <FileCheck className="w-3 h-3 shrink-0" />
                  <span>Active</span>
                </span>
              </>
            )}
          </div>

          {/* Top-Right Corner Action Icons (Bookmark / Share / Inspect / Delete) */}
          <div className="flex items-center gap-1 shrink-0 -mt-1 -mr-1">
            {!isMyDocument && onClone && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClone(material);
                }}
                title="Bookmark / Save to My Library"
                aria-label="Bookmark to My Library"
                className="p-1.5 text-[#9CA3AF] hover:text-[#10B981] hover:bg-[#0D0F12] rounded-lg transition"
              >
                {isCloned ? (
                  <Check className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <BookmarkPlus className="w-4 h-4" />
                )}
              </button>
            )}

            {isMyDocument && onTogglePrivacy && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePrivacy(material, !material.isPublic);
                }}
                title={material.isPublic ? 'Shared Publicly (Click to Make Private)' : 'Share with Community'}
                aria-label={material.isPublic ? 'Make Private' : 'Share with Community'}
                className={`p-1.5 rounded-lg transition ${
                  material.isPublic
                    ? 'text-[#10B981] hover:bg-[#10B981]/10'
                    : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12]'
                }`}
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            {onPreviewRawText && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPreviewRawText(material);
                }}
                title="Inspect extracted document text"
                aria-label="Inspect extracted document text"
                className="p-1.5 text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#0D0F12] rounded-lg transition"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            )}

            {isMyDocument && onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(material.id);
                }}
                title="Delete document"
                aria-label="Delete document"
                className="p-1.5 text-[#9CA3AF] hover:text-red-400 hover:bg-[#0D0F12] rounded-lg transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Title (Cleanly truncated with max 2 lines via line-clamp-2) */}
        <h3
          title={material.title}
          className="text-base font-bold text-[#F9FAFB] group-hover:text-[#A78BFA] transition line-clamp-2 break-words overflow-hidden leading-snug"
        >
          {material.title}
        </h3>

        {/* Author Metadata with Proper Name Capitalization */}
        <p className="text-xs text-[#9CA3AF] mt-1.5 flex items-center gap-1">
          <span>By</span>
          <span className="text-[#F9FAFB] font-medium capitalize">{formattedAuthor}</span>
          {isMyDocument && <span className="text-[#A78BFA] font-semibold">(You)</span>}
        </p>

        {/* Summary Excerpt */}
        <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-2 leading-relaxed">
          {material.summary}
        </p>

        {/* Single Inline Flex Row for Metadata Metrics: [⏱️ Xm read] • [🎴 30 Cards] • [❓ 30 Quizzes] */}
        <div className="flex items-center flex-wrap gap-2 py-3 my-3.5 border-y border-[#262B36] text-xs font-mono tabular-nums text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1.5 text-[#F9FAFB] font-medium whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
            <span>{readTimeLabel}</span>
          </span>

          <span aria-hidden="true" className="text-[#9CA3AF]/50">•</span>

          <span className="inline-flex items-center gap-1.5 text-[#06B6D4] font-medium whitespace-nowrap">
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span>{cardsCount} Cards</span>
          </span>

          <span aria-hidden="true" className="text-[#9CA3AF]/50">•</span>

          <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium whitespace-nowrap">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{quizzesCount} Quizzes</span>
          </span>
        </div>
      </div>

      {/* Consolidated Primary CTA Button */}
      <button
        type="button"
        onClick={() => onOpenStudySuite(material)}
        className="w-full py-2.5 px-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06B6D4]"
      >
        <span>Open Study Suite</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
