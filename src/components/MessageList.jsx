// src/components/MessageList.jsx
import React, { useRef, useCallback, useMemo, useEffect, memo } from 'react';
import {
  FlatList,
  View,
  RefreshControl,
  Text,
  StyleSheet,
} from 'react-native';
import MessageGroup from './MessageGroup';
import colors from '../constants/colors';
import { debounce } from '../utils/debounce';

const ITEM_APPROXIMATE_HEIGHT = 100;
const SCROLL_DEBOUNCE_MS = 300;

const groupsEqual = (a, b) => {
  if (!a || !b) return false;
  const lenA = Array.isArray(a.messages) ? a.messages.length : 0;
  const lenB = Array.isArray(b.messages) ? b.messages.length : 0;
  return (
    a.uuid === b.uuid &&
    (a.text ?? null) === (b.text ?? null) &&
    (a.status ?? null) === (b.status ?? null) &&
    lenA === lenB &&
    JSON.stringify(a.reactions ?? {}) === JSON.stringify(b.reactions ?? {})
  );
};

const MemoizedMessageGroup = memo(
  MessageGroup,
  (prevProps, nextProps) =>
    groupsEqual(prevProps.group, nextProps.group) &&
    prevProps.onParticipantPress === nextProps.onParticipantPress
);

const MessageList = ({
  messages,
  onReact,
  onReactionPress,
  onParticipantPress,
  refreshing,
  onRefresh,
}) => {
  const flatListRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const lastScrollRef = useRef(0);
  const isScrollingRef = useRef(false);

  const scrollToBottomBase = useCallback((animated = true) => {
    if (flatListRef.current && !isScrollingRef.current) {
      const now = Date.now();
      if (now - lastScrollRef.current < SCROLL_DEBOUNCE_MS) return;

      lastScrollRef.current = now;
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated });
        } catch (error) {
          console.warn('Failed to scroll to bottom:', error);
        }
      }, 50);
    }
  }, []);

  const debouncedScrollToBottom = useMemo(
    () => debounce(scrollToBottomBase, SCROLL_DEBOUNCE_MS),
    [scrollToBottomBase]
  );

  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    if (currentCount > prevCount && prevCount > 0) {
      debouncedScrollToBottom(true);
    } else if (currentCount > 0 && prevCount === 0) {
      debouncedScrollToBottom(false);
    }

    prevMessageCountRef.current = currentCount;
  }, [messages.length, debouncedScrollToBottom]);

  const keyExtractor = useCallback(
    (item, index) => item.uuid || `message-group-${index}`,
    []
  );

  const renderItem = useCallback(
    ({ item, index }) => (
      <MemoizedMessageGroup
        group={item}
        onReact={onReact}
        onReactionPress={onReactionPress}
        onParticipantPress={onParticipantPress}
        index={index}
      />
    ),
    [onReact, onReactionPress, onParticipantPress]
  );

  const getItemLayout = useCallback(
    (data, index) => ({
      length: ITEM_APPROXIMATE_HEIGHT,
      offset: ITEM_APPROXIMATE_HEIGHT * index,
      index,
    }),
    []
  );

  const handleScrollBeginDrag = useCallback(() => {
    isScrollingRef.current = true;
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    isScrollingRef.current = false;
  }, []);

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>Welcome to the chat!</Text>
        <Text style={styles.emptyStateSubtitle}>
          Start a conversation by sending your first message below.
        </Text>
      </View>
    ),
    []
  );

  return (
    <FlatList
      testID="message-list"
      ref={flatListRef}
      data={messages}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      removeClippedSubviews
      maxToRenderPerBatch={8}
      updateCellsBatchingPeriod={100}
      windowSize={8}
      initialNumToRender={12}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
      onContentSizeChange={() => debouncedScrollToBottom(false)}
      onLayout={() => debouncedScrollToBottom(false)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      ListEmptyComponent={renderEmptyState}
      style={styles.messagesList}
      contentContainerStyle={[
        styles.messagesContent,
        messages.length === 0 && styles.messagesContentEmpty,
      ]}
      accessible
      accessibilityRole="list"
      accessibilityLabel="Chat messages"
    />
  );
};

const styles = StyleSheet.create({
  messagesList: { flex: 1 },
  messagesContent: { paddingVertical: 8 },
  messagesContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default MessageList;
