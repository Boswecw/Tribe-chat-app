// src/components/MessageInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  Text,
  Animated,
  Platform 
} from 'react-native';
import { sendMessage } from '../api/messages';
import useMessageStore from '../state/messageStore';
import useReply from '../hooks/useReply';

const MessageInput = () => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputHeight, setInputHeight] = useState(48);
  
  const textInputRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const currentAnimationRef = useRef(null);
  
  // Store actions
  const addMessage = useMessageStore((s) => s.addMessage);
  const updateMessage = useMessageStore((s) => s.updateMessage);
  
  // Reply functionality
  const { replyTo, isReplying, cancelReply } = useReply();

  // Animate reply preview with proper cleanup
  useEffect(() => {
    // Stop any existing animation
    if (currentAnimationRef.current) {
      currentAnimationRef.current.stop();
    }

    currentAnimationRef.current = Animated.timing(slideAnim, {
      toValue: isReplying ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    });

    currentAnimationRef.current.start((finished) => {
      if (finished) {
        currentAnimationRef.current = null;
      }
    });

    // Cleanup function
    return () => {
      if (currentAnimationRef.current) {
        currentAnimationRef.current.stop();
        currentAnimationRef.current = null;
      }
    };
  }, [isReplying, slideAnim]);

  // Set up mounted ref and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      // Stop any running animations
      if (currentAnimationRef.current) {
        currentAnimationRef.current.stop();
      }
    };
  }, []);

  const safeSetState = (setter, value) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText || sending) return;

    safeSetState(setSending, true);
    
    // Create optimistic message
    const tempMessage = {
      uuid: `temp-${Date.now()}`,
      text: trimmedText,
      status: 'sending',
      createdAt: new Date().toISOString(),
      participant: { 
        name: 'You', 
        uuid: 'you' // Use 'you' as specified in API docs
      },
      // Include reply reference if replying
      ...(isReplying && replyTo ? { 
        replyToMessage: {
          uuid: replyTo.uuid,
          text: replyTo.text,
          participant: replyTo.participant
        }
      } : {})
    };
    
    // Optimistically add message and clear input
    addMessage(tempMessage);
    safeSetState(setText, '');
    safeSetState(setInputHeight, 48); // Reset height
    
    // Clear reply state
    if (isReplying) {
      cancelReply();
    }

    try {
      // Current API only accepts text, but we're ready for reply support
      // TODO: When API supports replies, send replyToMessage: replyTo.uuid
      const newMessage = await sendMessage(trimmedText);
      
      // Only update if component is still mounted
      if (isMountedRef.current) {
        // Replace temp message with real message from server
        updateMessage({ 
          ...newMessage, 
          status: 'sent',
          // Preserve reply reference for UI (server may not return it yet)
          ...(tempMessage.replyToMessage ? { 
            replyToMessage: tempMessage.replyToMessage 
          } : {})
        });
      }
      
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Only proceed if component is still mounted
      if (!isMountedRef.current) return;
      
      // Mark message as failed
      updateMessage({ 
        ...tempMessage, 
        status: 'failed',
        error: err.message 
      });
      
      // Show user-friendly error with retry option
      Alert.alert(
        'Message Failed', 
        'Your message could not be sent. Please check your connection and try again.',
        [
          {
            text: 'Retry',
            onPress: () => {
              if (isMountedRef.current) {
                // Restore text and retry
                setText(trimmedText);
                // Remove failed message
                updateMessage({ ...tempMessage, status: 'deleted' });
                // Note: Reply state restoration could be added here if needed
              }
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel',
            onPress: () => {
              if (isMountedRef.current) {
                // Just remove the failed message
                updateMessage({ ...tempMessage, status: 'deleted' });
              }
            }
          }
        ]
      );
    } finally {
      safeSetState(setSending, false);
    }
  };

  const handleTextChange = (newText) => {
    // Prevent excessive length
    if (newText.length <= 1000) {
      safeSetState(setText, newText);
    }
  };

  const handleContentSizeChange = (event) => {
    if (!isMountedRef.current) return;
    
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.max(48, Math.min(height + 16, 100));
    safeSetState(setInputHeight, newHeight);
  };

  const handleRetryKeyPress = (event) => {
    // Handle iOS send on return key press
    if (Platform.OS === 'ios' && event.nativeEvent.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const isDisabled = !text.trim() || sending;
  const replyPreviewHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60],
  });

  return (
    <View style={styles.container}>
      {/* Reply Preview with Animation */}
      <Animated.View 
        style={[
          styles.replyContainer,
          {
            height: replyPreviewHeight,
            opacity: slideAnim,
          }
        ]}
      >
        {isReplying && replyTo && (
          <View style={styles.replyContent}>
            <View style={styles.replyLine} />
            <View style={styles.replyTextContainer}>
              <Text style={styles.replyLabel}>
                Replying to {replyTo.participant?.name || 'Unknown'}
              </Text>
              <Text style={styles.replyText} numberOfLines={1}>
                {replyTo.text}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={cancelReply}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Cancel reply"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Input Container */}
      <View style={[styles.inputContainer, { minHeight: inputHeight }]}>
        <TextInput
          ref={textInputRef}
          style={[styles.textInput, { height: Math.max(32, inputHeight - 16) }]}
          value={text}
          onChangeText={handleTextChange}
          onContentSizeChange={handleContentSizeChange}
          onKeyPress={handleRetryKeyPress}
          placeholder={isReplying ? "Write a reply..." : "Type a message..."}
          placeholderTextColor="#999"
          multiline
          maxLength={1000}
          editable={!sending}
          returnKeyType={Platform.OS === 'ios' ? 'send' : 'default'}
          blurOnSubmit={false}
          onSubmitEditing={Platform.OS === 'ios' ? handleSend : undefined}
          textAlignVertical="top"
          scrollEnabled={inputHeight >= 100}
          accessibilityLabel={isReplying ? "Reply message input" : "Message input"}
          accessibilityHint="Type your message here"
        />
        
        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            isDisabled && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={isDisabled}
          activeOpacity={0.7}
          accessibilityLabel="Send message"
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
        >
          {/* Fallback for missing icon mapping */}
          <View style={[
            styles.sendIcon, 
            { backgroundColor: isDisabled ? '#ccc' : '#007AFF' }
          ]}>
            <Text style={styles.sendIconText}>→</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Character Count (when approaching limit) */}
      {text.length > 800 && (
        <Text style={styles.charCount} accessibilityLabel={`${text.length} of 1000 characters`}>
          {text.length}/1000
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  replyContainer: {
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  replyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  replyLine: {
    width: 3,
    height: 36,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginRight: 12,
  },
  replyTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    lineHeight: 18,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingRight: 8,
    color: '#333',
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  // Fallback send icon (until IconSymbol mapping is fixed)
  sendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIconText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 2, // Slight adjustment for visual centering
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#999',
    marginHorizontal: 16,
    marginBottom: 4,
  },
});

export default MessageInput;