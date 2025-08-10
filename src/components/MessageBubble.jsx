// Enhanced MessageBubble.jsx - Clean version that passes ESLint
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  AccessibilityInfo
} from 'react-native';
import Avatar from './Avatar';
import ReactionRow from './ReactionRow';
import { formatTime } from '../utils/formatDate';
import { useTheme } from '../constants/theme';
import { createStyles } from './MessageBubble.styles';

const MessageBubble = ({ message, isGrouped, onReact, onReactionPress, onParticipantPress }) => {
  const [showReactionRow, setShowReactionRow] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const participant = message.participant;
  const displayName = participant?.name || 'Unknown';
  const hasReactions = message.reactions && message.reactions.length > 0;
  
  // Check if this is the current user's message
  const isOwnMessage = participant?.uuid === 'you';
  
  // ✅ NEW: Check if message is still being sent or is temporary
  const isMessageSending = message.status === 'sending' || message.uuid?.startsWith('temp-');
  const reactionsDisabled = isMessageSending;

  // Memoize formatted time to prevent recalculation
  const formattedTime = useMemo(() => formatTime(message.createdAt), [message.createdAt]);
  
  // Memoize accessibility label
  const accessibilityLabel = useMemo(() => {
    let label = `Message from ${displayName}, sent at ${formattedTime}: ${message.text}`;
    if (message.editedAt) label += ' (edited)';
    if (hasReactions) label += ` with ${message.reactions.length} reactions`;
    return label;
  }, [displayName, formattedTime, message.text, message.editedAt, hasReactions, message.reactions]);

  const handleReact = useCallback(async (emoji) => {
    try {
      if (onReact) {
        await onReact(message.uuid, emoji);
        AccessibilityInfo.announceForAccessibility(`Added ${emoji} reaction`);
      }
      setShowReactionRow(false);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
      AccessibilityInfo.announceForAccessibility('Failed to add reaction');
    }
  }, [onReact, message.uuid]);

  const handleReactionPress = useCallback((reaction) => {
    if (onReactionPress) {
      onReactionPress(message.uuid, reaction);
    }
  }, [onReactionPress, message.uuid]);

  const handleParticipantPress = useCallback(() => {
    if (onParticipantPress && participant) {
      onParticipantPress(participant);
    }
  }, [onParticipantPress, participant]);

  const toggleReactionRow = useCallback(() => {
    // ✅ NEW: Prevent opening reactions on sending messages
    if (reactionsDisabled) {
      Alert.alert(
        'Message Still Sending', 
        'Please wait for the message to be sent before adding reactions.'
      );
      return;
    }

    setShowReactionRow(prev => {
      const newState = !prev;
      AccessibilityInfo.announceForAccessibility(
        newState ? 'Reaction options shown' : 'Reaction options hidden'
      );
      return newState;
    });
  }, [reactionsDisabled]);

  const handleImagePress = useCallback(() => {
    console.log('Image pressed:', message.image);
    AccessibilityInfo.announceForAccessibility('Opening image preview');
    // TODO: Implement image preview modal
  }, [message.image]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    AccessibilityInfo.announceForAccessibility('Failed to load image');
  }, []);

  return (
    <View 
      style={[
        styles.container,
        isGrouped ? styles.containerGrouped : styles.containerNotGrouped,
        isOwnMessage && styles.containerOwn
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {!isGrouped && (
        <View style={styles.header}>
          <TouchableOpacity onPress={handleParticipantPress}>
            <Avatar participant={participant} size={32} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleParticipantPress}>
            <Text 
              style={styles.name}
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`Message from ${displayName}`}
            >
              {displayName}
            </Text>
          </TouchableOpacity>
          <Text 
            style={styles.time}
            accessible={true}
            accessibilityLabel={`Sent at ${formattedTime}`}
          >
            {formattedTime}
          </Text>
        </View>
      )}

      <View style={[
        styles.bubble,
        isOwnMessage && styles.bubbleOwn
      ]}>
        <Text 
          style={[
            styles.text,
            isOwnMessage && styles.textOwn
          ]}
          selectable={true}
          accessible={true}
          accessibilityRole="text"
        >
          {message.text}
        </Text>
        
        {message.image && (
          <TouchableOpacity 
            onPress={handleImagePress} 
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="View image attachment"
            accessibilityHint="Double tap to open image preview"
          >
            <Image 
              source={{ uri: message.image }} 
              style={styles.image}
              resizeMode="cover"
              onLoad={handleImageLoad}
              onError={handleImageError}
              accessible={true}
              accessibilityIgnoresInvertColors={true}
            />
            {imageLoading && (
              <View style={styles.imageLoadingOverlay}>
                <Text style={styles.imageLoadingText}>Loading...</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {message.editedAt && (
          <Text 
            style={styles.edited}
            accessible={true}
            accessibilityLabel="This message was edited"
          >
            (edited)
          </Text>
        )}

        {/* Display existing reactions */}
        {hasReactions && (
          <View 
            style={styles.existingReactions}
            accessible={true}
            accessibilityLabel={`${message.reactions.length} reactions on this message`}
          >
            {message.reactions.map((reaction, index) => (
              <TouchableOpacity
                key={`${reaction.emoji}-${index}`}
                style={[
                  styles.reactionBubble,
                  reaction.isOwnReaction && styles.reactionBubbleActive
                ]}
                onPress={() => handleReactionPress(reaction)}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${reaction.emoji} reaction, ${reaction.count} ${reaction.count === 1 ? 'person' : 'people'}`}
                accessibilityHint="Double tap to see who reacted"
              >
                <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
                <Text style={[
                  styles.reactionCount,
                  reaction.isOwnReaction && styles.reactionCountActive
                ]}>
                  {reaction.count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ✅ ENHANCED: Add reaction button with disabled state */}
        <TouchableOpacity 
          style={[
            styles.addReactionButton,
            reactionsDisabled && styles.addReactionButtonDisabled
          ]}
          onPress={toggleReactionRow}
          activeOpacity={reactionsDisabled ? 1 : 0.7}
          disabled={reactionsDisabled}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={
            reactionsDisabled 
              ? "Reactions disabled while message is sending"
              : (showReactionRow ? "Hide reaction options" : "Show reaction options")
          }
          accessibilityHint={
            reactionsDisabled 
              ? "This message is still being sent"
              : "Double tap to toggle reaction options"
          }
        >
          <Text style={[
            styles.addReactionText,
            reactionsDisabled && styles.addReactionTextDisabled
          ]}>
            {reactionsDisabled ? '⏳' : (showReactionRow ? '✕' : '😊+')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reaction row for adding new reactions */}
      {showReactionRow && !reactionsDisabled && (
        <View style={styles.reactionRowContainer}>
          <ReactionRow onReact={handleReact} />
        </View>
      )}

      {/* Reply to message functionality */}
      {message.replyToMessage && (
        <View 
          style={styles.replyToContainer}
          accessible={true}
          accessibilityLabel={`Replying to ${message.replyToMessage.participant?.name || 'Unknown'}: ${message.replyToMessage.text}`}
        >
          <View style={styles.replyToLine} />
          <View style={styles.replyToContent}>
            <Text style={styles.replyToLabel}>
              Replying to {message.replyToMessage.participant?.name || 'Unknown'}
            </Text>
            <Text style={styles.replyToText} numberOfLines={2}>
              {message.replyToMessage.text}
            </Text>
          </View>
        </View>
      )}

      {/* Message status indicator */}
      {message.status && message.status !== 'sent' && (
        <View style={styles.statusContainer}>
          <Text 
            style={[
              styles.statusText, 
              message.status === 'failed' && styles.statusFailed,
              message.status === 'sending' && styles.statusSending
            ]}
            accessible={true}
            accessibilityLabel={`Message status: ${message.status}`}
          >
            {message.status === 'sending' && '⏳ Sending...'}
            {message.status === 'failed' && '❌ Failed to send'}
            {message.status === 'deleted' && '🗑️ Deleted'}
          </Text>
        </View>
      )}
    </View>
  );
};
export default MessageBubble;
