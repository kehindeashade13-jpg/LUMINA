import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Youtube,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Music,
  ExternalLink,
  Globe,
  Lock,
} from 'lucide-react';
import { StudyMaterial } from '../types/study';
import { extractTextFromFile } from '../services/pdfParser';
import { fetchYouTubeTranscript, extractYouTubeVideoId } from '../services/youtubeParser';
import { transcribeAudio } from '../services/audioParser';
import { generateFullStudySuite } from '../services/gemini';
import { saveMaterialToDatabase } from '../services/supabase';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDocumentCreated: (material: StudyMaterial) => void;
  onClearActiveWorkspace?: () => void;
  userId?: string;
  userFullName?: string;
  initialTab?: 'document' | 'youtube' | 'audio';
  onErrorToast?: (msg: string) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onDocumentCreated,
  onClearActiveWorkspace,
  userId,
  userFullName,
  initialTab = 'document',
  onErrorToast,
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'youtube' | 'audio'>(initialTab);
  const [docInputMode, setDocInputMode] = useState<'upload' | 'paste'>('upload');

  // Metadata & Privacy
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [rawText, setRawText] = useState('');
  const [isPublic, setIsPublic] = useState(false); // Defaults to Private

  // Document states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // YouTube states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [isFetchingYoutube, setIsFetchingYoutube] = useState(false);

  // Audio & Recording states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Processing state
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Reset modal state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setTitle('');
      setSubject('');
      setRawText('');
      setIsPublic(false); // Default to Private
      setSelectedFile(null);
      setYoutubeUrl('');
      setYoutubeVideoId(null);
      setAudioFile(null);
      setRecordedAudioBlob(null);
      setRecordedAudioUrl(null);
      setErrorMessage(null);
      setLoadingStep(null);
    } else {
      stopRecording();
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    }
  }, [isOpen, initialTab]);

  // Supported document extensions for client-side JavaScript validation
  const ALLOWED_DOC_EXTENSIONS = ['pdf', 'docx', 'pptx', 'doc', 'ppt', 'txt', 'md', 'json', 'csv', 'rtf'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  // Document file selection with client-side validation for iOS / web
  const handleDocFileChange = async (file: File) => {
    setErrorMessage(null);

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File size exceeds 50MB limit. Please upload a smaller document.');
      setSelectedFile(null);
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isDocMime =
      file.type.includes('pdf') ||
      file.type.includes('word') ||
      file.type.includes('presentation') ||
      file.type.includes('powerpoint') ||
      file.type.includes('text') ||
      file.type.includes('document') ||
      file.type.includes('officedocument') ||
      file.type === '';

    const isDocExtension = ALLOWED_DOC_EXTENSIONS.includes(extension);

    if (!isDocExtension && !isDocMime) {
      setErrorMessage(
        `Unsupported document format (${extension ? `.${extension}` : 'unknown'}). Please choose a PDF, PPTX, DOCX, or text/markdown file.`
      );
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setRawText('');

    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    setTitle(cleanName);

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

  const handleDocDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleDocFileChange(e.dataTransfer.files[0]);
    }
  };

  // Audio file selection (.mp3, .m4a, .wav)
  const handleAudioFileChange = async (file: File) => {
    setAudioFile(file);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(URL.createObjectURL(file));

    const cleanName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    setTitle(`Lecture: ${cleanName}`);
  };

  // MediaRecorder Voice Note Recording
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(URL.createObjectURL(blob));
        setAudioFile(null);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setIsRecordingPaused(false);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      if (!title) {
        setTitle(`Live Lecture Recording (${new Date().toLocaleDateString()})`);
      }
    } catch (err) {
      console.error('Audio recording error:', err);
      setErrorMessage('Microphone access denied or not supported in this browser environment.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isRecordingPaused) {
        mediaRecorderRef.current.resume();
        setIsRecordingPaused(false);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        setIsRecordingPaused(true);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsRecordingPaused(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const resetRecording = () => {
    stopRecording();
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setRecordingSeconds(0);
    setAudioFile(null);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Update YouTube Video ID on URL change & auto-populate video metadata via oEmbed
  useEffect(() => {
    if (youtubeUrl) {
      const vid = extractYouTubeVideoId(youtubeUrl);
      setYoutubeVideoId(vid);
      if (vid) {
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.title) {
              const cleanTitle = data.title;
              setTitle((prev) => (prev.trim() ? prev : cleanTitle));
              if (!subject.trim()) {
                const lower = cleanTitle.toLowerCase();
                if (lower.includes('chem')) setSubject('Chemistry');
                else if (lower.includes('phys') || lower.includes('quantum')) setSubject('Physics');
                else if (lower.includes('bio')) setSubject('Biology');
                else if (lower.includes('neural') || lower.includes('comput') || lower.includes('code'))
                  setSubject('Computer Science');
                else if (lower.includes('math') || lower.includes('calculus')) setSubject('Mathematics');
                else if (lower.includes('history')) setSubject('History');
                else setSubject('Academic Lecture');
              }
            }
          })
          .catch(() => {});
      }
    } else {
      setYoutubeVideoId(null);
    }
  }, [youtubeUrl]);

  // Main Submit Action: Process Document, YouTube URL, or Audio
  const handleCreateStudySuite = async () => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let finalContent = '';
      let sourceName = '';
      let docTitle = '';
      let docSubject = subject.trim();

      // 1. YouTube import flow: clear active workspace state immediately
      if (activeTab === 'youtube') {
        onClearActiveWorkspace?.();
        setRawText('');
        setSelectedFile(null);
        setAudioFile(null);

        if (!youtubeUrl.trim() || !youtubeVideoId) {
          throw new Error('Please enter a valid YouTube video link.');
        }

        setIsFetchingYoutube(true);
        setLoadingStep('Connecting to YouTube and extracting video transcript/captions...');

        const ytData = await fetchYouTubeTranscript(youtubeUrl);
        if (!ytData.transcript || ytData.transcript.trim().length < 50) {
          throw new Error(
            'Unable to extract captions from this YouTube video. Please try a video with enabled subtitles/transcripts.'
          );
        }

        finalContent = ytData.transcript;
        const videoTitle = ytData.title.trim() || `YouTube Lecture (${youtubeVideoId})`;
        setTitle(videoTitle);
        docTitle = videoTitle;
        sourceName = `YouTube: ${videoTitle}`;
        if (!docSubject) docSubject = 'Video Lecture';
        setIsFetchingYoutube(false);
      }

      // 2. Document file / Paste flow
      if (activeTab === 'document') {
        finalContent = rawText;
        if (!finalContent.trim()) {
          throw new Error('No study content found. Please upload a valid document or paste text.');
        }

        if (title.trim()) {
          docTitle = title.trim();
        } else if (selectedFile) {
          docTitle = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
        } else {
          const firstLine = finalContent.split('\n')[0].replace(/[#*_-]/g, '').trim();
          docTitle = firstLine ? firstLine.slice(0, 50).trim() : 'Document Notes';
        }

        sourceName = selectedFile ? selectedFile.name : docTitle;
        if (!docSubject) docSubject = 'Document Studies';
      }

      // 3. Audio file / Recording flow
      if (activeTab === 'audio') {
        const audioSource = audioFile || recordedAudioBlob;
        if (!audioSource) {
          throw new Error('Please record audio or upload an audio file (.mp3, .m4a, .wav).');
        }
        setLoadingStep('Transcribing speech & analyzing lecture contents with Gemini...');
        const transcribed = await transcribeAudio(audioSource, audioFile ? audioFile.name : 'Lecture_Voice_Note.webm');
        finalContent = transcribed.transcript;
        sourceName = audioFile ? `Audio: ${audioFile.name}` : 'Live Lecture Recording';
        docTitle =
          title.trim() ||
          (audioFile
            ? `Lecture: ${audioFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')}`
            : 'Live Lecture Recording');
        if (!docSubject) docSubject = 'Lecture Audio';
      }

      if (!finalContent.trim()) {
        throw new Error('No study content found. Please provide text, a valid YouTube link, or audio.');
      }

      // Generate 90-item comprehensive study suite
      setLoadingStep('Generating Step-by-Step Lessons, 30 Flashcards, 30 Notes & 30 Quizzes...');
      const material = await generateFullStudySuite(
        finalContent,
        docTitle,
        docSubject,
        sourceName
      );

      material.isPublic = isPublic;
      material.authorName = userFullName || 'Scholar';
      if (userId) {
        material.userId = userId;
      }

      setLoadingStep('Persisting study suite to workspace...');
      const saveRes = await saveMaterialToDatabase(material, userId, userFullName);

      if (!saveRes.success && saveRes.error) {
        onErrorToast?.(`Supabase Error: ${saveRes.error}`);
        throw new Error(saveRes.error);
      }

      setLoadingStep('Complete!');
      onDocumentCreated(material);
      onClose();
    } catch (err: unknown) {
      console.error('Study suite generation error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to generate study materials. Please check your network or try again.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
      setLoadingStep(null);
      setIsFetchingYoutube(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-[#161922] border border-[#262B36] rounded-2xl shadow-2xl p-5 sm:p-6 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262B36]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#0D0F12] text-[#7C3AED] border border-[#262B36]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#F9FAFB]">Upload Study Materials</h3>
              <p className="text-xs text-[#9CA3AF]">
                PDFs, YouTube Lectures, & Audio Voice Notes synthesized into a full study suite
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-[#9CA3AF] hover:text-[#F9FAFB] p-1.5 rounded-lg hover:bg-[#0D0F12] transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Tab Bar: Clean 3-column grid (grid grid-cols-3 gap-2) with uniform padding (py-2 px-3) and centered icons/labels */}
        <div className="grid grid-cols-3 gap-2 mt-4 p-1.5 bg-[#0D0F12] rounded-xl border border-[#262B36] text-xs font-semibold">
          {/* 1. Document */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('document');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-center transition whitespace-nowrap ${
              activeTab === 'document'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922]'
            }`}
          >
            <FileUp className="w-4 h-4 shrink-0" />
            <span>Document</span>
          </button>

          {/* 2. YouTube Link */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('youtube');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-center transition whitespace-nowrap ${
              activeTab === 'youtube'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922]'
            }`}
          >
            <Youtube className="w-4 h-4 text-red-400 shrink-0" />
            <span>YouTube Link</span>
          </button>

          {/* 3. Audio */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('audio');
              setErrorMessage(null);
            }}
            className={`py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-center transition whitespace-nowrap ${
              activeTab === 'audio'
                ? 'bg-[#7C3AED] text-[#F9FAFB] shadow-sm'
                : 'text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#161922]'
            }`}
          >
            <Mic className="w-4 h-4 text-[#06B6D4] shrink-0" />
            <span>Audio</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto pr-1 my-4 space-y-4 text-sm flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Common Metadata Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#F9FAFB] mb-1">
                Study Guide Title
              </label>
              <input
                type="text"
                placeholder={
                  activeTab === 'youtube'
                    ? 'e.g. Neural Networks & Deep Learning'
                    : activeTab === 'audio'
                    ? 'e.g. Economics Lecture Chapter 4'
                    : 'e.g. Molecular Biology Chapter 3'
                }
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0D0F12] border border-[#262B36] rounded-xl text-[#F9FAFB] placeholder-[#9CA3AF] text-xs focus:outline-none focus:border-[#7C3AED] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#F9FAFB] mb-1">
                Subject / Discipline
              </label>
              <input
                type="text"
                placeholder="e.g. Biology, Physics, Law, History, Computer Science"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#0D0F12] border border-[#262B36] rounded-xl text-[#F9FAFB] placeholder-[#9CA3AF] text-xs focus:outline-none focus:border-[#7C3AED] transition"
              />
            </div>
          </div>

          {/* Dynamic Privacy & Sharing Toggle */}
          <div className="p-3.5 rounded-xl bg-[#0D0F12] border border-[#262B36] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-xl border transition shrink-0 ${
                  isPublic
                    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                    : 'bg-[#161922] text-[#9CA3AF] border-[#262B36]'
                }`}
              >
                {isPublic ? (
                  <Globe className="w-4 h-4 text-[#10B981]" />
                ) : (
                  <Lock className="w-4 h-4 text-[#9CA3AF]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-[#F9FAFB]">
                    {isPublic ? 'Share with Community' : 'Private Document'}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition ${
                      isPublic
                        ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                        : 'bg-[#161922] text-[#9CA3AF] border-[#262B36]'
                    }`}
                  >
                    {isPublic ? 'Public' : 'Private (Default)'}
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-relaxed">
                  {isPublic
                    ? 'Visible to all Lumina users in the shared document library.'
                    : 'Strictly private to your account. Only you can view and access this file.'}
                </p>
              </div>
            </div>

            {/* Toggle Switch Button */}
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              aria-label={isPublic ? 'Share with Community' : 'Private Document'}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPublic ? 'bg-[#10B981]' : 'bg-[#262B36]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* TAB 1: DOCUMENT / TEXT */}
          {activeTab === 'document' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-1 bg-[#0D0F12] rounded-xl border border-[#262B36] text-xs font-medium w-fit">
                <button
                  type="button"
                  onClick={() => setDocInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    docInputMode === 'upload'
                      ? 'bg-[#7C3AED] text-[#F9FAFB] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
                  }`}
                >
                  Upload File (.pdf, .pptx, .docx, .txt)
                </button>
                <button
                  type="button"
                  onClick={() => setDocInputMode('paste')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    docInputMode === 'paste'
                      ? 'bg-[#7C3AED] text-[#F9FAFB] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#F9FAFB]'
                  }`}
                >
                  Paste Text Notes
                </button>
              </div>

              {docInputMode === 'upload' ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleDocFileChange(e.target.files[0]);
                      }
                      e.target.value = '';
                    }}
                    accept=".pdf,.pptx,.docx,.doc,.ppt,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.ms-powerpoint,text/plain,text/markdown"
                    className="hidden"
                  />
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDocDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition ${
                      isDragging
                        ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                        : selectedFile
                        ? 'border-[#10B981]/60 bg-[#10B981]/10'
                        : 'border-[#262B36] hover:border-[#7C3AED] bg-[#0D0F12]'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <div className="p-3 rounded-xl bg-[#161922] border border-[#262B36] text-[#7C3AED]">
                        <Upload className="w-6 h-6" />
                      </div>
                      {selectedFile ? (
                        <div>
                          <p className="text-xs font-semibold text-[#10B981] flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" /> {selectedFile.name}
                          </p>
                          <p className="text-[11px] text-[#9CA3AF] mt-1 font-mono tabular-nums">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Click to change file
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-[#F9FAFB]">
                            Drop your PDF, PPTX, DOCX, or document here, or <span className="text-[#A78BFA] underline">browse</span>
                          </p>
                          <p className="text-[11px] text-[#9CA3AF] mt-1">
                            Supports PDFs, PowerPoint (.pptx), Word (.docx), Markdown (.md), and plain text (.txt)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <textarea
                    rows={6}
                    placeholder="Paste textbook excerpts, lecture slides transcript, article content, or research notes here..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#0D0F12] border border-[#262B36] rounded-xl text-[#F9FAFB] placeholder-[#9CA3AF] text-xs focus:outline-none focus:border-[#7C3AED] transition"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: YOUTUBE VIDEO LINK */}
          {activeTab === 'youtube' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#F9FAFB] mb-1.5">
                  Paste YouTube Video URL
                </label>
                <div className="relative flex items-center">
                  <Youtube className="absolute left-3.5 w-4 h-4 text-red-400" />
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0D0F12] border border-[#262B36] rounded-xl text-[#F9FAFB] placeholder-[#9CA3AF] text-xs focus:outline-none focus:border-[#7C3AED] transition"
                  />
                </div>
                <p className="text-[11px] text-[#9CA3AF] mt-1.5">
                  Lumina automatically fetches the lecture transcript and extracts the full study suite.
                </p>
              </div>

              {youtubeVideoId && (
                <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#262B36] flex items-center gap-4">
                  <img
                    src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                    alt="YouTube Video Thumbnail"
                    className="w-28 h-18 object-cover rounded-lg border border-[#262B36] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/40 font-bold">
                      YouTube Video Detected
                    </span>
                    <h4 className="text-xs font-bold text-[#F9FAFB] mt-1 truncate">
                      {title || `YouTube Video ID: ${youtubeVideoId}`}
                    </h4>
                    <a
                      href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#A78BFA] hover:text-[#F9FAFB] flex items-center gap-1 mt-1 transition"
                    >
                      <span>Open on YouTube</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-[#0D0F12] border border-[#262B36]">
                <span className="text-xs font-bold text-[#7C3AED] uppercase tracking-wider block mb-2">
                  Try Sample Academic YouTube Lectures
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setYoutubeUrl('https://www.youtube.com/watch?v=aircAruvnKk');
                      setTitle('3Blue1Brown: But what is a neural network?');
                      setSubject('Computer Science');
                    }}
                    className="px-2.5 py-1 bg-[#161922] hover:bg-[#1E222D] border border-[#262B36] rounded-lg text-[11px] text-[#9CA3AF] hover:text-[#F9FAFB] transition"
                  >
                    Neural Networks (3Blue1Brown)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setYoutubeUrl('https://www.youtube.com/watch?v=8jLOx1hD3_o');
                      setTitle('Stanford: Introduction to Quantum Mechanics');
                      setSubject('Physics');
                    }}
                    className="px-2.5 py-1 bg-[#161922] hover:bg-[#1E222D] border border-[#262B36] rounded-lg text-[11px] text-[#9CA3AF] hover:text-[#F9FAFB] transition"
                  >
                    Quantum Mechanics (Stanford)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIO / RECORD LECTURE */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-[#0D0F12] border border-[#262B36]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-red-500 animate-ping' : 'bg-[#06B6D4]'}`} />
                    <span className="text-xs font-bold text-[#F9FAFB]">
                      {isRecording ? (isRecordingPaused ? 'Recording Paused' : 'Recording Live Lecture...') : 'Record Lecture / Voice Note'}
                    </span>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-bold text-[#06B6D4] bg-[#161922] px-2.5 py-1 rounded-lg border border-[#262B36]">
                    {formatTimer(recordingSeconds)}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
                    >
                      <Mic className="w-4 h-4" /> Start Recording
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={pauseRecording}
                        className="px-3.5 py-2 bg-[#161922] hover:bg-[#1E222D] text-[#F9FAFB] border border-[#262B36] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        {isRecordingPaused ? <Play className="w-3.5 h-3.5 text-[#10B981]" /> : <Pause className="w-3.5 h-3.5 text-[#06B6D4]" />}
                        <span>{isRecordingPaused ? 'Resume' : 'Pause'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
                      >
                        <Square className="w-3.5 h-3.5" /> Stop & Finish
                      </button>
                    </>
                  )}

                  {recordedAudioBlob && !isRecording && (
                    <button
                      type="button"
                      onClick={resetRecording}
                      className="px-3 py-2 bg-[#161922] hover:bg-[#1E222D] text-[#9CA3AF] hover:text-[#F9FAFB] border border-[#262B36] rounded-xl text-xs font-medium flex items-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset
                    </button>
                  )}
                </div>

                {recordedAudioUrl && !isRecording && (
                  <div className="mt-4 pt-3 border-t border-[#262B36] flex items-center gap-3">
                    <audio
                      ref={audioPreviewRef}
                      src={recordedAudioUrl}
                      onPlay={() => setIsPlayingPreview(true)}
                      onPause={() => setIsPlayingPreview(false)}
                      onEnded={() => setIsPlayingPreview(false)}
                      controls
                      className="w-full h-8 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-[#262B36] w-full" />
                <span className="bg-[#161922] px-3 text-[11px] text-[#9CA3AF] uppercase font-mono absolute">
                  OR Upload Audio File
                </span>
              </div>

              <div>
                <input
                  type="file"
                  ref={audioFileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleAudioFileChange(e.target.files[0])}
                  accept=".mp3,.m4a,.wav,.webm,.ogg,.aac"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioFileInputRef.current?.click()}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-[#262B36] hover:border-[#7C3AED] bg-[#0D0F12] transition flex items-center justify-center gap-3 text-xs text-[#9CA3AF] hover:text-[#F9FAFB]"
                >
                  <Music className="w-5 h-5 text-[#7C3AED]" />
                  <span>
                    {audioFile ? (
                      <strong className="text-[#10B981]">
                        {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                      </strong>
                    ) : (
                      'Choose .mp3, .m4a, or .wav lecture audio file'
                    )}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Live Progress Bar when Processing */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-[#0D0F12] border border-[#7C3AED]/50 text-[#F9FAFB] space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 text-xs font-medium">
                <Loader2 className="w-4 h-4 animate-spin text-[#06B6D4]" />
                <span>{loadingStep || 'Processing study materials...'}</span>
              </div>
              <div className="w-full bg-[#161922] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#7C3AED] h-full w-4/5 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Error Notice */}
        {errorMessage && (
          <div className="pt-2">
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="flex-1 leading-snug">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Responsive Modal Footer Layout */}
        <div className="pt-3 border-t border-[#262B36]">
          <p className="text-xs text-slate-400 text-center mb-3">
            Generates 30 Flashcards, 30 Notes & 30 Quizzes
          </p>
          <div className="flex gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-5 py-2.5 bg-[#0D0F12] hover:bg-[#1E222D] text-[#9CA3AF] hover:text-[#F9FAFB] rounded-xl text-xs font-semibold transition border border-[#262B36] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateStudySuite}
              disabled={
                isProcessing ||
                (activeTab === 'document' && !rawText.trim()) ||
                (activeTab === 'youtube' && (!youtubeUrl.trim() || !youtubeVideoId)) ||
                (activeTab === 'audio' && !audioFile && !recordedAudioBlob)
              }
              className="flex-1 py-2.5 px-5 bg-[#7C3AED] hover:bg-[#6D28D9] text-[#F9FAFB] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#06B6D4]" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Study Suite</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
