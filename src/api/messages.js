
import axios from 'axios';

const BASE = 'https://dummy-chat-server.tribechat.com/api';

// ✅ STANDARDIZED ERROR HANDLING:
export const fetchLatestMessages = async () => {
  try {
    const res = await axios.get(`${BASE}/messages/latest`);
    return res.data;
  } catch (err) {
    console.error('❌ Failed to fetch latest messages:', err);
    // Throw error instead of returning empty array for consistency
    throw new Error(`Failed to fetch messages: ${err.message}`);
  }
};

export const fetchUpdatedMessages = async (since) => {
  try {
    const res = await axios.get(`${BASE}/messages/updates/${since}`);
    return res.data;
  } catch (err) {
    console.error('❌ Failed to fetch updated messages:', err);
    // Return empty array for non-critical updates
    return [];
  }
};

export const sendMessage = async (text) => {
  try {
    const res = await axios.post(`${BASE}/messages/new`, { text });
    return res.data;
  } catch (err) {
    console.error('❌ Failed to send message:', err);
    throw new Error(`Failed to send message: ${err.message}`);
  }
};