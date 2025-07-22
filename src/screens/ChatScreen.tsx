// src/screens/ChatScreen.jsx
import React, { useEffect } from 'react';
import { FlatList, View, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useMessageStore from '../state/messageStore';
import { fetchLatestMessages } from '../api/messages';
import { groupMessages } from '../utils/groupMessages';
import useChatSync from '../hooks/useChatSync';
import MessageGroup from '../components/MessageGroup';
import MessageInput from '../components/MessageInput';
import colors from '../constants/colors';

const ChatScreen = () => {
  const { messages, setMessages } = useMessageStore();
  const [refreshing, setRefreshing] = React.useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency - only run once on mount. setMessages is stable from Zustand

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

  const groupedMessages = groupMessages(messages);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <FlatList
          inverted
          data={groupedMessages}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => <MessageGroup group={item} />}
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
});

export default ChatScreen;