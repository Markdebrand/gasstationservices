import React from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

export default function GeneratingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [progress, setProgress] = React.useState(0);
  const pulse = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  React.useEffect(() => {
    // Simulate short preparation time (2.5s)
    const start = Date.now();
    const DURATION = 2500;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.floor((elapsed / DURATION) * 100));
      setProgress(p);
      if (elapsed >= DURATION) {
        clearInterval(id);
        router.replace({ pathname: '/tracking', params: { ...params } as any });
      }
    }, 100);
    return () => clearInterval(id);
  }, [router, params]);

  return (
    <View style={styles.root}>
      <BackgroundMotion />
      <View style={styles.card}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulse }] }]}>
          <Ionicons name="construct" size={34} color="#b91c1c" />
        </Animated.View>
    <Text style={styles.title}>Generating your order…</Text>
  <Text style={styles.subtitle}>We're preparing the order.</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.percent}>{progress}%</Text>

        <Pressable onPress={() => router.replace({ pathname: '/tracking', params: { ...params } as any })} style={[styles.skip, { bottom: Math.max(16, insets.bottom + 8) }]}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '92%', backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E6EDF0', padding: 18, alignItems: 'center' },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#E8F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFE6ED' },
  title: { marginTop: 14, fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: { marginTop: 6, fontSize: 12, color: '#64748B', textAlign: 'center' },
  progressBar: { marginTop: 16, width: '100%', height: 10, backgroundColor: '#EEF6F3', borderRadius: 999 },
  progressFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 999 },
  percent: { marginTop: 6, color: '#64748B' },
  skip: { position: 'absolute', right: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E6EDF0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: '#0F172A', fontWeight: '700' },
  orb: { position: 'absolute', borderRadius: 9999 },
});

// Background with moving gradient and floating orbs
function BackgroundMotion() {
  const t1 = React.useRef(new Animated.Value(0)).current;
  const t2 = React.useRef(new Animated.Value(0)).current;
  const t3 = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const a1 = Animated.loop(
      Animated.sequence([
        Animated.timing(t1, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t1, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const a2 = Animated.loop(
      Animated.sequence([
        Animated.timing(t2, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t2, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    const a3 = Animated.loop(
      Animated.sequence([
        Animated.timing(t3, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t3, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [t1, t2, t3]);

  const orb1 = {
    transform: [
      { translateY: t1.interpolate({ inputRange: [0, 1], outputRange: [-10, 10] }) },
      { translateX: t1.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) },
    ],
    opacity: 0.8,
  } as const;
  const orb2 = {
    transform: [
      { translateX: t2.interpolate({ inputRange: [0, 1], outputRange: [-12, 12] }) },
      { translateY: t2.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) },
    ],
    opacity: 0.7,
  } as const;
  const orb3 = {
    transform: [
      { translateY: t3.interpolate({ inputRange: [0, 1], outputRange: [12, -12] }) },
      { translateX: t3.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) },
    ],
    opacity: 0.6,
  } as const;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={["#E6F7FB", "#F6FFFC"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.orb, { top: 60, left: -30, width: 220, height: 220, backgroundColor: 'rgba(20,97,123,0.10)' }, orb1]} />
      <Animated.View style={[styles.orb, { bottom: 80, right: -20, width: 180, height: 180, backgroundColor: 'rgba(16,185,129,0.12)' }, orb2]} />
      <Animated.View style={[styles.orb, { top: 200, right: 40, width: 140, height: 140, backgroundColor: 'rgba(14,116,144,0.10)' }, orb3]} />
    </View>
  );
}
