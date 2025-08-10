// Enhanced theme system with dark mode support
// src/constants/theme.js
import { useColorScheme } from 'react-native';

const lightTheme = {
  colors: {
    primary: '#007AFF',
    primaryLight: '#4A9EFF',
    primaryDark: '#0056CC',
    secondary: '#8E8E93',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceSecondary: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    textMuted: '#C7C7CC',
    border: '#C6C6C8',
    borderLight: '#E5E5EA',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#007AFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  borderRadius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },
  typography: {
    sizes: {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
      title: 24,
    },
    weights: {
      regular: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    primary: '#0A84FF',
    primaryLight: '#409CFF',
    primaryDark: '#0056CC',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceSecondary: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    textMuted: '#48484A',
    border: '#38383A',
    borderLight: '#48484A',
  },
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  return colorScheme === 'dark' ? darkTheme : lightTheme;
};