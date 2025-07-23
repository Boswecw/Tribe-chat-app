// src/state/sessionStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createRobustStorageAdapter } from '../utils/storage';

const useSessionStore = create(
  persist(
    (set) => ({
      sessionUuid: '',
      apiVersion: 0,
      lastUpdateTime: 0,

      setSession: ({ sessionUuid, apiVersion }) =>
        set({ sessionUuid, apiVersion }),

      setLastUpdateTime: (time) => set({ lastUpdateTime: time }),

      clearSession: () =>
        set({ sessionUuid: '', apiVersion: 0, lastUpdateTime: 0 }),
    }),
    {
      name: 'chat-session',
      getStorage: () => createRobustStorageAdapter('chat-session'),
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