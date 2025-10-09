import { View, Text, StyleSheet } from 'react-native';
export default function Order() {
  return (<View style={styles.root}><Text style={styles.text}>Solicitar Servicio</Text></View>);
}
const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center' }, text: { fontSize: 16 } });
