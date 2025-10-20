import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import 'react-native-reanimated';
import { useEffect } from 'react';
import { Platform, StatusBar, View } from 'react-native';
// optional: library to set Android navigation bar color
let setNavigationBarColor: ((color: string) => Promise<void>) | null = null;
try {
  // lazy require so it doesn't break web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const navColor = require('react-native-navigation-bar-color');
  if (navColor && typeof navColor.default === 'function') {
    setNavigationBarColor = (color: string) => navColor.default(color, false);
  } else if (navColor && typeof navColor === 'function') {
    setNavigationBarColor = (color: string) => Promise.resolve(navColor(color, false));
  }
} catch (e) {
  // ignore if library not available or running in managed environment
  setNavigationBarColor = null;
}

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  // helper: convert #RRGGBB or #RGB to rgba string with alpha
  const hexToRgba = (hex: string, alpha = 1) => {
    if (!hex) return `rgba(0,0,0,${alpha})`;
    const h = hex.replace('#', '');
    let r = 0;
    let g = 0;
    let b = 0;
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16);
      g = parseInt(h[1] + h[1], 16);
      b = parseInt(h[2] + h[2], 16);
    } else if (h.length === 6) {
      r = parseInt(h.substring(0, 2), 16);
      g = parseInt(h.substring(2, 4), 16);
      b = parseInt(h.substring(4, 6), 16);
    }
    return `rgba(${r},${g},${b},${alpha})`;
  };

  // determine theme color values once per render
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  // In light mode prefer the app's common light toolbar/page background so the status bar matches
  // (many screens use '#F8FAFC' instead of pure white). In dark mode use card for contrast.
  const LIGHT_TOOLBAR_BG = '#F8FAFC';
  const baseColor = colorScheme === 'dark'
    ? (theme.colors?.card ?? theme.colors?.background)
    : (LIGHT_TOOLBAR_BG ?? theme.colors?.background ?? theme.colors?.card);
  const cardColor = baseColor ?? '#6B7280';
  // choose a lighter (more transparent) overlay depending on theme:
  // - light theme: much more transparent for a clearer look
  // - dark theme: slightly less transparent to keep contrast
  const overlayAlpha = colorScheme === 'dark' ? 0.45 : 0.2;
  const overlayColor = hexToRgba(cardColor, overlayAlpha);

  useEffect(() => {
    // set native status bar background color on Android (may be no-op in Expo Go)
    if (Platform.OS === 'android') {
      try {
        StatusBar.setBackgroundColor(overlayColor, true);
        // set bar style based on theme
        StatusBar.setBarStyle(colorScheme === 'dark' ? 'light-content' : 'dark-content', true);
      } catch {}
      // try set nav bar color (guarded) - use the base color (non-transparent) so native nav bar is solid
      if (setNavigationBarColor) {
        try {
          const p = setNavigationBarColor(cardColor);
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (e) {
          // ignore; we'll render a JS-safe fallback below
        }
      }
    }
    // on iOS we rely on Expo StatusBar with appropriate style; background handled by overlays below
  }, [overlayColor, cardColor, colorScheme]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
  {/* StatusBar uses theme-aware style */}
  <ExpoStatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} backgroundColor={overlayColor} />
  {/* Absolute top/bottom overlays to ensure the status/navigation areas show the current theme color (slightly transparent) */}
  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top || 20, backgroundColor: overlayColor }} />
  <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: insets.bottom || 0, backgroundColor: overlayColor }} />
      <Toast />
    </ThemeProvider>
  );
}
