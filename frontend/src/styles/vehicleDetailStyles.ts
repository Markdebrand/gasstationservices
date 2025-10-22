import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  card: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E6EDF0' },
  photo: { width: 220, height: 140, borderRadius: 12, backgroundColor: '#EEE' },
  plate: { fontSize: 20, fontWeight: '800', marginTop: 12, color: '#0F172A' },
  meta: { fontSize: 14, color: '#64748B', marginTop: 4 },
  row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { color: '#94A3B8', fontSize: 13 },
  value: { color: '#0F172A', fontWeight: '700' },
  button: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
