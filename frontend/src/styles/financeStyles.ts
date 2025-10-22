import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  
  balanceCard: { marginTop: 12, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: '#E6EDF0' },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceOverline: { color: '#ECFDF5', opacity: 0.9, fontSize: 12 },
  balanceValue: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 4 },
  balanceDelta: { color: '#E6FFFA', fontSize: 12, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: '#E6EDF0' },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', marginBottom: 6 },
  tickLabel: { color: '#64748B', fontSize: 12 },
  txRow: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  txDate: { fontSize: 12, color: '#64748B' },
  txAmount: { fontSize: 14, fontWeight: '700' },
});
