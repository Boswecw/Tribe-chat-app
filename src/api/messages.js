// src/api/messages.js
import axios from "axios";

const BASE_URL = "https://dummy-chat-server.tribechat.com/api";
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Single axios client (consistent headers/interceptors)
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Log + surface useful error data
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      message: error.message,
    });
    return Promise.reject(error);
  },
);

// Retry wrapper for transient 5xx
const withRetry = async (fn, retries = MAX_RETRIES) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0 && error.response?.status >= 500) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY));
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
};

// ===== Message fetchers =====
export const fetchLatestMessages = async () => {
  try {
    const res = await withRetry(() => apiClient.get("/messages/latest"));
    return res.data;
  } catch (err) {
    console.error("❌ Failed to fetch latest messages:", err);
    throw new Error(`Failed to fetch messages: ${err.message}`);
  }
};

export const fetchAllMessages = () =>
  withRetry(async () => (await apiClient.get("/messages/all")).data);

export const fetchOlderMessages = (refMessageUuid) =>
  withRetry(
    async () => (await apiClient.get(`/messages/older/${refMessageUuid}`)).data,
  );

export const fetchUpdatedMessages = async (since) => {
  try {
    const res = await withRetry(() =>
      apiClient.get(`/messages/updates/${since}`),
    );
    return res.data;
  } catch (err) {
    console.error("❌ Failed to fetch updated messages:", err);
    return [];
  }
};

// ===== Send message (supports replies) =====
/**
 * Send a new message.
 * Back-compat:
 *  - sendMessage("hello")
 *  - sendMessage({ text: "hello", replyToMessage: "<uuid>" })
 * @param {string|{text:string, replyToMessage?:string}} arg
 * @returns {Promise<Object>} message
 */
export const sendMessage = async (arg) => {
  const payload = typeof arg === "string" ? { text: arg } : (arg ?? {});
  payload.text = (payload.text || "").trim();

  if (!payload.text) throw new Error("Message text is required");

  try {
    const res = await withRetry(() => apiClient.post("/messages/new", payload));
    const message = res.data;

    // Normalize: ensure reply metadata exists if we provided it
    if (payload.replyToMessage && !message.replyToMessage) {
      message.replyToMessage = { uuid: payload.replyToMessage };
    }

    return message;
  } catch (err) {
    console.error("❌ Failed to send message:", err);
    throw new Error(`Failed to send message: ${err.message}`);
  }
};

// ===== Reactions (includes graceful mock) =====
export const sendReaction = async (messageId, emoji, isAdding = true) => {
  if (!messageId || !emoji)
    throw new Error("Message ID and emoji are required");

  try {
    return withRetry(async () => {
      if (isAdding) {
        const response = await apiClient.post(
          `/messages/${messageId}/reactions`,
          { emoji },
        );
        return response.data;
      }
      const response = await apiClient.delete(
        `/messages/${messageId}/reactions`,
        { data: { emoji } },
      );
      return response.data;
    });
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 405) {
      console.warn(
        "⚠️ Reaction endpoints not implemented. Using mock response.",
      );
      return {
        success: true,
        messageId,
        emoji,
        action: isAdding ? "added" : "removed",
        timestamp: Date.now(),
        mock: true,
        message: {
          uuid: messageId,
          reactions: [
            {
              emoji,
              count: isAdding ? 1 : 0,
              participants: isAdding ? ["you"] : [],
            },
          ],
        },
      };
    }
    console.error("❌ Failed to send reaction:", error);
    throw new Error(`Failed to send reaction: ${error.message}`);
  }
};

export const addReaction = (messageId, emoji) =>
  sendReaction(messageId, emoji, true);
export const removeReaction = (messageId, emoji) =>
  sendReaction(messageId, emoji, false);

export const getMessageReactions = async (messageId) => {
  if (!messageId) throw new Error("Message ID is required");
  try {
    const response = await apiClient.get(`/messages/${messageId}/reactions`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.warn(
        "⚠️ Reaction detail endpoint not implemented. Returning empty reactions.",
      );
      return { reactions: [], messageId };
    }
    console.error("❌ Failed to get message reactions:", error);
    throw new Error(`Failed to get reactions: ${error.message}`);
  }
};

// ===== Validation + transforms =====
export const validateMessage = (message) => {
  const required = ["uuid", "text", "createdAt", "participant"];
  const missing = required.filter((f) => !message[f]);
  if (missing.length)
    throw new Error(`Message missing required fields: ${missing.join(", ")}`);
  return true;
};

export const transformMessage = (serverMessage) => {
  try {
    validateMessage(serverMessage);
    return {
      ...serverMessage,
      createdAt: new Date(serverMessage.createdAt).getTime(),
      editedAt: serverMessage.editedAt
        ? new Date(serverMessage.editedAt).getTime()
        : null,
      reactions: serverMessage.reactions || [],
      status: serverMessage.status || "sent",
    };
  } catch (e) {
    console.error("Error transforming message:", e);
    return serverMessage;
  }
};

export const transformMessages = (messages) => {
  if (!Array.isArray(messages)) {
    console.error("Expected array of messages, received:", typeof messages);
    return [];
  }
  return messages.map(transformMessage).filter(Boolean);
};

// ===== Error helpers =====
export const isNetworkError = (error) =>
  !error.response ||
  error.code === "NETWORK_ERROR" ||
  error.code === "ECONNABORTED";

export const isServerError = (error) =>
  error.response && error.response.status >= 500;

export const getErrorMessage = (error) => {
  if (isNetworkError(error))
    return "Network connection failed. Please check your internet connection.";
  if (isServerError(error))
    return "Server temporarily unavailable. Please try again in a moment.";
  if (error.response?.status === 400)
    return (
      error.response.data?.message ||
      "Invalid request. Please check your input."
    );
  if (error.response?.status === 429)
    return "Too many requests. Please wait a moment before trying again.";
  return (
    error.response?.data?.message ||
    error.message ||
    "An unexpected error occurred."
  );
};

// ===== Dev helpers =====
export const mockDelay = (delay = 500) =>
  new Promise((r) => setTimeout(r, delay));
export const isDevelopment = () =>
  __DEV__ || process.env.NODE_ENV === "development";

export default {
  fetchLatestMessages,
  fetchAllMessages,
  fetchOlderMessages,
  fetchUpdatedMessages,
  sendMessage,
  sendReaction,
  addReaction,
  removeReaction,
  getMessageReactions,
  validateMessage,
  transformMessage,
  transformMessages,
  isNetworkError,
  isServerError,
  getErrorMessage,
  mockDelay,
  isDevelopment,
};
