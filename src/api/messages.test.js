// src/api/messages.test.js
import { sendMessage } from './messages';
import axios from 'axios';

jest.mock('axios', () => {
  const post = jest.fn();
  return {
    create: jest.fn(() => ({ post })),
    post,
  };
});

describe('sendMessage', () => {
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

  beforeEach(() => {
    axios.create().post.mockResolvedValue(mockResponse);
  });

  it('accepts objects with text and replyToMessage', async () => {
    const payload = { text: 'Hi there', replyToMessage: 'orig' };
    const result = await sendMessage(payload);

    expect(axios.create().post).toHaveBeenCalledWith('/messages/new', payload);
    expect(result.replyToMessage.uuid).toBe('orig');
    expect(result.replyToMessage.text).toBe('Original');
  });
});

