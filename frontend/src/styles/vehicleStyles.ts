import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: '#E6EDF0' },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#EEE' },
  countBadge: { position: 'absolute', right: -6, top: -6, backgroundColor: '#14617B', height: 22, minWidth: 22, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plate: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  meta: { fontSize: 12, color: '#64748B', marginTop: 2 },
  cta: { backgroundColor: '#14617B', borderRadius: 16, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { color: '#F7FBFE', fontSize: 14, fontWeight: '700' },
  muted: { color: '#64748B' },
});
