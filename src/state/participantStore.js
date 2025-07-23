// src/state/participantStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

/**
 * Participant Store for managing chat participants
 * 
 * Features:
 * - Participant list management
 * - Individual participant updates
 * - Participant lookup and search
 * - Cross-platform storage support
 */

// ✅ STORAGE ADAPTER - Fixes AsyncStorage issues on web
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
        console.warn('Web storage getItem failed:', error);
        return null;
      }
    },
    async setItem(key, value) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch (error) {
        console.warn('Web storage setItem failed:', error);
        // Silently fail - app continues working without persistence
      }
    },
    async removeItem(key) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn('Web storage removeItem failed:', error);
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

const useParticipantStore = create(
  persist(
    (set, get) => ({
      // ✅ CORE STATE
      participants: [],
      
      // Additional tracking
      isLoaded: false,
      lastUpdated: 0,

      // ✅ BASIC PARTICIPANT OPERATIONS

      /**
       * Set entire participant list
       * @param {Array} list - Array of participant objects
       */
      setParticipants: (list) => {
        if (!Array.isArray(list)) {
          console.error('setParticipants: Expected array, received:', typeof list);
          return;
        }
        
        set({ 
          participants: list,
          isLoaded: true,
          lastUpdated: Date.now()
        });
        
        console.log(`👥 Set ${list.length} participants`);
      },

      /**
       * Update individual participant (e.g., avatar change, status update)
       * @param {Object} updated - Updated participant object
       */
      updateParticipant: (updated) => {
        if (!updated || !updated.uuid) {
          console.error('updateParticipant: Invalid participant object:', updated);
          return;
        }
        
        const { participants } = get();
        const existingIndex = participants.findIndex(p => p.uuid === updated.uuid);
        
        if (existingIndex === -1) {
          // Participant doesn't exist, add them
          set({
            participants: [...participants, updated],
            lastUpdated: Date.now()
          });
          console.log('👤 Added new participant:', updated.name || updated.uuid);
        } else {
          // Update existing participant
          set({
            participants: participants.map((p) =>
              p.uuid === updated.uuid ? { ...p, ...updated } : p
            ),
            lastUpdated: Date.now()
          });
          console.log('✏️ Updated participant:', updated.name || updated.uuid);
        }
      },

      /**
       * Add multiple participants at once
       * @param {Array} newParticipants - Array of new participant objects
       */
      addParticipants: (newParticipants) => {
        if (!Array.isArray(newParticipants) || newParticipants.length === 0) {
          return;
        }
        
        const { participants } = get();
        const existingUuids = new Set(participants.map(p => p.uuid));
        
        // Filter out duplicates
        const uniqueParticipants = newParticipants.filter(p => 
          p && p.uuid && !existingUuids.has(p.uuid)
        );
        
        if (uniqueParticipants.length === 0) {
          console.log('No new unique participants to add');
          return;
        }
        
        set({
          participants: [...participants, ...uniqueParticipants],
          lastUpdated: Date.now()
        });
        
        console.log(`👥 Added ${uniqueParticipants.length} new participants`);
      },

      /**
       * Remove a participant by UUID
       * @param {string} uuid - UUID of participant to remove
       */
      removeParticipant: (uuid) => {
        if (!uuid) return;
        
        const { participants } = get();
        const filteredParticipants = participants.filter(p => p.uuid !== uuid);
        
        if (filteredParticipants.length !== participants.length) {
          set({
            participants: filteredParticipants,
            lastUpdated: Date.now()
          });
          console.log('🗑️ Removed participant:', uuid);
        }
      },

      /**
       * Clear all participants
       */
      clearParticipants: () => {
        console.log('🧹 Clearing all participants');
        set({ 
          participants: [],
          isLoaded: false,
          lastUpdated: Date.now()
        });
      },

      // ✅ PARTICIPANT LOOKUP & SEARCH

      /**
       * Get a specific participant by UUID
       * @param {string} uuid - UUID of participant to find
       * @returns {Object|null} Participant object or null if not found
       */
      getParticipant: (uuid) => {
        if (!uuid) return null;
        
        const { participants } = get();
        return participants.find(p => p.uuid === uuid) || null;
      },

      /**
       * Get participant by name (case insensitive)
       * @param {string} name - Name to search for
       * @returns {Object|null} First matching participant or null
       */
      getParticipantByName: (name) => {
        if (!name) return null;
        
        const { participants } = get();
        const searchName = name.toLowerCase();
        return participants.find(p => 
          p.name && p.name.toLowerCase().includes(searchName)
        ) || null;
      },

      /**
       * Search participants by name or UUID
       * @param {string} searchTerm - Term to search for
       * @returns {Array} Array of matching participants
       */
      searchParticipants: (searchTerm) => {
        if (!searchTerm) return [];
        
        const { participants } = get();
        const search = searchTerm.toLowerCase();
        
        return participants.filter(p =>
          (p.name && p.name.toLowerCase().includes(search)) ||
          (p.uuid && p.uuid.toLowerCase().includes(search)) ||
          (p.email && p.email.toLowerCase().includes(search))
        );
      },

      /**
       * Check if a participant exists
       * @param {string} uuid - UUID to check
       * @returns {boolean} True if participant exists
       */
      hasParticipant: (uuid) => {
        if (!uuid) return false;
        const { participants } = get();
        return participants.some(p => p.uuid === uuid);
      },

      /**
       * Get current user participant (uuid: 'you')
       * @returns {Object|null} Current user participant or null
       */
      getCurrentUser: () => {
        const { participants } = get();
        return participants.find(p => p.uuid === 'you') || null;
      },

      /**
       * Get all participants except current user
       * @returns {Array} Array of other participants
       */
      getOtherParticipants: () => {
        const { participants } = get();
        return participants.filter(p => p.uuid !== 'you');
      },

      // ✅ BULK OPERATIONS

      /**
       * Update multiple participants at once
       * @param {Array} updates - Array of participant updates
       */
      updateParticipants: (updates) => {
        if (!Array.isArray(updates) || updates.length === 0) {
          return;
        }
        
        const { participants } = get();
        const updateMap = new Map(updates.map(p => [p.uuid, p]));
        
        set({
          participants: participants.map(p =>
            updateMap.has(p.uuid) 
              ? { ...p, ...updateMap.get(p.uuid) }
              : p
          ),
          lastUpdated: Date.now()
        });
        
        console.log(`📦 Bulk updated ${updates.length} participants`);
      },

      // ✅ UTILITY FUNCTIONS

      /**
       * Get total participant count
       * @returns {number} Total number of participants
       */
      getParticipantCount: () => {
        const { participants } = get();
        return participants.length;
      },

      /**
       * Get participants sorted by name
       * @returns {Array} Participants sorted alphabetically by name
       */
      getParticipantsSorted: () => {
        const { participants } = get();
        return [...participants].sort((a, b) => {
          const nameA = a.name || a.uuid || '';
          const nameB = b.name || b.uuid || '';
          return nameA.localeCompare(nameB);
        });
      },

      /**
       * Get online participants (if status is tracked)
       * @returns {Array} Array of online participants
       */
      getOnlineParticipants: () => {
        const { participants } = get();
        return participants.filter(p => p.isOnline || p.status === 'online');
      },

      /**
       * Validate participant object
       * @param {Object} participant - Participant to validate
       * @returns {boolean} True if valid
       */
      validateParticipant: (participant) => {
        return !!(
          participant &&
          participant.uuid &&
          typeof participant.uuid === 'string'
        );
      },

      /**
       * Get participant statistics
       * @returns {Object} Statistics about participants
       */
      getParticipantStats: () => {
        const { participants } = get();
        return {
          total: participants.length,
          withNames: participants.filter(p => p.name).length,
          withAvatars: participants.filter(p => p.avatarUrl).length,
          online: participants.filter(p => p.isOnline || p.status === 'online').length,
          currentUser: participants.find(p => p.uuid === 'you') ? 1 : 0
        };
      },

      // ✅ STATE MANAGEMENT

      /**
       * Get time since last update
       * @returns {number} Milliseconds since last update
       */
      getTimeSinceUpdate: () => {
        const { lastUpdated } = get();
        return lastUpdated ? Date.now() - lastUpdated : Infinity;
      },

      /**
       * Check if participants need refresh
       * @param {number} maxAge - Maximum age in milliseconds
       * @returns {boolean} True if refresh needed
       */
      needsRefresh: (maxAge = 5 * 60 * 1000) => {
        const { lastUpdated } = get();
        return !lastUpdated || (Date.now() - lastUpdated) > maxAge;
      }
    }),
    {
      name: 'chat-participants',
      getStorage: createStorageAdapter, // ✅ UPDATED: Use storage adapter
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('💾 Rehydrated participant store with', state.participants?.length || 0, 'participants');
          
          // Mark as loaded after rehydration if we have participants
          if (state.participants && state.participants.length > 0) {
            state.isLoaded = true;
          }
        }
      },
    }
  )
);

// ✅ PARTICIPANT STORE UTILITIES

/**
 * Development helper to inspect participant state
 * Only available in development mode
 */
if (__DEV__) {
  if (typeof window !== 'undefined') {
    window.participantStoreDebug = {
      getState: () => useParticipantStore.getState(),
      getParticipants: () => useParticipantStore.getState().participants,
      getStats: () => useParticipantStore.getState().getParticipantStats(),
      getCurrentUser: () => useParticipantStore.getState().getCurrentUser(),
      search: (term) => useParticipantStore.getState().searchParticipants(term),
      clearAll: () => useParticipantStore.getState().clearParticipants(),
      getInfo: () => {
        const state = useParticipantStore.getState();
        return {
          count: state.participants.length,
          isLoaded: state.isLoaded,
          timeSinceUpdate: state.getTimeSinceUpdate(),
          needsRefresh: state.needsRefresh()
        };
      }
    };
  }
}

export default useParticipantStore;