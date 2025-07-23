// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web fallback storage
const webStorage = {
  async getItem(key) {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {
      // Ignore storage errors
    }
  },
  async removeItem(key) {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {
      // Ignore storage errors
    }
  },
};

// Use AsyncStorage on native, fallback on web
export const storage = __DEV__ && typeof window !== 'undefined' 
  ? webStorage 
  : AsyncStorage;

export default storage;