// src/state/sessionStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

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
      getStorage: () => AsyncStorage,
    }
  )
);

export default useSessionStore;
