import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export default StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.light.subtleBg, padding: 16 },
  card: { margin: 16, backgroundColor: Colors.light.background, borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: Colors.light.cardBorder },
  photo: { width: 220, height: 140, borderRadius: 12, backgroundColor: Colors.light.background },
  plate: { fontSize: 20, fontWeight: '800', marginTop: 12, color: Colors.light.text },
  meta: { fontSize: 14, color: Colors.light.muted, marginTop: 4 },
  row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { color: Colors.light.muted, fontSize: 13 },
  value: { color: Colors.light.text, fontWeight: '700' },
  button: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: Colors.light.background, fontWeight: '700' },
});
