import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './components/Header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';

const SAVED_METHODS = [
  { id: 'm1', brand: 'Visa', last4: '4242', exp: '12/26' },
  { id: 'm2', brand: 'Mastercard', last4: '8282', exp: '09/27' },
];

export default function PaymentMethods() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [useNfc, setUseNfc] = React.useState(true);
  const [methods, setMethods] = React.useState(SAVED_METHODS);

  function handleToggleNfc(v: boolean) {
    // NFC is the preferred primary method; toggle only updates local state here
    setUseNfc(v);
  }

  function handleRemove(id: string) {
    Alert.alert('Remove card', 'Remove this saved card?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMethods(ms => ms.filter(m => m.id !== id)) },
    ]);
  }

  function renderMethod({ item }: any) {
    return (
      <View style={styles.methodRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.cardIcon}><Ionicons name="card" size={18} color="#0F172A" /></View>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.methodTitle}>{item.brand} **** {item.last4}</Text>
            <Text style={styles.methodMeta}>Exp {item.exp}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => Alert.alert('Set primary', 'Feature not implemented in demo')} style={{ marginRight: 12 }}>
            <Text style={{ color: Colors.light.tint, fontWeight: '700' }}>Set primary</Text>
          </Pressable>
          <Pressable onPress={() => handleRemove(item.id)}>
            <Text style={{ color: '#EF4444', fontWeight: '700' }}>Remove</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.headerWrap}>
        <Header showBack />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Payment methods</Text>

        <View style={styles.nfcCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.nfcIcon}><Ionicons name="wifi" size={20} color={Colors.light.text} /></View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.nfcTitle}>Pay with NFC (Tap to pay)</Text>
              <Text style={styles.nfcSubtitle}>Use your phone to pay directly at the pump or in-app terminals.</Text>
            </View>
            <Switch value={useNfc} onValueChange={handleToggleNfc} thumbColor={useNfc ? Colors.light.tint : undefined} />
          </View>
          <Text style={styles.nfcNote}>NFC is the preferred payment method. If enabled, you'll be prompted to tap at supporting terminals.</Text>
        </View>

        <View style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Saved cards</Text>
          <FlatList data={methods} keyExtractor={i => i.id} renderItem={renderMethod} ItemSeparatorComponent={() => <View style={{ height: 8 }} />} />
          <Pressable style={styles.addButton} onPress={() => Alert.alert('Add payment method', 'Add a new card in production via secure flow')}>
            <Text style={styles.addButtonText}>Add payment method</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 16 },
  headerWrap: { paddingTop: 12, paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 12 },
  nfcCard: { padding: 12, borderRadius: 12, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder },
  nfcIcon: { height: 44, width: 44, borderRadius: 10, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center' },
  nfcTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  nfcSubtitle: { color: Colors.light.muted, marginTop: 4 },
  nfcNote: { marginTop: 10, fontSize: 12, color: Colors.light.muted },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  methodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder },
  cardIcon: { height: 44, width: 44, borderRadius: 8, backgroundColor: Colors.light.subtleBg, alignItems: 'center', justifyContent: 'center' },
  methodTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text },
  methodMeta: { color: Colors.light.muted, marginTop: 4 },
  addButton: { marginTop: 12, backgroundColor: Colors.light.tint, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700' },
});
