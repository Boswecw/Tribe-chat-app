// src/components/MessageBubble.jsx
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Avatar from './Avatar';
import ReactionRow from './ReactionRow';
import { formatTime } from '../utils/formatDate';

const MessageBubble = ({ message, isGrouped, onReact, onReactionPress }) => {
  const [showReactionRow, setShowReactionRow] = useState(false);
  const participant = message.participant;
  const displayName = participant?.name || 'Unknown';
  const hasReactions = message.reactions && message.reactions.length > 0;

  const handleReact = async (emoji) => {
    try {
      if (onReact) {
        await onReact(message.uuid, emoji);
      }
      setShowReactionRow(false); // Hide reaction row after reacting
    } catch (_error) {
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
    }
  };

  const handleReactionPress = (reaction) => {
    if (onReactionPress) {
      onReactionPress(message.uuid, reaction);
    }
  };

  const toggleReactionRow = () => {
    setShowReactionRow(!showReactionRow);
  };

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

        {/* Display existing reactions */}
        {hasReactions && (
          <View style={styles.existingReactions}>
            {message.reactions.map((reaction, index) => (
              <TouchableOpacity
                key={`${reaction.emoji}-${index}`}
                style={styles.reactionBubble}
                onPress={() => handleReactionPress(reaction)}
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={styles.reactionCount}>{reaction.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Add reaction button */}
        <TouchableOpacity 
          style={styles.addReactionButton}
          onPress={toggleReactionRow}
        >
          <Text style={styles.addReactionText}>
            {showReactionRow ? '✕' : '😊+'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reaction row for adding new reactions */}
      {showReactionRow && (
        <View style={styles.reactionRowContainer}>
          <ReactionRow onReact={handleReact} />
        </View>
      )}
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
    position: 'relative',
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
  existingReactions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#90caf9',
  },
  reactionEmoji: {
    fontSize: 12,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1976d2',
  },
  addReactionButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addReactionText: {
    fontSize: 12,
    color: '#666',
  },
  reactionRowContainer: {
    marginTop: 4,
    marginLeft: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default MessageBubble;