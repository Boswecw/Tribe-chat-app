// src/components/ConnectionBanner.jsx
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../constants/colors';

const ConnectionBanner = ({ status, onRetry }) => {
  if (status === 'connected') return null;

  return (
    <View style={styles.connectionBanner}>
      <Text style={styles.connectionText}>
        {status === 'disconnected'
          ? '⚠️ Connection lost. Trying to reconnect...'
          : 'Syncing messages...'}
      </Text>
      {status === 'disconnected' && (
        <TouchableOpacity onPress={onRetry} style={styles.retryTextContainer}>
          <Text style={styles.retryText}>Pull down to refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default memo(ConnectionBanner);

const styles = StyleSheet.create({
  connectionBanner: {
    backgroundColor: colors.warning,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectionText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '500',
  },
  retryTextContainer: { marginTop: 4 },
  retryText: { color: colors.background, fontSize: 12, opacity: 0.8 },
});
