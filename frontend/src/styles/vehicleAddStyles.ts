import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: '#E6EDF0' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 8 },
  photo: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#F1F5F9' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  muted: { fontSize: 12, color: '#64748B' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '600' },
  label: { marginTop: 6, fontSize: 12, color: '#475569' },
  input: { marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6EDF0', borderRadius: 12, paddingHorizontal: 12, height: 44, color: '#0F172A' },
  row2: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cta: { marginTop: 16, backgroundColor: '#14617B', borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#F7FBFE', fontSize: 16, fontWeight: '600' },
});
