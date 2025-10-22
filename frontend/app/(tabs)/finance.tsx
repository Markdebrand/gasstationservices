import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import Header from '../components/Header';
import Svg, { Rect, Line as SvgLine, Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path as any);

import styles from '../../src/styles/financeStyles';

const monthly = [
  { m: 'Ene', gasto: 82 },
  { m: 'Feb', gasto: 120 },
  { m: 'Mar', gasto: 95 },
  { m: 'Abr', gasto: 141 },
  { m: 'May', gasto: 108 },
  { m: 'Jun', gasto: 130 },
];

const trend = [
  { m: 'Ene', v: 78 },
  { m: 'Feb', v: 110 },
  { m: 'Mar', v: 92 },
  { m: 'Abr', v: 140 },
  { m: 'May', v: 104 },
  { m: 'Jun', v: 118 },
];

const transactions = [
  { id: 1, title: 'Gasolina Premium', date: '15 Jun, 2025', amount: -65 },
  { id: 2, title: 'HSO Refund', date: '12 Jun, 2025', amount: 10 },
  { id: 3, title: 'Diesel', date: '08 Jun, 2025', amount: -42 },
];

export default function Finance() {
  const insets = useSafeAreaInsets();
  const [isInteracting, setIsInteracting] = React.useState(false);
  const [animateTrigger, setAnimateTrigger] = React.useState(0);
  // custom tab bar base height in TabsLayout is 64 + bottom inset (min 8)
  const tabBarBase = 64;
  const contentPadBottom = tabBarBase + Math.max(insets.bottom, 8) + 12; // extra breathing room

  useFocusEffect(
    React.useCallback(() => {
      // increment trigger whenever screen gets focus to restart animations
      setAnimateTrigger((t) => t + 1);
      return () => {};
    }, [])
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: contentPadBottom }} scrollEnabled={!isInteracting}>
      <Header />

  <Text style={styles.title}>Finance</Text>
  <Text style={styles.subtitle}>Spending summary and balance</Text>

      {/* Balance card */}
      <LinearGradient colors={["#10b981", "#059669"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.balanceCard}>
        <View style={styles.balanceRow}>
          <View>
            <Text style={styles.balanceOverline}>Total Balance</Text>
            <Text style={styles.balanceValue}>$1,245.80</Text>
            <Text style={styles.balanceDelta}>+12.5% this month</Text>
          </View>
          <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
        </View>
      </LinearGradient>

      {/* Monthly spend (bars) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Monthly Spend</Text>
  <ChartBars data={monthly} height={160} barColor="#10b981" onInteractionChange={setIsInteracting} animateTrigger={animateTrigger} />
      </View>

      {/* Trend (line) */}
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text style={styles.cardTitle}>Consumption Trend</Text>
          <MaterialIcons name="trending-up" size={16} color="#6B7280" />
        </View>
  <ChartLine data={trend.map(t => t.v)} height={140} color="#10b981" onInteractionChange={setIsInteracting} animateTrigger={animateTrigger} />
      </View>

      {/* Transactions */}
      <View style={[styles.card, { paddingVertical: 8 }] }>
        <Text style={[styles.cardTitle, { paddingHorizontal: 8, paddingTop: 6 }]}>Recent Transactions</Text>
        {transactions.map((t) => (
          <View key={t.id} style={styles.txRow}>
            <View>
              <Text style={styles.txTitle}>{t.title}</Text>
              <Text style={styles.txDate}>{t.date}</Text>
            </View>
            <Text style={[styles.txAmount, { color: t.amount < 0 ? '#E11D48' : '#059669' }]}>
              {t.amount < 0 ? `-$${Math.abs(t.amount).toFixed(2)}` : `+$${t.amount.toFixed(2)}`}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function ChartBars({ data, height = 160, barColor = '#10b981', onInteractionChange, animateTrigger }: { data: { m: string; gasto: number }[]; height?: number; barColor?: string; onInteractionChange?: (v: boolean) => void; animateTrigger?: number }) {
  const [width, setWidth] = React.useState(0);
  const padX = 16;
  const padTop = 16;
  const padBottom = 30; // leave more room for month labels
  const maxVal = Math.max(...data.map(d => d.gasto));
  const toY = (v: number) => padTop + (height - padTop - padBottom) * (1 - v / (maxVal || 1));
  const barW = 22;
  const gap = 14;
  const totalW = data.length * barW + (data.length - 1) * gap;

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [active, setActive] = React.useState(false);

  const updateActiveFromX = React.useCallback((x: number) => {
    if (width === 0) return;
    const usable = Math.max(padX, Math.min(x, width - padX));
    const step = barW + gap;
    const idx = Math.round((usable - padX) / step);
    const clamped = Math.max(0, Math.min(idx, data.length - 1));
    setActiveIndex(clamped);
  }, [width, barW, gap, data.length]);

  React.useEffect(() => { onInteractionChange?.(active); }, [active, onInteractionChange]);

  // animation values per bar
  const animsRef = React.useRef<Animated.Value[]>(data.map(() => new Animated.Value(0)));
  const anims = animsRef.current;

  React.useEffect(() => {
    // reset and run staggered grow animation whenever animateTrigger changes
    anims.forEach(a => a.setValue(0));
    const seq = anims.map((a, i) => Animated.timing(a, { toValue: 1, duration: 420, delay: i * 80, useNativeDriver: false }));
    Animated.stagger(80, seq).start();
  }, [anims, animateTrigger]);

  return (
    <View
      style={{ height }}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => { setActive(true); updateActiveFromX(e.nativeEvent.locationX); }}
      onResponderMove={(e) => updateActiveFromX(e.nativeEvent.locationX)}
      onResponderRelease={() => setActive(false)}
      onResponderTerminate={() => setActive(false)}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {/* ticks only (labels rendered as RN Text below) */}
          {data.map((d, i) => {
            const x = padX + i * (barW + gap) + barW / 2;
            return (
              <SvgLine key={`tick-${i}`} x1={x} y1={height - padBottom + 6} x2={x} y2={height - padBottom + 6} stroke="#6B7280" />
            );
          })}
        </Svg>
      )}

      {/* Bars are rendered as Animated Views over the SVG canvas for smoother height animation */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: padBottom }} pointerEvents="none">
        {width > 0 && data.map((d, i) => {
          const x = padX + i * (barW + gap);
          const y = toY(d.gasto);
          const finalH = Math.max(4, height - padBottom - y);
          const animH = anims[i].interpolate({ inputRange: [0, 1], outputRange: [0, finalH] });
          return (
            <Animated.View key={`bar-${i}`} style={{ position: 'absolute', left: x, bottom: 0, width: barW, height: animH, borderRadius: 6, backgroundColor: i === activeIndex ? '#10b981' : barColor, opacity: i === activeIndex ? 1 : 0.95 }} />
          );
        })}
      </View>

      {/* X labels */}
      <View style={{ position: 'absolute', bottom: 6, left: padX, right: padX, flexDirection: 'row', justifyContent: 'space-between' }}>
        {data.map((d, i) => (
          <Text key={`lbl-${i}`} style={styles.tickLabel}>{d.m}</Text>
        ))}
      </View>

      {/* Overlays: cursor line, marker, tooltip for active bar */}
      {active && activeIndex != null && width > 0 && (() => {
        const cx = padX + activeIndex * (barW + gap) + barW / 2;
        const value = data[activeIndex].gasto;
        // compute y for marker (top of the bar)
        const y = toY(value);
        const tooltipLeft = Math.min(Math.max(cx - 48, 6), Math.max(6, width - 96));
        return (
          <>
            <View pointerEvents="none" style={{ position: 'absolute', left: cx, top: 0, width: 2, height, backgroundColor: 'rgba(16,185,129,0.12)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: cx - 6, top: y - 6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: tooltipLeft, top: Math.max(y - 44, 6), paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A' }}>${value.toFixed(2)}</Text>
            </View>
          </>
        );
      })()}
    </View>
  );
}

