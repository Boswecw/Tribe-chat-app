// src/api/messages.js
import axios from 'axios';

const BASE = 'https://dummy-chat-server.tribechat.com/api';

export const fetchLatestMessages = async () => {
  try {
    const res = await axios.get(`${BASE}/messages/latest`);
    return res.data;
  } catch (err) {
    console.error('❌ Failed to fetch latest messages:', err);
    // Return empty array as fallback instead of throwing
    return [];
  }
};

export const fetchUpdatedMessages = async (since) => {
  try {
    const res = await axios.get(`${BASE}/messages/updates/${since}`);
    return res.data; // Array of updated TMessage
  } catch (err) {
    console.error('❌ Failed to fetch updated messages:', err);
    // Return empty array as fallback
    return [];
  }
};

export const sendMessage = async (text) => {
  try {
    const res = await axios.post(`${BASE}/messages/new`, { text });
    return res.data;
  } catch (err) {
    console.error('❌ Failed to send message:', err);
    throw err; // Re-throw for UI handling
  }
};