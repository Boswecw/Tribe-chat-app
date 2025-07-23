// app/(tabs)/chat.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import ChatScreen from '../../src/screens/ChatScreen';

export default function ChatTab() {
  return (
    <>
      <StatusBar style="auto" />
      <ChatScreen />
    </>
  );
}