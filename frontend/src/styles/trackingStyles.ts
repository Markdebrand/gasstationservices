import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  mapBoxLarge: { flex: 1, marginTop: 12, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E6EDF0', backgroundColor: '#E6F3F7', alignItems: 'center', justifyContent: 'center' },
  mapBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#DDEFF5' },
  pinPulse: { position: 'absolute', width: 90, height: 90, borderRadius: 999, backgroundColor: 'rgba(20,97,123,0.18)' },
  pinCenter: { width: 46, height: 46, borderRadius: 999, backgroundColor: '#E8F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CFE6ED' },
  bottomCard: { position: 'absolute', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E6EDF0' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#E6EDF0' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  label: { color: '#64748B', fontSize: 12 },
  value: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  hint: { marginTop: 10, color: '#64748B', fontSize: 12 },
  arrivalOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  arrivalRing: { position: 'absolute', width: 220, height: 220, borderRadius: 220, backgroundColor: 'rgba(16,185,129,0.25)' },
  arrivalBadge: { width: 120, height: 120, borderRadius: 120, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  arrivalText: { marginTop: 16, color: '#0F172A', fontWeight: '800' },
  progressCard: { position: 'absolute', left: 12, right: 12, top: 12, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E6EDF0' },
  paymentCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
});
