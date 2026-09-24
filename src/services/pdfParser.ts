import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  try {
    // Set standard CDN worker URL matching installed version or fallback
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Failed to configure pdf.js worker URL:', e);
  }
}

/**
 * Extracts plain text from an uploaded file (PDF, TXT, MD, JSON, etc.)
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; wordCount: number; charCount: number }> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (extension === 'pdf') {
    return extractTextFromPdf(file);
  } else {
    return extractTextFromTextFile(file);
  }
}

async function extractTextFromTextFile(file: File): Promise<{ text: string; wordCount: number; charCount: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
      resolve({
        text: content,
        wordCount,
        charCount: content.length,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read text file.'));
    reader.readAsText(file);
  });
}

async function extractTextFromPdf(file: File): Promise<{ text: string; wordCount: number; charCount: number }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    let fullText = '';
    const numPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');

      fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`;
    }

    const cleaned = fullText.replace(/\s+/g, ' ').trim();
    const wordCount = cleaned ? cleaned.split(/\s+/).length : 0;

    return {
      text: fullText.trim(),
      wordCount,
      charCount: fullText.length,
    };
  } catch (err) {
    console.warn('pdfjs extraction failed, attempting binary stream text recovery:', err);
    return fallbackPdfStreamExtraction(file);
  }
}

// Fallback in case worker is blocked by CSP or browser sandboxing
async function fallbackPdfStreamExtraction(file: File): Promise<{ text: string; wordCount: number; charCount: number }> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let rawStr = '';

  for (let i = 0; i < bytes.length; i++) {
    const charCode = bytes[i];
    // Keep printable ASCII chars & newlines
    if ((charCode >= 32 && charCode <= 126) || charCode === 10 || charCode === 13) {
      rawStr += String.fromCharCode(charCode);
    }
  }

  // Extract strings inside parentheses (standard PDF text operands e.g. (Hello World) Tj)
  const matches = rawStr.match(/\((.*?)\)\s*Tj/g) || [];
  let extracted = '';
  if (matches.length > 0) {
    extracted = matches.map(m => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')).join(' ');
  } else {
    // If no standard Tj tokens, extract long clean word chunks
    const words = rawStr.match(/[A-Za-z0-9,.:;'"\-\s]{4,}/g) || [];
    extracted = words.join(' ');
  }

  const clean = extracted.replace(/\s+/g, ' ').trim();
  const wordCount = clean ? clean.split(/\s+/).length : 0;

  return {
    text: clean || `Extracted text from ${file.name}. (PDF content preview)`,
    wordCount,
    charCount: clean.length,
  };
}
