import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { StudyMaterial, LuminaUser } from '../types/study';

// Local storage keys
const LOCAL_STORAGE_KEY = 'lumina_study_materials_cache';
const CONFIG_STORAGE_KEY = 'lumina_custom_supabase_config';
const AUTH_USER_STORAGE_KEY = 'lumina_auth_user_session';

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
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
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
 * ============================================================================
 * Supabase Authentication & User Session Management
 * ============================================================================
 */

function formatLuminaUser(supabaseUser: SupabaseAuthUser): LuminaUser {
  const metadata = supabaseUser.user_metadata || {};
  const fullName =
    metadata.full_name ||
    metadata.name ||
    supabaseUser.email?.split('@')[0] ||
    'Student';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    fullName: fullName,
  };
}

export async function getCurrentUser(): Promise<LuminaUser | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const user = formatLuminaUser(data.user);
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
        return user;
      }
    } catch (e) {
      console.warn('Error reading Supabase session:', e);
    }
  }

  // Fallback to local stored session if offline or demo
  try {
    const saved = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: LuminaUser | null; error?: string }> {
  const cleanEmail = email.trim();
  const cleanName = fullName.trim() || cleanEmail.split('@')[0] || 'Student';

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
          },
        },
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.user) {
        const user = formatLuminaUser(data.user);
        user.fullName = cleanName; // Ensure name is preserved immediately
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
        return { user };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      return { user: null, error: msg };
    }
  }

  // Local sandbox auth fallback for instant testing without remote keys
  const localUser: LuminaUser = {
    id: 'user_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36),
    email: cleanEmail,
    fullName: cleanName,
  };
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(localUser));
  return { user: localUser };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: LuminaUser | null; error?: string }> {
  const cleanEmail = email.trim();

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { user: null, error: error.message };
      }

      if (data?.user) {
        const user = formatLuminaUser(data.user);
        localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
        return { user };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      return { user: null, error: msg };
    }
  }

  // Local sandbox auth fallback
  const localUser: LuminaUser = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    email: cleanEmail,
    fullName: cleanEmail.split('@')[0] || 'Student',
  };
  localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(localUser));
  return { user: localUser };
}

export async function signOutUser(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  }
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
}

export function subscribeToAuthChanges(callback: (user: LuminaUser | null) => void): () => void {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }

  const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      const user = formatLuminaUser(session.user);
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
      callback(user);
    } else {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      callback(null);
    }
  });

  return () => {
    authListener.subscription.unsubscribe();
  };
}

/**
 * ============================================================================
 * User-Isolated Persistence Architecture (study_materials)
 * ============================================================================
 */

