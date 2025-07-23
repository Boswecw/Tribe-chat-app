// src/screens/ChatScreen.jsx
import React, { useEffect, useState } from 'react';
import { FlatList, View, StyleSheet, RefreshControl, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useMessageStore from '../state/messageStore';
import { fetchLatestMessages } from '../api/messages';
import { groupMessages } from '../utils/groupMessages';
import useChatSync from '../hooks/useChatSync';
import MessageGroup from '../components/MessageGroup';
import MessageInput from '../components/MessageInput';
import BottomSheet from '../components/BottomSheet';
import colors from '../constants/colors';

const ChatScreen = () => {
  const { messages, setMessages, updateMessage } = useMessageStore();
  const [refreshing, setRefreshing] = useState(false);
  const [reactionBottomSheet, setReactionBottomSheet] = useState({
    visible: false,
    messageId: null,
    reaction: null,
  });

  useChatSync(); // start syncing

  useEffect(() => {
    const loadInitialMessages = async () => {
      try {
        const latest = await fetchLatestMessages();
        setMessages(latest);
      } catch (err) {
        console.error('Failed to load initial messages:', err);
      }
    };

    loadInitialMessages();
  }, [setMessages]); // Add setMessages to dependency array (it's stable from Zustand)

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const latest = await fetchLatestMessages();
      setMessages(latest);
    } catch (err) {
      console.error('Failed to load initial messages:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle adding a reaction to a message
  const handleReact = async (messageId, emoji) => {
    try {
      // Find the message
      const message = messages.find(m => m.uuid === messageId);
      if (!message) return;

      // Optimistically update the message with the new reaction
      const existingReactions = message.reactions || [];
      const existingReaction = existingReactions.find(r => r.emoji === emoji);
      
      let updatedReactions;
      if (existingReaction) {
        // Increment count if reaction already exists
        updatedReactions = existingReactions.map(r =>
          r.emoji === emoji 
            ? { ...r, count: r.count + 1 }
            : r
        );
      } else {
        // Add new reaction
        updatedReactions = [
          ...existingReactions,
          {
            emoji,
            count: 1,
            participants: ['you'], // Add current user
          }
        ];
      }

      // Update the message optimistically
      updateMessage({
        ...message,
        reactions: updatedReactions
      });

      // TODO: Send reaction to server when API supports it
      // await addReactionToMessage(messageId, emoji);

      console.log(`Added reaction ${emoji} to message ${messageId}`);
      
    } catch (error) {
      console.error('Failed to add reaction:', error);
      // Revert optimistic update on error
      const originalMessage = messages.find(m => m.uuid === messageId);
      if (originalMessage) {
        updateMessage(originalMessage);
      }
      throw error;
    }
  };

  // Handle clicking on an existing reaction
  const handleReactionPress = (messageId, reaction) => {
    setReactionBottomSheet({
      visible: true,
      messageId,
      reaction,
    });
  };

  const closeReactionBottomSheet = () => {
    setReactionBottomSheet({
      visible: false,
      messageId: null,
      reaction: null,
    });
  };

  const groupedMessages = groupMessages(messages);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <FlatList
          inverted
          data={groupedMessages}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => (
            <MessageGroup 
              group={item} 
              onReact={handleReact}
              onReactionPress={handleReactionPress}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
        <MessageInput />

        {/* Reaction Details Bottom Sheet */}
        <BottomSheet
          isVisible={reactionBottomSheet.visible}
          onClose={closeReactionBottomSheet}
          title={`Reactions: ${reactionBottomSheet.reaction?.emoji || ''}`}
        >
          <View style={styles.reactionDetails}>
            {reactionBottomSheet.reaction && (
              <>
                <View style={styles.reactionHeader}>
                  <Text style={styles.reactionEmoji}>
                    {reactionBottomSheet.reaction.emoji}
                  </Text>
                  <Text style={styles.reactionCountText}>
                    {reactionBottomSheet.reaction.count} 
                    {reactionBottomSheet.reaction.count === 1 ? ' person' : ' people'} reacted
                  </Text>
                </View>
                
                {/* List of participants who reacted */}
                <View style={styles.participantsList}>
                  {reactionBottomSheet.reaction.participants?.map((participantId, index) => (
                    <View key={index} style={styles.participantItem}>
                      <Text style={styles.participantName}>
                        {participantId === 'you' ? 'You' : `User ${participantId}`}
                      </Text>
                    </View>
                  )) || (
                    <Text style={styles.noParticipantsText}>
                      No participant details available
                    </Text>
                  )}
                </View>
              </>
            )}
          </View>
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
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
});

export default ChatScreen;