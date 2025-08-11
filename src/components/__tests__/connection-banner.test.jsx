import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ConnectionBanner from '../ConnectionBanner';

describe('ConnectionBanner', () => {
  it('does not render when connected', () => {
    const { queryByText } = render(
      <ConnectionBanner status="connected" onRetry={jest.fn()} />
    );
    expect(queryByText(/Connection lost/)).toBeNull();
  });

  it('renders message and handles retry when disconnected', () => {
    const onRetry = jest.fn();
    const { getByText } = render(
      <ConnectionBanner status="disconnected" onRetry={onRetry} />
    );
    fireEvent.press(getByText('Pull down to refresh'));
    expect(onRetry).toHaveBeenCalled();
  });
});
