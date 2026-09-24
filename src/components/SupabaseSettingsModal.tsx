import React, { useState } from 'react';
import {
  X,
  Database,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  Key,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  getSupabaseCredentials,
  isSupabaseConfigured,
  saveCustomSupabaseCredentials,
  SUPABASE_SQL_SETUP,
  getSupabaseClient,
} from '../services/supabase';
import { getGeminiApiKey, saveCustomGeminiKey } from '../services/gemini';

interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onRefreshData,
}) => {
  const currentCreds = getSupabaseCredentials();
  const [supabaseUrl, setSupabaseUrl] = useState(currentCreds.url);
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(currentCreds.anonKey);
  const [geminiKey, setGeminiKey] = useState(getGeminiApiKey());

  const [copiedSql, setCopiedSql] = useState(false);
  const [testingSupabase, setTestingSupabase] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleSave = () => {
    saveCustomSupabaseCredentials(supabaseUrl, supabaseAnonKey);
    saveCustomGeminiKey(geminiKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
    if (onRefreshData) onRefreshData();
  };

  const handleTestConnection = async () => {
    setTestingSupabase(true);
    setTestResult(null);

    // Save temporary credentials first
    saveCustomSupabaseCredentials(supabaseUrl, supabaseAnonKey);

    const client = getSupabaseClient();
    if (!client) {
      setTestingSupabase(false);
      setTestResult({
        success: false,
        message: 'Invalid URL or Anon Key. Please make sure both are filled correctly.',
      });
      return;
    }

    try {
      const { data, error } = await client.from('study_materials').select('id').limit(1);
      if (error) {
        if (error.message.includes('relation "study_materials" does not exist')) {
          setTestResult({
            success: false,
            message: 'Connected to Supabase, but "study_materials" table is missing! Run the SQL snippet below.',
          });
        } else {
          setTestResult({
            success: false,
            message: `Supabase error: ${error.message}`,
          });
        }
      } else {
        setTestResult({
          success: true,
          message: 'Successfully connected to Supabase and verified "study_materials" table!',
        });
      }
    } catch (err: unknown) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to reach Supabase',
      });
    } finally {
      setTestingSupabase(false);
    }
  };

  const configured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-100">Supabase & Gemini Configuration</h3>
              <p className="text-xs text-neutral-400">
                Single-table JSONB storage for all study materials, flashcards & quizzes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1.5 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto pr-1 my-4 space-y-5 text-sm">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              configured
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
            }`}
          >
            {configured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <p className="font-semibold text-sm">
                {configured
                  ? 'Supabase Persistence Active'
                  : 'Supabase Offline Mode / Local Storage Active'}
              </p>
              <p className="text-neutral-400 mt-1">
                {configured
                  ? 'Materials are synced to your remote Supabase single-table "study_materials" and cached locally.'
                  : 'Materials are saved to local browser cache. Provide your Supabase URL & Anon Key to sync across devices.'}
              </p>
            </div>
          </div>

          {/* Supabase Credentials */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Supabase Project Connection
            </h4>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Supabase URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">
                Supabase Anon Key (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleTestConnection}
                disabled={testingSupabase || !supabaseUrl}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingSupabase ? 'animate-spin' : ''}`} />
                {testingSupabase ? 'Testing Connection...' : 'Test Connection'}
              </button>

              {testResult && (
                <span
                  className={`text-xs font-medium flex items-center gap-1 ${
                    testResult.success ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>

          {/* SQL Snippet */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Single-Table Schema (study_materials)
              </label>
              <button
                onClick={handleCopySql}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy SQL
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              Run this in your Supabase SQL Editor once. LUMINA serializes all notes, flashcards, and quizzes into the <code className="text-indigo-400 font-mono">full_data</code> JSONB column.
            </p>
            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
              <pre>{SUPABASE_SQL_SETUP}</pre>
            </div>
          </div>

          {/* Gemini API Key */}
          <div className="space-y-2 pt-2 border-t border-neutral-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Gemini AI Generation (VITE_GEMINI_API_KEY)
              </h4>
            </div>
            <p className="text-[11px] text-neutral-400">
              LUMINA automatically uses server-side Gemini in AI Studio, or you can supply an optional custom client key below for direct calls.
            </p>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 text-xs focus:outline-none focus:border-amber-500 transition font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            {savedSuccess && <span className="text-emerald-400 font-medium">✓ Settings saved successfully!</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-medium transition"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-indigo-600/20"
            >
              Save Credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
