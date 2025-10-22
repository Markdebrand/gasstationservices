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
import LocationsMap from '../components/locations/LocationsMap';
import styles from '../../src/styles/locationsStyles';
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
