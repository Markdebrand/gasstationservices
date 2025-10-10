import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Header from './components/Header';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';

type ClientVehicle = {
  id: string;
  plate: string;
  brand?: string;
  model?: string;
};

export default function TrackingScreen() {
  const params = useLocalSearchParams();
  const { address, fuel, liters, vehicleId } = params as any;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dispatcher, setDispatcher] = React.useState<any | null>(null);
  const [showWaiting, setShowWaiting] = React.useState<boolean>(true);
  const [waitingProgress, setWaitingProgress] = React.useState<number>(0);
  const [arrived, setArrived] = React.useState<boolean>(false);
  const [showArrivalAnim, setShowArrivalAnim] = React.useState<boolean>(false);
  const [progressPercent, setProgressPercent] = React.useState<number>(0);
  const [etaMinutes, setEtaMinutes] = React.useState<number>(1);
  const [clientVehicle, setClientVehicle] = React.useState<ClientVehicle | null>(null);
  const [showPayment, setShowPayment] = React.useState<boolean>(false);
  const [paid, setPaid] = React.useState<boolean>(false);
  const resumeAppliedRef = React.useRef(false);

  // Load client's vehicle info for payment summary
  React.useEffect(() => {
    const load = async () => {
      if (!vehicleId) return;
      const raw = await AsyncStorage.getItem('user:vehicles');
      const list = raw ? JSON.parse(raw) : [];
      const found = list.find((v: any) => v.id === vehicleId);
      if (found) setClientVehicle({ id: found.id, plate: found.plate, brand: found.brand, model: found.model });
    };
    load();
  }, [vehicleId]);

  // If resuming a pending payment, skip waiting and show modal (run only once)
  React.useEffect(() => {
    if (resumeAppliedRef.current) return;
    const p: any = params as any;
    if (p?.resumePayment && !paid) {
      resumeAppliedRef.current = true;
      setDispatcher({ name: 'Juan Delgado', plate: 'AB-1234', vehicle: 'Toyota Hilux', photo: null });
      setShowWaiting(false);
      setArrived(true);
      setProgressPercent(100);
      setEtaMinutes(0);
      setShowArrivalAnim(false);
      setShowPayment(true);
    }
  }, [paid]);

  // No vehicle details shown in simplified view

  // Simulate waiting for dispatcher acceptance
  React.useEffect(() => {
    if (!showWaiting) return;
    const id = setInterval(() => {
      setWaitingProgress((p) => {
        const inc = Math.floor(Math.random() * 15) + 8; // 8-22%
        const next = Math.min(100, p + inc);
        if (next >= 100) {
          clearInterval(id);
          // Auto-assign dispatcher on acceptance
          setDispatcher({ name: 'Juan Delgado', plate: 'AB-1234', vehicle: 'Toyota Hilux', photo: null });
          setShowWaiting(false);
        }
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, [showWaiting]);

  // Animated pulse for map pin (only when dispatcher is assigned)
  const pulse = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (!dispatcher) return;
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [dispatcher, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.2] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });

  // Simulate journey progress with ETA and arrival
  React.useEffect(() => {
    if (!dispatcher) return;
    const ARRIVAL_MS = 60000; // 1 minute journey simulation
    const start = Date.now();
    setArrived(false);
    setProgressPercent(0);
    setEtaMinutes(Math.max(1, Math.ceil(ARRIVAL_MS / 60000)));
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.floor((elapsed / ARRIVAL_MS) * 100));
      setProgressPercent(progress);
      const remaining = Math.max(0, ARRIVAL_MS - elapsed);
      setEtaMinutes(Math.max(0, Math.ceil(remaining / 60000)));
      if (elapsed >= ARRIVAL_MS) {
        clearInterval(tick);
        setArrived(true);
        setShowArrivalAnim(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setTimeout(() => setShowPayment(true), 1200);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [dispatcher]);

  // Persist pending payment when modal opens; update on paid
  const paymentSummary = React.useMemo(() => (
    clientVehicle ? `${clientVehicle.brand || ''} ${clientVehicle.model || ''} • ${clientVehicle.plate}` : ''
  ), [clientVehicle?.brand, clientVehicle?.model, clientVehicle?.plate]);

  React.useEffect(() => {
    if (!showPayment) return;
    const total = computeTotal(fuel, liters);
    const record = { fuel, liters, vehicleId, total, summary: paymentSummary, paid: false, ts: Date.now() };
    AsyncStorage.setItem('order:pendingPayment', JSON.stringify(record)).catch(() => {});
  }, [showPayment]);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('order:pendingPayment');
        if (!raw) return;
        const rec = JSON.parse(raw);
        if (paid) {
          rec.paid = true;
          await AsyncStorage.setItem('order:pendingPayment', JSON.stringify(rec));
        }
      } catch {}
    })();
  }, [paid]);

  // Arrival success animation values
  const successScale = React.useRef(new Animated.Value(0.4)).current;
  const successOpacity = React.useRef(new Animated.Value(0)).current;
  const ringScale = React.useRef(new Animated.Value(0.8)).current;
  const ringOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!showArrivalAnim) return;
    successScale.setValue(0.4);
    successOpacity.setValue(0);
    ringScale.setValue(0.8);
    ringOpacity.setValue(0);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(successScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(ringOpacity, { toValue: 0.6, duration: 200, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.6, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // keep briefly then hide overlay
      setTimeout(() => setShowArrivalAnim(false), 1200);
    });
  }, [showArrivalAnim, successScale, successOpacity, ringScale, ringOpacity]);

  return (
    <View style={styles.root}>
      <Header showBack />
      <Text style={styles.title}>Seguimiento del despacho</Text>
      <Text style={styles.subtitle}>
        {dispatcher ? (arrived ? 'Despachador llegó a tu ubicación' : 'Despachador asignado') : 'Esperando confirmación del despachador…'}
      </Text>

      {/* Map placeholder appears after acceptance, fills available space */}
      {dispatcher && (
        <View style={styles.mapBoxLarge}>
          <View style={styles.mapBackdrop} />
          <Animated.View style={[styles.pinPulse, { transform: [{ scale }], opacity }]} />
          <View style={styles.pinCenter}>
            <Ionicons name="paper-plane" size={20} color="#0B5C73" />
          </View>
          {/* Compact progress/ETA card overlay */}
          {!arrived && (
            <View style={styles.progressCard}>
              <Text style={styles.sectionTitle}>{progressPercent >= 100 ? 'En destino' : 'En camino'}</Text>
              <Text style={{ color: '#64748B', marginTop: 6 }}>Tiempo estimado: {etaMinutes} min</Text>
              <View style={{ marginTop: 10, height: 10, backgroundColor: '#EEF6F3', borderRadius: 999 }}>
                <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: '#059669', borderRadius: 999 }} />
              </View>
              <View style={{ position: 'absolute', right: 12, top: 12, backgroundColor: '#E6FAF2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ color: '#065F46', fontWeight: '700' }}>{progressPercent}%</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Bottom pinned dispatcher card over the map */}
      {dispatcher && (
        <View style={[styles.bottomCard, { left: 16, right: 16, bottom: Math.max(16, insets.bottom + 8) }]}> 
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
              {dispatcher?.photo ? (
                <Image source={{ uri: dispatcher.photo }} style={{ width: 52, height: 52, borderRadius: 10 }} />
              ) : (
                <Ionicons name="person" size={28} color="#64748B" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', color: '#0F172A' }}>{dispatcher?.name}</Text>
              <Text style={{ color: '#64748B', marginTop: 6 }}>Repartidor</Text>
              <Text style={{ color: '#64748B', marginTop: 6 }}>{`${dispatcher.vehicle || 'Vehículo'} • Placa: ${dispatcher.plate}`}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="call" size={20} color="#0F172A" />
              </Pressable>
              <Pressable style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chatbubble" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
          {arrived && !paid && !showPayment && (
            <Pressable
              onPress={() => setShowPayment(true)}
              style={{ marginTop: 12, height: 44, borderRadius: 10, backgroundColor: '#14617B', alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Reanudar pago</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Arrival animation overlay */}
      {showArrivalAnim && (
        <View style={styles.arrivalOverlay}>
          <Animated.View style={[styles.arrivalRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
          <Animated.View style={[styles.arrivalBadge, { transform: [{ scale: successScale }], opacity: successOpacity }]}>
            <Ionicons name="checkmark" size={38} color="#fff" />
          </Animated.View>
          <Text style={styles.arrivalText}>¡Despachador en destino!</Text>
        </View>
      )}

      {/* Payment modal with NFC pulse */}
      <Modal visible={showPayment} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={[styles.paymentCard, { paddingBottom: Math.max(16, insets.bottom + 8) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.sectionTitle}>Entregado</Text>
                <Text style={{ color: '#64748B' }}>Tiempo estimado: {Math.max(1, etaMinutes)} min</Text>
              </View>
              <View style={{ backgroundColor: '#E6FAF2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
                <Text style={{ color: '#065F46', fontWeight: '800' }}>100%</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginTop: 18 }}>
              {paid ? (
                <>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: '#0F172A' }}>Pago recibido</Text>
                  <Text style={{ color: '#64748B', marginTop: 6, textAlign: 'center' }}>Gracias. Se ha procesado el pago con NFC.</Text>
                </>
              ) : (
                <>
                  <Text style={{ fontWeight: '800', fontSize: 18, color: '#0F172A' }}>Pagar con NFC</Text>
                  <Text style={{ color: '#64748B', marginTop: 6, textAlign: 'center' }}>Acerca tu teléfono para completar el pago.</Text>
                </>
              )}

              {!paid && (
                <NfcPulse onPaid={() => setPaid(true)} />
              )}
            </View>

            <View style={{ marginTop: 16 }}>
              <Text style={{ color: '#64748B' }}>Pedido</Text>
              <Text style={{ fontWeight: '800', color: '#0F172A', marginTop: 4 }}>
                {clientVehicle ? `${clientVehicle.brand || ''} ${clientVehicle.model || ''} • ${clientVehicle.plate}` : '-'}
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: '#64748B' }}>Total</Text>
              <Text style={{ fontWeight: '800', color: '#0F172A', marginTop: 4 }}>${computeTotal(fuel, liters)}</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <Pressable onPress={async () => {
                setShowPayment(false);
                if (paid) {
                  try { await AsyncStorage.removeItem('order:pendingPayment'); } catch {}
                }
                router.replace('/');
              }} style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: '#14617B', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Volver al inicio</Text>
              </Pressable>
              <Pressable onPress={() => { setShowPayment(false); }} style={{ flex: 1, height: 48, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E6EDF0' }}>
                <Text style={{ color: '#0F172A', fontWeight: '800' }}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Waiting modal for acceptance */}
      <Modal visible={showWaiting} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#fff', width: '86%', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E6EDF0' }}>
            <Text style={{ fontWeight: '800', fontSize: 16, color: '#0F172A' }}>Esperando confirmación…</Text>
            <Text style={{ color: '#64748B', marginTop: 6 }}>Buscando un despachador disponible para tu pedido en {address || 'tu ubicación'}.</Text>
            <View style={{ marginTop: 14, height: 10, backgroundColor: '#EEF6F3', borderRadius: 999 }}>
              <View style={{ width: `${waitingProgress}%`, height: '100%', backgroundColor: '#10B981', borderRadius: 999 }} />
            </View>
            <Text style={{ marginTop: 8, color: '#64748B', fontSize: 12 }}>{waitingProgress}%</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setShowWaiting(false)} style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#0F172A', fontWeight: '700' }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => { setDispatcher({ name: 'Juan Delgado', plate: 'AB-1234', vehicle: 'Toyota Hilux', photo: null }); setShowWaiting(false); setWaitingProgress(100); }} style={{ flex: 1, height: 44, borderRadius: 10, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Forzar aceptar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  mapBoxLarge: { flex: 1, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E6EDF0', backgroundColor: '#E6F3F7', alignItems: 'center', justifyContent: 'center' },
  mapBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#DDEFF5' },
  pinPulse: { position: 'absolute', width: 90, height: 90, borderRadius: 999, backgroundColor: 'rgba(20,97,123,0.18)' },
  pinCenter: { width: 46, height: 46, borderRadius: 999, backgroundColor: '#E8F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFE6ED' },
  bottomCard: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E6EDF0' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E6EDF0' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  label: { color: '#64748B', fontSize: 12 },
  value: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  hint: { marginTop: 10, color: '#64748B', fontSize: 12 },
  arrivalOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  arrivalRing: { position: 'absolute', width: 220, height: 220, borderRadius: 220, backgroundColor: 'rgba(16,185,129,0.25)' },
  arrivalBadge: { width: 120, height: 120, borderRadius: 120, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  arrivalText: { marginTop: 16, color: '#0F172A', fontWeight: '800' },
  progressCard: { position: 'absolute', left: 12, right: 12, top: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E6EDF0' },
  paymentCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});

// Helper component: NFC pulse button
function NfcPulse({ onPaid }: { onPaid: () => void }) {
  const s = React.useRef(new Animated.Value(1)).current;
  const o = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(s, { toValue: 1.08, duration: 650, useNativeDriver: true }),
          Animated.timing(s, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(o, { toValue: 0.85, duration: 650, useNativeDriver: true }),
          Animated.timing(o, { toValue: 1, duration: 650, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [s, o]);

  return (
    <Animated.View style={{ transform: [{ scale: s }], opacity: o, marginTop: 16 }}>
      <Pressable onPress={onPaid} style={{ width: 120, height: 120, borderRadius: 999, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="phone-portrait" size={40} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

// Helper: compute total from params
function computeTotal(fuel?: string, liters?: string | number) {
  const l = Number(liters || 0);
  let price = 0;
  if (fuel === 'premium') price = 1.45;
  else if (fuel === 'regular') price = 1.32;
  else if (fuel === 'eco') price = 1.28;
  return (price * l).toFixed(2);
}
