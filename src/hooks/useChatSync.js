// src/hooks/useChatSync.js
import { useEffect } from 'react';
import { fetchServerInfo } from '../api/info';
import { fetchUpdatedMessages } from '../api/messages';
import { fetchAllParticipants, fetchUpdatedParticipants } from '../api/participants';

import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

const SYNC_INTERVAL = 8000; // 8 seconds

const useChatSync = () => {
  // Zustand hooks — destructure only what’s actually used
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
      try {
        const serverInfo = await fetchServerInfo();

        if (serverInfo.sessionUuid !== sessionUuid) {
          console.warn('🔁 Session UUID changed — resetting state...');
          clearMessages();
          clearParticipants();
          clearSession();
          setSession(serverInfo);

          const allParticipants = await fetchAllParticipants();
          setParticipants(allParticipants);
          return;
        }

        const updatedMessages = await fetchUpdatedMessages(lastUpdateTime);
        updatedMessages.forEach(updateMessage);

        const updatedParticipants = await fetchUpdatedParticipants(lastUpdateTime);
        updatedParticipants.forEach(updateParticipant);

        setLastUpdateTime(Date.now());
      } catch (err) {
        console.error('❌ Chat sync error:', err.message);
      }
    };

    syncData(); // initial run
    interval = setInterval(syncData, SYNC_INTERVAL);
    return () => clearInterval(interval);
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
