// src/state/messageStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

/**
 * Enhanced Message Store with Optimistic Updates
 * 
 * Features:
 * - Basic message CRUD operations
 * - Optimistic reaction updates for instant UI feedback
 * - Error recovery and rollback mechanisms
 * - Automatic cleanup of stale optimistic updates
 * - Persistent storage (excluding temporary optimistic data)
 */

const useMessageStore = create(
  persist(
    (set, get) => ({
      // ✅ CORE STATE
      messages: [],
      optimisticMessages: new Map(), // Track temporary optimistic updates
      
      // ✅ BASIC MESSAGE OPERATIONS
      
      /**
       * Replace entire message list
       * @param {Array} msgs - Array of message objects
       */
      setMessages: (msgs) => {
        set({ messages: Array.isArray(msgs) ? msgs : [] });
      },
      
      /**
       * Add a new message to the beginning of the list
       * @param {Object} msg - Message object
       */
      addMessage: (msg) => {
        if (!msg || !msg.uuid) {
          console.error('Invalid message object:', msg);
          return;
        }
        
        const { messages } = get();
        
        // Prevent duplicates
        const exists = messages.some(m => m.uuid === msg.uuid);
        if (exists) {
          console.warn('Message already exists:', msg.uuid);
          return;
        }
        
        set({ 
          messages: [msg, ...messages] 
        });
      },
      
      /**
       * Update an existing message
       * @param {Object} updatedMsg - Updated message object
       */
      updateMessage: (updatedMsg) => {
        if (!updatedMsg || !updatedMsg.uuid) {
          console.error('Invalid updated message object:', updatedMsg);
          return;
        }
        
        const { messages } = get();
        
        set({
          messages: messages.map(m =>
            m.uuid === updatedMsg.uuid 
              ? { ...m, ...updatedMsg }
              : m
          ),
        });
      },
      
      /**
       * Remove a message by UUID
       * @param {string} messageId - UUID of message to remove
       */
      removeMessage: (messageId) => {
        if (!messageId) return;
        
        const { messages } = get();
        set({
          messages: messages.filter(m => m.uuid !== messageId)
        });
      },
      
      /**
       * Get a specific message by UUID
       * @param {string} messageId - UUID of message to find
       * @returns {Object|null} Message object or null if not found
       */
      getMessage: (messageId) => {
        if (!messageId) return null;
        
        const { messages } = get();
        return messages.find(m => m.uuid === messageId) || null;
      },
      
      // ✅ OPTIMISTIC REACTION UPDATES
      
      /**
       * Add a reaction optimistically for immediate UI feedback
       * @param {string} messageId - UUID of the message
       * @param {string} emoji - Emoji to add
       * @param {string} userId - ID of the user adding reaction (default: 'you')
       * @returns {string|null} Optimistic key for tracking, or null if failed
       */
      addReactionOptimistic: (messageId, emoji, userId = 'you') => {
        if (!messageId || !emoji) {
          console.error('Message ID and emoji are required for optimistic reaction');
          return null;
        }
        
        const { messages, optimisticMessages } = get();
        const message = messages.find(m => m.uuid === messageId);
        
        if (!message) {
          console.error('Message not found for optimistic reaction:', messageId);
          return null;
        }
        
        // Check if user already reacted with this emoji
        const existingReaction = message.reactions?.find(r => r.emoji === emoji);
        const userAlreadyReacted = existingReaction?.participants?.includes(userId);
        
        if (userAlreadyReacted) {
          console.log('User already reacted with this emoji');
          return null;
        }
        
        // Generate unique optimistic key
        const optimisticKey = `${messageId}-${emoji}-${userId}-${Date.now()}`;
        
        // Store optimistic update for tracking
        const newOptimisticMessages = new Map(optimisticMessages);
        newOptimisticMessages.set(optimisticKey, {
          messageId,
          emoji,
          userId,
          timestamp: Date.now(),
          type: 'add_reaction'
        });
        
        // Update message with optimistic reaction
        const updatedReactions = message.reactions ? [...message.reactions] : [];
        
        if (existingReaction) {
          // Increment existing reaction
          const reactionIndex = updatedReactions.findIndex(r => r.emoji === emoji);
          updatedReactions[reactionIndex] = {
            ...existingReaction,
            count: existingReaction.count + 1,
            participants: [...(existingReaction.participants || []), userId]
          };
        } else {
          // Add new reaction
          updatedReactions.push({
            emoji,
            count: 1,
            participants: [userId],
            isOwnReaction: userId === 'you'
          });
        }
        
        // Update the message
        const updatedMessage = {
          ...message,
          reactions: updatedReactions
        };
        
        // Apply updates
        set({
          messages: messages.map(m =>
            m.uuid === messageId ? updatedMessage : m
          ),
          optimisticMessages: newOptimisticMessages
        });
        
        console.log('✅ Added optimistic reaction:', { messageId, emoji, optimisticKey });
        return optimisticKey;
      },
      
      /**
       * Confirm an optimistic update when server responds successfully
       * @param {string} optimisticKey - Key returned from addReactionOptimistic
       */
      confirmReaction: (optimisticKey) => {
        if (!optimisticKey) {
          console.error('Optimistic key is required for confirmation');
          return;
        }
        
        const { optimisticMessages } = get();
        const optimistic = optimisticMessages.get(optimisticKey);
        
        if (!optimistic) {
          console.warn('Optimistic update not found for confirmation:', optimisticKey);
          return;
        }
        
        // Remove from optimistic tracking since it's now confirmed
        const newOptimisticMessages = new Map(optimisticMessages);
        newOptimisticMessages.delete(optimisticKey);
        
        set({ optimisticMessages: newOptimisticMessages });
        
        console.log('✅ Confirmed optimistic reaction:', optimisticKey);
      },
      
      /**
       * Revert an optimistic update when server request fails
       * @param {string} optimisticKey - Key returned from addReactionOptimistic
       */
      revertReaction: (optimisticKey) => {
        if (!optimisticKey) {
          console.error('Optimistic key is required for reversion');
          return;
        }
        
        const { messages, optimisticMessages } = get();
        const optimistic = optimisticMessages.get(optimisticKey);
        
        if (!optimistic) {
          console.warn('Optimistic update not found for reversion:', optimisticKey);
          return;
        }
        
        const { messageId, emoji, userId } = optimistic;
        const message = messages.find(m => m.uuid === messageId);
        
        if (!message) {
          console.error('Message not found for optimistic reversion:', messageId);
          return;
        }
        
        // Revert the reaction
        const updatedReactions = message.reactions?.map(r => {
          if (r.emoji === emoji) {
            const newCount = r.count - 1;
            const newParticipants = r.participants?.filter(p => p !== userId) || [];
            
            if (newCount <= 0) {
              return null; // Will be filtered out
            }
            
            return {
              ...r,
              count: newCount,
              participants: newParticipants,
              isOwnReaction: newParticipants.includes('you')
            };
          }
          return r;
        }).filter(Boolean) || [];
        
        // Update the message
        const updatedMessage = {
          ...message,
          reactions: updatedReactions
        };
        
        // Remove from optimistic tracking
        const newOptimisticMessages = new Map(optimisticMessages);
        newOptimisticMessages.delete(optimisticKey);
        
        // Apply updates
        set({
          messages: messages.map(m =>
            m.uuid === messageId ? updatedMessage : m
          ),
          optimisticMessages: newOptimisticMessages
        });
        
        console.log('🔄 Reverted optimistic reaction:', optimisticKey);
      },
      
      /**
       * Remove a reaction optimistically (for toggle behavior)
       * @param {string} messageId - UUID of the message
       * @param {string} emoji - Emoji to remove
       * @param {string} userId - ID of the user removing reaction (default: 'you')
       * @returns {string|null} Optimistic key for tracking, or null if failed
       */
      removeReactionOptimistic: (messageId, emoji, userId = 'you') => {
        if (!messageId || !emoji) {
          console.error('Message ID and emoji are required for optimistic reaction removal');
          return null;
        }
        
        const { messages, optimisticMessages } = get();
        const message = messages.find(m => m.uuid === messageId);
        
        if (!message) {
          console.error('Message not found for optimistic reaction removal:', messageId);
          return null;
        }
        
        // Check if user has reacted with this emoji
        const existingReaction = message.reactions?.find(r => r.emoji === emoji);
        const userHasReacted = existingReaction?.participants?.includes(userId);
        
        if (!userHasReacted) {
          console.log('User has not reacted with this emoji');
          return null;
        }
        
        // Generate unique optimistic key
        const optimisticKey = `${messageId}-${emoji}-${userId}-${Date.now()}-remove`;
        
        // Store optimistic update for tracking
        const newOptimisticMessages = new Map(optimisticMessages);
        newOptimisticMessages.set(optimisticKey, {
          messageId,
          emoji,
          userId,
          timestamp: Date.now(),
          type: 'remove_reaction'
        });
        
        // Update message by removing user's reaction
        const updatedReactions = message.reactions?.map(r => {
          if (r.emoji === emoji) {
            const newCount = r.count - 1;
            const newParticipants = r.participants?.filter(p => p !== userId) || [];
            
            if (newCount <= 0) {
              return null; // Will be filtered out
            }
            
            return {
              ...r,
              count: newCount,
              participants: newParticipants,
              isOwnReaction: newParticipants.includes('you')
            };
          }
          return r;
        }).filter(Boolean) || [];
        
        // Update the message
        const updatedMessage = {
          ...message,
          reactions: updatedReactions
        };
        
        // Apply updates
        set({
          messages: messages.map(m =>
            m.uuid === messageId ? updatedMessage : m
          ),
          optimisticMessages: newOptimisticMessages
        });
        
        console.log('✅ Removed reaction optimistically:', { messageId, emoji, optimisticKey });
        return optimisticKey;
      },
      
      // ✅ CLEANUP AND MAINTENANCE
      
      /**
       * Clear old optimistic updates that haven't been resolved
       * Call this periodically to prevent memory leaks
       * @param {number} maxAge - Maximum age in milliseconds (default: 5 minutes)
       */
      clearStaleOptimisticUpdates: (maxAge = 5 * 60 * 1000) => {
        const { optimisticMessages } = get();
        const now = Date.now();
        
        const filtered = new Map(
          [...optimisticMessages].filter(([key, value]) => 
            now - value.timestamp < maxAge
          )
        );
        
        const removedCount = optimisticMessages.size - filtered.size;
        
        if (removedCount > 0) {
          set({ optimisticMessages: filtered });
          console.log(`🧹 Cleaned up ${removedCount} stale optimistic updates`);
        }
      },
      
      /**
       * Clear all optimistic updates (useful for debugging or reset)
       */
      clearAllOptimisticUpdates: () => {
        set({ optimisticMessages: new Map() });
        console.log('🧹 Cleared all optimistic updates');
      },
      
      /**
       * Get current optimistic update count (for debugging)
       * @returns {number} Number of pending optimistic updates
       */
      getOptimisticUpdateCount: () => {
        const { optimisticMessages } = get();
        return optimisticMessages.size;
      },
      
      // ✅ BULK OPERATIONS
      
      /**
       * Update multiple messages at once (for efficiency)
       * @param {Array} updates - Array of message objects to update
       */
      updateMessages: (updates) => {
        if (!Array.isArray(updates) || updates.length === 0) {
          return;
        }
        
        const { messages } = get();
        const updateMap = new Map(updates.map(msg => [msg.uuid, msg]));
        
        set({
          messages: messages.map(m =>
            updateMap.has(m.uuid) 
              ? { ...m, ...updateMap.get(m.uuid) }
              : m
          )
        });
        
        console.log(`📦 Bulk updated ${updates.length} messages`);
      },
      
      /**
       * Add multiple messages at once (for efficiency)
       * @param {Array} newMessages - Array of message objects to add
       */
      addMessages: (newMessages) => {
        if (!Array.isArray(newMessages) || newMessages.length === 0) {
          return;
        }
        
        const { messages } = get();
        const existingIds = new Set(messages.map(m => m.uuid));
        
        // Filter out duplicates
        const uniqueMessages = newMessages.filter(msg => 
          msg && msg.uuid && !existingIds.has(msg.uuid)
        );
        
        if (uniqueMessages.length === 0) {
          console.log('No new unique messages to add');
          return;
        }
        
        set({
          messages: [...uniqueMessages, ...messages]
        });
        
        console.log(`📦 Bulk added ${uniqueMessages.length} messages`);
      },
      
      // ✅ UTILITY FUNCTIONS
      
      /**
       * Check if a message exists
       * @param {string} messageId - UUID to check
       * @returns {boolean} True if message exists
       */
      hasMessage: (messageId) => {
        if (!messageId) return false;
        const { messages } = get();
        return messages.some(m => m.uuid === messageId);
      },
      
      /**
       * Get total message count
       * @returns {number} Total number of messages
       */
      getMessageCount: () => {
        const { messages } = get();
        return messages.length;
      },
      
      /**
       * Clear all messages (useful for logout/reset)
       */
      clearMessages: () => {
        set({ 
          messages: [],
          optimisticMessages: new Map()
        });
        console.log('🧹 Cleared all messages and optimistic updates');
      },
    }),
    {
      name: 'chat-messages',
      getStorage: () => AsyncStorage,
      // Only persist the actual messages, not optimistic updates
      partialize: (state) => ({
        messages: state.messages,
        // Explicitly exclude optimisticMessages from persistence
      }),
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

// ✅ STORE UTILITIES AND DEBUGGING

/**
 * Development helper to inspect store state
 * Only available in development mode
 */
if (__DEV__) {
  // Add debugging utilities to window in development
  if (typeof window !== 'undefined') {
    window.messageStoreDebug = {
      getState: () => useMessageStore.getState(),
      getMessages: () => useMessageStore.getState().messages,
      getOptimisticUpdates: () => useMessageStore.getState().optimisticMessages,
      clearAll: () => useMessageStore.getState().clearMessages(),
      getStats: () => {
        const state = useMessageStore.getState();
        return {
          messageCount: state.messages.length,
          optimisticCount: state.optimisticMessages.size,
          hasReactions: state.messages.some(m => m.reactions?.length > 0)
        };
      }
    };
  }
}

export default useMessageStore;