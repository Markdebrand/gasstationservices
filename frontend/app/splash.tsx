import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Splash() {
  const router = useRouter();

  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.84)).current;

  useEffect(() => {
    // Logo and title pop-in
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('auth:token');
        router.replace(token ? '/(tabs)' : '/(auth)/login');
      } catch {
        router.replace('/(auth)/login');
      }
    }, 1400);

    return () => {
      clearTimeout(timer);
    };
  }, [fade, scale, router]);

  const logoSource = require('../assets/images/LogoAPP.webp');

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.center, { opacity: fade, transform: [{ scale }] }]}>
        <Image source={logoSource} resizeMode="contain" style={styles.logo} />
        <Text style={styles.title}>HSO Fuel Delivery</Text>
        <Text style={styles.subtitle}>Tu combustible, a domicilio</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc', // slate-50
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    height: 104,
    width: 104,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  
});
