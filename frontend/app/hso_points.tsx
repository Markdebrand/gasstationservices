import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, FlatList, Dimensions, Animated, Easing, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './components/Header';
import { Colors } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import HsoPointsCard from './components/HSOPointsCard';
import { useHsoPoints } from '@/app/contexts/HSOPointsContext';

const { width } = Dimensions.get('window');

export default function HsoPoints() {
  const insets = useSafeAreaInsets();
  const [modalTier, setModalTier] = React.useState<any | null>(null);
  const { points, addPoints, currentTier, tiers } = useHsoPoints();

  // Level-up overlay state and animation
  const [showLevelUp, setShowLevelUp] = React.useState(false);
  const levelUpAnim = React.useRef(new Animated.Value(0)).current; // 0: hidden, 1: visible
  const prevTierRef = React.useRef(currentTier.id);

  // confetti animated values
  const CONFETTI_COUNT = 10;
  const confettiAnims = React.useRef(Array.from({ length: CONFETTI_COUNT }, () => new Animated.Value(0))).current;

  React.useEffect(() => {
    const prev = prevTierRef.current;
    if (currentTier.id !== prev) {
      // determine upward movement (new tier is later in TIERS array)
  const prevIndex = tiers.findIndex(t => t.id === prev);
  const newIndex = tiers.findIndex(t => t.id === currentTier.id);
      if (newIndex > prevIndex) {
        // leveled up
        setShowLevelUp(true);
        // reset confetti animations
        confettiAnims.forEach(a => a.setValue(0));
        Animated.sequence([
          Animated.timing(levelUpAnim, { toValue: 1, duration: 500, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
          Animated.stagger(80, confettiAnims.map((a) => Animated.timing(a, { toValue: 1, duration: 900 + Math.random() * 400, easing: Easing.out(Easing.quad), useNativeDriver: true })))
        ]).start();
      }
    }
    prevTierRef.current = currentTier.id;
  }, [currentTier.id]);

  const closeLevelUp = () => {
    Animated.timing(levelUpAnim, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => setShowLevelUp(false));
  };

  const progressPct = React.useMemo(() => {
    const t = currentTier;
    const span = t.ptsMax - t.ptsMin;
    const relative = Math.max(0, Math.min(1, (points - t.ptsMin) / (span || 1)));
    return Math.round(relative * 100);
  }, [points, currentTier]);

  return (
    <>
      <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]} showsVerticalScrollIndicator={false}>
  <Header showBack />
    <Text style={styles.pageTitle}>Your level</Text>
        <HsoPointsCard />

    <Text style={{ marginTop: 18, fontWeight: '700', marginBottom: 8 }}>HSO Points tiers</Text>
        <View style={styles.verticalList}>
          {tiers.map((t) => (
            <Pressable key={t.id} style={[styles.tierCard, currentTier.id === t.id ? styles.tierCardActive : null]} onPress={() => setModalTier(t)}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.tierIcon, { backgroundColor: t.color, alignItems: 'center', justifyContent: 'center' }]}> 
                  <Ionicons name={t.iconName as any} size={20} color={Colors.light.text} />
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800' }}>{t.title}</Text>
                  <Text style={{ color: Colors.light.muted, marginTop: 4 }}>{t.range}</Text>
                </View>
              </View>
              <View style={{ marginTop: 12 }}>
                <Text numberOfLines={2} style={{ color: Colors.light.muted }}>{t.benefits[0]}{t.benefits[1] ? ` • ${t.benefits[1]}` : ''}</Text>
              </View>
              <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: Colors.light.muted }}>Benefits: {t.benefits.length}</Text>
                {currentTier.id === t.id ? <Text style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, color: '#7F1D1D' }}>Current</Text> : <Text style={{ color: Colors.light.muted }}>{Math.max(0, t.ptsMin - points)} pts to level up</Text>}
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={{ marginTop: 18, color: Colors.light.muted, fontSize: 12 }}>Check the benefits for each tier. In production, sync levels and points with your backend (Supabase recommended).</Text>
        </ScrollView>

      {showLevelUp && (
        <Animated.View style={[styles.levelUpOverlay, { opacity: levelUpAnim }]}> 
          <View style={styles.levelUpContainer}>
            <Animated.View style={[styles.levelUpBadge, { transform: [{ scale: levelUpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }] }>
              <Ionicons name={currentTier.iconName as any} size={48} color="#fff" />
            </Animated.View>
            <Animated.Text style={[styles.levelUpTitle, { transform: [{ scale: levelUpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }], opacity: levelUpAnim }]}>{`You reached ${currentTier.title}!`}</Animated.Text>
            <Animated.Text style={[styles.levelUpMsg, { opacity: levelUpAnim }]}>{`You've reached ${points} pts. Enjoy your ${currentTier.title} benefits.`}</Animated.Text>

            {/* confetti: small colored circles that fall */}
            {confettiAnims.map((a, i) => {
              const left = (i / CONFETTI_COUNT) * 80 + Math.random() * 20; // percentage-ish
              const rotate = a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${180 + Math.random() * 180}deg`] });
              const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-40, 300 + Math.random() * 200] });
              const opacity = a.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0, 1, 0] });
              const bg = ['#F59E0B', '#9CA3AF', '#F87171', '#60A5FA', '#34D399'][i % 5];
              return (
                <Animated.View key={i} style={[styles.confetti, { left: `${left}%`, backgroundColor: bg, transform: [{ translateY }, { rotate }], opacity }]} />
              );
            })}

            <View style={{ flexDirection: 'row', marginTop: 18 }}>
              <Pressable onPress={closeLevelUp} style={styles.levelUpBtnPrimary}><Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text></Pressable>
              <Pressable onPress={async () => { 
                try {
                  await Share.share({
                    title: `I reached ${currentTier.title}`,
                    message: `I reached ${currentTier.title} in HSO Points! I have ${points} pts. Check out HSO for more benefits.`
                  });
                } catch (e) {
                  // ignore
                } finally {
                  closeLevelUp();
                }
              }} style={[styles.levelUpBtnSecondary]}>
                <Text style={{ color: Colors.light.tint }}>Compartir</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      )}

      <Modal visible={!!modalTier} transparent animationType="fade" onRequestClose={() => setModalTier(null)}>
        {/* Pressing the overlay closes the modal; pressing inside the card does not */}
        <Pressable style={styles.modalOverlay} onPress={() => setModalTier(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>{modalTier?.title} · <Text style={{ fontWeight: '700' }}>{modalTier?.range}</Text></Text>
            <Text style={{ marginTop: 12, fontWeight: '700' }}>Benefits</Text>
            <View style={{ marginTop: 8 }}>
              {modalTier?.benefits.map((b: string, i: number) => (
                <View key={i} style={{ flexDirection: 'row', marginTop: 8 }}>
                  <Text style={{ marginRight: 8 }}>{i+1}</Text>
                  <Text style={{ color: Colors.light.muted }}>{b}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <Pressable onPress={() => setModalTier(null)} style={styles.modalBtnSecondary}><Text style={{ color: Colors.light.tint }}>Close</Text></Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 16 },
  pageTitle: { fontSize: 13, color: Colors.light.muted, marginTop: 8 },
  topCard: { marginTop: 8, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  trophy: { height: 54, width: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelTitle: { fontSize: 18, color: Colors.light.text },
  progressBg: { height: 8, backgroundColor: Colors.light.cardBorder, borderRadius: 999, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 999 },
  progressNote: { marginTop: 8, fontSize: 12, color: Colors.light.muted },
  pill: { backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700' },
  verticalList: { marginTop: 12 },
  tierCard: { width: '100%', marginBottom: 12, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  tierCardActive: { borderColor: Colors.light.tint, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  tierIcon: { height: 44, width: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // removed inner shape styles in favor of Ionicons
  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalCard: { width: 320, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalBtnPrimary: { backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  modalBtnSecondary: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  levelUpOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  levelUpContainer: { alignItems: 'center', paddingHorizontal: 28 },
  levelUpBadge: { height: 110, width: 110, borderRadius: 110, backgroundColor: Colors.light.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  levelUpTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 8 },
  levelUpMsg: { color: 'rgba(255,255,255,0.9)', marginTop: 8, textAlign: 'center', maxWidth: 320 },
  confetti: { position: 'absolute', width: 10, height: 10, borderRadius: 3, opacity: 0.95 },
  levelUpBtnPrimary: { backgroundColor: Colors.light.tint, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginRight: 8 },
  levelUpBtnSecondary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#fff' },
});
