// src/state/messageStore.js  
import { create } from 'zustand';

const useMessageStore = create((set, get) => ({
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
}));

export default useMessageStore;