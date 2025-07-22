// src/state/messageStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

const useMessageStore = create(persist(
  (set, get) => ({
    messages: [],
    setMessages: (msgs) => set({ messages: msgs }),
    addMessage: (msg) => set({ messages: [msg, ...get().messages] }),
    updateMessage: (updatedMsg) =>
      set({
        messages: get().messages.map(m =>
          m.uuid === updatedMsg.uuid ? updatedMsg : m
        ),
      }),
  }),
  {
    name: 'chat-messages',
    getStorage: () => AsyncStorage,
  }
));

export default useMessageStore;
