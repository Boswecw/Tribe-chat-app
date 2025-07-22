// src/components/MessageGroup.jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MessageBubble from './MessageBubble';
import { formatDate } from '../utils/formatDate';

/**
 * A message group handles rendering one or more consecutive messages
 * from the same participant, optionally separated by date.
 */
const MessageGroup = ({ group }) => {
  return (
    <View style={styles.wrapper}>
      {group.dateSeparator && (
        <View style={styles.dateWrapper}>
          <Text style={styles.dateText}>{formatDate(group.createdAt)}</Text>
        </View>
      )}

      <MessageBubble message={group} isGrouped={group.isGrouped} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  dateWrapper: {
    alignItems: 'center',
    marginVertical: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
});

export default MessageGroup;
