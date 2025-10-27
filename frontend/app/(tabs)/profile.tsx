import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import HsoPointsCard from '../components/HSOPointsCard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { clearToken } from '@/utils/auth';
import { router } from 'expo-router';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const coupons = [
    { title: '10% OFF on Premium', code: 'HSO10' },
    { title: '2x points this week', code: 'DOUBLE' },
  ];

  const options = ['HSO Points', 'Payment methods', 'Order history', 'My vehicles', 'Add vehicle', 'Support', 'Sign out'];

  const handleOptionPress = async (option: string) => {
    if (option === 'Sign out') {
      await clearToken();
      router.replace('/(auth)/login' as any);
    } else {
      if (option === 'Payment methods') {
        router.push('/payment_methods');
        return;
      }
      if (option === 'HSO Points') {
        router.push('/hso_points');
        return;
      }
      if (option === 'My vehicles') {
        router.push('/vehicles/components/vehicle_list');
        return;
      }
      if (option === 'Add vehicle') {
        router.push('/vehicles/components/vehicle_add');
        return;
      }
      if (option === 'Order history' || option === 'Historial de pedidos') {
        router.push('/order_history');
        return;
      }
      if (option === 'Support') {
        router.push('/support');
        return;
      }
      Alert.alert(option);
    }
  };
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + 24, 80) }]}
      showsVerticalScrollIndicator={false}
    >
      <Header />
        <View style={styles.sectionCard}>
          <View style={styles.rowCenter}>
            <View style={styles.avatar}><Ionicons name="person" size={28} color={Colors.light.tint} /></View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.name}>User name</Text>
              <Text style={styles.subtitle}>User • @username</Text>
            </View>
          </View>
        </View>

        <HsoPointsCard compact />

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Rewards and coupons</Text>
          {coupons.map(c => (
            <View key={c.code} style={styles.couponRow}>
              <View style={styles.couponInfo}>
                <View style={styles.couponIcon}><Ionicons name="gift" size={16} color="#374151" /></View>
                <View>
                  <Text style={styles.couponTitle}>{c.title}</Text>
                  <Text style={styles.couponCode}>Code: {c.code}</Text>
                </View>
              </View>
              <Pressable style={styles.redeemButton} onPress={() => {}}>
                <Text style={styles.redeemText}>Redeem</Text>
              </Pressable>
            </View>
          ))}
          <Pressable style={{ marginTop: 8 }} onPress={() => router.push('/points')}>
            <Text style={{ color: Colors.light.tint, fontWeight: '700' }}>See more points and promotions</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          {options.map((o) => (
            <Pressable key={o} style={styles.optionRow} onPress={() => handleOptionPress(o)}>
              <Text style={styles.optionText}>{o}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.editButton} onPress={() => {}}>
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>
        {/* spacer so the last button isn't covered by the bottom tab bar */}
        <View style={{ height: Math.max(insets.bottom + 28, 96) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  content: { paddingBottom: 40 },
  sectionCard: { marginTop: 12, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 56, width: 56, borderRadius: 14, backgroundColor: 'rgba(185,28,28,0.06)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: Colors.light.muted, marginTop: 2 },
  pointsCard: { marginTop: 12, borderRadius: 12, padding: 12 },
  iconCircle: { height: 40, width: 40, borderRadius: 10, backgroundColor: 'rgba(185,28,28,0.08)', alignItems: 'center', justifyContent: 'center' },
  pointsTitle: { fontSize: 13, color: Colors.light.muted, fontWeight: '600' },
  pointsValue: { fontSize: 14, color: Colors.light.text, marginTop: 2 },
  progressBarBackground: { marginTop: 10, height: 8, backgroundColor: '#F1F5F9', borderRadius: 999 },
  progressBarFill: { height: 8, backgroundColor: Colors.light.tint, borderRadius: 999 },
  progressNote: { marginTop: 8, fontSize: 11, color: '#64748B' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  couponRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  couponInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponIcon: { height: 36, width: 36, borderRadius: 8, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  couponTitle: { fontSize: 14, fontWeight: '600' },
  couponCode: { fontSize: 12, color: Colors.light.muted },
  redeemButton: { backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  redeemText: { color: '#fff', fontWeight: '700' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  optionText: { fontSize: 14, color: Colors.light.text },
  editButton: { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.cardBorder, paddingVertical: 12, alignItems: 'center', backgroundColor: Colors.light.background },
  editText: { color: Colors.light.text, fontWeight: '700' },
});
