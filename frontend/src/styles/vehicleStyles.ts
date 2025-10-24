import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  subtitle: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  card: { backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: Colors.light.cardBorder },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: '#EEE' },
  countBadge: { position: 'absolute', right: -6, top: -6, backgroundColor: Colors.light.tint, height: 22, minWidth: 22, paddingHorizontal: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  plate: { fontSize: 16, fontWeight: '700', color: Colors.light.text },
  meta: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  cta: { backgroundColor: Colors.light.tint, borderRadius: 16, height: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  ctaText: { color: Colors.light.background, fontSize: 14, fontWeight: '700' },
  muted: { color: Colors.light.muted },
});
