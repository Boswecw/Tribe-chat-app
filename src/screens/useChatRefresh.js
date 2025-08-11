// src/screens/useChatRefresh.js
import { useState, useCallback, useMemo } from 'react';
import { Alert, AccessibilityInfo } from 'react-native';
import { fetchLatestMessages } from '../api/messages';
import { throttle } from '../utils/debounce';
import { requestQueue } from './requestQueue';

const REFRESH_THROTTLE_MS = 2000;

export default function useChatRefresh(setMessages, executeSyncOperation) {
  const [state, setState] = useState({
    refreshing: false,
    connectionStatus: 'connected',
    syncError: null,
  });

  const performRefresh = useCallback(async () => {
    if (state.refreshing) return;

    setState((prev) => ({ ...prev, refreshing: true, syncError: null }));

    try {
      await executeSyncOperation(
        async () => requestQueue.add(() => fetchLatestMessages()),
        (result) => {
          setMessages(result);
          setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
          AccessibilityInfo.announceForAccessibility(
            `Loaded ${result.length} messages`
          );
        },
        (error) => {
          console.error('Failed to refresh messages:', error);
          setState((prev) => ({
            ...prev,
            syncError: error,
            connectionStatus: 'disconnected',
          }));

          if (error?.response?.status !== 409) {
            Alert.alert(
              'Connection Error',
              'Unable to refresh messages. Please check your internet connection.',
              [
                { text: 'OK' },
                { text: 'Retry', onPress: () => performRefresh() },
              ]
            );
          }
        }
      );
    } catch (error) {
      console.error('Refresh operation failed:', error);
    } finally {
      setState((prev) => ({ ...prev, refreshing: false }));
    }
  }, [state.refreshing, executeSyncOperation, setMessages]);

  const throttledRefresh = useMemo(
    () => throttle(performRefresh, REFRESH_THROTTLE_MS),
    [performRefresh]
  );

  return {
    ...state,
    performRefresh,
    throttledRefresh,
  };
}
