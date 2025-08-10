// src/components/__tests__/reply-flow.test.jsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mocks
const addMessage = jest.fn();
jest.mock('../../state/messageStore', () => () => ({ addMessage }));
jest.mock('../../api/messages', () => ({ sendMessage: jest.fn() }));
jest.mock('../../hooks/useReply');

const MessageInput = require('../MessageInput').default;
const MessageBubble = require('../MessageBubble').default;

describe('reply flow', () => {
  it('sends reply payload and renders reply snippet', async () => {
    const replyTo = {
      uuid: 'orig',
      text: 'Original message',
      participant: { name: 'Alice' },
    };

    const newMessage = {
      uuid: 'reply-1',
      text: 'Reply text',
      replyToMessage: replyTo,
      participant: { name: 'Bob' },
      createdAt: Date.now(),
    };

    const { sendMessage } = require('../../api/messages');
    const useReply = require('../../hooks/useReply');

    sendMessage.mockResolvedValue(newMessage);
    useReply.mockReturnValue({ replyTo, isReplying: true, cancelReply: jest.fn() });

    const { getByPlaceholderText, getByText } = render(<MessageInput />);

    fireEvent.changeText(getByPlaceholderText('Write a reply…'), 'Reply text');
    fireEvent.press(getByText('Send'));

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({ text: 'Reply text', replyToMessage: 'orig' })
    );

    expect(addMessage).toHaveBeenCalledWith(newMessage);

    const { getByText: getByTextBubble } = render(
      <MessageBubble message={newMessage} isGrouped={false} />
    );

    expect(getByTextBubble('Replying to Alice')).toBeTruthy();
    expect(getByTextBubble('Original message')).toBeTruthy();
  });
});

