import React from 'react';
import { fetchUserProfile } from '../../services/user';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { clearToken } from '@/utils/auth';

export default function Profile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [user, setUser] = React.useState<{ full_name?: string; email?: string; role?: string } | null>(null);
  React.useEffect(() => {
    fetchUserProfile().then(setUser).catch(() => setUser(null));
  }, []);

  const coupons = [
    { title: '10% OFF on Premium', code: 'HSO10' },
    { title: '2x points this week', code: 'DOUBLE' },
  ];

  const options = ['Payment methods', 'Order history', 'Notifications', 'My vehicles', 'Add vehicle'];

  const handleOptionPress = async (option: string) => {
    if (option === 'Sign out') {
      await clearToken();
      router.replace('/(auth)/login' as any);
    } else {
      if (option === 'My vehicles') {
        router.push('/vehicles');
        return;
      }
      if (option === 'Add vehicle') {
        router.push('/vehicle');
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
            <View style={styles.avatar}><Ionicons name="person" size={28} color="#14617B" /></View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.name}>{user?.full_name || 'User name'}</Text>
              <Text style={styles.subtitle}>{user ? `${user.role || 'User'} • ${user.email}` : 'User • @username'}</Text>
            </View>
          </View>
        </View>

        <LinearGradient colors={["#E6FAFF", "#EAF8FB"]} style={styles.pointsCard} start={[0,0]} end={[1,1]}>
          <View style={styles.rowCenter}>
            <View style={styles.iconCircle}><Ionicons name="trophy" size={20} color="#0F172A" /></View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.pointsTitle}>HSO Points</Text>
              <Text style={styles.pointsValue}><Text style={{ fontWeight: '800' }}>1,240</Text> pts • Silver level</Text>
            </View>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: '66%' }]} />
          </View>
          <Text style={styles.progressNote}>360 pts to the next level</Text>
        </LinearGradient>

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
            <Text style={{ color: '#14617B', fontWeight: '700' }}>See more points and promotions</Text>
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

        <Pressable style={styles.signOutButton} onPress={() => handleOptionPress('Sign out')}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
        {/* spacer so the last button isn't covered by the bottom tab bar */}
        <View style={{ height: Math.max(insets.bottom + 28, 96) }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB', padding: 16 },
  content: { paddingBottom: 40 },
  sectionCard: { marginTop: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 56, width: 56, borderRadius: 14, backgroundColor: 'rgba(20,97,123,0.06)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  pointsCard: { marginTop: 12, borderRadius: 12, padding: 12 },
  iconCircle: { height: 40, width: 40, borderRadius: 10, backgroundColor: 'rgba(20,97,123,0.08)', alignItems: 'center', justifyContent: 'center' },
  pointsTitle: { fontSize: 13, color: '#374151', fontWeight: '600' },
  pointsValue: { fontSize: 14, color: '#0F172A', marginTop: 2 },
  progressBarBackground: { marginTop: 10, height: 8, backgroundColor: '#F1F5F9', borderRadius: 999 },
  progressBarFill: { height: 8, backgroundColor: '#14617B', borderRadius: 999 },
  progressNote: { marginTop: 8, fontSize: 11, color: '#64748B' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  couponRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  couponInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponIcon: { height: 36, width: 36, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  couponTitle: { fontSize: 14, fontWeight: '600' },
  couponCode: { fontSize: 12, color: '#64748B' },
  redeemButton: { backgroundColor: '#14617B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  redeemText: { color: '#fff', fontWeight: '700' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  optionText: { fontSize: 14, color: '#0F172A' },
  editButton: { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E6EDF0', paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  editText: { color: '#0F172A', fontWeight: '700' },
  signOutButton: { marginTop: 16, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444', paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  signOutText: { color: '#EF4444', fontWeight: '700' },
});