export async function saveMaterialToDatabase(
  material: StudyMaterial,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // Attach user ID and update timestamp
  const materialWithUser: StudyMaterial = {
    ...material,
    userId: userId || material.userId,
    lastAccessedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always update local cache for instant offline responsiveness
  updateLocalCache(materialWithUser, userId);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: true,
      error: 'Saved to local isolated cache. Supabase credentials not configured in VITE_SUPABASE_URL.',
    };
  }

  try {
    // Attempt insert with user_id column
    const payloadWithUserCol: Record<string, any> = {
      id: materialWithUser.id,
      title: materialWithUser.title,
      subject: materialWithUser.subject,
      full_data: materialWithUser,
    };

    if (userId) {
      payloadWithUserCol.user_id = userId;
    }

    const { error: upsertErr } = await supabase.from('study_materials').upsert(payloadWithUserCol);

    if (upsertErr) {
      // If error indicates column user_id doesn't exist yet, retry without user_id column
      if (upsertErr.message.includes('user_id') || upsertErr.code === '42703') {
        const { error: fallbackErr } = await supabase.from('study_materials').upsert({
          id: materialWithUser.id,
          title: materialWithUser.title,
          subject: materialWithUser.subject,
          full_data: materialWithUser,
        });
        if (fallbackErr) {
          console.warn('Supabase save error (fallback):', fallbackErr);
          return { success: false, error: fallbackErr.message };
        }
        return { success: true };
      }

      console.warn('Supabase save error:', upsertErr);
      return { success: false, error: upsertErr.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database error';
    console.warn('Supabase upsert exception:', err);
    return { success: false, error: msg };
  }
}

/**
 * Loading:
 * Retrieve materials filtered for the authenticated user so each user only views their own files.
 */
export async function fetchFullStudyDataFromSupabase(
  userId?: string
): Promise<{ materials: StudyMaterial[]; fromSupabase: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const cached = getLocalCache(userId);
    return { materials: cached, fromSupabase: false };
  }

  try {
    let query = supabase.from('study_materials').select('*');

    // If userId provided, try filtering by user_id column
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      // If column user_id does not exist, fetch all and filter client-side by full_data.userId
      if (error.message.includes('user_id') || error.code === '42703') {
        const { data: allData, error: allErr } = await supabase.from('study_materials').select('*');
        if (!allErr && Array.isArray(allData)) {
          const userOnly = allData
            .map((item: { full_data: StudyMaterial }) => item.full_data)
            .filter((m: StudyMaterial) => m && (!userId || m.userId === userId));

          if (userOnly.length > 0) {
            syncLocalCache(userOnly, userId);
          }
          return { materials: userOnly, fromSupabase: true };
        }
      }

      console.warn('Supabase fetch error, using local cache:', error);
      const cached = getLocalCache(userId);
      return { materials: cached, fromSupabase: false, error: error.message };
    }

    if (data && Array.isArray(data)) {
      const rehydrated = data
        .map((item: { full_data: StudyMaterial }) => item.full_data)
        .filter(Boolean) as StudyMaterial[];

      // Filter by user if returned row didn't filter
      const userFiltered = userId
        ? rehydrated.filter((m) => !m.userId || m.userId === userId)
        : rehydrated;

      if (userFiltered.length > 0) {
        syncLocalCache(userFiltered, userId);
      }

      return { materials: userFiltered, fromSupabase: true };
    }

    return { materials: [], fromSupabase: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database fetch failed';
    console.warn('Supabase fetch exception:', err);
    const cached = getLocalCache(userId);
    return { materials: cached, fromSupabase: false, error: msg };
  }
}

export async function deleteMaterialFromDatabase(id: string, userId?: string): Promise<boolean> {
  // Update local cache first
  const current = getLocalCache(userId).filter((m) => m.id !== id);
  syncLocalCache(current, userId);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let delQuery = supabase.from('study_materials').delete().eq('id', id);
      if (userId) {
        delQuery = delQuery.eq('user_id', userId);
      }
      await delQuery;
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }
  return true;
}

// Local user-isolated cache helpers
function getCacheKey(userId?: string): string {
  return userId ? `${LOCAL_STORAGE_KEY}_${userId}` : LOCAL_STORAGE_KEY;
}

function syncLocalCache(materials: StudyMaterial[], userId?: string): void {
  try {
    localStorage.setItem(getCacheKey(userId), JSON.stringify(materials));
  } catch (e) {
    console.warn('Cache write failed:', e);
  }
}

export function getLocalCache(userId?: string): StudyMaterial[] {
  try {
    const data = localStorage.getItem(getCacheKey(userId));
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
        !m.title?.includes('Quantum Computing') &&
        (!userId || !m.userId || m.userId === userId)
    );

    if (cleaned.length !== parsed.length) {
      syncLocalCache(cleaned, userId);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function updateLocalCache(material: StudyMaterial, userId?: string): void {
  try {
    const current = getLocalCache(userId);
    const index = current.findIndex((m) => m.id === material.id);
    if (index >= 0) {
      current[index] = material;
    } else {
      current.unshift(material);
    }
    syncLocalCache(current, userId);
  } catch (e) {
    console.error('Failed to update local cache', e);
  }
}

export const SUPABASE_SQL_SETUP = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  subject TEXT,
  full_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for complete multi-user isolation
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view, insert, update, and delete their own study materials
CREATE POLICY "Users can only access their own study materials"
  ON study_materials
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
`;

