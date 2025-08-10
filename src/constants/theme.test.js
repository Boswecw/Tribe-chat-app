import { renderHook } from '@testing-library/react-native';
import { useTheme, lightTheme, darkTheme } from './theme';
import { useColorScheme as mockUseColorScheme } from 'react-native';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    useColorScheme: jest.fn(),
  };
});

describe('useTheme', () => {
  it('returns light theme when color scheme is light', () => {
    mockUseColorScheme.mockReturnValue('light');
    const { result } = renderHook(() => useTheme());

    expect(result.current.colors).toMatchSnapshot();
    expect(result.current).toEqual(lightTheme);
  });

  it('returns dark theme when color scheme is dark', () => {
    mockUseColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useTheme());

    expect(result.current.colors).toMatchSnapshot();
    expect(result.current).toEqual(darkTheme);
  });
});

