// src/hooks/useChatSync.js
import { useEffect, useRef, useCallback } from 'react';
import { fetchServerInfo } from '../api/info';
import { fetchUpdatedMessages } from '../api/messages';
import { fetchAllParticipants, fetchUpdatedParticipants } from '../api/participants';

import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

const SYNC_INTERVAL = 8000; // 8 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

const useChatSync = () => {
  const syncInProgress = useRef(false);
  const retryCount = useRef(0);
  const syncInterval = useRef(null);
  const retryTimeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  
  // Message store actions
  const setMessages = useMessageStore((s) => s.setMessages);
  const updateMessage = useMessageStore((s) => s.updateMessage);

  // Participant store actions
  const updateParticipant = useParticipantStore((s) => s.updateParticipant);
  const setParticipants = useParticipantStore((s) => s.setParticipants);
  const clearParticipants = useParticipantStore((s) => s.clearParticipants);

  // Session store state and actions
  const lastUpdateTime = useSessionStore((s) => s.lastUpdateTime);
  const setSession = useSessionStore((s) => s.setSession);
  const setLastUpdateTime = useSessionStore((s) => s.setLastUpdateTime);
  const clearSession = useSessionStore((s) => s.clearSession);

  // Cleanup function for all timers and timeouts
  const clearAllTimers = useCallback(() => {
    if (syncInterval.current) {
      clearInterval(syncInterval.current);
      syncInterval.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const resetAppState = useCallback(() => {
    console.log('🔄 Resetting application state...');
    setMessages([]);
    clearParticipants();
    clearSession();
  }, [setMessages, clearParticipants, clearSession]);

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

  // Store the latest syncData function in a ref to avoid stale closures
  const syncDataRef = useRef();

  const syncData = useCallback(async () => {
    // Prevent overlapping sync calls or calls after unmount
    if (syncInProgress.current || !isMountedRef.current) {
      console.warn('⏳ Sync already in progress or component unmounted, skipping...');
      return;
    }

    syncInProgress.current = true;

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
          console.log(`🔄 Retrying in ${RETRY_DELAY * retryCount.current}ms (attempt ${retryCount.current}/${MAX_RETRY_ATTEMPTS})`);
          
          // Clear any existing retry timeout
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }
          
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              syncInProgress.current = false;
              syncDataRef.current?.();
            }
          }, RETRY_DELAY * retryCount.current);
          return;
        } else {
          console.error('💥 Max retry attempts reached, skipping sync cycle');
          retryCount.current = 0; // Reset for next cycle
          return;
        }
      }

      // Double-check mount status and get fresh session UUID
      if (!isMountedRef.current) return;
      
      const currentSessionUuid = useSessionStore.getState().sessionUuid;
      
      // Check if session has changed
      if (serverInfo.sessionUuid !== currentSessionUuid) {
        await handleSessionChange(serverInfo);
        return; // Exit early after session change
      }

      // Perform batch updates if we have a valid session
      if (currentSessionUuid && lastUpdateTime > 0) {
        await performBatchUpdates(lastUpdateTime);
      } else if (currentSessionUuid) {
        // First time sync - just update timestamp
        if (isMountedRef.current) {
          setLastUpdateTime(Date.now());
          console.log('🆕 Initial sync - timestamp set');
        }
      }
      
    } catch (err) {
      console.error('❌ Chat sync error:', err.message);
      
      // Implement retry logic for general sync errors
      retryCount.current++;
      if (retryCount.current < MAX_RETRY_ATTEMPTS && isMountedRef.current) {
        console.log(`🔄 Retrying sync in ${RETRY_DELAY}ms`);
        
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            syncInProgress.current = false;
            syncDataRef.current?.();
          }
        }, RETRY_DELAY);
        return;
      } else {
        retryCount.current = 0; // Reset for next cycle
      }
    } finally {
      if (isMountedRef.current) {
        syncInProgress.current = false;
      }
    }
  }, [lastUpdateTime, handleSessionChange, performBatchUpdates, setLastUpdateTime]);

  // Update the ref whenever syncData changes
  useEffect(() => {
    syncDataRef.current = syncData;
  }, [syncData]);

  const startSyncInterval = useCallback(() => {
    // Clear any existing interval
    clearAllTimers();
    
    if (!isMountedRef.current) return;
    
    // Start new interval
    syncInterval.current = setInterval(() => {
      if (isMountedRef.current && syncDataRef.current) {
        syncDataRef.current();
      }
    }, SYNC_INTERVAL);
    console.log(`🔄 Chat sync started (interval: ${SYNC_INTERVAL}ms)`);
  }, [clearAllTimers]);

  const stopSyncInterval = useCallback(() => {
    clearAllTimers();
    console.log('⏹️ Chat sync stopped');
  }, [clearAllTimers]);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Initial sync
    syncData();
    
    // Start interval
    startSyncInterval();
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      stopSyncInterval();
      syncInProgress.current = false;
      retryCount.current = 0;
    };
  }, [syncData, startSyncInterval, stopSyncInterval]);

  // Return sync status for debugging or UI purposes
  return {
    isSyncing: syncInProgress.current,
    retryCount: retryCount.current,
    isConnected: isMountedRef.current && syncInProgress.current === false
  };
};

export default useChatSync;