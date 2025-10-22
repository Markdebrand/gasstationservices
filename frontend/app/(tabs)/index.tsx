import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Polyline, Path } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const AnimatedPath = Animated.createAnimatedComponent(Path as any);
import Header from '../components/Header';
import styles from '../../src/styles/indexStyles';

const chartData = [1.08, 1.12, 1.14, 1.1, 1.16, 1.18];

export default function HomeScreen() {
  const router = useRouter();
  const [pending, setPending] = React.useState<any | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('order:pendingPayment');
          if (!active) return;
          if (raw) {
            const rec = JSON.parse(raw);
            setPending(rec && rec.paid === false ? rec : null);
          } else {
            setPending(null);
          }
        } catch {
          setPending(null);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 80 }}>
      <Header />

      {pending && (
        <View style={[styles.card, { backgroundColor: '#F0FBF6', borderColor: '#CBE9DC' }] }>
          <Text style={styles.cardTitle}>Pending payment</Text>
          <Text style={styles.cardMeta}>
            {pending.summary || 'Order'} • Total ${pending.total}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Pressable
              style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: '#14617B', alignItems: 'center', justifyContent: 'center' }}
              onPress={() => {
                const q = new URLSearchParams({ resumePayment: '1', address: 'your location', vehicleId: String(pending.vehicleId || ''), fuel: String(pending.fuel || ''), liters: String(pending.liters || '') }).toString();
                router.push(`/tracking?${q}` as any);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800' }}>Resume payment</Text>
            </Pressable>
            <Pressable
              style={{ width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#E6EDF0', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
              onPress={async () => { try { await AsyncStorage.removeItem('order:pendingPayment'); } catch {}; setPending(null); }}
            >
              <Ionicons name="close" size={20} color="#0F172A" />
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.grid3}>
        <PriceBadge title="Gasolina" price="$1.18" unit="/L" trend="+1.2%" colorBg="#E0F2FE" icon={<MaterialCommunityIcons name="gas-station" size={16} color="#475569" />} />
  <PriceBadge title="Diesel" price="$1.06" unit="/L" trend="-0.4%" colorBg="#F1F5F9" negative icon={<Ionicons name="flame-outline" size={16} color="#475569" />} />
        <PriceBadge title="Premium" price="$1.34" unit="/L" trend="+0.6%" colorBg="#FEF3C7" icon={<Ionicons name="speedometer-outline" size={16} color="#475569" />} />
      </View>

  <View style={[styles.card, { marginTop: 8 }] }>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Price summary</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="trending-up-outline" color="#64748B" size={16} />
            <Text style={styles.cardMeta}>Average</Text>
          </View>
        </View>
        <View style={{ height: 120, justifyContent: 'center' }}>
          <PolylineChart data={chartData} />
        </View>
  <Text style={styles.cardNote}>Last 6 months • overall average</Text>
      </View>

      <View style={[styles.grid2, { marginTop: 16 }]}>
        <View style={styles.promoCard}>
          <Text style={styles.muted}>Promo</Text>
          <Text style={styles.bold}>HSO10: -10% on your first fill</Text>
        </View>
        <View style={styles.smallCard}>
          <Text style={styles.muted}>Last order</Text>
          <Text style={styles.bold}>Premium • 20L • $26.80</Text>
        </View>
      </View>

  <TouchableOpacity style={[styles.cta, { marginTop: 20 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="water-outline" size={18} color="#F7FBFE" />
          <Text style={styles.ctaText}>Request service</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

function PriceBadge({ title, price, unit, trend, colorBg, negative, icon }: { title: string; price: string; unit: string; trend: string; colorBg: string; negative?: boolean; icon?: React.ReactNode }) {
  return (
    <View style={[styles.badge, { backgroundColor: colorBg }]}>
      <View style={styles.badgeRow}>
        <Text style={styles.muted}>{title}</Text>
        <View>{icon}</View>
      </View>
      <Text style={styles.badgePrice}>
        {price}
        <Text style={styles.badgeUnit}>{unit}</Text>
      </Text>
      <Text style={[styles.badgeTrend, { backgroundColor: negative ? '#FFF1F2' : '#ECFDF5', color: negative ? '#E11D48' : '#059669' }]}>{trend}</Text>
    </View>
  );
}

function PolylineChart({ data }: { data: number[] }) {
  const [width, setWidth] = React.useState(0);
  const height = 100;
  const padX = 12;
  const padY = 16;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const toY = (v: number) => padY + (height - 2 * padY) * (1 - (v - min) / (max - min || 1));

  const [points, polyPoints] = React.useMemo(() => {
    if (width === 0) return [[], { poly: '', path: '' } ] as [Array<{ x: number; y: number }>, { poly: string; path: string }];
    const step = (width - 2 * padX) / (data.length - 1);
    const ptsArr = data.map((v, i) => {
      const x = padX + i * step;
      const y = toY(v);
      // snap to half-pixel to reduce anti-aliasing seams
      const xSnap = Math.round(x) + 0.5;
      const ySnap = Math.round(y) + 0.5;
      return { x: xSnap, y: ySnap };
    });
    const str = ptsArr.map((p) => `${p.x},${p.y}`).join(' ');
    const path = ptsArr.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return [ptsArr, { poly: str, path }];
  }, [width, data]);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [active, setActive] = React.useState(false);
  const dashAnim = React.useRef(new Animated.Value(0)).current;
  const pathRef = React.useRef<any>(null);
  const [pathLen, setPathLen] = React.useState(0);

  useFocusEffect(
    React.useCallback(() => {
      // trigger draw animation whenever screen gains focus
      const t = setTimeout(() => {
        if (!pathRef.current) return;
        try {
          const len = pathRef.current.getTotalLength();
          setPathLen(len);
          dashAnim.setValue(len);
          Animated.timing(dashAnim, { toValue: 0, duration: 700, useNativeDriver: false }).start();
        } catch (e) {
          // ignore
        }
      }, 20);
      return () => clearTimeout(t);
    }, [width, data])
  );

  const updateActiveFromX = React.useCallback(
    (x: number) => {
      if (width === 0 || points.length === 0) return;
      const usable = Math.max(padX, Math.min(x, width - padX));
      const step = (width - 2 * padX) / (data.length - 1);
      const idx = Math.round((usable - padX) / step);
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      setActiveIndex(clamped);
    },
    [width, data.length, points.length]
  );

  return (
    <View
      style={{ height, width: '100%' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        setActive(true);
        updateActiveFromX(e.nativeEvent.locationX);
      }}
      onResponderMove={(e) => updateActiveFromX(e.nativeEvent.locationX)}
      onResponderRelease={() => setActive(false)}
      onResponderTerminate={() => setActive(false)}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {polyPoints && polyPoints.path && (
            <AnimatedPath
              ref={pathRef}
              d={polyPoints.path}
              fill="none"
              stroke="#14617B"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={pathLen ? `${pathLen} ${pathLen}` : undefined}
              strokeDashoffset={dashAnim}
            />
          )}
        </Svg>
      )}

      {active && activeIndex != null && points[activeIndex] && (
        <>
          {/* Cursor vertical line */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: points[activeIndex].x,
              top: 0,
              width: 1,
              height: height,
              backgroundColor: 'rgba(20,97,123,0.25)',
            }}
          />
          {/* Marker */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: points[activeIndex].x - 5,
              top: points[activeIndex].y - 5,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#14617B',
              borderWidth: 2,
              borderColor: '#F7FBFE',
            }}
          />
          {/* Tooltip */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: Math.min(Math.max(points[activeIndex].x - 36, 0), width - 72),
              top: Math.max(points[activeIndex].y - 34, 0),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#0F172A' }}>
              ${data[activeIndex].toFixed(2)} /L
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

 
