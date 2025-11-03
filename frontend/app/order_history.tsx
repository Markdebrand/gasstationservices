import React from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Modal, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './components/Header';
import { Colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

import { fetchOrders } from '../services/orders';

type Order = {
  id: number;
  product_type: string;
  total_price: number;
  status: string;
  delivery_address: string;
  created_at?: string;
};

export default function OrderHistory() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = React.useState<Order | null>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  React.useEffect(() => {
    fetchOrders().then(setOrders).catch(() => setOrders([]));
  }, []);

  const renderItem = ({ item }: { item: Order }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowTitle}>{item.product_type}</Text>
        <Text style={styles.rowMeta}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''} • {item.status}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.amount, styles.amountRed]}>${item.total_price?.toFixed(2) ?? '-'}</Text>
        <Pressable onPress={() => setSelected(item)} style={styles.eyeBtn}>
          <Ionicons name="eye" size={18} color={Colors.light.tint} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>...
      <Header showBack />
  <Text style={styles.pageTitle}>Order history</Text>


      <View style={styles.card}>
        <Text style={styles.cardOverline}>Your recent orders</Text>
        <Text style={styles.cardNote}>Review details and receipts</Text>

  <FlatList data={orders} keyExtractor={(i) => i.id.toString()} renderItem={renderItem} ItemSeparatorComponent={() => <View style={{ height: 12 }} />} contentContainerStyle={{ paddingTop: 12 }} />
      </View>

      <Modal visible={!!selected} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selected?.product_type}</Text>
            <Text style={styles.modalMeta}>{selected?.created_at ? new Date(selected.created_at).toLocaleDateString() : ''} • {selected?.status}</Text>
            <Text style={styles.modalNote}>{selected?.delivery_address}</Text>

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
