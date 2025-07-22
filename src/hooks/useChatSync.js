import { useEffect, useRef } from 'react';
import { fetchServerInfo } from '../api/info';
import { fetchUpdatedMessages } from '../api/messages';
import { fetchAllParticipants, fetchUpdatedParticipants } from '../api/participants';

import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

const SYNC_INTERVAL = 8000; // 8 seconds

const useChatSync = () => {
  const syncInProgress = useRef(false);
  
  // ❌ BEFORE (BROKEN):
  // const clearMessages = useMessageStore((s) => s.clearMessages);
  
  // ✅ AFTER (FIXED):
  const setMessages = useMessageStore((s) => s.setMessages);
  const updateMessage = useMessageStore((s) => s.updateMessage);

  const updateParticipant = useParticipantStore((s) => s.updateParticipant);
  const setParticipants = useParticipantStore((s) => s.setParticipants);
  const clearParticipants = useParticipantStore((s) => s.clearParticipants);

  const sessionUuid = useSessionStore((s) => s.sessionUuid);
  const lastUpdateTime = useSessionStore((s) => s.lastUpdateTime);
  const setSession = useSessionStore((s) => s.setSession);
  const setLastUpdateTime = useSessionStore((s) => s.setLastUpdateTime);
  const clearSession = useSessionStore((s) => s.clearSession);

  useEffect(() => {
    let interval;

    const syncData = async () => {
      // Prevent overlapping sync calls
      if (syncInProgress.current) {
        console.warn('⏳ Sync already in progress, skipping...');
        return;
      }

      syncInProgress.current = true;

      try {
        // Add error handling for server info fetch
        let serverInfo;
        try {
          serverInfo = await fetchServerInfo();
        } catch (err) {
          console.error('❌ Failed to fetch server info, skipping sync:', err);
          syncInProgress.current = false;
          return; // Skip this sync cycle
        }

        if (serverInfo.sessionUuid !== sessionUuid) {
          console.warn('🔁 Session UUID changed — resetting state...');
          
          // ❌ BEFORE (BROKEN):
          // clearMessages();
          
          // ✅ AFTER (FIXED):
          setMessages([]); // Clear messages by setting empty array
          
          clearParticipants();
          clearSession();
          setSession(serverInfo);

          try {
            const allParticipants = await fetchAllParticipants();
            setParticipants(allParticipants);
          } catch (err) {
            console.error('❌ Failed to fetch participants:', err);
          }
          
          syncInProgress.current = false;
          return;
        }

        // Fetch updates in parallel with individual error handling
        try {
          const [updatedMessages, updatedParticipants] = await Promise.all([
            fetchUpdatedMessages(lastUpdateTime).catch(err => {
              console.error('❌ Failed to fetch updated messages:', err);
              return []; // Return empty array on failure
            }),
            fetchUpdatedParticipants(lastUpdateTime).catch(err => {
              console.error('❌ Failed to fetch updated participants:', err);
              return []; // Return empty array on failure
            })
          ]);

          // Batch message updates
          if (updatedMessages.length > 0) {
            updatedMessages.forEach(updateMessage);
          }

          // Batch participant updates
          if (updatedParticipants.length > 0) {
            updatedParticipants.forEach(updateParticipant);
          }

          setLastUpdateTime(Date.now());
        } catch (err) {
          console.error('❌ Error during batch updates:', err);
        }
        
      } catch (err) {
        console.error('❌ Chat sync error:', err.message);
      } finally {
        syncInProgress.current = false;
      }
    };

    syncData(); // initial run
    interval = setInterval(syncData, SYNC_INTERVAL);
    
    return () => {
      clearInterval(interval);
      syncInProgress.current = false;
    };
  }, [
    sessionUuid,
    lastUpdateTime,
    updateMessage,
    updateParticipant,
    setParticipants,
    setSession,
    setLastUpdateTime,
    setMessages, // ✅ FIXED: Use setMessages instead of clearMessages
    clearParticipants,
    clearSession
  ]);
};

export default useChatSync;