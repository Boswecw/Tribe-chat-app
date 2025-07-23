// Error Boundary for catching component crashes
// src/components/ErrorBoundary.jsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    // Log to crash reporting service
    // crashlytics().recordError(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We're sorry, but something unexpected happened.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#212529',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6c757d',
  },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default ErrorBoundary;

// Enhanced message store with better error handling and optimistic updates
// src/state/messageStore.js
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';

const useMessageStore = create(
  persist(
    (set, get) => ({
      messages: [],
      optimisticMessages: new Map(), // Track optimistic updates
      
      setMessages: (msgs) => set({ messages: msgs }),
      
      addMessage: (msg) => {
        const newMessage = {
          ...msg,
          uuid: msg.uuid || `temp-${Date.now()}`,
          status: msg.status || 'sending',
          createdAt: msg.createdAt || Date.now(),
        };
        
        set({ 
          messages: [newMessage, ...get().messages],
        });
        
        return newMessage;
      },
      
      updateMessage: (updatedMsg) => {
        set({
          messages: get().messages.map(m =>
            m.uuid === updatedMsg.uuid ? { ...m, ...updatedMsg } : m
          ),
        });
      },
      
      removeMessage: (messageId) => {
        set({
          messages: get().messages.filter(m => m.uuid !== messageId),
        });
      },
      
      // Optimistic reaction update
      addReactionOptimistic: (messageId, emoji, userId = 'you') => {
        const { messages, optimisticMessages } = get();
        const message = messages.find(m => m.uuid === messageId);
        
        if (!message) return null;
        
        const optimisticKey = `${messageId}-${emoji}`;
        const existingOptimistic = optimisticMessages.get(optimisticKey);
        
        if (existingOptimistic) {
          // Already have optimistic update for this reaction
          return null;
        }
        
        const existingReactions = message.reactions || [];
        const existingReaction = existingReactions.find(r => r.emoji === emoji);
        
        let updatedReactions;
        if (existingReaction) {
          updatedReactions = existingReactions.map(r =>
            r.emoji === emoji 
              ? { ...r, count: r.count + 1, participants: [...(r.participants || []), userId] }
              : r
          );
        } else {
          updatedReactions = [...existingReactions, { 
            emoji, 
            count: 1, 
            participants: [userId]
          }];
        }
        
        const updatedMessage = {
          ...message,
          reactions: updatedReactions
        };
        
        // Store optimistic update
        set({
          optimisticMessages: new Map(optimisticMessages.set(optimisticKey, {
            messageId,
            emoji,
            userId,
            timestamp: Date.now()
          }))
        });
        
        // Update message
        get().updateMessage(updatedMessage);
        
        return optimisticKey;
      },
      
      // Confirm or revert optimistic update
      confirmReaction: (optimisticKey) => {
        const { optimisticMessages } = get();
        if (optimisticMessages.has(optimisticKey)) {
          set({
            optimisticMessages: new Map([...optimisticMessages].filter(([key]) => key !== optimisticKey))
          });
        }
      },
      
      revertReaction: (optimisticKey) => {
        const { optimisticMessages, messages } = get();
        const optimistic = optimisticMessages.get(optimisticKey);
        
        if (!optimistic) return;
        
        const message = messages.find(m => m.uuid === optimistic.messageId);
        if (!message) return;
        
        const updatedReactions = message.reactions.map(r => {
          if (r.emoji === optimistic.emoji) {
            const newCount = r.count - 1;
            const newParticipants = r.participants.filter(p => p !== optimistic.userId);
            
            if (newCount <= 0) {
              return null; // Will be filtered out
            }
            
            return {
              ...r,
              count: newCount,
              participants: newParticipants
            };
          }
          return r;
        }).filter(Boolean);
        
        get().updateMessage({
          ...message,
          reactions: updatedReactions
        });
        
        // Remove optimistic update
        set({
          optimisticMessages: new Map([...optimisticMessages].filter(([key]) => key !== optimisticKey))
        });
      },
      
      // Clear old optimistic updates (cleanup)
      clearStaleOptimisticUpdates: () => {
        const { optimisticMessages } = get();
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        const filtered = new Map(
          [...optimisticMessages].filter(([, value]) => 
            now - value.timestamp < fiveMinutes
          )
        );
        
        set({ optimisticMessages: filtered });
      },
    }),
    {
      name: 'chat-messages',
      getStorage: () => AsyncStorage,
      // Don't persist optimistic messages
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);

export default useMessageStore;

// Enhanced API layer with retry logic and better error handling
// src/api/messages.js
import axios from 'axios';

const BASE_URL = 'https://dummy-chat-server.tribechat.com/api';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  }
);

// Generic retry wrapper
const withRetry = async (fn, retries = MAX_RETRIES) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response?.status >= 500) {
      console.log(`Retrying request. Attempts remaining: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

export const fetchLatestMessages = async () => {
  return withRetry(async () => {
    const response = await apiClient.get('/messages/latest');
    return response.data;
  });
};

export const fetchUpdatedMessages = async (since) => {
  try {
    const response = await apiClient.get(`/messages/updates/${since}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch updated messages:', error);
    return []; // Return empty array for non-critical updates
  }
};

export const sendMessage = async (text) => {
  return withRetry(async () => {
    const response = await apiClient.post('/messages/new', { text });
    return response.data;
  });
};

export const sendReaction = async (messageId, emoji) => {
  return withRetry(async () => {
    const response = await apiClient.post(`/messages/${messageId}/react`, { 
      emoji 
    });
    return response.data;
  });
};

// Enhanced loading states and error handling hook
// src/hooks/useAsyncOperation.js
import { useState, useCallback } from 'react';

export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (asyncFunction, onSuccess, onError) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFunction();
      onSuccess?.(result);
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setError(errorMessage);
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    execute,
    reset,
  };
};