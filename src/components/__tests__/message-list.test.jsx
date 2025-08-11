import React from 'react';
import { render, act } from '@testing-library/react-native';
import MessageList from '../MessageList';

describe('MessageList', () => {
  const baseProps = {
    onReact: jest.fn(),
    onReactionPress: jest.fn(),
    onParticipantPress: jest.fn(),
    refreshing: false,
    onRefresh: jest.fn(),
  };

  it('renders empty state when there are no messages', () => {
    const { getByText } = render(<MessageList messages={[]} {...baseProps} />);
    expect(getByText('Welcome to the chat!')).toBeTruthy();
  });

  it('calls onRefresh when refresh control is triggered', () => {
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <MessageList messages={[]} {...baseProps} onRefresh={onRefresh} />
    );
    act(() => {
      getByTestId('message-list').props.refreshControl.props.onRefresh();
    });
    expect(onRefresh).toHaveBeenCalled();
  });

  it('renders messages', () => {
    const messages = [
      { uuid: '1', text: 'Hello', participant: { uuid: 'u1' }, createdAt: '2023-01-01T00:00:00Z' },
    ];
    const { getByText } = render(
      <MessageList messages={messages} {...baseProps} />
    );
    expect(getByText('Hello')).toBeTruthy();
  });
});
