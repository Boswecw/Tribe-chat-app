// src/components/__tests__/reply-flow.test.jsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MessageInput from '../../components/MessageInput';

// Mock useReply as a jest.fn default export
jest.mock('../../hooks/useReply', () => ({
  __esModule: true,
  default: jest.fn(),
}));
import useReply from '../../hooks/useReply';

// Mock message store (Zustand) with in-scope mock var
const mockAddMessage = jest.fn();
jest.mock('../../state/messageStore', () => () => ({ addMessage: mockAddMessage }));

// Mock API
jest.mock('../../api/messages', () => ({ sendMessage: jest.fn() }));
import { sendMessage } from '../../api/messages';

describe('reply flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends reply payload and adds returned message', async () => {
    const replyTo = {
      uuid: 'orig',
      text: 'Original',
      participant: { name: 'Alice' },
    };

    // Make the reply hook say we are replying
    useReply.mockReturnValue({
      replyTo,
      isReplying: true,
      cancelReply: jest.fn(),
    });

    // Mock API response for the new message
    const newMessage = {
      uuid: 'new-msg',
      text: 'Hi there',
      replyToMessage: replyTo,
      participant: { name: 'Bob' },
      createdAt: Date.now(),
    };
    sendMessage.mockResolvedValue(newMessage);

    const { getByPlaceholderText, getByRole, getByA11yRole, getByText } = render(<MessageInput />);

    // Match actual placeholder from the rendered tree: "Write a reply…"
    const input = getByPlaceholderText(/write a reply/i);
    fireEvent.changeText(input, 'Hi there');

    // Find and press the Send button
    let sendBtn;
    try {
      sendBtn = getByRole('button');
    } catch {
      try {
        sendBtn = getByA11yRole('button');
      } catch {
        sendBtn = getByText(/send/i);
      }
    }
    fireEvent.press(sendBtn);

    await waitFor(() => {
      // sent with reply id
      expect(sendMessage).toHaveBeenCalledWith({
        text: 'Hi there',
        replyToMessage: 'orig',
      });

      // store received the returned message
      expect(mockAddMessage).toHaveBeenCalledWith(newMessage);
    });
  });
});
