import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Prevenir que el splash se oculte automáticamente
        await SplashScreen.preventAutoHideAsync();
        const token = await AsyncStorage.getItem('auth:token');
        setHasToken(!!token);
      } finally {
        setReady(true);
        // Oculta el splash tan pronto como la app esté lista
        await SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return <View style={{ flex:1, alignItems:'center', justifyContent:'center' }}><ActivityIndicator /></View>;
  const target = (hasToken ? '/(tabs)' : '/(auth)/login') as any;
  return <Redirect href={target} />;
}
