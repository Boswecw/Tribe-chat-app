// src/components/MessageBubble.jsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Avatar from './Avatar';
import { formatTime } from '../utils/formatDate';

const MessageBubble = ({ message, isGrouped }) => {
  const participant = message.participant;
  const displayName = participant?.name || 'Unknown';

  return (
    <View style={{ marginTop: isGrouped ? 2 : 12, paddingHorizontal: 12 }}>
      {!isGrouped && (
        <View style={styles.header}>
          <Avatar participant={participant} size={32} />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.time}>{formatTime(message.createdAt)}</Text>
        </View>
      )}

      <View style={styles.bubble}>
        <Text style={styles.text}>{message.text}</Text>
        {message.image && (
          <Image source={{ uri: message.image }} style={styles.image} />
        )}
        {message.editedAt && (
          <Text style={styles.edited}>(edited)</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  name: {
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
  time: {
    marginLeft: 'auto',
    fontSize: 10,
    color: '#888',
  },
  bubble: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 8,
  },
  text: {
    fontSize: 14,
  },
  edited: {
    fontSize: 10,
    color: '#888',
    marginTop: 4,
  },
  image: {
    marginTop: 6,
    height: 150,
    borderRadius: 6,
  },
});

export default MessageBubble;
