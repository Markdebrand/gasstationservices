import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop }]}> 
      <View style={styles.headerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.brandBadge}>
            <Ionicons name="water" size={20} color="#14617B" />
          </View>
          <View>
            <Text style={styles.headerOverline}>HSO FUEL DELIVERY</Text>
            <Text style={styles.headerTitle}>Tu combustible, a domicilio</Text>
          </View>
        </View>
        <View style={{ position: 'relative' }}>
          <LinearGradient
            colors={["#3FB0C1", "#14617B"]}
            start={[0, 0]}
            end={[1, 1]}
            style={styles.gradientContainer}
          >
            <Pressable onPress={() => router.push('/notifications')} style={styles.bellInner} hitSlop={10}>
              <Ionicons name="notifications" size={22} color="#ffffff" />
            </Pressable>
          </LinearGradient>
          <View style={styles.bellDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent' },
  headerCard: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandBadge: { height: 40, width: 40, borderRadius: 10, backgroundColor: 'rgba(20,97,123,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerOverline: { fontSize: 13, color: '#64748B', fontWeight: '700', letterSpacing: 0.4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  gradientContainer: {
    height: 46,
    width: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle shadow to lift the button
    shadowColor: '#0f3b47',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
  bellInner: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: { position: 'absolute', top: -6, right: -6, width: 10, height: 10, backgroundColor: '#EF4444', borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
});
