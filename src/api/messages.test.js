import axios from 'axios';
jest.mock('axios');

describe('messages api', () => {
  let mockClient;
  let messages;

  const loadModule = () => {
    jest.resetModules();
    mockClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      interceptors: { response: { use: jest.fn() } },
    };
    axios.create.mockReturnValue(mockClient);
    messages = require('./messages');
  };

  beforeEach(() => {
    loadModule();
  });

  test('sendMessage posts plain text', async () => {
    mockClient.post.mockResolvedValue({ data: { uuid: '1', text: 'hi' } });
    const res = await messages.sendMessage('hi');
    expect(mockClient.post).toHaveBeenCalledWith('/messages/new', { text: 'hi' });
    expect(res).toEqual({ uuid: '1', text: 'hi' });
  });

  test('sendMessage supports reply metadata', async () => {
    mockClient.post.mockResolvedValue({ data: { uuid: '2', text: 'yo' } });
    const res = await messages.sendMessage({ text: 'yo', replyToMessage: 'orig' });
    expect(mockClient.post).toHaveBeenCalledWith('/messages/new', { text: 'yo', replyToMessage: 'orig' });
    expect(res.replyToMessage).toEqual({ uuid: 'orig' });
  });

  test('addReaction posts to endpoint', async () => {
    mockClient.post.mockResolvedValue({ data: { success: true } });
    const res = await messages.addReaction('m1', '👍');
    expect(mockClient.post).toHaveBeenCalledWith('/messages/m1/reactions', { emoji: '👍' });
    expect(res).toEqual({ success: true });
  });

  test('sendReaction returns mock response when endpoint missing', async () => {
    mockClient.post.mockRejectedValue({ response: { status: 404 } });
    const res = await messages.addReaction('m1', '😂');
    expect(res.mock).toBe(true);
  });

  test('sendMessage retries and fails on server error', async () => {
    jest.useFakeTimers();
    mockClient.post.mockRejectedValue({ response: { status: 500 } });
    const promise = messages.sendMessage('fail');
    for (let i = 0; i < 3; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }
    await expect(promise).rejects.toThrow('Failed to send message');
    expect(mockClient.post).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });
});
