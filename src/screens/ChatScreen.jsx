// src/screens/ChatScreen.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Text, Alert, AccessibilityInfo, ActivityIndicator, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Store imports
import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

// API imports
import { sendReaction } from '../api/messages';

// Utility imports
import { groupMessages } from '../utils/groupMessages';
import { throttle } from '../utils/debounce';

// Hook imports
import useChatSync from '../hooks/useChatSync';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import useChatRefresh from './useChatRefresh';

// Component imports
import MessageInput from '../components/MessageInput';
import BottomSheet from '../components/BottomSheet';
import ConnectionBanner from '../components/ConnectionBanner';
import MessageList from '../components/MessageList';

// Constants imports
import colors from '../constants/colors';
import { requestQueue } from './requestQueue';

const REACTION_THROTTLE_MS = 1000;

// Enhanced ErrorBoundary with 409 error handling
class EnhancedErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (__DEV__ && (error.message?.includes('Network request failed') || error.message?.includes('409'))) {
      console.warn('🚨 Development server issue detected - consider restarting');
    }
    if (this.state.retryCount < 3 && this.shouldAutoRecover(error)) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 2000);
    }
  }

  shouldAutoRecover(error) {
    const recoverable = ['Network request failed', 'Connection timeout', '409', 'Request conflict'];
    return recoverable.some(msg => error.message?.includes(msg));
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {__DEV__ && this.state.error?.message ? `Dev Error: ${this.state.error.message}` : 'Please try refreshing the app'}
          </Text>
          {this.state.retryCount < 3 && (
            <Text style={styles.errorHint}>Auto-retry in progress... ({this.state.retryCount}/3)</Text>
          )}
          <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ChatScreen = () => {
  const { messages, setMessages, addReactionOptimistic, confirmReaction, revertReaction, clearStaleOptimisticUpdates } =
    useMessageStore();
  const { participants } = useParticipantStore();
  const { sessionUuid } = useSessionStore();

  const [bottomSheets, setBottomSheets] = useState({
    reaction: { visible: false, messageId: null, reaction: null },
    participant: { visible: false, participant: null },
  });

  const appStateRef = useRef(AppState.currentState);
  const { isSyncing: syncLoading } = useChatSync();
  const { execute: executeReactionOperation } = useAsyncOperation();
  const { execute: executeSyncOperation } = useAsyncOperation();

  const { refreshing, connectionStatus, syncError, performRefresh, throttledRefresh } = useChatRefresh(
    setMessages,
    executeSyncOperation
  );

  const processedMessages = useMemo(() => {
    if (!messages?.length) return [];
    try {
      return [...groupMessages(messages, participants)].reverse();
    } catch (error) {
      console.error('Error processing messages:', error);
      return [];
    }
  }, [messages, participants]);

  const handleAppStateChange = useCallback(
    nextAppState => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (sessionUuid && processedMessages.length > 0) performRefresh();
      }
      appStateRef.current = nextAppState;
    },
    [sessionUuid, processedMessages.length, performRefresh]
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub?.remove();
  }, [handleAppStateChange]);

  const handleReactBase = useCallback(
    async (messageId, emoji) => {
      try {
        if (messageId.startsWith('temp-')) {
          Alert.alert('Message Still Sending', 'Please wait for the message to send before adding reactions.');
          return;
        }
        const optimisticId = addReactionOptimistic(messageId, emoji, 'you');
        await executeReactionOperation(
          async () => requestQueue.add(() => sendReaction(messageId, emoji, true)),
          res => {
            confirmReaction(optimisticId, res);
            AccessibilityInfo.announceForAccessibility(`Added ${emoji} reaction`);
          },
          err => {
            revertReaction(optimisticId);
            if (err?.response?.status === 409) {
              console.warn('Reaction conflict - retrying automatically');
              return;
            }
            Alert.alert('Failed to Add Reaction', 'Please try again.', [
              { text: 'Retry', onPress: () => handleReactBase(messageId, emoji) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }
        );
      } catch (error) {
        console.error('Reaction error:', error);
      }
    },
    [addReactionOptimistic, executeReactionOperation, confirmReaction, revertReaction]
  );

  const handleReact = useMemo(() => throttle(handleReactBase, REACTION_THROTTLE_MS), [handleReactBase]);

  const handleReactionPress = useCallback((messageId, reaction) => {
    setBottomSheets(prev => ({ ...prev, reaction: { visible: true, messageId, reaction } }));
  }, []);

  const handleParticipantPress = useCallback(participant => {
    setBottomSheets(prev => ({ ...prev, participant: { visible: true, participant } }));
  }, []);

  const closeBottomSheets = useCallback(() => {
    setBottomSheets({
      reaction: { visible: false, messageId: null, reaction: null },
      participant: { visible: false, participant: null },
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (sessionUuid && processedMessages.length === 0) throttledRefresh();
      clearStaleOptimisticUpdates();
      return () => requestQueue.clear();
    }, [sessionUuid, processedMessages.length, throttledRefresh, clearStaleOptimisticUpdates])
  );

  const renderErrorState = useCallback(() => {
    if (!syncError) return null;
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Unable to load messages</Text>
        <Text style={styles.errorMessage}>
          {syncError?.message || 'Something went wrong while loading messages.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={performRefresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }, [syncError, performRefresh]);

  return (
    <EnhancedErrorBoundary>
      <SafeAreaView style={styles.container}>
        <View style={styles.chatContainer}>
          <ConnectionBanner status={connectionStatus} onRetry={performRefresh} />

          {syncLoading && (
            <View style={styles.syncBanner}>
              <ActivityIndicator size="small" color={colors.background} />
              <Text style={styles.syncText}>Syncing messages...</Text>
            </View>
          )}

          {renderErrorState()}

          <MessageList
            messages={processedMessages}
            onReact={handleReact}
            onReactionPress={handleReactionPress}
            onParticipantPress={handleParticipantPress}
            refreshing={refreshing}
            onRefresh={throttledRefresh}
          />

          <MessageInput />

          <BottomSheet visible={bottomSheets.reaction.visible} onClose={closeBottomSheets} title="Reaction Details" />
          <BottomSheet visible={bottomSheets.participant.visible} onClose={closeBottomSheets} title="Participant Details" />
        </View>
      </SafeAreaView>
    </EnhancedErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  chatContainer: { flex: 1 },
  syncBanner: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: { color: colors.background, fontSize: 12, marginLeft: 8 },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
    backgroundColor: colors.error.background,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: '600', color: colors.error.text, marginBottom: 8, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: colors.error.text, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  errorHint: { fontSize: 12, color: colors.text.secondary, textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },
  retryButton: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  retryButtonText: { color: colors.background, fontSize: 16, fontWeight: '500' },
});

export default ChatScreen;
