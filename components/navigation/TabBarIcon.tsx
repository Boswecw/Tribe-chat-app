import React, { ComponentProps } from 'react';
import { View, ViewStyle, TextStyle, StyleProp } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

// Extract the name prop type from IconSymbol component
type IconName = ComponentProps<typeof IconSymbol>['name'];

interface TabBarIconProps {
  /**
   * The name of the icon to display
   */
  name: IconName;
  
  /**
   * The color of the icon
   */
  color: string;
  
  /**
   * The size of the icon
   * @default 28
   */
  size?: number;
  
  /**
   * Whether the tab is focused/active
   */
  focused?: boolean;
  
  /**
   * Container style for the icon wrapper
   */
  containerStyle?: StyleProp<ViewStyle>;
  
  /**
   * Style for the icon itself (TextStyle for text-based icons)
   */
  iconStyle?: StyleProp<TextStyle>;
  
  /**
   * Additional style props - separated to avoid type conflicts
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * TabBarIcon component for rendering icons in tab navigation
 * Handles both container and icon styling properly
 */
export function TabBarIcon({
  name,
  color,
  size = 28,
  focused = false,
  containerStyle,
  iconStyle,
  style,
}: TabBarIconProps) {
  return (
    <View style={[styles.container, containerStyle, style]}>
      <IconSymbol
        name={name}
        color={color}
        size={size}
        style={[
          styles.icon,
          focused && styles.focusedIcon,
          iconStyle
        ]}
      />
    </View>
  );
}

// Separate styles for container (ViewStyle) and icon (TextStyle)
const styles = {
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  } as ViewStyle,
  
  icon: {
    // Icon-specific text styles
    textAlign: 'center',
  } as TextStyle,
  
  focusedIcon: {
    // Additional styles for focused state
    fontWeight: '600',
  } as TextStyle,
};

export default TabBarIcon;