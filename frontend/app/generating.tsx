import React from 'react';
import { View, Text, StyleSheet, Animated, Easing, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';

export default function GeneratingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [progress, setProgress] = React.useState(0);

  // Rotations for orbiting containers
  const rotateA = React.useRef(new Animated.Value(0)).current;
  const rotateB = React.useRef(new Animated.Value(0)).current;
  const rotateC = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const a = Animated.loop(
      Animated.timing(rotateA, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    );
    const b = Animated.loop(
      Animated.timing(rotateB, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: true })
    );
    const c = Animated.loop(
      Animated.timing(rotateC, { toValue: 1, duration: 8400, easing: Easing.linear, useNativeDriver: true })
    );
    a.start(); b.start(); c.start();
    return () => { a.stop(); b.stop(); c.stop(); };
  }, [rotateA, rotateB, rotateC]);

  React.useEffect(() => {
    // Simulate preparation time (2.5s) and animate progress.
    // IMPORTANT: run once on mount — don't depend on `params` identity which may change per render
    // and cause this effect to restart repeatedly (which can freeze progress at a low value).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const start = Date.now();
    const DURATION = 2500;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.floor((elapsed / DURATION) * 100));
      setProgress(p);
      if (elapsed >= DURATION) {
        clearInterval(id);
        // small delay to let final animation finish
        setTimeout(() => router.replace({ pathname: '/tracking', params: { ...params } as any }), 200);
      }
    }, 80);
    return () => clearInterval(id);
    // Intentionally running once on mount to avoid interval restart when params/router change
  }, []);

  const rA = rotateA.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const rB = rotateB.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
  const rC = rotateC.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.root}>
      <CreativeBackground rA={rA} rB={rB} rC={rC} progress={progress} />

      <View style={styles.card}>
        <View style={styles.centerRow}>
          <Animated.View style={[styles.ring, { transform: [{ rotate: rC }] }]} />
          <Animated.View style={[styles.ringThin, { transform: [{ rotate: rB }] }]} />
          <Animated.View style={[styles.ringFaint, { transform: [{ rotate: rA }] }]} />

          {/* Orbit containers - each has a dot at top so rotation creates orbit */}
          <Animated.View style={[styles.orbitContainer, { transform: [{ rotate: rA }] }]}>
            <View style={styles.orbitDot} />
          </Animated.View>
          <Animated.View style={[styles.orbitContainerLarge, { transform: [{ rotate: rB }] }]}>
            <View style={[styles.orbitDot, styles.orbitDotSmall]} />
          </Animated.View>
          <Animated.View style={[styles.orbitContainerXL, { transform: [{ rotate: rC }] }]}>
            <View style={[styles.orbitDot, styles.orbitDotTiny]} />
          </Animated.View>

          <View style={styles.iconWrap} pointerEvents="none">
            <Ionicons name="construct" size={36} color={Colors.light.background} />
          </View>
        </View>

        <Text style={styles.title}>Generating your order…</Text>
        <Text style={styles.subtitle}>Preparing everything — this should only take a moment.</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack} />
          <View style={[styles.progressTrackFill, { width: `${progress}%` }]} />
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
  root: { flex: 1, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center', padding: 16 },
  card: { width: '92%', backgroundColor: Colors.light.background, borderRadius: 18, borderWidth: 1, borderColor: Colors.light.cardBorder, padding: 22, alignItems: 'center', overflow: 'hidden' },
  centerRow: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { position: 'absolute', width: 84, height: 84, borderRadius: 999, backgroundColor: Colors.light.tint, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.light.tint, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  title: { marginTop: 18, fontSize: 18, fontWeight: '800', color: Colors.light.text, textAlign: 'center' },
  subtitle: { marginTop: 6, fontSize: 13, color: Colors.light.muted, textAlign: 'center' },
  progressRow: { marginTop: 16, width: '100%', height: 10, borderRadius: 999, backgroundColor: Colors.light.subtleBg, overflow: 'hidden' },
  progressTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.light.subtleBg },
  progressTrackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: Colors.light.tint, borderRadius: 999 },
  percent: { marginTop: 8, color: Colors.light.muted },
  skip: { position: 'absolute', right: 16, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  skipText: { color: Colors.light.text, fontWeight: '700' },

  // Rings & orbit
  ring: { position: 'absolute', width: 220, height: 220, borderRadius: 999, borderWidth: 8, borderColor: 'rgba(185,28,28,0.06)' },
  ringThin: { position: 'absolute', width: 190, height: 190, borderRadius: 999, borderWidth: 4, borderColor: 'rgba(185,28,28,0.08)' },
  ringFaint: { position: 'absolute', width: 150, height: 150, borderRadius: 999, borderWidth: 2, borderColor: 'rgba(185,28,28,0.04)' },
  orbitContainer: { position: 'absolute', width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  orbitContainerLarge: { position: 'absolute', width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
  orbitContainerXL: { position: 'absolute', width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  orbitDot: { position: 'absolute', top: 12, width: 14, height: 14, borderRadius: 999, backgroundColor: Colors.light.tint, shadowColor: Colors.light.tint, shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 },
  orbitDotSmall: { width: 10, height: 10, top: 8, backgroundColor: 'rgba(185,28,28,0.9)' },
  orbitDotTiny: { width: 8, height: 8, top: 6, backgroundColor: 'rgba(185,28,28,0.8)' },
});

function CreativeBackground({ rA, rB, rC, progress }: { rA: any; rB: any; rC: any; progress: number }) {
  // subtle moving gradient + pulsing background highlight tied to progress
  const pulse = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={["rgba(255,245,245,0.9)", "rgba(255,250,250,0.95)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

      {/* subtle progress halo */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: glow }]} />
    </View>
  );
}
