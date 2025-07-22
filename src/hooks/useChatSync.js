// src/hooks/useChatSync.js
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
  
  // Zustand hooks — destructure only what's actually used
  const updateMessage = useMessageStore((s) => s.updateMessage);
  const clearMessages = useMessageStore((s) => s.clearMessages);

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
        const serverInfo = await fetchServerInfo();

        if (serverInfo.sessionUuid !== sessionUuid) {
          console.warn('🔁 Session UUID changed — resetting state...');
          
          // Batch all clearing operations
          clearMessages();
          clearParticipants();
          clearSession();
          setSession(serverInfo);

          const allParticipants = await fetchAllParticipants();
          setParticipants(allParticipants);
          
          syncInProgress.current = false;
          return;
        }

        // Fetch updates in parallel
        const [updatedMessages, updatedParticipants] = await Promise.all([
          fetchUpdatedMessages(lastUpdateTime),
          fetchUpdatedParticipants(lastUpdateTime)
        ]);

        // Batch message updates - avoid forEach for performance
        if (updatedMessages.length > 0) {
          updatedMessages.forEach(updateMessage);
        }

        // Batch participant updates
        if (updatedParticipants.length > 0) {
          updatedParticipants.forEach(updateParticipant);
        }

        setLastUpdateTime(Date.now());
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
    clearMessages,
    clearParticipants,
    clearSession
  ]);
};

export default useChatSync;