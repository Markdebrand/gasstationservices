import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Button, Platform, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import Header from '../components/Header';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

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
  const [marker, setMarker] = useState<MarkerType | null>(null);
  const [showMap, setShowMap] = useState(false);

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
      setMarker(null);
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
      setMarker(null);
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
        setMarker({
          latitude: parseFloat(loc.lat),
          longitude: parseFloat(loc.lon),
          title: loc.display_name,
        });
      } else {
        setMarker(null);
      }
    } catch {
      setMarker(null);
    }
  };

  // Buscador OSM solo en el modal
  const handleModalSearch = async (text: string) => {
    setSearch(text);
    if (!text) {
      setMarker(null);
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
        setMarker({
          latitude: parseFloat(loc.lat),
          longitude: parseFloat(loc.lon),
          title: loc.display_name,
        });
      } else {
        setMarker(null);
      }
    } catch {
      setMarker(null);
    }
  };

  return (
    <KeyboardAwareScrollView style={styles.root} contentContainerStyle={{ paddingBottom: contentPadBottom }} enableOnAndroid extraScrollHeight={10} keyboardShouldPersistTaps="handled">
      <Header />
      <Text style={styles.title}>Locations</Text>
      <Text style={styles.subtitle}>Nearby affiliated gas stations</Text>
      <View style={{ marginTop: 12 }}>
        <View style={styles.searchRow}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            placeholder="Buscar localización..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={handleUnifiedSearch}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.mapBox}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Pressable onPress={() => setShowMap(true)} style={{ alignItems: 'center' }}>
              <Feather name="map-pin" size={28} color="#0F172A" />
              <Text style={{ marginTop: 8, fontSize: 13, color: '#334155', fontWeight: 'bold' }}>Locations map</Text>
            </Pressable>
          </View>
        </View>
        <Modal visible={showMap} animationType="slide" transparent={false} onRequestClose={() => setShowMap(false)}>
          <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'flex-start', alignItems: 'stretch' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 18 }}>
              <Pressable onPress={() => setShowMap(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={32} color="#64748B" />
              </Pressable>
            </View>
            <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12, marginLeft: 24 }}>Mapa de ubicaciones</Text>
            <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 12 }}>
              <TextInput
                style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 16 }}
                placeholder="Buscar localización..."
                value={search}
                onChangeText={setSearch}
                placeholderTextColor="#94A3B8"
              />
              <Pressable onPress={() => handleModalSearch(search)} style={{ marginLeft: 12, backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center', height: 48 }}>
                <Ionicons name="search" size={24} color="#fff" />
              </Pressable>
            </View>
            <MapView
              style={{ flex: 1, borderRadius: 0 }}
              provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
              region={region}
              mapType="standard"
              showsUserLocation={true}
              showsMyLocationButton={true}
            >
              {marker && (
                <Marker
                  coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                  title={marker.title}
                />
              )}
            </MapView>
          </View>
        </Modal>
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
