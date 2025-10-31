import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Modal, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
const Blur: any = (BlurView as unknown) as any;
import MapView, { Marker, PROVIDER_DEFAULT, Polyline } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import styles from '../../../src/styles/locationsMapStyles';
import { Colors } from '@/constants/theme';
import RouteActions from './RouteActions';
import RouteProgress from './RouteProgress';
import RouteETA from './RouteETA';
import RouteReroute from './RouteReroute';
import formatDuration from '../../../src/utils/formatDuration';
import { SavedLocationBridge } from '../../../src/lib/savedLocationBridge';

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
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<MarkerTypeLocal | null>(null);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance?: number; duration?: number } | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navIndex, setNavIndex] = useState(0);
  const [navFraction, setNavFraction] = useState(0);
  const [remainingKm, setRemainingKm] = useState<number | null>(null);
  const [etaSec, setEtaSec] = useState<number | null>(null);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [editName, setEditName] = useState('');
  // arrivalMounted controls whether the arrival overlay is mounted
  const [arrivalMounted, setArrivalMounted] = useState(false);
  const arrivalAnim = useRef(new Animated.Value(0)).current;
  const navMarkerRef = useRef<any>(null);
  const mapRef = useRef<MapView | null>(null);
  const watchRef = useRef<any>(null);
  const [badgePos, setBadgePos] = useState<{ x: number; y: number } | null>(null);
  const [mapSize, setMapSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [badgeShift, setBadgeShift] = useState<number>(0);
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

  // When the modal opens, center map on user's approximate location if available
  useEffect(() => {
    const centerOnUser = async () => {
      if (!visible) return;
      try {
        let pos: any = null;
        const last = await (Location as any).getLastKnownPositionAsync?.();
        if (last && last.coords) pos = last.coords;
        else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
            pos = cur.coords;
          }
        }
        if (pos) {
          const { latitude, longitude } = pos;
          setUserLocation({ latitude, longitude, title: 'You are here' });
          const r = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
          setRegion(r);
          if (mapRef.current && (mapRef.current as any).animateToRegion) {
            (mapRef.current as any).animateToRegion(r, 400);
          }
        }
      } catch (e) {
        // ignore silently
      }
    };
    centerOnUser();
  }, [visible]);

  // Helper to fetch route from current (or provided) user location to the marker
  const fetchRouteFromMarker = async (useMarker: MarkerTypeLocal | null) => {
    if (!useMarker) return false;
    let from = userLocation;
    // If we don't have the user's current location, try last-known position first, then request permission
    if (!from) {
      try {
        const last = await (Location as any).getLastKnownPositionAsync?.();
        if (last && last.coords) {
          from = { latitude: last.coords.latitude, longitude: last.coords.longitude, title: 'You are here' };
          setUserLocation(from);
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            from = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, title: 'You are here' };
            setUserLocation(from);
          } else {
            // fallback to map region
            from = { latitude: region.latitude, longitude: region.longitude, title: 'Map center' };
          }
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
      if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        console.warn('OSRM route response invalid', { url, data });
      } else {
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

  // Lightweight summary fetch: only distance/duration (no geometry) so we can show time badge without fetching full route
  const fetchRouteSummary = async (useMarker: MarkerTypeLocal | null) => {
    if (!useMarker) return false;
    let from = userLocation;
    if (!from) {
      try {
        const last = await (Location as any).getLastKnownPositionAsync?.();
        if (last && last.coords) {
          from = { latitude: last.coords.latitude, longitude: last.coords.longitude, title: 'You are here' };
          setUserLocation(from);
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
            from = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, title: 'You are here' };
            setUserLocation(from);
          } else {
            from = { latitude: region.latitude, longitude: region.longitude, title: 'Map center' };
          }
        }
      } catch (err) {
        console.warn('Failed to get current position for route summary', err);
        from = { latitude: region.latitude, longitude: region.longitude, title: 'Map center' };
      }
    }

    const start = `${from.longitude},${from.latitude}`;
    const end = `${useMarker.longitude},${useMarker.latitude}`;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=false&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        console.warn('OSRM summary response invalid', { url, data });
      } else {
        const route = data.routes[0];
        setRouteInfo({ distance: route.distance, duration: route.duration });
        return true;
      }
    } catch (e) {
      console.warn('Route summary fetch failed', e);
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
    // Switch to real GPS-based navigation: watch device position and update navIndex to the nearest
    if (!navigating || !routeCoords || routeCoords.length === 0) {
      setNavIndex(0);
      // ensure we stop any active watcher
      try { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } } catch (e) {}
      return;
    }

    let mounted = true;
    const startWatch = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Location permission not granted for navigation');
          return;
        }
        // subscribe to device location updates
        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 3, timeInterval: 1000 },
          (pos) => {
            if (!mounted) return;
            const { latitude, longitude } = pos.coords;
            // update user marker
            setUserLocation({ latitude, longitude, title: 'You are here' });

                // center map on current device position for navigation
            if (mapRef.current && (mapRef.current as any).animateToRegion) {
              try { (mapRef.current as any).animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500); } catch (e) { }
            }

            // if we've reached the destination (within ~8 meters of last point) stop navigation
            const last = routeCoords[routeCoords.length - 1];
            const distToLast = haversineDistance(latitude, longitude, last.latitude, last.longitude);
            if (distToLast < 0.008) { // ~8 meters
              try { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } } catch (e) {}
              setNavigating(false);
              showArrival();
            }
          }
        );
        watchRef.current = sub;
      } catch (e) {
        console.warn('Failed to start location watch for navigation', e);
      }
    };

    startWatch();
    return () => {
      mounted = false;
      try { if (watchRef.current) { watchRef.current.remove(); watchRef.current = null; } } catch (e) {}
    };
  }, [navigating, routeCoords]);

  // Animate route actions panel when a marker is selected or routeInfo appears/disappears
  useEffect(() => {
    const shouldShow = !!marker || !!routeInfo;
    Animated.timing(routePanelAnim, { toValue: shouldShow ? 1 : 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [marker, routeInfo, routePanelAnim]);

  // When a marker is selected, fetch a lightweight summary (distance/duration) so time badge appears
  useEffect(() => {
    if (!marker) {
      setRouteInfo(null);
      return;
    }
    // fetch summary, but don't overwrite full route coords if already present
    fetchRouteSummary(marker).catch(() => {});
  }, [marker]);

  // compute on-screen position for the badge so it can be rendered above the marker as an overlay
  const updateBadgePosition = useCallback(async () => {
    if (!marker || !mapRef.current) {
      setBadgePos(null);
      setBadgeShift(0);
      return;
    }
    try {
      // pointForCoordinate returns { x, y } in pixels relative to the map view
      const point = await (mapRef.current as any).pointForCoordinate({ latitude: marker.latitude, longitude: marker.longitude });
      // move the badge a little above the marker pin (adjust values if needed)
      const offsetY = -48; // pixels above the marker
      setBadgePos({ x: point.x, y: point.y + offsetY });

      // compute horizontal shift to avoid clipping on edges
      if (mapSize.width && mapSize.width > 0) {
        const badgeHalf = 48; // estimated half-width of the badge in px (larger to avoid clipping)
        const margin = 12; // keep a small margin from edges
        let shift = 0;
        const rightOverhang = (point.x + badgeHalf) - (mapSize.width - margin);
        if (rightOverhang > 0) {
          shift = -rightOverhang; // move left
        } else {
          const leftOverhang = badgeHalf - (point.x - margin);
          if (leftOverhang > 0) {
            shift = leftOverhang; // move right
          }
        }
        setBadgeShift(shift);
      }
    } catch (e) {
      // silently ignore if map doesn't support the method yet
      setBadgePos(null);
      setBadgeShift(0);
    }
  }, [marker, mapSize]);

  // update badge position when marker or region changes
  useEffect(() => {
    updateBadgePosition();
    // also try again in a short moment to let map settle
    const t = setTimeout(() => updateBadgePosition(), 260);
    return () => clearTimeout(t);
  }, [marker, region, updateBadgePosition]);

  // simple haversine distance (returns kilometers)
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Reverse-geocode selected marker to a human-readable address
  useEffect(() => {
    const doReverse = async () => {
      if (!marker) {
        setSelectedAddress(null);
        return;
      }
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: marker.latitude, longitude: marker.longitude });
        if (results && results.length > 0) {
          const res = results[0];
          const parts = [res.name, res.street, res.city, res.region, res.postalCode, res.country].filter(Boolean);
          setSelectedAddress(parts.join(', '));
        } else {
          setSelectedAddress(null);
        }
      } catch (e) {
        console.warn('Reverse geocode failed', e);
        setSelectedAddress(null);
      }
    };
    doReverse();
  }, [marker]);

  const saveRoute = async () => {
    if (!routeInfo || !routeCoords || routeCoords.length === 0) return;
    const rec = { id: `route:${Date.now()}`, info: routeInfo, coords: routeCoords.slice(0, 10), address: selectedAddress ?? null, marker: marker ?? null, ts: Date.now() };
    try {
      const raw = await AsyncStorage.getItem('user:routes');
      const list = raw ? JSON.parse(raw) : [];
      list.push(rec);
      await AsyncStorage.setItem('user:routes', JSON.stringify(list));
      // notify parent if provided
      if (onSave) {
        try { onSave(marker); } catch {}
      }
    } catch (e) {
      console.warn('Failed to save route', e);
    }
  };

  // Save the currently selected marker as a saved location (addresses list)
  const saveSelectedLocation = async () => {
    if (!marker) return;
    const loc = { id: `loc:${Date.now()}`, name: editName || marker.title || 'Selected', address: selectedAddress ?? `${marker.latitude.toFixed(5)}, ${marker.longitude.toFixed(5)}`, lat: marker.latitude, lon: marker.longitude } as any;
    try {
      const raw = await AsyncStorage.getItem('user:savedLocations');
      const list = raw ? JSON.parse(raw) : [];
      // simple dedupe by lat/lon
      const exists = list.some((l: any) => Number(l.lat) === Number(loc.lat) && Number(l.lon) === Number(loc.lon));
      if (!exists) list.push(loc);
      await AsyncStorage.setItem('user:savedLocations', JSON.stringify(list));
      try { SavedLocationBridge.notifyChange(); } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('Failed to save location', e);
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

  // Arrival overlay helpers: mount/unmount with animation
  const showArrival = () => {
    try {
      setArrivalMounted(true);
      arrivalAnim.setValue(0);
      Animated.spring(arrivalAnim, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
    } catch (e) { /* ignore */ }
  };

  const hideArrival = (cb?: () => void) => {
    try {
      Animated.timing(arrivalAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
        setArrivalMounted(false);
        if (cb) cb();
      });
    } catch (e) {
      setArrivalMounted(false);
      if (cb) cb();
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent={false} onRequestClose={closeAnimated}>
      <Animated.View style={[styles.modalRoot, { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
        <View style={[styles.modalTop, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable onPress={closeAnimated} style={[styles.modalBack, { position: 'absolute', left: 16, top: Math.max(insets.top, 12) }]}>
            <Ionicons name="chevron-back" size={20} color="#7F1D1D" />
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
            initialRegion={region}
            rotateEnabled={true}
            pitchEnabled={true}
            zoomEnabled={true}
            showsCompass={false}
            mapType="standard"
            showsUserLocation={true}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            onMapReady={() => {
              // ensure badge is positioned once map is ready
              updateBadgePosition().catch(() => {});
            }}
            onLayout={(e) => {
              // recalc when layout changes
              const { width, height } = e.nativeEvent.layout;
              setMapSize({ width, height });
              updateBadgePosition().catch(() => {});
            }}
            onRegionChangeComplete={(r) => {
              // update local region and reposition badge so it moves with the marker
              setRegion(r);
              updateBadgePosition().catch(() => {});
            }}
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
            // Enable selecting Points of Interest (POI) like gas stations / supermarkets on supported providers
            showsPointsOfInterest={true}
            onPoiClick={(e: any) => {
              try {
                const coord = e.nativeEvent.coordinate;
                const name = e.nativeEvent.name || 'Point of interest';
                if (coord && coord.latitude && coord.longitude) {
                  setMarker({ latitude: coord.latitude, longitude: coord.longitude, title: name });
                  // fetch a lightweight route summary when a POI is selected
                  fetchRouteSummary({ latitude: coord.latitude, longitude: coord.longitude, title: name }).catch(() => {});
                }
              } catch (err) {
                // ignore
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
            {/* Badge as a Marker anchored above the selected marker so it stays attached to the coordinate */}
            {marker && routeInfo && routeInfo.duration != null && (
              <Marker
                coordinate={{
                  latitude: (() => {
                    const latDelta = region?.latitudeDelta || 0.01;
                    const offset = latDelta * 0.04; // base offset above pin (moved higher)
                    const topBound = (region?.latitude || 0) + latDelta / 2;
                    const bottomBound = (region?.latitude || 0) - latDelta / 2;
                    const desired = marker.latitude + offset;
                    const margin = latDelta * 0.04;
                    const clamped = Math.min(desired, topBound - margin);
                    return Math.max(clamped, bottomBound + margin);
                  })(),
                  longitude: marker.longitude,
                }}
                anchor={{ x: 0.5, y: 1 }}
                zIndex={999}
              >
                <View style={[styles.timeBadge, { transform: [{ translateX: badgeShift }] }]}>
                  <Text style={styles.timeBadgeText}>{formatDuration(routeInfo.duration ?? 0)}</Text>
                </View>
              </Marker>
            )}
            {/* (badge moved out-of-map into absolute overlay for z-order control) */}
            {userLocation && (
              <Marker coordinate={{ latitude: userLocation.latitude, longitude: userLocation.longitude }} title={userLocation.title} pinColor="#2563EB" />
            )}
            {showRoute && routeCoords && routeCoords.length > 0 && (
              // When navigating, only draw the remaining segment of the route starting at navIndex
              <Polyline
                coordinates={navigating && navIndex > 0 ? routeCoords.slice(navIndex) : routeCoords}
                strokeWidth={4}
                strokeColor={Colors.light.tint}
              />
            )}
          </MapView>

          {/* Route progress helper: computes projection, nearest segment, remaining distance and smoothing */}
          <RouteProgress
            routeCoords={routeCoords}
            userLocation={userLocation}
            navIndex={navIndex}
            window={40}
            smoothingAlpha={0.45}
            onUpdate={(u) => {
              try {
                setNavIndex(u.nearestIndex);
                setNavFraction(u.t);
                setRemainingKm(u.smoothedRemainingKm);
              } catch (e) { /* ignore */ }
            }}
          />

          {/* ETA helper: queries OSRM for a current summary (duration/distance) from device -> destination */}
          <RouteETA
            origin={userLocation}
            destination={routeCoords && routeCoords.length > 0 ? routeCoords[routeCoords.length - 1] : null}
            enabled={navigating && !!userLocation && routeCoords && routeCoords.length > 0}
            intervalMs={8000}
            smoothingAlpha={0.4}
            onUpdate={(u) => {
              try {
                setEtaSec(Math.round(u.smoothedDurationSec));
                // Also update routeInfo so time badge uses the live ETA
                setRouteInfo((prev) => ({ ...(prev || {}), duration: Math.round(u.smoothedDurationSec), distance: Math.round(u.distanceM) }));
              } catch (e) {}
            }}
          />

          {/* Re-route helper: if user deviates off-route, request a new route from OSRM and replace routeCoords */}
          <RouteReroute
            routeCoords={routeCoords}
            userLocation={userLocation}
            navIndex={navIndex}
            enabled={navigating && !!userLocation && routeCoords && routeCoords.length > 0}
            offRouteThresholdMeters={30}
            cooldownMs={15000}
            onStart={() => { setRouteLoading(true); }}
            onReroute={(coords, info) => {
              try {
                if (coords && coords.length > 0) setRouteCoords(coords);
                if (info) setRouteInfo({ distance: info.distance, duration: info.duration });
              } catch (e) {}
              setRouteLoading(false);
            }}
          />

          {/* Name editor modal shown when user taps Save */}
          <Modal visible={showNameEditor} transparent animationType="fade" onRequestClose={() => setShowNameEditor(false)}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '92%', backgroundColor: Colors.light.background, borderRadius: 12, padding: 16 }}>
                <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Location name"
                  placeholderTextColor={Colors.light.muted}
                  style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 10, marginBottom: 12, color: Colors.light.text }}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                  <Pressable onPress={() => setShowNameEditor(false)} style={[styles.ra_btn, styles.ra_secondary, { marginRight: 8 }]}>
                    <Text style={styles.ra_text_secondary}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={async () => {
                    try {
                      await saveSelectedLocation();
                    } catch (e) { /* ignore */ }
                    setShowNameEditor(false);
                    // notify parent as well
                    if (onSave) {
                      try { onSave(marker); } catch (e) {}
                    }
                  }} style={[styles.ra_btn, styles.ra_primary]}>
                    <Text style={styles.ra_text_primary}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>

          

          <View style={[styles.floatingSearch, { top: Math.max(insets.top, 12) }]}>
            <View style={styles.compactSearchCard}>
              <TextInput placeholder="Search location..." placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} style={styles.compactSearchInput} />
              <Pressable onPress={() => handleModalSearch && handleModalSearch(search)} style={styles.compactSearchBtn}>
                <Ionicons name="search" size={18} color="#10B981" />
              </Pressable>
            </View>
          </View>


          {/* routeInfo now shown inside the RouteActions container */}

          <RouteActions
            visible={!!marker || !!routeInfo}
            loading={routeLoading}
            navigating={navigating}
            disabledStart={routeLoading || !(routeCoords && routeCoords.length > 0)}
            selected={marker ? { latitude: marker.latitude, longitude: marker.longitude, title: selectedAddress ?? marker.title } : null}
            routeInfo={routeInfo}
            onToggleShowRoute={async () => {
              if (showRoute) { setShowRoute(false); return; }
              if (routeCoords && routeCoords.length > 0) { setShowRoute(true); return; }
              const ok = await fetchRouteFromMarker(marker);
              if (ok) setShowRoute(true);
            }}
            onToggleNavigate={() => {
              if (!navigating) {
                // ensure arrival overlay is hidden when starting navigation
                hideArrival();
                setNavigating(true);
                setNavIndex(0);
              } else {
                setNavigating(false);
                hideArrival();
              }
            }}
            onSave={() => {
              // Trigger route save and then open the name editor to save the location
              try { saveRoute(); } catch (e) { /* ignore */ }
              if (marker) {
                setEditName(marker.title || 'Selected');
                setShowNameEditor(true);
              }
            }}
            animatedStyle={[{ bottom: 0, paddingBottom: Math.max(insets.bottom, 12) + 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderTopLeftRadius: 14, borderTopRightRadius: 14, opacity: routePanelAnim, transform: [{ translateY: routePanelAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] } as any]}
          />

          {/* Navigation marker shown when navigating */}
          {navigating && routeCoords && routeCoords[navIndex] && (
            <Marker coordinate={routeCoords[navIndex]} pinColor="#FF6B00" />
          )}

          {/* position buttons higher when route actions panel is visible */}
          {(() => {
            const actionsVisible = !!marker || !!routeInfo;
            const buttonBottom = Math.max(insets.bottom, 12) + 10 + (actionsVisible ? 145 : 0);
            return (
              <>
                <Pressable onPress={goToUserLocation} style={[styles.locateButton, { bottom: buttonBottom }]}>
                  <Ionicons name="locate" size={20} color="#0F172A" />
                </Pressable>
                <Pressable onPress={() => {
            try {
              if (mapRef.current && (mapRef.current as any).animateCamera) {
                (mapRef.current as any).animateCamera({ heading: 0, pitch: 0 }, { duration: 300 });
              } else if (mapRef.current && (mapRef.current as any).animateToRegion) {
                // fallback: re-center without changing heading
                mapRef.current.animateToRegion({ latitude: region.latitude, longitude: region.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta }, 300);
              }
            } catch (e) { console.warn('Compass reset failed', e); }
                }} style={[styles.compassButton, { bottom: buttonBottom }]}>
            <Ionicons name="compass" size={20} color="#0F172A" />
          </Pressable>
              </>
            );
          })()}
          {/* Arrival overlay shown when navigation reached final coordinate */}
          {arrivalMounted && (
            <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }, { opacity: arrivalAnim, transform: [{ scale: arrivalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]} pointerEvents="auto">
              <Animated.View style={{ width: 300, backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center', opacity: arrivalAnim, transform: [{ scale: arrivalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 }}>You've arrived</Text>
                <Text style={{ color: '#64748B', textAlign: 'center', marginBottom: 16 }}>You have reached your destination.</Text>
                <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between' }}>
                  <Pressable onPress={() => { hideArrival(); }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 }}>
                    <Text style={{ color: Colors.light.tint, fontWeight: '700' }}>Close</Text>
                  </Pressable>
                  <Pressable onPress={() => { saveRoute(); hideArrival(); }} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: Colors.light.tint }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Save route</Text>
                  </Pressable>
                </View>
              </Animated.View>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}


