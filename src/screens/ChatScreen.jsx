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
  TouchableOpacity,
  Dimensions
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
import ErrorBoundary from '../components/ErrorBoundary';

// Constants imports
import colors from '../constants/colors';

const { height: screenHeight } = Dimensions.get('window');
const ITEM_APPROXIMATE_HEIGHT = 100; // Approximate height for performance optimization

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

  // Custom hooks
  const { 
    loading: syncLoading, 
    error: syncError, 
    execute: executeSyncOperation 
  } = useAsyncOperation();

  const { 
    loading: reactionLoading, 
    error: reactionError, 
    execute: executeReactionOperation 
  } = useAsyncOperation();

  // Start chat sync
  const { isSyncing, retryCount, isConnected } = useChatSync();

  // Update connection status based on sync state
  useEffect(() => {
    if (!isConnected) {
      setConnectionStatus('disconnected');
    } else if (isSyncing) {
      setConnectionStatus('syncing');
    } else {
      setConnectionStatus('connected');
    }
  }, [isConnected, isSyncing]);

  // Focus effect for screen active state
  useFocusEffect(
    useCallback(() => {
      // Clear stale optimistic updates when screen becomes active
      clearStaleOptimisticUpdates();
      
      // Announce screen to accessibility users
      AccessibilityInfo.announceForAccessibility('Chat screen loaded');
      
      return () => {
        // Cleanup when screen loses focus
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }, [clearStaleOptimisticUpdates])
  );

  // Initial data loading
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await executeSyncOperation(
          () => fetchLatestMessages(),
          (data) => {
            setMessages(data);
            AccessibilityInfo.announceForAccessibility(
              `Loaded ${data.length} messages`
            );
          },
          (error) => {
            console.error('Failed to load initial messages:', error);
            Alert.alert(
              'Connection Error', 
              'Failed to load messages. Please check your connection and try again.',
              [
                { text: 'Retry', onPress: loadInitialData },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }
        );
      } catch (error) {
        // Error already handled in execute function
      }
    };

    if (sessionUuid) {
      loadInitialData();
    }
  }, [sessionUuid, executeSyncOperation, setMessages]);

  // Memoized grouped messages for performance
  const groupedMessages = useMemo(() => {
    try {
      return groupMessages(messages);
    } catch (error) {
      console.error('Error grouping messages:', error);
      return messages; // Fallback to ungrouped messages
    }
  }, [messages]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await executeSyncOperation(
        () => fetchLatestMessages(),
        (data) => {
          setMessages(data);
          AccessibilityInfo.announceForAccessibility('Messages refreshed');
        },
        (error) => {
          console.error('Failed to refresh messages:', error);
          Alert.alert('Refresh Failed', 'Unable to refresh messages. Please try again.');
        }
      );
    } catch (error) {
      // Error already handled
    } finally {
      setRefreshing(false);
    }
  }, [executeSyncOperation, setMessages]);

  // Load older messages (infinite scroll)
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMoreMessages || groupedMessages.length === 0) {
      return;
    }

    setLoadingOlder(true);
    try {
      const oldestMessage = groupedMessages[groupedMessages.length - 1];
      // TODO: Implement fetchOlderMessages API call
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
  }, [loadingOlder, hasMoreMessages, groupedMessages, messages, setMessages]);

  // Enhanced reaction handler with optimistic updates
  const handleReact = useCallback(async (messageId, emoji) => {
    try {
      // Add optimistic reaction immediately for better UX
      const optimisticKey = addReactionOptimistic(messageId, emoji, 'you');
      
      if (!optimisticKey) {
        // Reaction already exists or message not found
        return;
      }

      // Announce to accessibility users
      AccessibilityInfo.announceForAccessibility(`Added ${emoji} reaction`);

      // Send reaction to server
      await executeReactionOperation(
        () => sendReaction(messageId, emoji),
        (serverResponse) => {
          // Confirm optimistic update with server data
          confirmReaction(optimisticKey);
          
          // Update with server response if different
          if (serverResponse && serverResponse.uuid === messageId) {
            updateMessage(serverResponse);
          }
        },
        (error) => {
          console.error('Failed to send reaction:', error);
          
          // Revert optimistic update on error
          revertReaction(optimisticKey);
          
          // Show user-friendly error
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
          {retryCount > 0 && (
            <Text style={styles.retryText}>
              Retry attempt {retryCount}/3
            </Text>
          )}
        </View>
      );
    }
    
    if (connectionStatus === 'syncing') {
      return (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.syncText}>Syncing messages...</Text>
        </View>
      );
    }
    
    return null;
  }, [connectionStatus, retryCount]);

  // Footer component for loading older messages
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
      <Text style={styles.emptyStateTitle}>No messages yet</Text>
      <Text style={styles.emptyStateSubtitle}>
        Start a conversation by sending a message
      </Text>
    </View>
  ), []);

  // Error state component
  const renderErrorState = useCallback(() => {
    if (!syncError) return null;
    
    return (
      <View style={styles.errorState}>
        <Text style={styles.errorTitle}>Unable to load messages</Text>
        <Text style={styles.errorMessage}>{syncError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => window.location?.reload?.() || onRefresh()}
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
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <View style={styles.chatContainer}>
          {/* Connection status header */}
          {renderHeader()}
          
          {/* Error state */}
          {syncError && renderErrorState()}
          
          {/* Messages list */}
          <FlatList
            ref={flatListRef}
            data={groupedMessages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            
            // Performance optimizations
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            windowSize={10}
            initialNumToRender={15}
            
            // Maintain scroll position when new messages arrive
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 100,
            }}
            
            // Inverted for chat-like behavior (newest at bottom)
            inverted={true}
            
            // Styling
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesListContent,
              groupedMessages.length === 0 && styles.messagesListEmpty
            ]}
            showsVerticalScrollIndicator={false}
            
            // Pull to refresh
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            
            // Infinite scroll
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
                                     { uuid: participantId, name: participantId === 'you' ? 'You' : `User ${participantId}` };
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.participantItem}
                        onPress={() => {
                          closeReactionBottomSheet();
                          handleParticipantPress(participant);
                        }}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${participant.name} profile`}
                      >
                        <Text style={styles.participantName}>
                          {participant.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  }) || (
                    <Text style={styles.noParticipantsText}>
                      No participant details available
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
                    {participantBottomSheet.participant.name}
                  </Text>
                  <Text style={styles.participantId}>
                    ID: {participantBottomSheet.participant.uuid}
                  </Text>
                </View>
                
                {/* Additional participant info could go here */}
                <View style={styles.participantInfo}>
                  <Text style={styles.participantInfoText}>
                    {participantBottomSheet.participant.uuid === 'you' 
                      ? 'This is you!' 
                      : 'Chat participant'
                    }
                  </Text>
                </View>
              </>
            )}
          </View>
        </BottomSheet>
      </SafeAreaView>
    </ErrorBoundary>
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