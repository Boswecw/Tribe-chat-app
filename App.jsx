import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import ChatScreen from './src/screens/ChatScreen';
import InputBar from './src/components/InputBar';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ChatScreen />
        <InputBar />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // optional, for white background
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
});
