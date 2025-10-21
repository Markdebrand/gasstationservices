import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Modal, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
const Blur: any = (BlurView as unknown) as any;
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

export interface MarkerTypeLocal { latitude: number; longitude: number; title: string }

interface Props {
  visible: boolean;
  onClose: () => void;
  initialRegion: any;
  search: string;
  setSearch: (s: string) => void;
  handleModalSearch?: (text: string) => Promise<void>;
  onSave?: (marker: MarkerTypeLocal | null) => void;
  onUse?: (marker: MarkerTypeLocal | null) => void;
}

export default function LocationsMap({ visible, onClose, initialRegion, search, setSearch, handleModalSearch, onSave, onUse }: Props) {
  const insets = useSafeAreaInsets();
  const [region, setRegion] = useState(initialRegion);
  const [marker, setMarker] = useState<MarkerTypeLocal | null>(null);
  const [userLocation, setUserLocation] = useState<MarkerTypeLocal | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setRegion(initialRegion);
  }, [initialRegion]);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 10, tension: 80, useNativeDriver: true }).start();
    }
  }, [visible]);

  const closeAnimated = () => {
    Animated.timing(anim, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(onClose);
  };

  const goToUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = pos.coords;
      setUserLocation({ latitude, longitude, title: 'You are here' });
      if (mapRef.current && mapRef.current.animateToRegion) {
        mapRef.current.animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
      }
    } catch (e) {
      console.warn('Failed to get location', e);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent={false} onRequestClose={closeAnimated}>
      <Animated.View style={[styles.modalRoot, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
        <View style={[styles.modalTop, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable onPress={closeAnimated} style={[styles.modalBack, { position: 'absolute', left: 16, top: Math.max(insets.top, 12) }]}>
            <Ionicons name="chevron-back" size={20} color="#14617B" />
          </Pressable>
          <View style={{ flex: 1, paddingLeft: 66 }}>
            <Text style={styles.modalOverline}>LOCATIONS</Text>
            <Text style={styles.modalTitle}>Locations map</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.mapFullRoot}>
          <MapView
            ref={(r) => { mapRef.current = r; return; }}
            style={styles.mapFull}
            provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
            region={region}
            mapType="standard"
            showsUserLocation={true}
            showsMyLocationButton={true}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setMarker({ latitude, longitude, title: 'Selected location' });
            }}
            onLongPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              setMarker({ latitude, longitude, title: 'Selected location' });
            }}
          >
            {marker && (
              <Marker
                coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
                title={marker.title}
                draggable
                onDragEnd={(ev) => {
                  const { latitude, longitude } = ev.nativeEvent.coordinate;
                  setMarker({ latitude, longitude, title: marker.title });
                }}
              />
            )}
            {userLocation && (
              <Marker coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} title={userLocation.title} pinColor="#2563EB" />
            )}
          </MapView>

          <View style={[styles.floatingSearch, { top: Math.max(insets.top, 12) }]}>
            <View style={styles.compactSearchCard}>
              <TextInput placeholder="Search location..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} style={styles.compactSearchInput} />
              <Pressable onPress={() => handleModalSearch && handleModalSearch(search)} style={styles.compactSearchBtn}>
                <Ionicons name="search" size={18} color="#10B981" />
              </Pressable>
            </View>
          </View>

          <View style={[styles.floatingActions, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
            <Pressable onPress={() => { onSave && onSave(marker); closeAnimated(); }} style={[styles.floatingButton, { backgroundColor: 'rgba(16,185,129,0.95)' }]}>
              <Text style={styles.floatingButtonText}>Save selected location</Text>
            </Pressable>
            <Pressable onPress={() => { onUse && onUse(marker); closeAnimated(); }} style={[styles.floatingButton, { backgroundColor: 'rgba(20,97,123,0.95)' }]}>
              <Text style={styles.floatingButtonText}>Use this location</Text>
            </Pressable>
          </View>

          <Pressable onPress={goToUserLocation} style={[styles.locateButton, { bottom: Math.max(insets.bottom, 12) + 92 }]}>
            <Ionicons name="locate" size={20} color="#0F172A" />
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, backgroundColor: '#FFFFFF' },
  modalTop: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, width: '100%', backgroundColor: 'transparent' },
  modalBack: { height: 40, width: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,97,123,0.06)', marginRight: 6 },
  modalOverline: { fontSize: 13, color: '#64748B', fontWeight: '700', letterSpacing: 0.4 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: -1 },
  mapFullRoot: { flex: 1, backgroundColor: '#000' },
  mapFull: { ...StyleSheet.absoluteFillObject },
  floatingActions: { position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 40, flexDirection: 'column' },
  floatingButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  floatingButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  floatingSearch: { position: 'absolute', left: 16, right: 16, zIndex: 50, alignItems: 'center' },
  compactSearchCard: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E6EEF0' },
  compactSearchInput: { flex: 1, color: '#0F172A', paddingVertical: 6, paddingLeft: 6 },
  compactSearchBtn: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  locateButton: { position: 'absolute', right: 20, backgroundColor: '#FFFFFF', width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 6, zIndex: 60 },
});
