
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { sendMessage } from '../api/messages';
import useMessageStore from '../state/messageStore';

const MessageInput = () => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const addMessage = useMessageStore((s) => s.addMessage);
  const updateMessage = useMessageStore((s) => s.updateMessage);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    
    // Create optimistic message
    const tempMessage = {
      uuid: `temp-${Date.now()}`,
      text: text.trim(),
      status: 'sending',
      createdAt: new Date().toISOString(),
      participant: { name: 'You' } // Placeholder
    };
    
    // Optimistically add message
    addMessage(tempMessage);
    setText('');

    try {
      const newMessage = await sendMessage(text.trim());
      // Replace temp message with real message
      updateMessage({ ...newMessage, status: 'sent' });
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark message as failed
      updateMessage({ 
        ...tempMessage, 
        status: 'failed',
        error: err.message 
      });
      
      // Show user-friendly error
      Alert.alert(
        'Message Failed', 
        'Your message could not be sent. Please check your connection and try again.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          multiline
          maxLength={1000}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!text.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <IconSymbol 
            name="arrow.up.circle.fill" 
            size={32} 
            color={!text.trim() || sending ? '#ccc' : '#007AFF'} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default MessageInput;