import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Header from '../components/Header';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  // Nuevo: programación, promo, propina y tokens
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
  // ...existing code...

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

  // Cargar ubicaciones guardadas
  // ...existing code...

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
    

  <Text style={styles.title}>Solicitar Servicio</Text>
  <Text style={styles.subtitle}>Completa los detalles de tu pedido</Text>

      {/* Tipo de Combustible */}
  <Text style={styles.overline}>Tipo de Combustible</Text>
      <View style={styles.grid3}>
        <FuelCard label="Premium" price={FUEL_PRICES.premium} selected={fuel === 'premium'} onPress={() => setFuel('premium')} />
        <FuelCard label="Regular" price={FUEL_PRICES.regular} selected={fuel === 'regular'} onPress={() => setFuel('regular')} />
  <FuelCard label="Diesel" price={FUEL_PRICES.diesel} selected={fuel === 'diesel'} onPress={() => setFuel('diesel')} />
      </View>

      <Text style={[styles.overline, { marginTop: 14 }]}>Tu Vehículo (para identificar)</Text>
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
              <Text style={styles.vehicleTitle}>{v.plate}</Text>
              <Text style={styles.vehicleSub}>{v.brand || ''} {v.model || ''}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/vehicle')} style={[styles.addVehicleBox]}>
          <Ionicons name="add" size={22} color="#0F172A" />
        </Pressable>
      </ScrollView>

      {/* Tipo de Vehículo del Despachadorr */}
      <Text style={[styles.overline, { marginTop: 14 }]}>Tipo de Vehículo del Despachador</Text>
      <View style={styles.grid2}> 
        <DispatcherCard title="Camioneta" subtitle="AB-1234 • 100L" icon="car" selected={dispatcherType==='pickup'} onPress={() => setDispatcherType('pickup')} />
        <DispatcherCard title="Camión chico" subtitle="CD-5678 • 250L" icon="bus" selected={dispatcherType==='small-truck'} onPress={() => setDispatcherType('small-truck')} />
      </View>

      {/* Cantidad (Litros) */}
  <Text style={[styles.overline, { marginTop: 14 }]}>Cantidad (Litros)</Text>
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
            <Text style={styles.cardTitle}>Ubicación de Entrega</Text>
            <Text style={styles.cardSub}>{address}</Text>
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>¿Cuándo lo quieres?</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          <Pressable onPress={() => setScheduleType('asap')} style={[styles.pill, scheduleType==='asap' && styles.pillActive]}>
            <Text style={[styles.pillText, scheduleType==='asap' && styles.pillTextActive]}>Lo antes posible</Text>
          </Pressable>
          <Pressable onPress={() => setScheduleType('scheduled')} style={[styles.pill, scheduleType==='scheduled' && styles.pillActive]}>
            <Text style={[styles.pillText, scheduleType==='scheduled' && styles.pillTextActive]}>Programar</Text>
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
        <Text style={styles.cardTitle}>Promociones y código</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' }}>
          <TextInput value={promoInput} onChangeText={setPromoInput} placeholder="Código (ej. HSO10)" placeholderTextColor="#94A3B8" style={[styles.input, { flex: 1 }]} />
          <Pressable onPress={applyPromo} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Aplicar</Text>
          </Pressable>
        </View>
        {appliedPromo ? (
          <View style={[styles.rowBetween, { marginTop: 8 }]}>
            <Text style={{ color: '#065F46', fontWeight: '700' }}>Aplicado: {appliedPromo}</Text>
            <Pressable onPress={removePromo}><Text style={styles.link}>Quitar</Text></Pressable>
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
        <Text style={styles.cardTitle}>Propina</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {[0,5,10,15].map(p => (
            <Pressable key={p} onPress={() => { setTipMode('percent'); setTipPercent(p); }} style={[styles.pill, tipMode==='percent' && tipPercent===p && styles.pillActive]}>
              <Text style={[styles.pillText, tipMode==='percent' && tipPercent===p && styles.pillTextActive]}>{p}%</Text>
            </Pressable>
          ))}
          <Pressable onPress={() => setTipMode('custom')} style={[styles.pill, tipMode==='custom' && styles.pillActive]}>
            <Text style={[styles.pillText, tipMode==='custom' && styles.pillTextActive]}>Personalizar</Text>
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
              <Text style={styles.applyButtonText}>Aplicar</Text>
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
                  <Text style={styles.applyButtonText}>Aceptar</Text>
                </Pressable>
              </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={styles.muted}>Disponible: {availableTokens.toFixed(0)} tokens (≈ ${round2(availableTokens * TOKEN_VALUE).toFixed(2)})</Text>
              <Pressable onPress={() => { setTokensExpanded(false); setTokensTemp(String(tokensAmount || '')); }}>
                <Text style={styles.link}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        </View>
        )}
      </View>

      {/* Resumen de costos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen de costos</Text>
        <View style={styles.rowBetween}><Text style={styles.muted}>Subtotal</Text><Text style={styles.value}>${subtotal.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Fee del servicio</Text><Text style={styles.value}>${serviceFee.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Delivery</Text><Text style={styles.value}>${deliveryFee.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Propina</Text><Text style={styles.value}>${tipValue.toFixed(2)}</Text></View>
        <View style={styles.rowBetween}><Text style={styles.muted}>Descuento</Text><Text style={styles.value}>-${promoDiscount.toFixed(2)}</Text></View>
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
  <Text style={styles.ctaText}>Solicitar Servicio</Text>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  overline: { marginTop: 12, fontSize: 12, color: '#64748B' },
  grid3: { flexDirection: 'row', gap: 12, marginTop: 8 },
  grid2: { flexDirection: 'row', gap: 12, marginTop: 8 },
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
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E6EDF0' },
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  muted: { color: '#64748B' },
  value: { color: '#0F172A' },
  applyButton: { height: 36, borderRadius: 10, paddingHorizontal: 8, minWidth: 60, backgroundColor: '#14617B', alignItems: 'center', justifyContent: 'center' },
  applyButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  vehiclePill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E6EDF0', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, marginRight: 10 },
  vehiclePillActive: { borderColor: '#14617B', backgroundColor: 'rgba(20,97,123,0.05)' },
  vehicleThumb: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEE' },
  vehicleTitle: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  vehicleSub: { fontSize: 11, color: '#64748B' },
  addVehicleBox: { width: 56, height: 56, borderRadius: 14, borderWidth: 1, borderColor: '#E6EDF0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  dispatcherCard: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E6EDF0', borderRadius: 16, padding: 12, backgroundColor: '#FFFFFF' },
  dispatcherCardActive: { borderColor: '#14617B', backgroundColor: 'rgba(20,97,123,0.05)' },
  dispatcherTitle: { fontWeight: '700', color: '#0F172A' },
  dispatcherSub: { fontSize: 12, color: '#64748B' },
});

function round2(n: number) { return Math.round(n * 100) / 100; }
