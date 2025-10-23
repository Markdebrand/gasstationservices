import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  grid3: { flexDirection: 'row', marginTop: 12, marginBottom: 16, justifyContent: 'space-between', paddingHorizontal: 4 },
  grid2: { flexDirection: 'row', gap: 12, marginTop: 18 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: '#E6EDF0' },
  promoCard: { flex: 1, backgroundColor: 'rgba(20,97,123,0.06)', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 0, justifyContent: 'center' },
  smallCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 0, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  cardMeta: { fontSize: 12, color: '#64748B' },
  cardNote: { marginTop: 6, fontSize: 12, color: '#64748B' },
  badge: { flex: 1, borderRadius: 16, padding: 12, marginHorizontal: 6, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1, minWidth: 88 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgePrice: { marginTop: 4, fontSize: 20, fontWeight: '700', color: '#0F172A' },
  badgeUnit: { fontSize: 12, color: '#64748B', fontWeight: '400' },
  badgeTrend: { marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, fontSize: 11 },
  muted: { color: '#64748B', fontSize: 12 },
  bold: { marginTop: 4, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  // darker red for layout/CTA to match provided image
  cta: { marginTop: 20, backgroundColor: '#b91c1c', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#F7FBFE', fontSize: 16, fontWeight: '600' },
});
