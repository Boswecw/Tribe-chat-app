// src/api/messages.test.js
import axios from 'axios';
jest.mock('axios');

describe('messages api', () => {
  let mockClient;
  let api;

  const loadModule = () => {
    jest.resetModules();
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      interceptors: { response: { use: jest.fn() } },
    };
    axios.create.mockReturnValue(mockClient);
    api = require('./messages');
  };

  beforeEach(() => {
    loadModule();
  });

  test('sendMessage posts plain text', async () => {
    mockClient.post.mockResolvedValue({ data: { uuid: '1', text: 'hi' } });
    const res = await api.sendMessage('hi');
    expect(mockClient.post).toHaveBeenCalledWith('/messages/new', { text: 'hi' });
    expect(res).toEqual({ uuid: '1', text: 'hi' });
  });

  test('sendMessage accepts object payload and forwards it as-is', async () => {
    const payload = { text: 'Hi there', replyToMessage: 'orig' };
    const mockResponse = {
      data: {
        uuid: 'new-msg',
        text: 'Hi there',
        replyToMessage: {
          uuid: 'orig',
          text: 'Original',
          participant: { name: 'Alice' },
        },
        participant: { name: 'Bob' },
        createdAt: Date.now(),
      },
    };
    mockClient.post.mockResolvedValue(mockResponse);

    const res = await api.sendMessage(payload);

    expect(mockClient.post).toHaveBeenCalledWith('/messages/new', payload);
    expect(res.replyToMessage.uuid).toBe('orig');
    expect(res.replyToMessage.text).toBe('Original');
  });

  test('sendMessage supports reply metadata even if API omits it', async () => {
    mockClient.post.mockResolvedValue({ data: { uuid: '2', text: 'yo' } });
    const res = await api.sendMessage({ text: 'yo', replyToMessage: 'orig' });
    expect(mockClient.post).toHaveBeenCalledWith('/messages/new', { text: 'yo', replyToMessage: 'orig' });
    expect(res.replyToMessage).toEqual({ uuid: 'orig' });
  });

  test('addReaction posts to endpoint', async () => {
    mockClient.post.mockResolvedValue({ data: { success: true } });
    const res = await api.addReaction('m1', '👍');
    expect(mockClient.post).toHaveBeenCalledWith('/messages/m1/reactions', { emoji: '👍' });
    expect(res).toEqual({ success: true });
  });

  test('addReaction returns mock response when endpoint missing', async () => {
    mockClient.post.mockRejectedValue({ response: { status: 404 } });
    const res = await api.addReaction('m1', '😂');
    expect(res.mock).toBe(true);
  });

  test('sendMessage retries and fails on server error', async () => {
    jest.useFakeTimers();
    mockClient.post.mockRejectedValue({ response: { status: 500 } });

    const promise = api.sendMessage('fail');
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }

    await expect(promise).rejects.toThrow('Failed to send message');
    expect(mockClient.post).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });
});
