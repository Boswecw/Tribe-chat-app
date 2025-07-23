// src/screens/ChatScreen.jsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { 
  FlatList, 
  View, 
  StyleSheet, 
  RefreshControl, 
  Text, 
  Alert,
  AccessibilityInfo,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Store imports
import useMessageStore from '../state/messageStore';
import useParticipantStore from '../state/participantStore';
import useSessionStore from '../state/sessionStore';

// API imports
import { fetchLatestMessages, sendReaction } from '../api/messages';

// Utility imports
import { groupMessages } from '../utils/groupMessages';

// Hook imports
import useChatSync from '../hooks/useChatSync';
import { useAsyncOperation } from '../hooks/useAsyncOperation';

// Component imports
import MessageGroup from '../components/MessageGroup';
import MessageInput from '../components/MessageInput';
import BottomSheet from '../components/BottomSheet';

// Constants imports
import colors from '../constants/colors';

const ITEM_APPROXIMATE_HEIGHT = 100; // Approximate height for performance optimization

// Simple ErrorBoundary fallback component (temporary)
class SimpleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Something went wrong</Text>
          <Text style={{ textAlign: 'center', color: '#666' }}>Please try refreshing the app</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const ChatScreen = () => {
  // Zustand store hooks
  const { 
    messages, 
    setMessages, 
    updateMessage, 
    addReactionOptimistic, 
    confirmReaction, 
    revertReaction,
    clearStaleOptimisticUpdates 
  } = useMessageStore();
  
  const { participants } = useParticipantStore();
  const { sessionUuid } = useSessionStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [reactionBottomSheet, setReactionBottomSheet] = useState({
    visible: false,
    messageId: null,
    reaction: null,
  });
  const [participantBottomSheet, setParticipantBottomSheet] = useState({
    visible: false,
    participant: null,
  });

  // Refs
  const flatListRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // Custom hooks
  const { 
    loading: syncLoading, 
    error: syncError, 
    executeSyncOperation 
  } = useChatSync();
  
  const { executeOperation: executeReactionOperation } = useAsyncOperation();

  // Process and group messages
  const groupedMessages = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    
    try {
      return groupMessages(messages, participants);
    } catch (error) {
      console.error('Error grouping messages:', error);
      return [];
    }
  }, [messages, participants]);

  // FIXED: Reverse messages for proper display order (newest at bottom)
  const displayMessages = useMemo(() => {
    return [...groupedMessages].reverse();
  }, [groupedMessages]);

  // FIXED: Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current && displayMessages.length > 0) {
      // Small delay to ensure content has rendered
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated });
        } catch (error) {
          console.warn('Failed to scroll to bottom:', error);
        }
      }, 100);
    }
  }, [displayMessages.length]);

  // FIXED: Effect to scroll to bottom on new messages
  useEffect(() => {
    const currentMessageCount = displayMessages.length;
    const prevMessageCount = prevMessageCountRef.current;
    
    if (currentMessageCount > prevMessageCount && prevMessageCount > 0) {
      // New message arrived, scroll to bottom
      scrollToBottom(true);
    } else if (currentMessageCount > 0 && prevMessageCount === 0) {
      // Initial load, scroll to bottom without animation
      scrollToBottom(false);
    }
    
    prevMessageCountRef.current = currentMessageCount;
  }, [displayMessages.length, scrollToBottom]);

  // Initialize data on screen focus
  useFocusEffect(
    useCallback(() => {
      if (sessionUuid && messages.length === 0) {
        onRefresh();
      }
      
      // Cleanup stale optimistic updates on focus
      clearStaleOptimisticUpdates();
      
      return () => {
        // Clear any retry timeouts
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      };
    }, [sessionUuid, messages.length, onRefresh, clearStaleOptimisticUpdates])
  );

  // Pull to refresh handler - FIXED: Now loads newer messages since list isn't inverted
  const onRefresh = useCallback(async () => {
    if (refreshing) return;

    setRefreshing(true);
    try {
      await executeSyncOperation(
        async () => {
          const latestMessages = await fetchLatestMessages();
          setMessages(latestMessages);
          setConnectionStatus('connected');
          
          AccessibilityInfo.announceForAccessibility(
            `Loaded ${latestMessages.length} messages`
          );
          
          return latestMessages;
        },
        'Failed to refresh messages. Please try again.'
      );
    } catch (_error) {
      setConnectionStatus('disconnected');
      Alert.alert(
        'Connection Error',
        'Unable to refresh messages. Please check your internet connection.',
        [
          { text: 'OK' },
          { text: 'Retry', onPress: () => onRefresh() }
        ]
      );
    } finally {
      setRefreshing(false);
    }
  }, [executeSyncOperation, setMessages, refreshing]);

  // FIXED: Load older messages (now loads from beginning since list isn't inverted)
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages || displayMessages.length === 0) {
      return;
    }

    setLoadingOlder(true);
    try {
      // TODO: Implement fetchOlderMessages API call
      // const oldestMessage = groupedMessages[groupedMessages.length - 1];
      // const olderMessages = await fetchOlderMessages(oldestMessage.uuid);
      
      // Simulate loading for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      const olderMessages = []; // Placeholder
      
      if (olderMessages.length === 0) {
        setHasMoreMessages(false);
        AccessibilityInfo.announceForAccessibility('No more messages to load');
      } else {
        setMessages([...messages, ...olderMessages]);
        AccessibilityInfo.announceForAccessibility(
          `Loaded ${olderMessages.length} older messages`
        );
      }
    } catch (error) {
      console.error('Failed to load older messages:', error);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMoreMessages, displayMessages.length, messages, setMessages]);

  // Enhanced reaction handler with optimistic updates
  const handleReact = useCallback(async (messageId, emoji) => {
    try {
      // Add optimistic reaction immediately for better UX
      const optimisticKey = addReactionOptimistic(messageId, emoji, 'you');
      
      if (!optimisticKey) {
        return;
      }

      AccessibilityInfo.announceForAccessibility(`Added ${emoji} reaction`);

      // Send reaction to server
      await executeReactionOperation(
        () => sendReaction(messageId, emoji),
        (serverResponse) => {
          confirmReaction(optimisticKey);
          
          if (serverResponse && serverResponse.uuid === messageId) {
            updateMessage(serverResponse);
          }
        },
        (error) => {
          console.error('Failed to send reaction:', error);
          revertReaction(optimisticKey);
          
          Alert.alert(
            'Reaction Failed', 
            'Unable to add reaction. Please try again.',
            [
              { 
                text: 'Retry', 
                onPress: () => handleReact(messageId, emoji) 
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
          
          AccessibilityInfo.announceForAccessibility('Failed to add reaction');
        }
      );
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }, [
    addReactionOptimistic, 
    executeReactionOperation, 
    confirmReaction, 
    revertReaction, 
    updateMessage
  ]);

  // Reaction press handler (show bottom sheet)
  const handleReactionPress = useCallback((messageId, reaction) => {
    setReactionBottomSheet({
      visible: true,
      messageId,
      reaction,
    });
    
    AccessibilityInfo.announceForAccessibility(
      `Showing ${reaction.emoji} reaction details`
    );
  }, []);

  // Participant press handler
  const handleParticipantPress = useCallback((participant) => {
    setParticipantBottomSheet({
      visible: true,
      participant,
    });
    
    AccessibilityInfo.announceForAccessibility(
      `Showing details for ${participant.name}`
    );
  }, []);

  // Close bottom sheets
  const closeReactionBottomSheet = useCallback(() => {
    setReactionBottomSheet({
      visible: false,
      messageId: null,
      reaction: null,
    });
  }, []);

  const closeParticipantBottomSheet = useCallback(() => {
    setParticipantBottomSheet({
      visible: false,
      participant: null,
    });
  }, []);

  // FlatList optimization callbacks
  const keyExtractor = useCallback((item, index) => {
    return item.uuid || `message-${index}`;
  }, []);

  const renderItem = useCallback(({ item, index }) => (
    <MessageGroup 
      group={item} 
      onReact={handleReact}
      onReactionPress={handleReactionPress}
      onParticipantPress={handleParticipantPress}
      index={index}
    />
  ), [handleReact, handleReactionPress, handleParticipantPress]);

  const getItemLayout = useCallback((data, index) => ({
    length: ITEM_APPROXIMATE_HEIGHT,
    offset: ITEM_APPROXIMATE_HEIGHT * index,
    index,
  }), []);

  // Header component with connection status
  const renderHeader = useCallback(() => {
    if (connectionStatus === 'disconnected') {
      return (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionText}>
            ⚠️ Connection lost. Trying to reconnect...
          </Text>
          <Text style={styles.retryText}>
            Pull down to refresh
          </Text>
        </View>
      );
    }
    
    if (syncLoading) {
      return (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={colors.background} />
          <Text style={styles.syncText}>Syncing messages...</Text>
        </View>
      );
    }
    
    return null;
  }, [connectionStatus, syncLoading]);

  // Loading footer component
  const renderFooter = useCallback(() => {
    if (!loadingOlder) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingText}>Loading older messages...</Text>
      </View>
    );
  }, [loadingOlder]);

  // Empty state component
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Welcome to the chat!</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start a conversation by sending your first message below.
      </Text>
    </View>
  ), []);

  // Error state component
  const renderErrorState = useCallback(() => {
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>
          Unable to load messages
        </Text>
        <Text style={styles.errorMessage}>
          {syncError?.message || 'Something went wrong while loading messages.'}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => onRefresh()}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Retry loading messages"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }, [syncError, onRefresh]);

  return (
    <SimpleErrorBoundary>
      <SafeAreaView style={styles.container}>
        <View style={styles.chatContainer}>
          {/* Connection status header */}
          {renderHeader()}
          
          {/* Error state */}
          {syncError && renderErrorState()}
          
          {/* Messages list - FIXED: No longer inverted */}
          <FlatList
            ref={flatListRef}
            data={displayMessages} // Using reversed data
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            initialNumToRender={15}
            
            // FIXED: Auto-scroll behavior for new messages
            onContentSizeChange={scrollToBottom}
            onLayout={() => scrollToBottom(false)}
            
            // REMOVED: inverted={true} - This was causing the mirroring!
            
            // Styling
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesListContent,
              displayMessages.length === 0 && styles.messagesListEmpty
            ]}
            showsVerticalScrollIndicator={false}
            
            // FIXED: Pull to refresh now loads newer messages (normal behavior)
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            
            // FIXED: Load older messages when scrolling to top (normal behavior)
            onEndReached={loadOlderMessages}
            onEndReachedThreshold={0.1}
            
            // Footer for loading indicator
            ListFooterComponent={renderFooter}
            
            // Empty state
            ListEmptyComponent={!syncLoading ? renderEmptyState : null}
            
            // Accessibility
            accessible={true}
            accessibilityLabel="Messages list"
            accessibilityHint="Swipe up and down to navigate messages"
          />
          
          {/* Input component */}
          <MessageInput />
        </View>

        {/* Reaction Bottom Sheet */}
        <BottomSheet
          isVisible={reactionBottomSheet.visible}
          onClose={closeReactionBottomSheet}
          title="Reaction Details"
        >
          <View style={styles.reactionDetails}>
            {reactionBottomSheet.reaction && (
              <>
                <View style={styles.reactionHeader}>
                  <Text style={styles.reactionEmoji}>
                    {reactionBottomSheet.reaction.emoji}
                  </Text>
                  <Text style={styles.reactionCountText}>
                    {reactionBottomSheet.reaction.count} {
                      reactionBottomSheet.reaction.count === 1 ? 'person' : 'people'
                    } reacted
                  </Text>
                </View>
                
                {/* List of participants who reacted */}
                <View style={styles.participantsList}>
                  {reactionBottomSheet.reaction.participants?.map((participantId, index) => {
                    const participant = participants.find(p => p.uuid === participantId) || 
                                     { uuid: participantId, name: participantId === 'you' ? 'You' : 'Unknown' };
                    
                    return (
                      <View key={`${participantId}-${index}`} style={styles.participantItem}>
                        <Text style={styles.participantName}>
                          {participant.name}
                        </Text>
                      </View>
                    );
                  }) || (
                    <Text style={styles.noParticipantsText}>
                      No reaction data available
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        </BottomSheet>

        {/* Participant Bottom Sheet */}
        <BottomSheet
          isVisible={participantBottomSheet.visible}
          onClose={closeParticipantBottomSheet}
          title="Participant Details"
        >
          <View style={styles.participantDetails}>
            {participantBottomSheet.participant && (
              <>
                <View style={styles.participantHeader}>
                  <Text style={styles.participantDisplayName}>
                    {participantBottomSheet.participant.name || 'Unknown User'}
                  </Text>
                  <Text style={styles.participantId}>
                    ID: {participantBottomSheet.participant.uuid}
                  </Text>
                </View>
                
                <View style={styles.participantInfo}>
                  <Text style={styles.participantInfoText}>
                    {participantBottomSheet.participant.uuid === 'you' ? 
                      'This is you!' 
                      : 'Chat participant'
                    }
                  </Text>
                </View>
              </>
            )}
          </View>
        </BottomSheet>
      </SafeAreaView>
    </SimpleErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  chatContainer: {
    flex: 1,
  },
  
  // Connection status styles
  connectionBanner: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  
  connectionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  
  retryText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  
  syncBanner: {
    backgroundColor: colors.info,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  syncText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Messages list styles
  messagesList: {
    flex: 1,
  },
  
  messagesListContent: {
    padding: 12,
    paddingBottom: 20,
  },
  
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  
  // Loading footer styles
  loadingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.textMuted,
  },
  
  // Empty state styles
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Error state styles
  errorState: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
  },
  
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginBottom: 8,
  },
  
  errorMessage: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Bottom sheet content styles
  reactionDetails: {
    padding: 16,
  },
  
  reactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  reactionEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  
  reactionCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  
  participantsList: {
    gap: 8,
  },
  
  participantItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  
  noParticipantsText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  
  // Participant details styles
  participantDetails: {
    padding: 16,
  },
  
  participantHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  
  participantDisplayName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  
  participantId: {
    fontSize: 12,
    color: colors.textMuted,
  },
  
  participantInfo: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
  
  participantInfoText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default React.memo(ChatScreen);