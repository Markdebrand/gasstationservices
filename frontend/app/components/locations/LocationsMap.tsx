import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
const Blur: any = (BlurView as unknown) as any;
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import styles from '../../../src/styles/locationsMapStyles';

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
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance?: number; duration?: number } | null>(null);
  const [showRoute, setShowRoute] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [navIndex, setNavIndex] = useState(0);
  const navMarkerRef = useRef<any>(null);
  const mapRef = useRef<MapView | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const routePanelAnim = useRef(new Animated.Value(0)).current;
  const AnimatedBlur: any = Animated.createAnimatedComponent(Blur as any);

  useEffect(() => {
    setRegion(initialRegion);
  }, [initialRegion]);

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 10, tension: 80, useNativeDriver: true }).start();
    }
  }, [visible]);

  // Helper to fetch route from current (or provided) user location to the marker
  const fetchRouteFromMarker = async (useMarker: MarkerTypeLocal | null) => {
    if (!useMarker) return false;
    let from = userLocation;
    // If we don't have the user's current location, try to request it now
    if (!from) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          from = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, title: 'You are here' };
          setUserLocation(from);
        } else {
          // fallback to map region
          from = { latitude: region.latitude, longitude: region.longitude, title: 'Map center' };
        }
      } catch (err) {
        console.warn('Failed to get current position for route start', err);
        from = { latitude: region.latitude, longitude: region.longitude, title: 'Map center' };
      }
    }

    const start = `${from.longitude},${from.latitude}`;
    const end = `${useMarker.longitude},${useMarker.latitude}`;
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: any) => ({ latitude: c[1], longitude: c[0] }));
        setRouteCoords(coords);
        setRouteInfo({ distance: route.distance, duration: route.duration });
        return true;
      }
    } catch (e) {
      console.warn('Route fetch failed', e);
    } finally {
      setRouteLoading(false);
    }
    return false;
  };

  // Fit map to route only when user chooses to view the route
  useEffect(() => {
    if (showRoute && routeCoords && routeCoords.length > 0) {
      if (mapRef.current && (mapRef.current as any).fitToCoordinates) {
        try { (mapRef.current as any).fitToCoordinates(routeCoords, { edgePadding: { top: 80, right: 40, bottom: 200, left: 40 }, animated: true }); } catch {}
      }
    }
  }, [showRoute, routeCoords]);

  const closeAnimated = () => {
    // clear selection and route when closing
    setMarker(null);
    setRouteCoords([]);
    setRouteInfo(null);
    Animated.timing(anim, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(onClose);
  };

  // Simulate navigation along route when 'navigating' is true
  useEffect(() => {
    if (!navigating || !routeCoords || routeCoords.length === 0) {
      setNavIndex(0);
      return;
    }
    let idx = navIndex;
    const id = setInterval(() => {
      idx = Math.min(routeCoords.length - 1, idx + 1);
      setNavIndex(idx);
      const coord = routeCoords[idx];
      if (mapRef.current && (mapRef.current as any).animateToRegion) {
        try { (mapRef.current as any).animateToRegion({ latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 250); } catch {}
      }
      if (idx >= routeCoords.length - 1) {
        clearInterval(id);
        setNavigating(false);
      }
    }, 300);
    return () => clearInterval(id);
  }, [navigating, routeCoords]);

  // Animate route actions panel when a marker is selected or routeInfo appears/disappears
  useEffect(() => {
    const shouldShow = !!marker || !!routeInfo;
    Animated.timing(routePanelAnim, { toValue: shouldShow ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [marker, routeInfo, routePanelAnim]);

  const saveRoute = async () => {
    if (!routeInfo || !routeCoords || routeCoords.length === 0) return;
    const rec = { id: `route:${Date.now()}`, info: routeInfo, coords: routeCoords.slice(0, 10), ts: Date.now() };
    try {
      const raw = await AsyncStorage.getItem('user:routes');
      const list = raw ? JSON.parse(raw) : [];
      list.push(rec);
      await AsyncStorage.setItem('user:routes', JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save route', e);
    }
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
            showsMyLocationButton={false}
            onPress={(e) => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              // If there is already a selected marker, touching another point clears the selection/route
              if (marker) {
                setMarker(null);
                setRouteCoords([]);
                setRouteInfo(null);
              } else {
                setMarker({ latitude, longitude, title: 'Selected location' });
              }
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
            {showRoute && routeCoords && routeCoords.length > 0 && (
              <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor="#0B5C73" />
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


          {routeInfo && (
            <View style={[styles.routeInfo, { top: Math.max(insets.top, 12) + 72, right: 16 }]}>
              {(() => {
                const d = routeInfo.distance ?? 0; // meters
                return d < 1000 ? (
                  <Text style={{ color: '#065F46', fontWeight: '700' }}>{`${Math.round(d)} m`}</Text>
                ) : (
                  <Text style={{ color: '#065F46', fontWeight: '700' }}>{`${(d / 1000).toFixed(1)} km`}</Text>
                );
              })()}
              <Text style={{ color: '#065F46', marginTop: 4 }}>{Math.ceil((routeInfo.duration || 0) / 60)} min</Text>
            </View>
          )}

          {(marker || routeInfo) && (
            <AnimatedBlur intensity={10} tint="light" style={[styles.routeActionsBg, { bottom: Math.max(insets.bottom, 12) + 16, opacity: routePanelAnim, transform: [{ translateY: routePanelAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] } as any]}> 
              <View style={styles.routeActionsInner}>
                <Pressable onPress={async () => {
                    if (showRoute) {
                      setShowRoute(false);
                      return;
                    }
                    // If we already have routeCoords for the current marker, just show it
                    if (routeCoords && routeCoords.length > 0) {
                      setShowRoute(true);
                      return;
                    }
                    // Otherwise fetch the route now
                    const ok = await fetchRouteFromMarker(marker);
                    if (ok) setShowRoute(true);
                  }} style={styles.routeActionBtn} disabled={routeLoading}>
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>{routeLoading ? 'Cargando...' : (showRoute ? 'Ocultar ruta' : 'Ver ruta')}</Text>
                </Pressable>
                <Pressable onPress={() => { if (!navigating) { setNavigating(true); setNavIndex(0); } else { setNavigating(false); } }} style={styles.routeActionBtnGreen} disabled={routeLoading || !(routeCoords && routeCoords.length > 0)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{navigating ? 'Detener' : 'Iniciar ruta'}</Text>
                </Pressable>
                <Pressable onPress={() => saveRoute()} style={styles.routeActionBtn}>
                  <Text style={{ color: '#0F172A', fontWeight: '700' }}>Guardar</Text>
                </Pressable>
              </View>
            </AnimatedBlur>
          )}

          {/* Navigation marker shown when navigating */}
          {navigating && routeCoords && routeCoords[navIndex] && (
            <Marker coordinate={routeCoords[navIndex]} pinColor="#FF6B00" />
          )}

          <Pressable onPress={goToUserLocation} style={[styles.locateButton, { bottom: Math.max(insets.bottom, 12) + 160 }]}>
            <Ionicons name="locate" size={20} color="#0F172A" />
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}


