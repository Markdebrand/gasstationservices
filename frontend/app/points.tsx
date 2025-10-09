import React from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable } from 'react-native';
import Header from './components/Header';

export default function PointsScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Header showBack />

      <View style={styles.card}>
  <Text style={styles.title}>Points and Promotions</Text>
  <Text style={styles.subtitle}>Soon you will be able to manage your points and redeem promotions here.</Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFB', padding: 16 },
  content: { paddingBottom: 40 },
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 13, color: '#64748B', textAlign: 'center' },
});
