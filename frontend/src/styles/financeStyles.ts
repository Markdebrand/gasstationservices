import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.subtleBg, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.light.text },
  subtitle: { fontSize: 12, color: Colors.light.muted, marginTop: 2 },
  
  balanceCard: { marginTop: 12, borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: Colors.light.cardBorder },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceOverline: { color: Colors.light.background, opacity: 0.9, fontSize: 12 },
  balanceValue: { color: Colors.light.background, fontSize: 28, fontWeight: '700', marginTop: 4 },
  balanceDelta: { color: Colors.light.background, fontSize: 12, marginTop: 2 },
  card: { backgroundColor: Colors.light.background, borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: Colors.light.cardBorder },
  cardTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text, marginBottom: 6 },
  tickLabel: { color: Colors.light.muted, fontSize: 12 },
  txRow: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  txTitle: { fontSize: 14, fontWeight: '600', color: Colors.light.text },
  txDate: { fontSize: 12, color: Colors.light.muted },
  txAmount: { fontSize: 14, fontWeight: '700' },
});
