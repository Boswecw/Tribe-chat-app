// src/components/InputBar.jsx
import { useState } from 'react';
import {
  Button,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { sendMessage } from '../api/messages';
import useReply from '../hooks/useReply';
import useMessageStore from '../state/messageStore';

const InputBar = () => {
  const [text, setText] = useState('');
  const { addMessage } = useMessageStore();
  const { replyTo, isReplying, cancelReply } = useReply();

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    try {
      const payload = {
        text: trimmed,
        ...(isReplying && replyTo ? { replyToMessage: replyTo.uuid } : {}),
      };

      // ✅ send full payload so replies reach the API
      const newMessage = await sendMessage(payload);

      // Normalize locally if the server didn’t echo reply metadata
      if (payload.replyToMessage && !newMessage.replyToMessage) {
        newMessage.replyToMessage = replyTo; // attach full object for immediate UI
      }

      addMessage(newMessage);
      setText('');
      cancelReply();
    } catch (err) {
      console.error('❌ Error sending message:', err.message);
    }
  };

  return (
    <View style={styles.wrapper}>
      {isReplying && replyTo && (
        <View style={styles.replyPreview}>
          <Text style={styles.replyLabel}>
            Replying to: {replyTo.participant?.name}
          </Text>
          <Text style={styles.replyText} numberOfLines={1}>
            {replyTo.text}
          </Text>
          <TouchableOpacity onPress={cancelReply} accessibilityRole="button" accessibilityLabel="Cancel reply">
            <Text style={styles.cancel}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={isReplying ? 'Write a reply…' : 'Type a message…'}
          value={text}
          onChangeText={setText}
          multiline
          accessibilityLabel="Message input"
        />
        <Button title="Send" onPress={handleSend} accessibilityLabel="Send message" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    padding: 10,
    borderTopWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  replyPreview: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 6,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyLabel: {
    fontWeight: '600',
    marginRight: 6,
  },
  replyText: {
    flex: 1,
    color: '#555',
  },
  cancel: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#888',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#fff',
  },
});

export default InputBar;