function ChartLine({ data, height = 140, color = '#10b981', onInteractionChange, animateTrigger }: { data: number[]; height?: number; color?: string; onInteractionChange?: (v: boolean) => void; animateTrigger?: number }) {
  const [width, setWidth] = React.useState(0);
  const padX = 16;
  const padY = 18;
  const min = Math.min(...data);
  const max = Math.max(...data);

  const [points, polyPoints] = React.useMemo(() => {
    if (width === 0) return [[], ''] as [Array<{ x: number; y: number }>, string];
    const step = (width - 2 * padX) / (data.length - 1);
    const ptsArr = data.map((v, i) => {
      const x = padX + i * step;
      const y = padY + (height - 2 * padY) * (1 - (v - min) / (max - min || 1));
      const xSnap = Math.round(x) + 0.5;
      const ySnap = Math.round(y) + 0.5;
      return { x: xSnap, y: ySnap };
    });
    const str = ptsArr.map((p) => `${p.x},${p.y}`).join(' ');
    return [ptsArr, str];
  }, [width, data, height, padX, padY, min, max]);

  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
  const [active, setActive] = React.useState(false);

  const updateActiveFromX = React.useCallback((x: number) => {
    if (width === 0 || points.length === 0) return;
    const usable = Math.max(padX, Math.min(x, width - padX));
    const step = (width - 2 * padX) / (data.length - 1);
    const idx = Math.round((usable - padX) / step);
    const clamped = Math.max(0, Math.min(idx, data.length - 1));
    setActiveIndex(clamped);
  }, [width, data.length, points.length, padX]);
  React.useEffect(() => { onInteractionChange?.(active); }, [active, onInteractionChange]);

  // Path draw animation
  const pathRef = React.useRef<any>(null);
  const dashAnim = React.useRef(new Animated.Value(0)).current;
  const [pathLen, setPathLen] = React.useState<number>(0);

  React.useEffect(() => {
    if (!pathRef.current || !polyPoints) return;
    // restart animation when animateTrigger changes
    const t = setTimeout(() => {
      try {
        const len = pathRef.current.getTotalLength();
        setPathLen(len);
        dashAnim.setValue(len);
        Animated.timing(dashAnim, { toValue: 0, duration: 800, useNativeDriver: false }).start();
      } catch (e) {
        // ignore if not available
      }
    }, 20);
    return () => clearTimeout(t);
  }, [polyPoints, dashAnim, animateTrigger]);

  return (
    <View
      style={{ height }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => { setActive(true); updateActiveFromX(e.nativeEvent.locationX); }}
      onResponderMove={(e) => updateActiveFromX(e.nativeEvent.locationX)}
      onResponderRelease={() => setActive(false)}
      onResponderTerminate={() => setActive(false)}
  >
      {width > 0 && (
        <Svg width={width} height={height}>
          {/* animated path (strokeDashoffset animates) */}
          {polyPoints.length > 0 && (
            <AnimatedPath
              ref={pathRef}
              d={`M ${polyPoints.split(' ').join(' L ')}`}
              fill="none"
              stroke={color}
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
              height,
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
              ${data[activeIndex].toFixed(2)}
            </Text>
          </View>
        </>
      )}
      {/* notify parent */}
      <>{React.useEffect(() => { onInteractionChange?.(active); return () => {}; }, [active])}</>
    </View>
  );
}

 
