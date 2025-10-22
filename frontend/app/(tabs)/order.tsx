import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Modal, FlatList, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Header from '../components/Header';
import styles from '../../src/styles/orderStyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

const FUEL_PRICES = {
  premium: 1.45,
  regular: 1.32,
  diesel: 1.28,
} as const;

const TOKEN_VALUE = 0.5; // 1 token == $0.5

type FuelKey = keyof typeof FUEL_PRICES;

export default function Order() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [fuel, setFuel] = React.useState<FuelKey>('premium');
  const [liters, setLiters] = React.useState<number>(10);
  const [address, setAddress] = React.useState('Av. Principal 123, San José, Costa Rica');
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = React.useState<string | null>(null);
  const [dispatcherType, setDispatcherType] = React.useState<'pickup' | 'small-truck' | null>('pickup');
  // New: scheduling, promo, tip and tokens
  const [scheduleType, setScheduleType] = React.useState<'asap' | 'scheduled'>('asap');
  const [scheduleDate, setScheduleDate] = React.useState(''); // YYYY-MM-DD
  const [scheduleTime, setScheduleTime] = React.useState(''); // HH:MM
  const [promoInput, setPromoInput] = React.useState('');
  const [appliedPromo, setAppliedPromo] = React.useState<string | null>(null);
  const [tipMode, setTipMode] = React.useState<'none' | 'percent' | 'custom'>('none');
  const [tipPercent, setTipPercent] = React.useState<number>(0);
  const [tipCustom, setTipCustom] = React.useState<number>(0);
  const [useTokens, setUseTokens] = React.useState<boolean>(false);
  const [tokensAmount, setTokensAmount] = React.useState<number>(0);
  const [tokensExpanded, setTokensExpanded] = React.useState<boolean>(false);
  const [tokensTemp, setTokensTemp] = React.useState<string>('');
  const [availableTokens, setAvailableTokens] = React.useState<number>(10);
  const [showLocationModal, setShowLocationModal] = React.useState(false);
  const [savedLocations, setSavedLocations] = React.useState<{name: string, address: string, lat: number, lon: number}[]>([]);
  const [selectedLocation, setSelectedLocation] = React.useState<{name: string, address: string, lat: number, lon: number} | null>(null);
  const [region, setRegion] = React.useState({
    latitude: 9.92807,
    longitude: -84.09072,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const subtotal = React.useMemo(() => round2(FUEL_PRICES[fuel] * (liters || 0)), [fuel, liters]);
  const serviceFee = 0.8;
  const deliveryFee = React.useMemo(() => (dispatcherType === 'small-truck' ? 2.0 : 1.5), [dispatcherType]);

  const promoDiscount = React.useMemo(() => {
    if (!appliedPromo) return 0;
    const up = appliedPromo.toUpperCase();
    if (up === 'HSO10') return round2(subtotal * 0.10);
    if (up === 'FREESHIP') return round2(deliveryFee); // cubre delivery
    if (up === 'FUEL5') return 1.0; // descuento fijo
    return 0;
  }, [appliedPromo, subtotal, deliveryFee]);

  const tipValue = React.useMemo(() => {
    if (tipMode === 'percent') return round2(subtotal * (tipPercent / 100));
    if (tipMode === 'custom') return round2(tipCustom);
    return 0;
  }, [tipMode, tipPercent, tipCustom, subtotal]);

  const preTokenTotal = React.useMemo(() => round2(subtotal + serviceFee + deliveryFee + tipValue - promoDiscount), [subtotal, serviceFee, deliveryFee, tipValue, promoDiscount]);
  const tokensApplied = React.useMemo(() => {
    if (!useTokens) return 0;
    const dollarValue = round2((tokensAmount || 0) * TOKEN_VALUE);
    return Math.min(dollarValue, Math.max(0, preTokenTotal));
  }, [useTokens, tokensAmount, preTokenTotal]);
  const total = React.useMemo(() => Math.max(0, round2(preTokenTotal - tokensApplied)), [preTokenTotal, tokensApplied]);

  React.useEffect(() => {
    const load = async () => {
      const key = 'user:vehicles';
      const existing = await AsyncStorage.getItem(key);
      const list: Vehicle[] = existing ? JSON.parse(existing) : [];
      setVehicles(list);
      if (list.length > 0 && !selectedVehicleId) setSelectedVehicleId(list[0].id);
    };
    load();
  }, []);

  // try to load available tokens balance (optional)
  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user:tokens');
        if (raw) {
          const n = Number(raw);
          if (!Number.isNaN(n)) setAvailableTokens(n);
        }
      } catch {}
    })();
  }, []);

  // Load saved locations
  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user:savedLocations');
        if (raw) setSavedLocations(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const applyPromo = () => {
    const code = (promoInput || '').trim().toUpperCase();
    if (!code) return;
    const allowed = ['HSO10', 'FREESHIP', 'FUEL5'];
    if (!allowed.includes(code)) {
      setAppliedPromo(null);
    } else {
      setAppliedPromo(code);
    }
  };

  const removePromo = () => setAppliedPromo(null);

  // Save new location
  const saveLocation = async (loc: {name: string, address: string, lat: number, lon: number}) => {
    const updated = [...savedLocations, loc];
    setSavedLocations(updated);
    await AsyncStorage.setItem('user:savedLocations', JSON.stringify(updated));
  };

  // Delete saved location
  const deleteLocation = async (address: string, lat: number) => {
    const updated = savedLocations.filter(loc => !(loc.address === address && loc.lat === lat));
    setSavedLocations(updated);
    await AsyncStorage.setItem('user:savedLocations', JSON.stringify(updated));
  };

  // Select location and close modal
  const handleSelectLocation = (loc: {name: string, address: string, lat: number, lon: number}) => {
    setAddress(loc.address);
    setSelectedLocation(loc);
    setShowLocationModal(false);
  };

  // On map click, perform reverse geocoding to get real address
  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  let name = 'Selected location';
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
      const data = await response.json();
      if (data && data.display_name) {
        address = data.display_name;
  name = data.name || 'Selected location';
      }
    } catch {}
    const loc = { name, address, lat: latitude, lon: longitude };
    setSelectedLocation(loc);
    setRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  // Autocompletado de direcciones con Photon
  const [photonResults, setPhotonResults] = React.useState<any[]>([]);
  const [addressSearch, setAddressSearch] = React.useState('');

  const handleAddressAutocomplete = async (text: string) => {
    setAddressSearch(text);
    if (!text || text.length < 3) {
      setPhotonResults([]);
      return;
    }
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5`);
      const data = await response.json();
      if (data && data.features) {
        setPhotonResults(data.features);
      } else {
        setPhotonResults([]);
      }
    } catch {
      setPhotonResults([]);
    }
  };

  const handlePhotonSelect = (feature: any) => {
    const coords = feature.geometry.coordinates;
  const name = feature.properties.name || feature.properties.street || 'Selected address';
    const address = feature.properties.label || name;
    const loc = {
      name,
      address,
      lat: coords[1],
      lon: coords[0]
    };
    setSelectedLocation(loc);
    setRegion({
      latitude: coords[1],
      longitude: coords[0],
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setAddress(address);
    setPhotonResults([]);
    setAddressSearch(address);
  };

  return (
    <KeyboardAwareScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: 80 + (insets.bottom || 0) }}
      enableOnAndroid={true}
      extraScrollHeight={20}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Header />

  <Text style={styles.title}>Request Service</Text>
  <Text style={styles.subtitle}>Complete your order details</Text>

      {/* Tipo de Combustible */}
  <Text style={styles.overline}>Fuel Type</Text>
      <View style={styles.grid3}>
        <FuelCard label="Premium" price={FUEL_PRICES.premium} selected={fuel === 'premium'} onPress={() => setFuel('premium')} />
        <FuelCard label="Regular" price={FUEL_PRICES.regular} selected={fuel === 'regular'} onPress={() => setFuel('regular')} />
  <FuelCard label="Diesel" price={FUEL_PRICES.diesel} selected={fuel === 'diesel'} onPress={() => setFuel('diesel')} />
      </View>

      {/* Tu Vehículo (para identificar) */}
  <Text style={[styles.overline, { marginTop: 14 }]}>Your Vehicle (for identification)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
        {vehicles.map(v => (
          <Pressable key={v.id} onPress={() => setSelectedVehicleId(v.id)} style={[styles.vehiclePill, selectedVehicleId === v.id && styles.vehiclePillActive]}>
            {v.photos && v.photos.length > 0 ? (
              <Image source={{ uri: v.photos[0] }} style={styles.vehicleThumb} />
            ) : (
              <View style={[styles.vehicleThumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EEF2F7' }]}>
                <Ionicons name="car-sport" size={18} color="#64748B" />
              </View>
            )}
            <View style={{ marginLeft: 8 }}>
              <Text style={styles.vehicleTitle}>{[v.brand, v.model].filter(Boolean).join(' ') || v.plate}</Text>
              <Text style={styles.vehicleSub}>{v.plate}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/vehicles/components/vehicle_add')} style={[styles.addVehicleBox]}>
          <Ionicons name="add" size={22} color="#0F172A" />
        </Pressable>
      </ScrollView>

      {/* Tipo de Vehículo del Despachador */}
  <Text style={[styles.overline, { marginTop: 14 }]}>Dispatcher Vehicle Type</Text>
      <View style={styles.grid2}> 
        <DispatcherCard title="Pickup truck" subtitle="AB-1234 • 100L" icon="car" selected={dispatcherType==='pickup'} onPress={() => setDispatcherType('pickup')} />
        <DispatcherCard title="Small truck" subtitle="CD-5678 • 250L" icon="bus" selected={dispatcherType==='small-truck'} onPress={() => setDispatcherType('small-truck')} />
      </View>

      {/* Cantidad (Litros) */}
  <Text style={[styles.overline, { marginTop: 14 }]}>Amount (Liters)</Text>
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

      {/* Ubicación de Entrega */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={styles.iconBadge}><Ionicons name="location" size={16} color="#059669" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Delivery Location</Text>
            <Text style={styles.cardSub}>{address}</Text>
            <Pressable onPress={() => setShowLocationModal(true)}>
              <Text style={styles.link}>Change location</Text>
            </Pressable>
          </View>
        </View>
      </View>
      {/* Modal para seleccionar ubicación de entrega */}
      <Modal visible={showLocationModal} animationType="slide" transparent={false} onRequestClose={() => setShowLocationModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'flex-start', alignItems: 'stretch' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 18 }}>
            <Pressable onPress={() => setShowLocationModal(false)} style={{ padding: 6 }}>
              <Ionicons name="close" size={32} color="#64748B" />
            </Pressable>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 12, marginLeft: 24 }}>Select delivery location</Text>
          {/* Autocompletado Photon */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 12 }}>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, padding: 12, fontSize: 16 }}
              placeholder="Search address..."
              value={addressSearch}
              onChangeText={handleAddressAutocomplete}
              placeholderTextColor="#94A3B8"
            />
          </View>
          {photonResults.length > 0 && (
            <FlatList
              data={photonResults}
              keyExtractor={(item) => item.properties.osm_id + item.properties.label}
              renderItem={({ item }) => (
                <Pressable onPress={() => handlePhotonSelect(item)} style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                  <Text style={{ fontSize: 15, color: '#0F172A' }}>{item.properties.label}</Text>
                </Pressable>
              )}
              style={{ maxHeight: 180, marginHorizontal: 24, backgroundColor: '#F1F5F9', borderRadius: 12, marginBottom: 8 }}
            />
          )}
          <MapView
            style={{ flex: 1, borderRadius: 0 }}
            provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
            region={region}
            mapType="standard"
            showsUserLocation={true}
            showsMyLocationButton={true}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker
                coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lon }}
                title={selectedLocation.name}
              />
            )}
          </MapView>
          <View style={{ padding: 18 }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10 }}>Your saved locations</Text>
            <FlatList
              data={savedLocations}
              keyExtractor={(item) => item.address + item.lat}
              renderItem={({ item }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                  <Pressable onPress={() => handleSelectLocation(item)} style={{ flex: 1, padding: 12 }}>
                    <Text style={{ fontSize: 15, color: '#0F172A' }}>{item.name}</Text>
                    <Text style={{ fontSize: 13, color: '#64748B' }}>{item.address}</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteLocation(item.address, item.lat)} style={{ padding: 8 }}>
                    <Ionicons name="trash" size={20} color="#E11D48" />
                  </Pressable>
                </View>
              )}
              style={{ maxHeight: 140, backgroundColor: '#F1F5F9', borderRadius: 12 }}
            />
            <Pressable onPress={() => { if (selectedLocation) saveLocation(selectedLocation); }} style={{ marginTop: 16, backgroundColor: '#10B981', borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Save selected location</Text>
            </Pressable>
            <Pressable onPress={() => { if (selectedLocation) handleSelectLocation(selectedLocation); }} style={{ marginTop: 12, backgroundColor: '#14617B', borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Use this location for delivery</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Cuándo lo quieres */}
      <View style={styles.card}>
  <Text style={styles.cardTitle}>When do you want it?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable onPress={() => setScheduleType('asap')} style={[styles.pill, scheduleType==='asap' && styles.pillActive]}>
            <Text style={[styles.pillText, scheduleType==='asap' && styles.pillTextActive]}>As soon as possible</Text>
          </Pressable>
          <Pressable onPress={() => setScheduleType('scheduled')} style={[styles.pill, scheduleType==='scheduled' && styles.pillActive]}>
            <Text style={[styles.pillText, scheduleType==='scheduled' && styles.pillTextActive]}>Schedule</Text>
          </Pressable>
        </View>
        {scheduleType === 'scheduled' && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TextInput placeholder="YYYY-MM-DD" placeholderTextColor="#94A3B8" value={scheduleDate} onChangeText={setScheduleDate} style={[styles.input, { flex: 1 }]} />
            <TextInput placeholder="HH:MM" placeholderTextColor="#94A3B8" value={scheduleTime} onChangeText={setScheduleTime} style={[styles.input, { flex: 1 }]} />
          </View>
        )}
      </View>

      {/* Promos */}
      <View style={styles.card}>
  <Text style={styles.cardTitle}>Promotions and code</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <TextInput value={promoInput} onChangeText={setPromoInput} placeholder="Code (e.g. HSO10)" placeholderTextColor="#94A3B8" style={[styles.input, { flex: 1 }]} />
          <Pressable onPress={applyPromo} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </Pressable>
        </View>
        {appliedPromo ? (
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={{ color: '#065F46', fontWeight: '700' }}>Applied: {appliedPromo}</Text>
            <Pressable onPress={removePromo}><Text style={styles.link}>Remove</Text></Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {['HSO10', 'FREESHIP', 'FUEL5'].map(code => (
              <Pressable key={code} onPress={() => { setPromoInput(code); setAppliedPromo(code); }} style={[styles.pill]}> 
                <Text style={styles.pillText}>{code}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Propina */}
      <View style={styles.card}>
  <Text style={styles.cardTitle}>Tip</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {[0,5,10,15].map(p => (
            <Pressable key={p} onPress={() => { setTipMode('percent'); setTipPercent(p); }} style={[styles.pill, tipMode==='percent' && tipPercent===p && styles.pillActive]}>
              <Text style={[styles.pillText, tipMode==='percent' && tipPercent===p && styles.pillTextActive]}>{p}%</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setTipMode('custom')} style={[styles.pill, tipMode==='custom' && styles.pillActive]}>
            <Text style={[styles.pillText, tipMode==='custom' && styles.pillTextActive]}>Custom</Text>
          </Pressable>
        </View>
        {tipMode === 'custom' && (
          <TextInput value={String(tipCustom || '')} onChangeText={(t)=> setTipCustom(Number(t.replace(/[^0-9.]/g,'')||0))} placeholder="$0.00" placeholderTextColor="#94A3B8" style={[styles.input, { marginTop: 8 }]} />
        )}
      </View>

      {/* Tokens */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.cardTitle}>Tokens</Text>
          {!tokensExpanded && (
            <Pressable onPress={() => { setTokensTemp(String(tokensAmount || '')); setTokensExpanded(true); }} style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </Pressable>
          )}
        </View>
        {tokensExpanded && (
          <View style={{ marginTop: 8 }}>
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TextInput value={tokensTemp} onChangeText={(t) => setTokensTemp(t.replace(/[^0-9.]/g, ''))} placeholder="0" placeholderTextColor="#94A3B8" style={[styles.input, { flex: 1 }]} />
                <View style={{ alignItems: 'flex-end', marginRight: 6 }}>
                  <Text style={styles.muted}>≈ ${(() => { const n = Number(tokensTemp || 0); return (Number.isNaN(n) ? 0 : round2(n * TOKEN_VALUE)).toFixed(2); })()}</Text>
                </View>
                <Pressable onPress={() => {
                  const n = Number(tokensTemp || 0);
                  setTokensAmount(n);
                  setUseTokens(n > 0);
                  setTokensExpanded(false);
                }} style={[styles.applyButton, { paddingHorizontal: 12 }]}> 
              <Text style={styles.applyButtonText}>Accept</Text>
                </Pressable>
              </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.muted}>Available: {availableTokens.toFixed(0)} tokens (≈ ${round2(availableTokens * TOKEN_VALUE).toFixed(2)})</Text>
              <Pressable onPress={() => { setTokensExpanded(false); setTokensTemp(String(tokensAmount || '')); }}>
                <Text style={styles.link}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
        )}
      </View>

      {/* Resumen de costos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cost summary</Text>
        <View style={styles.rowBetween}><Text style={styles.muted}>Subtotal</Text><Text style={styles.value}>${subtotal.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Service fee</Text><Text style={styles.value}>${serviceFee.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Delivery</Text><Text style={styles.value}>${deliveryFee.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Tip</Text><Text style={styles.value}>${tipValue.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Discount</Text><Text style={styles.value}>-${promoDiscount.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Tokens</Text><Text style={styles.value}>-${tokensApplied.toFixed(2)}</Text></View>
        <View style={[styles.rowBetween, { marginTop: 8 }]}><Text style={[styles.value, { fontWeight: '800' }]}>Total</Text><Text style={[styles.value, { fontWeight: '800' }]}>${total.toFixed(2)}</Text></View>
      </View>

      {/* CTA: navegar a tracking */}
      <Pressable
        style={[styles.cta, { marginBottom: insets.bottom || 16 }]}
        onPress={() => router.push({ pathname: '/generating', params: {
          fuel,
          liters: String(liters),
          address,
          vehicleId: selectedVehicleId || '',
          dispatcherType: dispatcherType || '',
          scheduleType,
          scheduleDate,
          scheduleTime,
          appliedPromo: appliedPromo || '',
          tip: String(tipValue),
          total: String(total)
        } })}
      >
  <Text style={styles.ctaText}>Request Service</Text>
      </Pressable>
    </KeyboardAwareScrollView>
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

type Vehicle = {
  id: string;
  photos?: string[];
  plate: string;
  brand?: string;
  model?: string;
};

function DispatcherCard({ title, subtitle, icon, selected, onPress }: { title: string; subtitle: string; icon: any; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.dispatcherCard, selected && styles.dispatcherCardActive]}>
      <Ionicons name={icon} size={18} color={selected ? '#14617B' : '#64748B'} />
      <View style={{ marginLeft: 8 }}>
        <Text style={styles.dispatcherTitle}>{title}</Text>
        <Text style={styles.dispatcherSub}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}



function round2(n: number) { return Math.round(n * 100) / 100; }
