import { View, Text, StyleSheet } from 'react-native';
export default function Profile() {
  return (<View style={styles.root}><Text style={styles.text}>Perfil</Text></View>);
}
const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center' }, text: { fontSize: 16 } });
