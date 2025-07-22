// src/state/participantStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

const useParticipantStore = create(
  persist(
    (set, get) => ({
      participants: [],

      // Set entire list
      setParticipants: (list) => set({ participants: list }),

      // Update individual participant (e.g., avatar change)
      updateParticipant: (updated) =>
        set({
          participants: get().participants.map((p) =>
            p.uuid === updated.uuid ? updated : p
          ),
        }),

      // Clear all
      clearParticipants: () => set({ participants: [] }),
    }),
    {
      name: 'chat-participants',
      getStorage: () => AsyncStorage,
    }
  )
);

export default useParticipantStore;
