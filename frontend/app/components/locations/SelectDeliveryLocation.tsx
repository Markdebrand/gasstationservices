import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, Modal, FlatList, Platform, Keyboard, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../../../src/styles/locationsMapStyles';
import { Colors } from '@/constants/theme';
import formatDuration from '../../../src/utils/formatDuration';
import { SavedLocationBridge } from '../../../src/lib/savedLocationBridge';

export default function SelectDeliveryLocation({
  visible,
  onClose,
  onSelect,
  onSave,
  onDelete,
  savedLocations,
  initialRegion
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (loc: { name: string; address: string; lat: number; lon: number } | null) => void;
  onSave?: (loc: { name: string; address: string; lat: number; lon: number }) => void;
  onDelete?: (address: string, lat: number) => void;
  savedLocations?: { name: string; address: string; lat: number; lon: number }[];
  initialRegion?: any;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [region, setRegion] = useState(initialRegion || { latitude: 9.92807, longitude: -84.09072, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [marker, setMarker] = useState<any | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<any | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance?: number; duration?: number } | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');
  const [photonResults, setPhotonResults] = useState<any[]>([]);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [editName, setEditName] = useState('');

  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    // subscribe to saved-location selections made from the standalone SavedLocations screen
    const handler = (item: { name: string; address: string; lat: number; lon: number } | null) => {
      if (!item) return;
      const loc = { name: item.name || 'Saved', address: item.address || '', lat: item.lat, lon: item.lon };
      try {
        setMarker({ latitude: loc.lat, longitude: loc.lon, title: loc.name });
        setRegion({ latitude: loc.lat, longitude: loc.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 });
        setPhotonResults([]);
        setAddressSearch(loc.address || '');
        // update route info for the selected saved location
        fetchRouteSummary({ latitude: loc.lat, longitude: loc.lon }).catch(() => {});
      } catch (e) { /* ignore */ }
    };
  SavedLocationBridge.setSelectionListener(handler);
  return () => { SavedLocationBridge.clearSelectionListener(); };
  }, []);

  useEffect(() => {
    if (initialRegion) setRegion(initialRegion);
  }, [initialRegion]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
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
        // ignore
      }
    })();
  }, [visible]);

  const fetchRouteSummary = async (useMarker: any) => {
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
        from = { latitude: region.latitude, longitude: region.longitude, title: 'Map center' };
      }
    }

    const start = `${from.longitude},${from.latitude}`;
    const end = `${useMarker.longitude},${useMarker.latitude}`;
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=false&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data || data.code !== 'Ok' || !data.routes || data.routes.length === 0) return false;
      const route = data.routes[0];
      setRouteInfo({ distance: route.distance, duration: route.duration });
      return true;
    } catch (e) {
      return false;
    }
  };

  // Reverse geocode marker to readable address
  useEffect(() => {
    const doReverse = async () => {
      if (!marker) { setSelectedAddress(null); return; }
      try {
        const results = await Location.reverseGeocodeAsync({ latitude: marker.latitude, longitude: marker.longitude });
        if (results && results.length > 0) {
          const res = results[0];
          const parts = [res.name, res.street, res.city, res.region, res.postalCode, res.country].filter(Boolean);
          setSelectedAddress(parts.join(', '));
        } else setSelectedAddress(null);
      } catch (e) { setSelectedAddress(null); }
    };
    doReverse();
    if (marker) fetchRouteSummary(marker).catch(() => {});
  }, [marker]);

  const handleMapPress = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    // hide photon results when user taps the map
    try { setPhotonResults([]); } catch (err) {}
    if (marker) {
      // clear selection first
      setMarker(null);
      setRouteInfo(null);
    } else {
      setMarker({ latitude, longitude, title: 'Selected location' });
    }
  };

  const handleAddressAutocomplete = async (text: string) => {
    setAddressSearch(text);
    if (!text || text.length < 3) { setPhotonResults([]); return; }
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
      const data = await response.json();
      if (data && data.features) {
        // sort features by proximity to user's location / map center
        const centerLat = userLocation?.latitude ?? region?.latitude;
        const centerLon = userLocation?.longitude ?? region?.longitude;

        const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
          const toRad = (v: number) => v * Math.PI / 180;
          const R = 6371000; // meters
          const dLat = toRad(lat2 - lat1);
          const dLon = toRad(lon2 - lon1);
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };

        const featuresWithDist = data.features.map((f: any) => {
          const coords = f?.geometry?.coordinates || [];
          const lat = coords[1];
          const lon = coords[0];
          let dist = Number.MAX_SAFE_INTEGER;
          if (typeof centerLat === 'number' && typeof centerLon === 'number' && typeof lat === 'number' && typeof lon === 'number') {
            dist = haversine(centerLat, centerLon, lat, lon);
          }
          return { _feature: f, _dist: dist };
        });

        featuresWithDist.sort((a: any, b: any) => a._dist - b._dist);
        const sorted = featuresWithDist.map((x: any) => x._feature);
        setPhotonResults(sorted);
      } else setPhotonResults([]);
    } catch (e) { setPhotonResults([]); }
  };

  const handlePhotonSelect = (feature: any) => {
    const coords = feature.geometry.coordinates;
    const name = feature.properties.name || feature.properties.street || 'Selected address';
    const address = feature.properties.label || name;
    const loc = { name, address, lat: coords[1], lon: coords[0] };
    setMarker({ latitude: loc.lat, longitude: loc.lon, title: loc.name });
    setRegion({ latitude: loc.lat, longitude: loc.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 });
    setPhotonResults([]);
    setAddressSearch(address);
  };

  const goToUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const { latitude, longitude } = pos.coords;
      setUserLocation({ latitude, longitude, title: 'You are here' });
      if (mapRef.current && (mapRef.current as any).animateToRegion) {
        (mapRef.current as any).animateToRegion({ latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
      }
    } catch (e) { }
  };

  const searchTop = Math.max(insets.top, 12) + 80;
  const actionsVisible = !!marker || !!routeInfo;
  const [routePanelHeight, setRoutePanelHeight] = useState<number>(0);
  const buttonBottom = Math.max(insets.bottom, 12) + 10 + (routePanelHeight || 0);
  const raiseOffset = 6;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onShow = (e: any) => {
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
      setKeyboardVisible(true);
    };
    const onHide = () => {
      setKeyboardHeight(0);
      setKeyboardVisible(false);
    };
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subShow = Keyboard.addListener(showEvent, onShow);
    const subHide = Keyboard.addListener(hideEvent, onHide);
    return () => { subShow.remove(); subHide.remove(); };
  }, []);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={[styles.modalTop, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable onPress={onClose} style={[styles.modalBack, { position: 'absolute', left: 16, top: Math.max(insets.top, 12) }]}>
            <Ionicons name="chevron-back" size={20} color="#7F1D1D" />
          </Pressable>
          <View style={{ flex: 1, paddingLeft: 66 }}>
            <Text style={styles.modalOverline}>Delivery</Text>
            <Text style={styles.modalTitle}>Select delivery location</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Floating search card */}
        <View style={[styles.floatingSearch, { top: searchTop }]}>
          <View style={styles.compactSearchCard}>
            <TextInput
              style={styles.compactSearchInput}
              placeholder="Search address..."
              value={addressSearch}
              onChangeText={handleAddressAutocomplete}
              onBlur={() => { if (!addressSearch || addressSearch.trim().length === 0) setPhotonResults([]); }}
              placeholderTextColor={Colors.light.muted}
            />
            <Pressable onPress={() => { if (mapRef.current && (mapRef.current as any).animateToRegion) { (mapRef.current as any).animateToRegion(region, 300); } }} style={styles.compactSearchBtn}>
              <Ionicons name="search" size={18} color={Colors.light.tint} />
            </Pressable>
          </View>

          {photonResults.length > 0 && (
            <FlatList
                data={photonResults}
                keyExtractor={(item, idx) => `${String(item?.properties?.osm_id ?? '')}-${String(item?.properties?.label ?? '')}-${idx}`}
                renderItem={({ item }) => {
                  const coords = item?.geometry?.coordinates;
                  const fallbackCoords = coords && coords.length >= 2 ? `${Number(coords[1]).toFixed(5)}, ${Number(coords[0]).toFixed(5)}` : 'Unknown location';
                  const fullLabel = item?.properties?.label || fallbackCoords;
                  const primary = item?.properties?.name || item?.properties?.label || item?.properties?.street || fallbackCoords;
                  // Build a street address line: housenumber + street, city
                  const housenumber = item?.properties?.housenumber;
                  const street = item?.properties?.street;
                  const city = item?.properties?.city || item?.properties?.state || item?.properties?.region;
                  const streetLineParts: string[] = [];
                  if (street) {
                    streetLineParts.push(housenumber ? `${street} ${housenumber}` : street);
                  }
                  if (city) streetLineParts.push(city);
                  const streetAddress = streetLineParts.length > 0 ? streetLineParts.join(', ') : null;
                  const secondary = streetAddress || (fullLabel && fullLabel !== primary ? fullLabel : null);
                  return (
                    <Pressable onPress={() => handlePhotonSelect(item)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                      <Text style={{ fontSize: 15, color: Colors.light.text, fontWeight: '600' }}>{primary}</Text>
                      {secondary ? <Text style={{ fontSize: 13, color: Colors.light.muted, marginTop: 4 }}>{secondary}</Text> : null}
                    </Pressable>
                  );
                }}
                style={{ maxHeight: 180, width: '100%', marginTop: 8, backgroundColor: Colors.light.background, borderRadius: 12 }}
              />
          )}
        </View>

        <View style={styles.mapFullRoot}>
          <MapView
            ref={(r) => { mapRef.current = r; return; }}
            style={styles.mapFull}
            provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
            region={region}
            rotateEnabled={true}
            pitchEnabled={true}
            zoomEnabled={true}
            showsCompass={false}
            mapType="standard"
            showsUserLocation={true}
            showsMyLocationButton={false}
            onRegionChangeComplete={(r) => setRegion(r)}
            onPress={handleMapPress}
            onPoiClick={(e: any) => {
              try {
                const coord = e.nativeEvent.coordinate;
                const name = e.nativeEvent.name || 'Point of interest';
                if (coord && coord.latitude && coord.longitude) {
                  setMarker({ latitude: coord.latitude, longitude: coord.longitude, title: name });
                  fetchRouteSummary({ latitude: coord.latitude, longitude: coord.longitude, title: name }).catch(() => {});
                }
              } catch (err) {}
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
            {/* Time badge shown above the selected marker (fixed over the pin) */}
            {marker && routeInfo && routeInfo.duration != null && (
              <Marker
                coordinate={{
                  latitude: (() => {
                    const latDelta = region?.latitudeDelta || 0.01;
                    const offset = latDelta * 0.04; // base offset above pin
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
                <View style={styles.timeBadge}>
                  <Text style={styles.timeBadgeText}>{formatDuration(routeInfo.duration || 0)}</Text>
                </View>
              </Marker>
            )}
          </MapView>

          {/* locate & compass buttons */}
          <>
            <Pressable onPress={goToUserLocation} style={[styles.locateButton, { bottom: buttonBottom + raiseOffset, zIndex: 120, transform: [{ translateY: keyboardVisible ? keyboardHeight : 0 }] }]}>
              <Ionicons name="locate" size={20} color="#0F172A" />
            </Pressable>
            <Pressable onPress={() => {
              try {
                if (mapRef.current && (mapRef.current as any).animateCamera) {
                  (mapRef.current as any).animateCamera({ heading: 0, pitch: 0 }, { duration: 300 });
                } else if (mapRef.current && (mapRef.current as any).animateToRegion) {
                  mapRef.current.animateToRegion({ latitude: region.latitude, longitude: region.longitude, latitudeDelta: region.latitudeDelta, longitudeDelta: region.longitudeDelta }, 300);
                }
              } catch (e) { /* ignore */ }
            }} style={[styles.compassButton, { bottom: buttonBottom + raiseOffset, zIndex: 120, transform: [{ translateY: keyboardVisible ? keyboardHeight : 0 }] }]}>
              <Ionicons name="compass" size={20} color="#0F172A" />
            </Pressable>
          </>

          

          {/* bottom actions panel */}
          <View
            style={[styles.routeActionsBg, { bottom: insets.bottom + 1, transform: [{ translateY: keyboardVisible ? keyboardHeight : 0 }] }] }
            onLayout={(e) => {
              try {
                const h = e.nativeEvent.layout.height;
                if (h && h !== routePanelHeight) setRoutePanelHeight(h);
              } catch (err) {}
            }}
          >
            <View style={styles.routeActionsInner}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: '700', color: Colors.light.text }}>{marker ? (selectedAddress ?? marker.title) : 'No location selected'}</Text>
                {marker && <Text style={{ color: Colors.light.muted, marginTop: 6 }}>{marker.latitude.toFixed(5)}, {marker.longitude.toFixed(5)}</Text>}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable onPress={() => { if (marker) { setEditName(marker.title || 'Selected'); setShowNameEditor(true); } }} style={[styles.ra_btn, styles.ra_secondary, { marginRight: 6 }]}>
                  <Text style={styles.ra_text_secondary}>Save</Text>
                </Pressable>

                <Pressable onPress={() => { if (marker) { const loc = { name: marker.title || 'Selected', address: selectedAddress ?? `${marker.latitude.toFixed(5)}, ${marker.longitude.toFixed(5)}`, lat: marker.latitude, lon: marker.longitude }; onSelect(loc); onClose(); } }} style={[styles.ra_btn, styles.ra_primary]}>
                  <Text style={styles.ra_text_primary}>Use for delivery</Text>
                </Pressable>
              </View>
            </View>

            {/* Link to standalone saved-locations view (open management screen) */}
            <View style={styles.routeActionsContent}>
              <Pressable onPress={() => { router.push('/components/SavedLocations'); }} style={[styles.ra_btn, styles.ra_secondary, { alignSelf: 'flex-start' }]}>
                <Text style={styles.ra_text_secondary}>Saved addresses</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
                <Pressable onPress={() => {
                  try {
                    if (marker && onSave) {
                      const loc = { name: editName || marker.title || 'Selected', address: selectedAddress ?? `${marker.latitude.toFixed(5)}, ${marker.longitude.toFixed(5)}`, lat: marker.latitude, lon: marker.longitude };
                      onSave(loc);
                    }
                  } catch (e) { /* ignore */ }
                  setShowNameEditor(false);
                }} style={[styles.ra_btn, styles.ra_primary]}>
                  <Text style={styles.ra_text_primary}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}
