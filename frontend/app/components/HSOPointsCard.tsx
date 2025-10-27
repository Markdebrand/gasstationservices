import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';
import { useHsoPoints } from '@/app/contexts/HSOPointsContext';

export default function HsoPointsCard({ compact }: { compact?: boolean }) {
  const { points, addPoints, currentTier } = useHsoPoints();

  const progressPct = React.useMemo(() => {
    const t = currentTier;
    const span = t.ptsMax - t.ptsMin || 1;
    const relative = Math.max(0, Math.min(1, (points - t.ptsMin) / span));
    return Math.round(relative * 100);
  }, [points, currentTier]);

  return (
    // change mint/green background to a soft red/rosy gradient
    <LinearGradient colors={["#FFF5F5", "#FFF"]} start={[0,0]} end={[1,1]} style={[styles.pointsCard, compact && styles.pointsCardCompact]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.pointsIcon}><Ionicons name={currentTier.iconName as any} size={22} color={Colors.light.text} /></View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.pointsLabel}>HSO Points</Text>
          <Text style={styles.pointsValue}><Text style={{ fontWeight: '800' }}>{points}</Text> pts • {currentTier.title}</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressNote}>{Math.max(0, (currentTier.ptsMax || 0) - points)} pts to next level</Text>
        </View>
        {/* Removed duplicate right-side badge: tier title is already shown inline next to points */}
      </View>

      {!compact && (
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Pressable style={[styles.pill]} onPress={() => addPoints(100)}>
            <Text style={styles.pillText}>+100 pts</Text>
          </Pressable>
          <Pressable style={[styles.pill, { marginLeft: 8 }]} onPress={() => addPoints(500)}>
            <Text style={styles.pillText}>+500 pts</Text>
          </Pressable>
          <Pressable style={[styles.pill, { marginLeft: 8, backgroundColor: '#FEE2E2' }]} onPress={() => addPoints(-200)}>
            <Text style={[styles.pillText, { color: '#B91C1C' }]}>-200 pts</Text>
          </Pressable>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  pointsCard: { borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  pointsCardCompact: { padding: 12 },
  pointsIcon: { height: 54, width: 54, borderRadius: 12, backgroundColor: '#FFEAEA', alignItems: 'center', justifyContent: 'center' },
  pointsLabel: { fontSize: 13, color: Colors.light.muted, fontWeight: '700' },
  pointsValue: { fontSize: 16, color: Colors.light.text, marginTop: 4 },
  progressBg: { height: 8, backgroundColor: Colors.light.cardBorder, borderRadius: 999, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 8, backgroundColor: Colors.light.tint, borderRadius: 999 },
  progressNote: { marginTop: 8, fontSize: 12, color: Colors.light.muted },
  // levelBadge removed to avoid duplicate tier label
  pill: { backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillText: { color: '#fff', fontWeight: '700' },
});
