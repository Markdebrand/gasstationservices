import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.subtleBg, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  subtitle: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  card: { backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: Colors.light.cardBorder },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 8 },
  photo: { width: '100%', height: 180, borderRadius: 12, backgroundColor: Colors.light.background },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  muted: { fontSize: 12, color: Colors.light.muted },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: '600' },
  label: { marginTop: 6, fontSize: 12, color: Colors.light.muted },
  input: { marginTop: 4, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.cardBorder, borderRadius: 12, paddingHorizontal: 12, height: 44, color: Colors.light.text },
  row2: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cta: { marginTop: 16, backgroundColor: Colors.light.tint, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: Colors.light.background, fontSize: 16, fontWeight: '600' },
});
