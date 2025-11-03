import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.subtleBg, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  subtitle: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  mapBoxLarge: { flex: 1, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: Colors.light.cardBorder, backgroundColor: Colors.light.background, alignItems: 'center', justifyContent: 'center' },
  mapBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.light.background },
  pinPulse: { position: 'absolute', width: 90, height: 90, borderRadius: 999, backgroundColor: 'rgba(185,28,28,0.18)' },
  pinCenter: { width: 46, height: 46, borderRadius: 999, backgroundColor: Colors.light.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.light.cardBorder },
  bottomCard: { position: 'absolute', backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  card: { backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.light.text, marginBottom: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  label: { color: Colors.light.muted, fontSize: 12 },
  value: { color: Colors.light.text, fontSize: 13, fontWeight: '700' },
  hint: { marginTop: 10, color: Colors.light.muted, fontSize: 12 },
  arrivalOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  arrivalRing: { position: 'absolute', width: 220, height: 220, borderRadius: 220, backgroundColor: 'rgba(185,28,28,0.25)' },
  arrivalBadge: { width: 120, height: 120, borderRadius: 120, backgroundColor: Colors.light.tint, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  arrivalText: { marginTop: 16, color: Colors.light.text, fontWeight: '800' },
  progressCard: { position: 'absolute', left: 12, right: 12, top: 12, backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.light.cardBorder },
  paymentCard: { backgroundColor: Colors.light.background, padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});
