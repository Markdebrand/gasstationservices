import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Button, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { BlurView } from 'expo-blur';
// TypeScript: alias to any for JSX usage when types are missing in this workspace
const Blur: any = (BlurView as unknown) as any;
import Header from '../components/Header';
import LocationsMap from '../components/LocationsMap';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';

const stations = [
  { name: 'HSO Station Centro', addr: 'Av. Principal 123, Centro', dist: 1.2, rate: 4.8, hours: '24/7', open: true },
  { name: 'HSO Station Norte', addr: 'Calle 45 #12-34, Zona Norte', dist: 3.5, rate: 4.6, hours: '6:00 - 22:00', open: true },
  { name: 'HSO Station Plaza', addr: 'Centro Comercial Plaza, Local 5', dist: 5.8, rate: 4.9, hours: '7:00 - 21:00', open: false },
  { name: 'HSO Station Sur', addr: 'Autopista Sur Km 8', dist: 7.2, rate: 4.7, hours: '24/7', open: true },
];

// Definir tipo para marker
interface MarkerType {
  latitude: number;
  longitude: number;
  title: string;
}

export default function LocationsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarBase = 64;
  const contentPadBottom = tabBarBase + Math.max(insets.bottom, 8) + 12;
  const [query, setQuery] = React.useState('');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState({
    latitude: 4.60971, // Bogotá por defecto
    longitude: -74.08175,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [showMap, setShowMap] = useState(false);

  // showMap controls the display of the separate LocationsMap component

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter(s => s.name.toLowerCase().includes(q) || s.addr.toLowerCase().includes(q));
  }, [query]);

  // Unificar búsqueda: filtra estaciones y busca en OSM
  const handleUnifiedSearch = async (text: string) => {
    setSearch(text);
    setQuery(text);
    if (!text) {
      setRegion({
        latitude: 4.60971,
        longitude: -74.08175,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }
    // Filtrar estaciones primero
    const filteredStations = stations.filter(s => s.name.toLowerCase().includes(text.toLowerCase()) || s.addr.toLowerCase().includes(text.toLowerCase()));
    if (filteredStations.length > 0) {
      // Centrar en la primera estación encontrada
      setRegion({
        latitude: 4.60971,
        longitude: -74.08175,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }
    // Si no hay estaciones, buscar en OSM
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`
      );
      const results = await response.json();
      if (results && results.length > 0) {
        const loc = results[0];
        setRegion({
          latitude: parseFloat(loc.lat),
          longitude: parseFloat(loc.lon),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        // modal will show marker when opened
      } else {
        // nothing
      }
    } catch {
      // ignore
    }
  };

  // Buscador OSM solo en el modal
  const handleModalSearch = async (text: string) => {
    setSearch(text);
    if (!text) {
      setRegion({
        latitude: 4.60971,
        longitude: -74.08175,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      return;
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=1`
      );
      const results = await response.json();
      if (results && results.length > 0) {
        const loc = results[0];
        setRegion({
          latitude: parseFloat(loc.lat),
          longitude: parseFloat(loc.lon),
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        // marker will be handled by modal component
      } else {
        // nothing
      }
    } catch {
      // ignore
    }
  };

  // Location logic moved to LocationsMap component

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
            value={search}
            onChangeText={handleUnifiedSearch}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.mapBox}>
          {/* Minimal non-interactive map preview behind the icon */}
          <MapView
            style={styles.mapPreview}
            provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
            region={region}
            mapType="standard"
            pointerEvents="none"
            showsUserLocation={false}
            zoomEnabled={false}
            scrollEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          />
          <Blur intensity={80} tint="light" style={styles.mapPreviewOverlay} pointerEvents="none" />
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Pressable onPress={() => setShowMap(true)} style={{ alignItems: 'center' }}>
              <Feather name="map-pin" size={28} color="#0F172A" />
              <Text style={{ marginTop: 8, fontSize: 13, color: '#334155', fontWeight: 'bold' }}>Locations map</Text>
            </Pressable>
          </View>
        </View>
        <LocationsMap
          visible={showMap}
          onClose={() => setShowMap(false)}
          initialRegion={region}
          search={search}
          setSearch={setSearch}
          handleModalSearch={handleModalSearch}
          onSave={(m) => { /* TODO: persist m */ }}
          onUse={(m) => { if (m) setRegion({ latitude: m.latitude, longitude: m.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }); }}
        />
        {/* Lista de estaciones locales */}
        <Text style={styles.countText}>{stations.length} nearby stations</Text>
        <View style={{ marginTop: 8 }}>
          {stations.map((s) => (
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
                <Text style={[styles.statusBadge, s.open ? styles.statusOpen : styles.statusClose]}>{s.open ? 'Open' : 'Closed'}</Text>
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
  mapPreview: { ...StyleSheet.absoluteFillObject, borderRadius: 20, overflow: 'hidden' },
  mapPreviewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 20 },
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
  /* Modal / full-screen map styles */
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalTop: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%', backgroundColor: 'transparent' },
  modalBack: { height: 40, width: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,97,123,0.06)', marginRight: 6 },
  modalOverline: { fontSize: 13, color: '#64748B', fontWeight: '700', letterSpacing: 0.4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: -1 },
  mapModalContainer: { flex: 1, margin: 18, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E6EEF0', backgroundColor: '#FFFFFF' },
  mapModalView: { flex: 1 },
  modalActions: { paddingHorizontal: 18, paddingTop: 12, gap: 10 },
  modalButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  modalButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  mapFullRoot: { flex: 1, backgroundColor: '#000' },
  mapFull: { ...StyleSheet.absoluteFillObject },
  modalTopOverlay: { position: 'absolute', left: 0, right: 0, top: 0, height: 64, zIndex: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, backgroundColor: 'transparent' },
  modalBackOverlay: { padding: 8, backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: 10 },
  modalTitleOverlay: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  floatingActions: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 40, flexDirection: 'column' },
  floatingButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatingButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  bottomSearch: { position: 'absolute', left: 16, right: 16, zIndex: 45, alignItems: 'center' },
  bottomSearchInner: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8 },
  bottomSearchInput: { flex: 1, color: '#0F172A', paddingVertical: 6, paddingLeft: 6 },
  bottomSearchBtn: { marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  compactSearchCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E6EEF0' },
  compactSearchInput: { flex: 1, color: '#0F172A', paddingVertical: 6, paddingLeft: 6 },
  compactSearchBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  floatingSearch: { position: 'absolute', left: 16, right: 16, zIndex: 50, alignItems: 'center' },
  locateButton: { position: 'absolute', right: 20, backgroundColor: '#FFFFFF', width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6, zIndex: 60 },
});
