import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { StudyMaterial } from '../types/study';

// Local storage key for fallback persistence or offline cache
const LOCAL_STORAGE_KEY = 'lumina_study_materials_cache';
const CONFIG_STORAGE_KEY = 'lumina_custom_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Get configured credentials from env or user local override
export function getSupabaseCredentials(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  if (envUrl && envKey && !envUrl.includes('your-project')) {
    return { url: envUrl.trim(), anonKey: envKey.trim() };
  }

  // Check localStorage for manually entered keys if env vars were not populated
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url.trim(), anonKey: parsed.anonKey.trim() };
      }
    }
  } catch (e) {
    console.error('Failed to read custom supabase config', e);
  }

  return { url: envUrl, anonKey: envKey };
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string): void {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify({ url, anonKey }));
  clientInstance = null; // reset cached client
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const creds = getSupabaseCredentials();
  if (!creds.url || !creds.anonKey || creds.url.includes('your-project')) {
    return null;
  }

  if (!clientInstance) {
    try {
      clientInstance = createClient(creds.url, creds.anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
}

export function isSupabaseConfigured(): boolean {
  const creds = getSupabaseCredentials();
  return Boolean(creds.url && creds.anonKey && !creds.url.includes('your-project'));
}

/**
 * 1. Single-Table JSONB Persistence Architecture
 * Saving (saveMaterialToDatabase):
 * Packages the entire item state (metadata, extracted text, notes, flashcards, and quizzes)
 * into a single object and writes it into the full_data JSONB column:
 * await supabase.from('study_materials').upsert({ id: material.id, title: material.title, subject: material.subject, full_data: material })
 */
export async function saveMaterialToDatabase(material: StudyMaterial): Promise<{ success: boolean; error?: string }> {
  // Always update local cache for instant offline responsiveness
  updateLocalCache(material);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: true,
      error: 'Saved locally. Supabase credentials not configured in VITE_SUPABASE_URL.',
    };
  }

  try {
    const { error } = await supabase.from('study_materials').upsert({
      id: material.id,
      title: material.title,
      subject: material.subject,
      full_data: material,
    });

    if (error) {
      console.warn('Supabase save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.warn('Supabase upsert exception:', err);
    return { success: false, error: msg };
  }
}

/**
 * Loading (fetchFullStudyDataFromSupabase):
 * On initial app load (useEffect), retrieve all materials using:
 * const { data } = await supabase.from('study_materials').select('*')
 * Rehydrate the React application state directly from item.full_data.
 * Do not filter queries by user_id or require separate child table lookups.
 */
export async function fetchFullStudyDataFromSupabase(): Promise<{ materials: StudyMaterial[]; fromSupabase: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const cached = getLocalCache();
    return { materials: cached, fromSupabase: false };
  }

  try {
    const { data, error } = await supabase.from('study_materials').select('*');

    if (error) {
      console.warn('Supabase fetch error:', error);
      const cached = getLocalCache();
      return { materials: cached, fromSupabase: false, error: error.message };
    }

    if (data && Array.isArray(data)) {
      const rehydrated = data
        .map((item: { full_data: StudyMaterial }) => item.full_data)
        .filter(Boolean) as StudyMaterial[];

      // Sync local cache
      if (rehydrated.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(rehydrated));
      }

      return { materials: rehydrated, fromSupabase: true };
    }

    return { materials: [], fromSupabase: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database fetch failed';
    console.warn('Supabase fetch exception:', err);
    const cached = getLocalCache();
    return { materials: cached, fromSupabase: false, error: msg };
  }
}

export async function deleteMaterialFromDatabase(id: string): Promise<boolean> {
  // Update local cache first
  const current = getLocalCache().filter(m => m.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('study_materials').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }
  return true;
}

// Local cache helpers
export function getLocalCache(): StudyMaterial[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    // Filter out any legacy mock materials
    const cleaned = parsed.filter(
      (m: StudyMaterial) =>
        m &&
        m.id !== 'mat_neuro_synaptic_plasticity' &&
        m.id !== 'mat_quantum_computing_qubits' &&
        !m.title?.includes('Neurobiology') &&
        !m.title?.includes('Quantum Computing')
    );

    if (cleaned.length !== parsed.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function updateLocalCache(material: StudyMaterial): void {
  try {
    const current = getLocalCache();
    const index = current.findIndex(m => m.id === material.id);
    if (index >= 0) {
      current[index] = material;
    } else {
      current.unshift(material);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Failed to update local cache', e);
  }
}

export const SUPABASE_SQL_SETUP = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT,
  full_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public policy for the study workspace
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public full access for study materials"
  ON study_materials
  FOR ALL
  USING (true)
  WITH CHECK (true);
`;
