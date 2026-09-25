import { createClient, SupabaseClient, User as SupabaseAuthUser } from '@supabase/supabase-js';
import { StudyMaterial, LuminaUser } from '../types/study';

// Local storage keys
const LOCAL_STORAGE_KEY = 'lumina_study_materials_cache';
const COMMUNITY_STORAGE_KEY = 'lumina_community_study_materials';
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

/**
 * ============================================================================
 * User-Isolated & Public/Private Persistence Architecture (study_materials)
 * ============================================================================
 */

export async function saveMaterialToDatabase(
  material: StudyMaterial,
  userId?: string,
  authorName?: string
): Promise<{ success: boolean; error?: string }> {
  // Attach user ID, author name, privacy flag, and update timestamp
  const materialWithUser: StudyMaterial = {
    ...material,
    userId: userId || material.userId,
    authorName: authorName || material.authorName || 'Scholar',
    isPublic: material.isPublic === true,
    lastAccessedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Always update local cache for instant offline responsiveness
  updateLocalCache(materialWithUser, userId);
  if (materialWithUser.isPublic) {
    updateCommunityCache(materialWithUser);
  } else {
    removeFromCommunityCache(materialWithUser.id);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: true,
      error: 'Saved to local isolated cache. Supabase credentials not configured in VITE_SUPABASE_URL.',
    };
  }

  try {
    // Attempt insert with user_id and is_public columns
    const payloadWithCols: Record<string, any> = {
      id: materialWithUser.id,
      title: materialWithUser.title,
      subject: materialWithUser.subject,
      is_public: materialWithUser.isPublic === true,
      full_data: materialWithUser,
    };

    if (userId) {
      payloadWithCols.user_id = userId;
    }

    const { error: upsertErr } = await supabase.from('study_materials').upsert(payloadWithCols);

    if (upsertErr) {
      // If error indicates column does not exist, retry with simpler columns while full_data maintains isPublic
      if (
        upsertErr.message.includes('user_id') ||
        upsertErr.message.includes('is_public') ||
        upsertErr.code === '42703'
      ) {
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
 * Toggle a document's privacy status (Public vs Private)
 */
export async function toggleMaterialPrivacy(
  material: StudyMaterial,
  isPublic: boolean,
  userId?: string
): Promise<StudyMaterial> {
  const updated: StudyMaterial = {
    ...material,
    isPublic,
    updatedAt: new Date().toISOString(),
  };

  await saveMaterialToDatabase(updated, userId);
  return updated;
}

/**
 * Clone a public community material into user's private library
 */
export async function cloneCommunityMaterial(
  communityMat: StudyMaterial,
  currentUserId: string,
  currentUserName?: string
): Promise<StudyMaterial> {
  const newId = 'mat_user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const cloned: StudyMaterial = {
    ...communityMat,
    id: newId,
    userId: currentUserId,
    authorName: currentUserName || 'Scholar',
    isPublic: false, // Cloned copies default to Private in user's library
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastAccessedAt: new Date().toISOString(),
  };

  await saveMaterialToDatabase(cloned, currentUserId);
  return cloned;
}

export interface FullStudyDataResult {
  materials: StudyMaterial[]; // Personal library
  personalMaterials: StudyMaterial[];
  communityMaterials: StudyMaterial[];
  fromSupabase: boolean;
  error?: string;
}

/**
 * Loading:
 * Retrieve personal materials strictly for authenticated user, and public materials for community library.
 */
export async function fetchFullStudyDataFromSupabase(
  userId?: string
): Promise<FullStudyDataResult> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    const cachedPersonal = getLocalCache(userId);
    const cachedCommunity = getCommunityCache();
    return {
      materials: cachedPersonal,
      personalMaterials: cachedPersonal,
      communityMaterials: cachedCommunity,
      fromSupabase: false,
    };
  }

  try {
    let personalList: StudyMaterial[] = [];
    let communityList: StudyMaterial[] = [];

    // 1. Fetch personal materials strictly for auth user
    if (userId) {
      try {
        const { data: pData, error: pErr } = await supabase
          .from('study_materials')
          .select('*')
          .eq('user_id', userId);

        if (!pErr && Array.isArray(pData)) {
          personalList = pData
            .map((item: { full_data: StudyMaterial }) => item.full_data)
            .filter((m: StudyMaterial) => m && m.userId === userId);
        }
      } catch (err) {
        console.warn('Personal query fallback:', err);
      }
    }

    // 2. Fetch public community materials (is_public = true)
    try {
      const { data: cData, error: cErr } = await supabase
        .from('study_materials')
        .select('*')
        .eq('is_public', true);

      if (!cErr && Array.isArray(cData)) {
        communityList = cData
          .map((item: { full_data: StudyMaterial }) => item.full_data)
          .filter((m: StudyMaterial) => m && m.isPublic === true);
      }
    } catch (err) {
      console.warn('Community query fallback:', err);
    }

    // Fallback client-side filter if specific column queries fail
    if (personalList.length === 0 && userId) {
      const { data: allData } = await supabase.from('study_materials').select('*');
      if (Array.isArray(allData)) {
        const allRehydrated = allData
          .map((item: { full_data: StudyMaterial }) => item.full_data)
          .filter(Boolean) as StudyMaterial[];

        personalList = allRehydrated.filter((m) => m.userId === userId);
        communityList = allRehydrated.filter((m) => m.isPublic === true);
      }
    }

    // Sync to local caches
    if (personalList.length > 0 && userId) {
      syncLocalCache(personalList, userId);
    } else if (userId) {
      personalList = getLocalCache(userId);
    }

    if (communityList.length > 0) {
      syncCommunityCache(communityList);
    } else {
      communityList = getCommunityCache();
    }

    return {
      materials: personalList,
      personalMaterials: personalList,
      communityMaterials: communityList,
      fromSupabase: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Database fetch failed';
    console.warn('Supabase fetch exception:', err);
    const cachedPersonal = getLocalCache(userId);
    const cachedCommunity = getCommunityCache();
    return {
      materials: cachedPersonal,
      personalMaterials: cachedPersonal,
      communityMaterials: cachedCommunity,
      fromSupabase: false,
      error: msg,
    };
  }
}

export async function deleteMaterialFromDatabase(id: string, userId?: string): Promise<boolean> {
  // Update local cache first
  const current = getLocalCache(userId).filter((m) => m.id !== id);
  syncLocalCache(current, userId);
  removeFromCommunityCache(id);

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

    // Filter out legacy items and ensure strictly matches requested user
    const cleaned = parsed.filter(
      (m: StudyMaterial) =>
        m &&
        m.id !== 'mat_neuro_synaptic_plasticity' &&
        m.id !== 'mat_quantum_computing_qubits' &&
        !m.title?.includes('Neurobiology') &&
        !m.title?.includes('Quantum Computing') &&
        (!userId || m.userId === userId)
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

// Community library cache helpers
function syncCommunityCache(materials: StudyMaterial[]): void {
  try {
    localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(materials));
  } catch (e) {
    console.warn('Community cache write failed:', e);
  }
}

export function getCommunityCache(): StudyMaterial[] {
  try {
    const data = localStorage.getItem(COMMUNITY_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((m: StudyMaterial) => m && m.isPublic === true);
      }
    }
  } catch {
    // Ignore error
  }
  return [];
}

export function updateCommunityCache(material: StudyMaterial): void {
  try {
    const current = getCommunityCache();
    const idx = current.findIndex((m) => m.id === material.id);
    if (idx >= 0) {
      current[idx] = material;
    } else {
      current.unshift(material);
    }
    syncCommunityCache(current);
  } catch (e) {
    console.warn('Failed to update community cache:', e);
  }
}

export function removeFromCommunityCache(id: string): void {
  try {
    const current = getCommunityCache().filter((m) => m.id !== id);
    syncCommunityCache(current);
  } catch (e) {
    console.warn('Failed to remove from community cache:', e);
  }
}

export const SUPABASE_SQL_SETUP = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS study_materials (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  is_public BOOLEAN DEFAULT FALSE NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  full_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure is_public and user_id columns exist on legacy tables:
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_materials' AND column_name = 'is_public') THEN
    ALTER TABLE study_materials ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'study_materials' AND column_name = 'user_id') THEN
    ALTER TABLE study_materials ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
  END IF;
END $$;

-- Enable Row Level Security (RLS) for strict multi-user privacy & public sharing
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Users can view their own private study materials OR any public community materials
DROP POLICY IF EXISTS "Public and personal materials viewable" ON study_materials;
CREATE POLICY "Public and personal materials viewable"
  ON study_materials
  FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

-- 2. INSERT Policy: Users can only create materials for their own account
DROP POLICY IF EXISTS "Users can create own materials" ON study_materials;
CREATE POLICY "Users can create own materials"
  ON study_materials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE Policy: Users can only update/toggle privacy on their own materials
DROP POLICY IF EXISTS "Users can update own materials" ON study_materials;
CREATE POLICY "Users can update own materials"
  ON study_materials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. DELETE Policy: Users can only delete their own materials
DROP POLICY IF EXISTS "Users can delete own materials" ON study_materials;
CREATE POLICY "Users can delete own materials"
  ON study_materials
  FOR DELETE
  USING (auth.uid() = user_id);
`;

