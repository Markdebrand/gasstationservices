import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  showBack?: boolean;
  onBack?: () => void;
  showNotifications?: boolean;
};

export default function Header({ showBack, onBack, showNotifications = true }: Props) {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    try {
      router.back();
    } catch (e) {
      // fallback: go to root
      router.push('/');
    }
  };

  return (
    <View style={[styles.container, { paddingTop }]}> 
      <View style={styles.headerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {showBack ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <Ionicons name="chevron-back" size={20} color="#7F1D1D" />
            </Pressable>
          ) : (
            <View style={styles.brandBadge}>
              <Ionicons name="water" size={20} color="#7F1D1D" />
            </View>
          )}
          <View>
            <Text style={styles.headerOverline}>HSO FUEL DELIVERY</Text>
            <Text style={styles.headerTitle}>Your fuel, delivered</Text>
          </View>
        </View>
        {showNotifications ? (
          <View style={{ position: 'relative' }}>
            <LinearGradient
              colors={["#b91c1c", "#7f1414"]}
              start={[0, 0]}
              end={[1, 1]}
              style={styles.gradientContainer}
            >
              <Pressable onPress={() => router.push('/notifications')} style={styles.bellInner} hitSlop={10}>
                <Ionicons name="notifications" size={22} color="#ffffff" />
              </Pressable>
            </LinearGradient>
            <View style={[styles.bellDot, { backgroundColor: '#b91c1c' }]} />
          </View>
        ) : (
          <View style={{ width: 46, height: 46 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent' },
  headerCard: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandBadge: { height: 40, width: 40, borderRadius: 10, backgroundColor: 'rgba(255,200,200,0.14)', alignItems: 'center', justifyContent: 'center' },
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
  backButton: { height: 36, width: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,200,200,0.08)', marginRight: 6 },
  bellDot: { position: 'absolute', top: -6, right: -6, width: 10, height: 10, backgroundColor: '#b91c1c', borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
});
