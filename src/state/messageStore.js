// src/state/messageStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createRobustStorageAdapter } from '../utils/storage';

const useMessageStore = create(
  persist(
    (set, get) => ({
      messages: [],
      optimisticMessages: new Map(),
      
      setMessages: (msgs) => {
        set({ messages: Array.isArray(msgs) ? msgs : [] });
      },
      
      addMessage: (msg) => {
        if (!msg || !msg.uuid) {
          console.error('Invalid message object:', msg);
          return;
        }
        
        const { messages } = get();
        const exists = messages.some(m => m.uuid === msg.uuid);
        if (exists) {
          console.warn('Message already exists:', msg.uuid);
          return;
        }
        
        set({ messages: [msg, ...messages] });
      },
      
      updateMessage: (updatedMsg) => {
        if (!updatedMsg || !updatedMsg.uuid) {
          console.error('Invalid updated message object:', updatedMsg);
          return;
        }
        
        const { messages } = get();
        set({
          messages: messages.map(m =>
            m.uuid === updatedMsg.uuid ? { ...m, ...updatedMsg } : m
          )
        });
      },
      
      // Optimistic reaction methods
      addReactionOptimistic: (messageId, emoji) => {
        const { optimisticMessages } = get();
        const tempId = `${messageId}-${emoji}-${Date.now()}`;
        optimisticMessages.set(tempId, { messageId, emoji, type: 'add' });
        set({ optimisticMessages: new Map(optimisticMessages) });
        return tempId;
      },
      
      confirmReaction: (tempId) => {
        const { optimisticMessages } = get();
        optimisticMessages.delete(tempId);
        set({ optimisticMessages: new Map(optimisticMessages) });
      },
      
      revertReaction: (tempId) => {
        const { optimisticMessages } = get();
        optimisticMessages.delete(tempId);
        set({ optimisticMessages: new Map(optimisticMessages) });
      },
      
      clearStaleOptimisticUpdates: () => {
        const { optimisticMessages } = get();
        const now = Date.now();
        const staleThreshold = 30000; // 30 seconds
        
        for (const tempId of optimisticMessages.keys()) {
          const timestamp = parseInt(tempId.split('-').pop());
          if (now - timestamp > staleThreshold) {
            optimisticMessages.delete(tempId);
          }
        }
        
        set({ optimisticMessages: new Map(optimisticMessages) });
      },
      
      clearMessages: () => set({ messages: [], optimisticMessages: new Map() }),
    }),
    {
      name: 'chat-messages',
      getStorage: () => createRobustStorageAdapter('chat-messages'),
      version: 1,
      partialize: (state) => {
        // Exclude optimistic updates from persistence
        const { optimisticMessages, ...persistentState } = state;
        return persistentState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure optimisticMessages is always a Map after rehydration
          state.optimisticMessages = new Map();
          console.log('💾 Rehydrated message store with', state.messages?.length || 0, 'messages');
        }
      },
    }
  )
);

export default useMessageStore;