/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

// Red palette
const tintColorLight = '#b91c1c'; // warm red for light theme accents
const tintColorDark = '#ffdddd'; // light rosy tint for dark theme accents

export const Colors = {
  light: {
    text: '#11181C',
    background: '#ffffff',
    tint: tintColorLight,
    // additional named shades to make theme usage consistent across the app
    primaryDark: '#7f1414',
    danger: '#E11D48',
  // keep all accents in red/white palette; reuse tint for success to match requested theme
  success: tintColorLight,
    // chart color (green) used for charts when user wants green charts
    chart: '#10B981',
    muted: '#64748B',
    subtleBg: '#F8FAFC',
    cardBorder: '#E6EDF0',
    icon: '#6B6B6B',
    tabIconDefault: '#6B6B6B',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F5EAEA',
    background: '#0f0b0b',
    tint: tintColorDark,
    primaryDark: '#7f1414',
    danger: '#E11D48',
  success: tintColorDark,
    // chart color for dark theme
    chart: '#34D399',
    muted: '#BFA7A7',
    subtleBg: '#050505',
    cardBorder: '#2a2323',
    icon: '#BFA7A7',
    tabIconDefault: '#BFA7A7',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
