/**
 * Dual Storage Adapter
 * Manifest V3 compliant: uses chrome.storage.local when running inside a Chrome Extension,
 * and falls back to window.localStorage when running in standard web environments.
 */

// In-memory cache for synchronous access
const memoryCache: Record<string, string> = {};

// Initialize memory cache from localStorage if available
if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        memoryCache[key] = window.localStorage.getItem(key) || '';
      }
    }
  } catch (e) {
    // Storage access might be restricted in some environments
  }
}

// Safely obtain chrome reference if present
const chromeGlobal = typeof chrome !== 'undefined' ? chrome : undefined;

// If chrome.storage.local is available, populate the memory cache from it
if (chromeGlobal?.storage?.local) {
  try {
    chromeGlobal.storage.local.get(null, (items: Record<string, unknown>) => {
      if (items && typeof items === 'object') {
        Object.keys(items).forEach((k) => {
          memoryCache[k] = typeof items[k] === 'string' ? (items[k] as string) : JSON.stringify(items[k]);
        });
      }
    });

    // Keep cache synchronized with extension storage changes
    chromeGlobal.storage.onChanged.addListener((changes: Record<string, { newValue?: unknown }>, areaName: string) => {
      if (areaName === 'local') {
        Object.keys(changes).forEach((key) => {
          if (changes[key].newValue !== undefined) {
            const val = changes[key].newValue;
            memoryCache[key] = typeof val === 'string' ? val : JSON.stringify(val);
          } else {
            delete memoryCache[key];
          }
        });
      }
    });
  } catch (e) {
    console.warn('Chrome storage initialization error:', e);
  }
}

export const appStorage = {
  /**
   * Get an item asynchronously from chrome.storage.local or localStorage
   */
  async getItem(key: string): Promise<string | null> {
    if (chromeGlobal?.storage?.local) {
      return new Promise((resolve) => {
        try {
          chromeGlobal.storage.local.get([key], (result: Record<string, unknown>) => {
            if (chromeGlobal.runtime?.lastError) {
              console.warn('chrome.storage error:', chromeGlobal.runtime.lastError);
              resolve(memoryCache[key] ?? null);
              return;
            }
            const val = result?.[key];
            if (val !== undefined && val !== null) {
              const strVal = typeof val === 'string' ? val : JSON.stringify(val);
              memoryCache[key] = strVal;
              resolve(strVal);
            } else {
              resolve(null);
            }
          });
        } catch (err) {
          resolve(memoryCache[key] ?? null);
        }
      });
    }

    // Web Fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) memoryCache[key] = val;
        return val;
      }
    } catch (e) {}

    return memoryCache[key] ?? null;
  },

  /**
   * Set an item in chrome.storage.local or localStorage
   */
  async setItem(key: string, value: string): Promise<void> {
    memoryCache[key] = value;

    if (chromeGlobal?.storage?.local) {
      return new Promise((resolve) => {
        try {
          chromeGlobal.storage.local.set({ [key]: value }, () => {
            resolve();
          });
        } catch (err) {
          resolve();
        }
      });
    }

    // Web Fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {}
  },

  /**
   * Remove an item from chrome.storage.local or localStorage
   */
  async removeItem(key: string): Promise<void> {
    delete memoryCache[key];

    if (chromeGlobal?.storage?.local) {
      return new Promise((resolve) => {
        try {
          chromeGlobal.storage.local.remove([key], () => {
            resolve();
          });
        } catch (err) {
          resolve();
        }
      });
    }

    // Web Fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
  },

  /**
   * Synchronous get (reads from in-memory cache synchronized with chrome.storage / localStorage)
   */
  getSync(key: string): string | null {
    if (memoryCache[key] !== undefined) {
      return memoryCache[key];
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          memoryCache[key] = val;
          return val;
        }
      }
    } catch (e) {}
    return null;
  },

  /**
   * Synchronous set
   */
  setSync(key: string, value: string): void {
    this.setItem(key, value);
  },

  /**
   * Synchronous remove
   */
  removeSync(key: string): void {
    this.removeItem(key);
  },
};
