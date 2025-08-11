import React from 'react';
import { render, act } from '@testing-library/react-native';
import useChatRefresh from '../useChatRefresh';

jest.mock('../../api/messages', () => ({
  fetchLatestMessages: jest.fn().mockResolvedValue([{ uuid: '1' }]),
}));

jest.mock('../requestQueue', () => ({
  requestQueue: { add: jest.fn((fn) => fn()) },
}));

describe('useChatRefresh', () => {
  it('fetches messages and updates state', async () => {
    const setMessages = jest.fn();
    const execute = (fn, onSuccess, onError) => fn().then(onSuccess).catch(onError);
    let hook;
    const Test = () => {
      hook = useChatRefresh(setMessages, execute);
      return null;
    };
    render(<Test />);
    await act(async () => {
      await hook.performRefresh();
    });
    expect(setMessages).toHaveBeenCalledWith([{ uuid: '1' }]);
    expect(hook.connectionStatus).toBe('connected');
  });
});
