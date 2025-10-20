import React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import Header from '../components/Header';

const stations = [
  { name: 'HSO Station Centro', addr: 'Av. Principal 123, Centro', dist: 1.2, rate: 4.8, hours: '24/7', open: true },
  { name: 'HSO Station Norte', addr: 'Calle 45 #12-34, Zona Norte', dist: 3.5, rate: 4.6, hours: '6:00 - 22:00', open: true },
  { name: 'HSO Station Plaza', addr: 'Centro Comercial Plaza, Local 5', dist: 5.8, rate: 4.9, hours: '7:00 - 21:00', open: false },
  { name: 'HSO Station Sur', addr: 'Autopista Sur Km 8', dist: 7.2, rate: 4.7, hours: '24/7', open: true },
];

export default function LocationsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarBase = 64;
  const contentPadBottom = tabBarBase + Math.max(insets.bottom, 8) + 12;
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(s => s.name.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q));
  }, [query]);

  return (
    <KeyboardAwareScrollView style={styles.root} contentContainerStyle={{ paddingBottom: contentPadBottom }} enableOnAndroid extraScrollHeight={10} keyboardShouldPersistTaps="handled">
      <Header />

  <Text style={styles.title}>Locations</Text>
  <Text style={styles.subtitle}>Nearby affiliated gas stations</Text>

      <View style={{ marginTop: 12 }}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            placeholder="Search location..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.mapBox}>
          <View style={{ position: 'absolute', right: 12, top: 12 }}>
            <Pressable style={styles.locButton} onPress={() => { /* TODO: wire geolocation */ }}>
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text style={styles.locButtonText}>My location</Text>
            </Pressable>
          </View>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="map-pin" size={28} color="#0F172A" />
            <Text style={{ marginTop: 8, fontSize: 13, color: '#334155' }}>Locations map</Text>
          </View>
        </View>

  <Text style={styles.countText}>{filtered.length} nearby stations</Text>
        <View style={{ marginTop: 8 }}>
          {filtered.map((s) => (
            <View key={s.name} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <Text style={styles.cardAddr}>{s.addr}</Text>
                  <View style={styles.cardMetaRow}>
                    <Text style={styles.cardMeta}>📍 {s.dist} km</Text>
                    <Text style={styles.cardMeta}>⭐ {s.rate}</Text>
                    <Text style={styles.cardMeta}>⏰ {s.hours}</Text>
                  </View>
                </View>
                <Text style={[styles.statusBadge, s.open ? styles.statusOpen : styles.statusClose]}>{s.open ? 'Abierto' : 'Cerrado'}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, height: 44 },
  searchInput: { marginLeft: 6, flex: 1, color: '#0F172A' },

  mapBox: { marginTop: 12, borderRadius: 20, paddingVertical: 36, paddingHorizontal: 16, backgroundColor: 'rgba(16,185,129,0.10)' },
  locButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  locButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginLeft: 6 },

  countText: { marginTop: 12, fontSize: 12, color: '#64748B' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginTop: 10, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  cardAddr: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  cardMeta: { fontSize: 11, color: '#64748B' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, fontSize: 12, fontWeight: '600' },
  statusOpen: { backgroundColor: '#ECFDF5', color: '#059669' },
  statusClose: { backgroundColor: '#FFE4E6', color: '#E11D48' },
});
