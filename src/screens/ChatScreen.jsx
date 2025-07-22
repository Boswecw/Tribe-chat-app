// src/screens/ChatScreen.jsx
import React, { useEffect } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import useMessageStore from '../state/messageStore';
import { fetchLatestMessages } from '../api/messages';
import { groupMessages } from '../utils/groupMessages';
import useChatSync from '../hooks/useChatSync';
import MessageGroup from '../components/MessageGroup';
import colors from '../constants/colors';

const ChatScreen = () => {
  const { messages, setMessages } = useMessageStore();

  useChatSync(); // start syncing

  useEffect(() => {
    (async () => {
      const latest = await fetchLatestMessages();
      setMessages(latest);
    })();
  }, [setMessages]);

  const groupedMessages = groupMessages(messages);

  return (
    <View style={styles.container}>
      <FlatList
        inverted
        data={groupedMessages}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => <MessageGroup group={item} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // from constants
  },
  listContent: {
    padding: 12,
  },
});

export default ChatScreen;
