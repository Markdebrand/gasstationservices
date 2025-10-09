import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import Header from '../components/Header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

const FUEL_PRICES = {
  premium: 1.45,
  regular: 1.32,
  diesel: 1.28,
} as const;

type FuelKey = keyof typeof FUEL_PRICES;

export default function Order() {
  const [fuel, setFuel] = React.useState<FuelKey>('premium');
  const [liters, setLiters] = React.useState<number>(10);
  const [address, setAddress] = React.useState('Av. Principal 123, San José, Costa Rica');

  const total = React.useMemo(() => Number((FUEL_PRICES[fuel] * (liters || 0)).toFixed(2)), [fuel, liters]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 80 }}>
      <Header />

  <Text style={styles.title}>Request Service</Text>
  <Text style={styles.subtitle}>Complete the details for your order</Text>

      {/* Fuel type */}
  <Text style={styles.overline}>Fuel Type</Text>
      <View style={styles.grid3}>
        <FuelCard label="Premium" price={FUEL_PRICES.premium} selected={fuel === 'premium'} onPress={() => setFuel('premium')} />
        <FuelCard label="Regular" price={FUEL_PRICES.regular} selected={fuel === 'regular'} onPress={() => setFuel('regular')} />
  <FuelCard label="Diesel" price={FUEL_PRICES.diesel} selected={fuel === 'diesel'} onPress={() => setFuel('diesel')} />
      </View>

      {/* Liters */}
  <Text style={[styles.overline, { marginTop: 14 }]}>Quantity (Liters)</Text>
      <TextInput
        keyboardType="numeric"
        value={String(liters)}
        onChangeText={(t) => setLiters(Math.max(0, Number(t.replace(/[^0-9.]/g, '')) || 0))}
        style={styles.input}
        placeholder="0"
        placeholderTextColor="#94A3B8"
      />
      <View style={styles.quickRow}>
        {[10, 20, 30, 40].map((n) => (
          <Pressable key={n} onPress={() => setLiters(n)} style={[styles.pill, liters === n && styles.pillActive]}>
            <Text style={[styles.pillText, liters === n && styles.pillTextActive]}>{n}L</Text>
          </Pressable>
        ))}
      </View>

      {/* Address */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={styles.iconBadge}><Ionicons name="location" size={16} color="#059669" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Delivery Location</Text>
            <Text style={styles.cardSub}>{address}</Text>
            <Pressable onPress={() => { /* TODO: open location selector */ }}>
              <Text style={styles.link}>Change location</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Total */}
      <LinearGradient colors={["#ECFDF5", "#D1FAE5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.totalCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.totalOverline}>Total to Pay</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
          <View style={styles.totalIcon}><Ionicons name="water" size={18} color="#059669" /></View>
        </View>
      </LinearGradient>

      {/* CTA */}
      <Pressable style={styles.cta} onPress={() => { /* TODO: navegar a pago NFC */ }}>
  <Text style={styles.ctaText}>Go to Payment</Text>
      </Pressable>
    </ScrollView>
  );
}

function FuelCard({ label, price, selected, onPress }: { label: string; price: number; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.fuelCard, selected && styles.fuelCardActive]}>
      <Ionicons name="water" size={18} color={selected ? '#14617B' : '#64748B'} />
      <Text style={styles.fuelLabel}>{label}</Text>
      <Text style={styles.fuelPrice}>${price.toFixed(2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  overline: { marginTop: 12, fontSize: 12, color: '#64748B' },
  grid3: { flexDirection: 'row', gap: 12, marginTop: 8 },
  fuelCard: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6EDF0', borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center' },
  fuelCardActive: { borderColor: '#14617B', backgroundColor: 'rgba(20,97,123,0.05)' },
  fuelLabel: { marginTop: 4, fontSize: 12, color: '#64748B' },
  fuelPrice: { marginTop: 2, fontSize: 14, fontWeight: '700', color: '#0F172A' },
  input: { marginTop: 8, borderWidth: 1, borderColor: '#E6EDF0', borderRadius: 14, paddingHorizontal: 12, height: 44, backgroundColor: '#FFFFFF', color: '#0F172A' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#E6EDF0', backgroundColor: '#FFFFFF' },
  pillActive: { backgroundColor: '#14617B', borderColor: '#14617B' },
  pillText: { fontSize: 12, color: '#0F172A' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E6EDF0', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  cardSub: { marginTop: 4, fontSize: 12, color: '#64748B' },
  link: { marginTop: 6, color: '#14617B', fontSize: 12, fontWeight: '600' },
  iconBadge: { height: 28, width: 28, borderRadius: 8, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  totalCard: { marginTop: 12, borderRadius: 12, padding: 12 },
  totalOverline: { fontSize: 12, color: '#065F46' },
  totalValue: { fontSize: 22, fontWeight: '700', color: '#065F46', marginTop: 2 },
  totalIcon: { height: 40, width: 40, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  cta: { marginTop: 16, backgroundColor: '#10B981', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#F7FBFE', fontSize: 16, fontWeight: '600' },
});
