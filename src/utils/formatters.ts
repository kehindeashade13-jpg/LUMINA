import { StudyMaterial } from '../types/study';

/**
 * Dynamically calculates reading time based on word count (~200 words per minute).
 * Falls back to synthesized sections/summary word count or file size estimation
 * if raw document text is unavailable.
 */
export const calculateReadTime = (
  text?: string,
  material?: Partial<StudyMaterial>,
  fileSizeBytes?: number
): string => {
  const raw = text?.trim() || '';
  if (raw.length > 0) {
    const words = raw.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes}m read`;
  }

  // Fallback 1: Aggregate synthesized content from the material object if rawText isn't populated
  if (material) {
    const combinedText = [
      material.summary || '',
      ...(material.keyPoints || []),
      ...(material.sections?.map((s) => `${s.title} ${s.content}`) || []),
      ...(material.glossary?.map((g) => `${g.term} ${g.definition}`) || []),
    ]
      .join(' ')
      .trim();

    if (combinedText.length > 0) {
      const words = combinedText.split(/\s+/).filter(Boolean).length;
      const minutes = Math.max(1, Math.ceil(words / 200));
      return `${minutes}m read`;
    }
  }

  // Fallback 2: Estimate from file size (~500 words per page / ~150 words per KB)
  if (fileSizeBytes && fileSizeBytes > 0) {
    const estimatedWords = Math.ceil((fileSizeBytes / 1024) * 150);
    const minutes = Math.max(1, Math.ceil(estimatedWords / 200));
    return `${minutes}m read`;
  }

  return '1m read';
};

/**
 * Dynamically calculates numeric reading time in minutes based on word count.
 */
export const calculateReadTimeMinutes = (text?: string): number => {
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  return Math.max(1, Math.ceil(words / 200));
};

/**
 * Formats author names with proper title capitalization (e.g., "Elisha Sesede" instead of "Elisha sesede").
 */
export const formatAuthorName = (name?: string): string => {
  if (!name || !name.trim()) return 'Scholar';
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Truncates long document titles cleanly for input placeholders, chips, and compact badges.
 * Example: truncateTitle("BIO 203 Advanced Cellular Mechanics", 18) -> "BIO 203 Advanced C..."
 */
export const truncateTitle = (title?: string, maxLength: number = 18): string => {
  if (!title || !title.trim()) return 'Document';
  const clean = title.trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trimEnd()}...`;
};

/**
 * Filters out unparsed AI prompt subtitle strings, raw key instructions, or prompt metadata
 * before rendering card headers, questions, or options.
 */
export const cleanPromptArtifacts = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/SELECT THE CORRECT DEFINITION\s*\/?\s*(ANSWER|KEYS)?\s*:?/gi, '')
    .replace(/KEYS:\s*1\/A,\s*2\/B(,\s*3\/C,\s*4\/D)?/gi, '')
    .replace(/\bANSWER\s*:\s*$/gi, '')
    .replace(/\s*\(\d+\s*[-–to]+\s*\d+\s+core\s+concepts?\)/gi, '')
    .replace(/\s*\(\d+\s*[-–to]+\s*\d+\s+items?\)/gi, '')
    .trim();
};
