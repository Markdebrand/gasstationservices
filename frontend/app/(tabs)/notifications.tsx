import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function NotificationsScreen() {
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Ionicons name="notifications-outline" size={32} color="#14617B" />
				<Text style={styles.title}>Notificaciones</Text>
			</View>
			<Text style={styles.empty}>No tienes notificaciones nuevas.</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', padding: 16 },
	header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
	title: { fontSize: 22, fontWeight: '700', color: '#14617B', marginLeft: 12 },
	empty: { fontSize: 15, color: '#64748B', marginTop: 8 },
});
