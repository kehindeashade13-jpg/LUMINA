import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from 'lucide-react';
import { StudyMaterial } from '../types/study';
import { extractTextFromFile } from '../services/pdfParser';
import { generateFullStudySuite } from '../services/gemini';
import { saveMaterialToDatabase } from '../services/supabase';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: (material: StudyMaterial) => void;
  userId?: string;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentCreated,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (file: File) => {
    setSelectedFile(file);
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt.replace(/[_-]/g, ' '));
    }

    try {
      setLoadingStep('Extracting document contents...');
      const extracted = await extractTextFromFile(file);
      setRawText(extracted.text);
      setLoadingStep(null);
    } catch {
      setErrorMessage('Could not extract text from file. Please try pasting raw text directly.');
      setLoadingStep(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCreateStudySuite = async () => {
    if (!rawText.trim()) {
      setErrorMessage('Please provide study text or upload a document to proceed.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setLoadingStep('Performing deep extraction on all paragraphs & formulas...');
      const docTitle = title.trim() || 'Untitled Study Guide';
      const docSubject = subject.trim() || 'General Studies';

      // 1. Generate AI study notes, flashcards, practice questions, quiz
      setLoadingStep('Generating Step-by-Step Lessons, 30 Flashcards, 30 Practice Questions & 30 Quizzes...');
      const material = await generateFullStudySuite(
        rawText,
        docTitle,
        docSubject,
        selectedFile ? selectedFile.name : undefined
      );

      // 2. Persist to Supabase single-table study_materials with user isolation
      if (userId) {
        material.userId = userId;
      }
      setLoadingStep('Persisting 90 study items & lessons to workspace...');
      await saveMaterialToDatabase(material, userId);

      setLoadingStep('Complete!');
      onDocumentCreated(material);
      onClose();
    } catch (err: unknown) {
      console.error('Study suite generation error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to generate study materials. Please check your network or API keys.'
      );
    } finally {
      setIsProcessing(false);
      setLoadingStep(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-[#34495E]/80 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#34495E]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#8E44AD]/15 text-[#a569bd] border border-[#8E44AD]/30">
              <Sparkles className="w-5 h-5 text-[#F1C40F]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-100">Upload Study Document</h3>
              <p className="text-xs text-neutral-400">
                Generate AI study guides, 3D flashcards, and quizzes with Supabase persistence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Method Tabs */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-neutral-950/80 rounded-xl border border-[#34495E]/60 text-xs font-medium">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload'
                ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileUp className="w-4 h-4" /> Upload File (PDF/TXT)
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'paste'
                ? 'bg-[#8E44AD] text-white shadow-sm shadow-[#8E44AD]/30'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Paste Text Notes
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto pr-1 my-4 space-y-4 text-sm flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <>
            {/* Common Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Molecular Biology Chapter 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Subject / Discipline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Biology, Physics, Law, History"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
                />
              </div>
            </div>

            {/* Upload Drop Zone */}
            {activeTab === 'upload' && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                  accept=".pdf,.txt,.md,.json,.csv"
                  className="hidden"
                />
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-[#8E44AD] bg-[#8E44AD]/10'
                      : selectedFile
                      ? 'border-[#2ECC71]/60 bg-[#2ECC71]/10'
                      : 'border-[#34495E]/70 hover:border-[#8E44AD] bg-neutral-950/50'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-3 rounded-2xl bg-neutral-900 border border-[#34495E]/80 text-[#8E44AD] shadow-md">
                      <Upload className="w-6 h-6" />
                    </div>
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-semibold text-[#2ECC71] flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-neutral-200">
                          Drop your PDF or document here, or <span className="text-[#a569bd] underline">browse</span>
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1">
                          Supports PDFs, plain text (.txt), Markdown (.md)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {rawText && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                      <span>Extracted Content Preview</span>
                      <span className="text-[#F1C40F] font-mono">{rawText.split(/\s+/).length} words</span>
                    </div>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs font-mono focus:outline-none focus:border-[#8E44AD] transition resize-none"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Paste Text Tab */}
            {activeTab === 'paste' && (
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Study Notes / Textbook Text
                </label>
                <textarea
                  rows={8}
                  placeholder="Paste textbook excerpts, lecture slides transcript, article content, or research notes here..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-[#34495E]/60 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-[#8E44AD] transition"
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                  <span>LUMINA AI analyzes key concepts, definitions, and questions</span>
                  <span className="text-[#F1C40F] font-mono">{rawText ? rawText.trim().split(/\s+/).length : 0} words</span>
                </div>
              </div>
            )}
          </>

          {/* Live Progress Bar when Processing */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-[#8E44AD]/15 border border-[#8E44AD]/40 text-purple-100 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-xs font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-[#F1C40F]" />
                <span>{loadingStep || 'Processing study materials with Gemini AI...'}</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-[#8E44AD] via-[#a569bd] to-[#2ECC71] h-full w-4/5 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-[#34495E]/50 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            Persists directly to Supabase table <code className="text-[#F1C40F] font-mono">study_materials</code>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition border border-[#34495E]/60 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateStudySuite}
              disabled={isProcessing || !rawText.trim()}
              className="px-5 py-2 bg-[#8E44AD] hover:bg-[#7D3C98] text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-[#8E44AD]/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#F1C40F]" /> Generate 90-Item Study Suite
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
