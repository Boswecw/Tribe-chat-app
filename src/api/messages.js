// src/api/messages.js
import axios from 'axios';

const BASE = 'https://dummy-chat-server.tribechat.com/api';

export const fetchLatestMessages = async () => {
  const res = await axios.get(`${BASE}/messages/latest`);
  return res.data;
};

export const sendMessage = async (text) => {
  const res = await axios.post(`${BASE}/messages/new`, { text });
  return res.data;
};
