// src/components/MessageInput.jsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { sendMessage } from '../api/messages';
import useMessageStore from '../state/messageStore';

const MessageInput = () => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const addMessage = useMessageStore((s) => s.addMessage);

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const newMessage = await sendMessage(text.trim());
      addMessage(newMessage);
      setText('');
    } catch (err) {
      console.error('Failed to send message:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
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