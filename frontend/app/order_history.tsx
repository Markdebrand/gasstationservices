import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './components/Header';
import { Colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

type Order = { id: string; title: string; date: string; status: string; amount: string; note?: string };

const SAMPLE: Order[] = [
  { id: 'o1', title: 'Premium Gasoline', date: '15 Jun, 2025', status: 'Delivered', amount: '-$65.00', note: 'Rear door delivery. Driver: Juan P.' },
  { id: 'o2', title: 'HSO Refund', date: '12 Jun, 2025', status: 'Delivered', amount: '+$10.00', note: 'Refund for fare adjustment.' },
  { id: 'o3', title: 'Diesel', date: '08 Jun, 2025', status: 'Cancelled', amount: '-$42.00', note: 'Order cancelled due to no dispatch.' },
];

export default function OrderHistory() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = React.useState<Order | null>(null);

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowMeta}>{item.date} • {item.status}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.amount, item.amount.startsWith('+') ? styles.amountGreen : styles.amountRed]}>{item.amount}</Text>
        <Pressable onPress={() => setSelected(item)} style={styles.eyeBtn}>
          <Ionicons name="eye" size={18} color={Colors.light.tint} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
      <Header showBack />
  <Text style={styles.pageTitle}>Order history</Text>


      <View style={styles.card}>
        <Text style={styles.cardOverline}>Your recent orders</Text>
        <Text style={styles.cardNote}>Review details and receipts</Text>

        <FlatList data={SAMPLE} keyExtractor={(i) => i.id} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} contentContainerStyle={{ paddingTop: 12 }} />
      </View>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selected?.title}</Text>
            <Text style={styles.modalMeta}>{selected?.date} • {selected?.status}</Text>
            <Text style={styles.modalNote}>{selected?.note}</Text>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setSelected(null)} style={[styles.modalBtn, styles.modalBtnOutline]}>
                  <Text style={[styles.modalBtnText, styles.modalBtnTextOutline]}>Close</Text>
                </Pressable>
                <Pressable onPress={() => { Alert.alert('Download', 'Downloading receipt...'); }} style={[styles.modalBtn, styles.modalBtnPrimary]}>
                  <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>Download receipt</Text>
                </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text, marginTop: 8, marginBottom: 12 },
  card: { backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  cardOverline: { fontSize: 12, color: Colors.light.muted, marginBottom: 6 },
  cardNote: { fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  rowMeta: { color: Colors.light.muted, marginTop: 6, fontSize: 12 },
  rowRight: { alignItems: 'flex-end', marginLeft: 12 },
  amount: { fontWeight: '700' },
  amountRed: { color: Colors.light.text },
  amountGreen: { color: Colors.light.chart || '#10B981' },
  eyeBtn: { marginTop: 8, backgroundColor: Colors.light.subtleBg, padding: 8, borderRadius: 8 },

  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '86%', backgroundColor: Colors.light.background, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: Colors.light.cardBorder },
  modalTitle: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  modalMeta: { color: Colors.light.muted, marginTop: 8 },
  modalNote: { marginTop: 12, color: Colors.light.muted },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 18 },
  modalBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, minWidth: 110, alignItems: 'center' },
  modalBtnOutline: { backgroundColor: Colors.light.subtleBg, borderWidth: 1, borderColor: Colors.light.cardBorder },
  modalBtnPrimary: { backgroundColor: Colors.light.tint },
  modalBtnText: { fontWeight: '700' },
  modalBtnTextOutline: { color: Colors.light.text },
  modalBtnTextPrimary: { color: '#fff' },
});
