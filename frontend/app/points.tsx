import React from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, FlatList, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import Header from './components/Header';
import HsoPointsCard from './components/HSOPointsCard';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';

const COUPONS = [
  { id: 'c1', title: '10% OFF on Premium', desc: 'Exclusive discount on premium fuel.', code: 'HSO10', date: '30 Jun, 2025', available: true },
  { id: 'c2', title: '2x points this week', desc: 'Double your points on orders this week.', code: 'DOUBLE', date: 'This week', available: true },
];

export default function PointsScreen() {
  const [tab, setTab] = React.useState<'available' | 'redeemed'>('available');
  const [query, setQuery] = React.useState('');

  async function onCopy(code: string) {
    try {
      await Clipboard.setStringAsync(code);
    } catch (e) {
      console.warn('Clipboard copy failed', e);
    }
  }

  async function onShare(code: string) {
    try {
      await Share.share({ message: `Use code ${code} on HSO Gas Station` });
    } catch (e) {
      console.warn('Share failed', e);
    }
  }

  function onRedeem(c: any) {
    console.log('Redeeming', c.title);
  }

  const filtered = COUPONS.filter((c) => tab === 'available' ? c.available : !c.available).filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.code.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.root}>
      <View style={styles.headerWrap}>
        <Header showBack />
      </View>

      <View style={styles.content}>
        <HsoPointsCard compact />

        <View style={styles.segmentRow}>
          <TextInput placeholder="Search coupons or codes" placeholderTextColor={Colors.light.muted} value={query} onChangeText={setQuery} style={styles.searchInput} />
          <View style={{ flexDirection: 'row', marginLeft: 8 }}>
            <Pressable onPress={() => setTab('available')} style={[styles.segmentBtn, tab === 'available' && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, tab === 'available' && styles.segmentTextActive]}>Available</Text>
            </Pressable>
            <Pressable onPress={() => setTab('redeemed')} style={[styles.segmentBtn, tab === 'redeemed' && styles.segmentBtnActive, { marginLeft: 8 }]}>
              <Text style={[styles.segmentText, tab === 'redeemed' && styles.segmentTextActive]}>Redeemed</Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          style={{ marginTop: 12 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.couponCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={styles.couponIcon}><Ionicons name="ticket" size={18} color="#0F172A" /></View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.couponTitle}>{item.title}</Text>
                  <Text style={styles.couponDesc}>{item.desc}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                    <Text style={styles.couponCode}>{item.code}</Text>
                    <Text style={styles.couponDate}> • {item.date}</Text>
                  </View>
                </View>
                <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable onPress={() => onCopy(item.code)} style={{ marginRight: 8 }}>
                      <Ionicons name="copy" size={18} color={Colors.light.tint} />
                    </Pressable>
                    <Pressable onPress={() => onShare(item.code)} style={{ marginRight: 8 }}>
                      <Ionicons name="share-social" size={18} color={Colors.light.tint} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => onRedeem(item)} style={styles.redeemBtn}>
                    <Text style={styles.redeemText}>Redeem</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Text style={{ color: Colors.light.muted }}>No coupons found</Text>
            </View>
          )}
        />

        <Text style={styles.footerNote}>Points and coupons in this demo are not synchronized. For production, connect Supabase or your backend for persistence.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 16, paddingBottom: 40 },
  container: { paddingTop: 12 },
  pointsCard: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  pointsIcon: { height: 54, width: 54, borderRadius: 12, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center' },
  pointsLabel: { fontSize: 13, color: Colors.light.muted, fontWeight: '700' },
  pointsValue: { fontSize: 16, color: Colors.light.text, marginTop: 4 },
  progressBg: { height: 8, backgroundColor: Colors.light.cardBorder, borderRadius: 999, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: Colors.light.tint, borderRadius: 999 },
  progressNote: { marginTop: 8, fontSize: 12, color: Colors.light.muted },
  levelBadge: { marginLeft: 12, backgroundColor: Colors.light.background, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: Colors.light.cardBorder },

  segmentRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  searchInput: { flex: 1, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder, borderRadius: 10, padding: 12, color: Colors.light.text },
  segmentBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder },
  segmentBtnActive: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  segmentText: { color: Colors.light.text, fontWeight: '700' },
  segmentTextActive: { color: '#fff' },

  couponCard: { marginTop: 12, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  couponIcon: { height: 44, width: 44, borderRadius: 10, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center' },
  couponTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  couponDesc: { marginTop: 6, color: Colors.light.muted },
  couponCode: { marginTop: 8, fontWeight: '700', color: Colors.light.text },
  couponDate: { color: Colors.light.muted, marginLeft: 6 },
  redeemBtn: { marginTop: 12, backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  redeemText: { color: '#fff', fontWeight: '700' },

  footerNote: { marginTop: 18, color: Colors.light.muted, fontSize: 12, textAlign: 'center' },
  headerWrap: { paddingTop: 12, paddingHorizontal: 16 },
  
});
