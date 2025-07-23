// src/state/sessionStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

// ✅ STORAGE ADAPTER - Cross-platform storage solution
const createStorageAdapter = () => {
  // Web storage fallback
  const webStorage = {
    async getItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      } catch (error) {
        console.warn('[sessionStore] Web storage getItem failed:', error);
        return null;
      }
    },
    async setItem(key, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn('[sessionStore] Web storage setItem failed:', error);
        // Silently fail - app continues working without persistence
      }
    },
    async removeItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('[sessionStore] Web storage removeItem failed:', error);
      }
    },
  };

  // Return appropriate storage based on platform
  if (typeof window !== 'undefined') {
    // Web platform - use localStorage fallback
    return webStorage;
  } else {
    // Native platform - use AsyncStorage
    return AsyncStorage;
  }
};

const useSessionStore = create(
  persist(
    (set) => ({
      sessionUuid: '',
      apiVersion: 0,
      lastUpdateTime: 0,

      // Set session data
      setSession: ({ sessionUuid, apiVersion }) =>
        set({ sessionUuid, apiVersion }),

      // Update last fetch/check timestamp
      setLastUpdateTime: (time) => set({ lastUpdateTime: time }),

      // Clear session info (e.g., when session UUID changes)
      clearSession: () =>
        set({ sessionUuid: '', apiVersion: 0, lastUpdateTime: 0 }),
    }),
    {
      name: 'chat-session',
      getStorage: () => createStorageAdapter(), // ✅ Use storage adapter
      version: 1,
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[sessionStore] Storage rehydration failed:', error);
        } else if (state) {
          console.log('[sessionStore] Storage rehydrated successfully');
        }
      },
    }
  )
);

export default useSessionStore;