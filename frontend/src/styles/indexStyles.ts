import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  grid3: { flexDirection: 'row', marginTop: 12, marginBottom: 16, justifyContent: 'space-between', paddingHorizontal: 4 },
  grid2: { flexDirection: 'row', gap: 12, marginTop: 18 },
  card: { flex: 1, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: Colors.light.cardBorder },
  promoCard: { flex: 1, backgroundColor: 'rgba(185,28,28,0.06)', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 0, justifyContent: 'center' },
  smallCard: { flex: 1, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 0, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  cardMeta: { fontSize: 12, color: Colors.light.muted },
  cardNote: { marginTop: 6, fontSize: 12, color: Colors.light.muted },
  badge: { flex: 1, borderRadius: 16, padding: 12, marginHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1, minWidth: 88 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgePrice: { marginTop: 4, fontSize: 20, fontWeight: '700', color: Colors.light.text },
  badgeUnit: { fontSize: 12, color: Colors.light.muted, fontWeight: '400' },
  badgeTrend: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, fontSize: 11 },
  muted: { color: Colors.light.muted, fontSize: 12 },
  bold: { marginTop: 4, fontSize: 14, fontWeight: '600', color: Colors.light.text },
  // darker red for layout/CTA to match provided image
  cta: { marginTop: 20, backgroundColor: Colors.light.tint, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: Colors.light.background, fontSize: 16, fontWeight: '600' },
});
