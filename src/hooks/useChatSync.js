// src/hooks/useChatSync.js - Enhanced version with proper error handling
import { useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';

// API imports
import { fetchServerInfo } from '../api/info';
import { fetchUpdatedMessages } from '../api/messages';
import { fetchAllParticipants, fetchUpdatedParticipants } from '../api/participants';

// Store imports
import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

const SYNC_INTERVALS = {
  ACTIVE: 8000,     // 8 seconds when app is active
  BACKGROUND: 30000, // 30 seconds when app is backgrounded
  IDLE: 60000,      // 1 minute when no user activity
};

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

const useChatSync = () => {
  const syncInProgress = useRef(false);
  const isMountedRef = useRef(true);
  const retryCount = useRef(0);
  const syncTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);
  
  // Storage failure tracking
  const storageFailureCount = useRef(0);
  const lastStorageFailure = useRef(0);
  
  // Store actions
  const { setMessages, updateMessage } = useMessageStore();
  const { setParticipants, updateParticipant, clearParticipants } = useParticipantStore();
  const { sessionUuid, lastUpdateTime, setSession, setLastUpdateTime, clearSession } = useSessionStore();

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Reset application state
  const resetAppState = useCallback(() => {
    console.log('🔄 Resetting application state...');
    setMessages([]);
    clearParticipants();
    clearSession();
  }, [setMessages, clearParticipants, clearSession]);

  // Handle session changes
  const handleSessionChange = useCallback(async (newSessionInfo) => {
    console.log('🔁 Session UUID changed — resetting state...');
    resetAppState();
    setSession(newSessionInfo);

    try {
      const allParticipants = await fetchAllParticipants();
      if (isMountedRef.current) {
        setParticipants(allParticipants);
        console.log('✅ Participants loaded for new session');
      }
    } catch (err) {
      console.error('❌ Failed to fetch participants for new session:', err);
      // Don't throw - allow sync to continue
    }
  }, [resetAppState, setSession, setParticipants]);

  // Perform batch updates
  const performBatchUpdates = useCallback(async (lastUpdate) => {
    try {
      // Fetch updates in parallel with individual error handling
      const [updatedMessages, updatedParticipants] = await Promise.all([
        fetchUpdatedMessages(lastUpdate).catch(err => {
          console.error('❌ Failed to fetch updated messages:', err);
          return []; // Return empty array on failure
        }),
        fetchUpdatedParticipants(lastUpdate).catch(err => {
          console.error('❌ Failed to fetch updated participants:', err);
          return []; // Return empty array on failure
        })
      ]);

      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;

      // Apply message updates
      if (updatedMessages.length > 0) {
        console.log(`📥 Updating ${updatedMessages.length} messages`);
        updatedMessages.forEach(message => {
          updateMessage(message);
        });
      }

      // Apply participant updates
      if (updatedParticipants.length > 0) {
        console.log(`👥 Updating ${updatedParticipants.length} participants`);
        updatedParticipants.forEach(participant => {
          updateParticipant(participant);
        });
      }

      // Update timestamp after successful batch update
      setLastUpdateTime(Date.now());
      
      // Reset retry count on success
      retryCount.current = 0;
      
    } catch (err) {
      console.error('❌ Error during batch updates:', err);
      throw err; // Re-throw to be handled by main sync function
    }
  }, [updateMessage, updateParticipant, setLastUpdateTime]);

  // Determine current sync interval based on app state and activity
  const getCurrentSyncInterval = useCallback(() => {
    const now = Date.now();
    const timeSinceActivity = now - lastActivityRef.current;
    
    if (appStateRef.current !== 'active') {
      return SYNC_INTERVALS.BACKGROUND;
    }
    
    if (timeSinceActivity > 300000) { // 5 minutes of inactivity
      return SYNC_INTERVALS.IDLE;
    }
    
    return SYNC_INTERVALS.ACTIVE;
  }, []);

  // Enhanced sync function with storage error handling
  const performSync = useCallback(async () => {
    if (syncInProgress.current || !isMountedRef.current) {
      return;
    }

    // Check if we should skip sync due to recent storage failures
    const now = Date.now();
    if (storageFailureCount.current >= 5 && (now - lastStorageFailure.current) < 60000) {
      console.log('🚫 Skipping sync due to recent storage failures');
      return;
    }

    syncInProgress.current = true;
    console.log(`🔄 Chat sync started (interval: ${getCurrentSyncInterval()}ms)`);

    try {
      // Fetch server info with error handling
      let serverInfo;
      try {
        serverInfo = await fetchServerInfo();
      } catch (err) {
        console.error('❌ Failed to fetch server info:', err);
        
        // Implement exponential backoff for retries
        retryCount.current++;
        if (retryCount.current < MAX_RETRY_ATTEMPTS && isMountedRef.current) {
          const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount.current - 1);
          console.log(`🔄 Retrying in ${backoffDelay}ms (attempt ${retryCount.current}/${MAX_RETRY_ATTEMPTS})`);
          
          // Clear any existing retry timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              syncInProgress.current = false;
              performSync();
            }
          }, backoffDelay);
          return;
        } else {
          console.error('💥 Max retry attempts reached, skipping sync cycle');
          retryCount.current = 0; // Reset for next cycle
          return;
        }
      }

      // Double-check mount status
      if (!isMountedRef.current) return;
      
      // Check if session has changed
      if (serverInfo.sessionUuid !== sessionUuid) {
        await handleSessionChange(serverInfo);
        return; // Exit early after session change
      }

      // Perform batch updates if we have a valid session
      if (sessionUuid && lastUpdateTime > 0) {
        await performBatchUpdates(lastUpdateTime);
      } else if (sessionUuid) {
        // First time sync - just update timestamp
        if (isMountedRef.current) {
          setLastUpdateTime(Date.now());
          console.log('🆕 Initial sync - timestamp set');
        }
      }
      
      // Reset failure count on successful sync
      storageFailureCount.current = 0;
      retryCount.current = 0;
      
      console.log('✅ Chat sync completed successfully');
      
    } catch (error) {
      console.error('❌ Chat sync error:', error.message);
      
      // Track storage-specific errors
      if (error.message.includes('storage') || error.message.includes('persist')) {
        storageFailureCount.current++;
        lastStorageFailure.current = now;
        console.warn(`⚠️ Storage failure count: ${storageFailureCount.current}`);
      }
      
      // Implement exponential backoff for retries
      retryCount.current++;
      if (retryCount.current < MAX_RETRY_ATTEMPTS && isMountedRef.current) {
        const backoffDelay = RETRY_DELAY * Math.pow(2, retryCount.current - 1);
        console.log(`🔄 Retrying sync in ${backoffDelay}ms (attempt ${retryCount.current})`);
        
        setTimeout(() => {
          if (isMountedRef.current) {
            syncInProgress.current = false;
            performSync();
          }
        }, backoffDelay);
        return;
      } else {
        retryCount.current = 0; // Reset for next cycle
      }
    } finally {
      if (isMountedRef.current) {
        syncInProgress.current = false;
      }
    }
  }, [getCurrentSyncInterval, handleSessionChange, performBatchUpdates, setLastUpdateTime, lastUpdateTime, sessionUuid]);

  // Schedule next sync with dynamic interval
  const scheduleNextSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    if (!isMountedRef.current) return;
    
    const interval = getCurrentSyncInterval();
    syncTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        performSync().then(() => {
          scheduleNextSync(); // Schedule the next sync
        });
      }
    }, interval);
  }, [performSync, getCurrentSyncInterval]);

  // Cleanup function for all timers and timeouts
  const clearAllTimers = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      appStateRef.current = nextAppState;
      
      if (nextAppState === 'active') {
        updateActivity();
        // Sync immediately when app becomes active
        performSync().then(() => {
          scheduleNextSync();
        });
      } else {
        // Adjust sync frequency for background state
        scheduleNextSync();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [performSync, scheduleNextSync, updateActivity]);

  // Initialize sync
  useEffect(() => {
    isMountedRef.current = true;
    updateActivity();
    
    // Start initial sync
    performSync().then(() => {
      scheduleNextSync();
    });

    return () => {
      isMountedRef.current = false;
      clearAllTimers();
      syncInProgress.current = false;
      retryCount.current = 0;
    };
  }, [performSync, scheduleNextSync, clearAllTimers, updateActivity]);

  // Return sync status and controls
  return {
    updateActivity,
    isSyncing: syncInProgress.current,
    retryCount: retryCount.current,
    isConnected: isMountedRef.current && !syncInProgress.current,
    hasStorageIssues: storageFailureCount.current > 0,
  };
};

export default useChatSync;