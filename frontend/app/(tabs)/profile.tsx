import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { clearToken } from '@/utils/auth';
import { router } from 'expo-router';

export default function Profile() {
  const insets = useSafeAreaInsets();

  const coupons = [
    { title: '10% OFF en Premium', code: 'HSO10' },
    { title: '2x puntos esta semana', code: 'DOUBLE' },
  ];

  const options = ['Métodos de pago', 'Historial de pedidos', 'Notificaciones', 'Cerrar sesión'];

  const handleOptionPress = async (option: string) => {
    if (option === 'Cerrar sesión') {
      await clearToken();
      router.replace('/(auth)/login' as any);
    } else {
      // Aquí puedes manejar otras opciones si lo deseas
      Alert.alert(option);
    }
  };
  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}> 
      <Header />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.rowCenter}>
            <View style={styles.avatar}><Ionicons name="person" size={28} color="#14617B" /></View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.name}>Nombre de usuario</Text>
              <Text style={styles.subtitle}>Usuario • @usuario</Text>
            </View>
          </View>
        </View>

        <LinearGradient colors={["#E6FAFF", "#EAF8FB"]} style={styles.pointsCard} start={[0,0]} end={[1,1]}>
          <View style={styles.rowCenter}>
            <View style={styles.iconCircle}><Ionicons name="trophy" size={20} color="#0F172A" /></View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.pointsTitle}>Puntos HSO</Text>
              <Text style={styles.pointsValue}><Text style={{ fontWeight: '800' }}>1,240</Text> pts • Nivel Plata</Text>
            </View>
          </View>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: '66%' }]} />
          </View>
          <Text style={styles.progressNote}>A 360 pts del siguiente nivel</Text>
        </LinearGradient>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recompensas y cupones</Text>
          {coupons.map(c => (
            <View key={c.code} style={styles.couponRow}>
              <View style={styles.couponInfo}>
                <View style={styles.couponIcon}><Ionicons name="gift" size={16} color="#374151" /></View>
                <View>
                  <Text style={styles.couponTitle}>{c.title}</Text>
                  <Text style={styles.couponCode}>Código: {c.code}</Text>
                </View>
              </View>
              <Pressable style={styles.redeemButton} onPress={() => {}}>
                <Text style={styles.redeemText}>Canjear</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          {options.map((o) => (
            <Pressable key={o} style={styles.optionRow} onPress={() => handleOptionPress(o)}>
              <Text style={styles.optionText}>{o}</Text>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.editButton} onPress={() => {}}>
          <Text style={styles.editText}>Editar perfil</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFB' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionCard: { marginTop: 12, backgroundColor: '#fff', borderRadius: 12, padding: 12, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  avatar: { height: 56, width: 56, borderRadius: 14, backgroundColor: 'rgba(20,97,123,0.06)', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  pointsCard: { marginTop: 12, borderRadius: 12, padding: 12 },
  iconCircle: { height: 40, width: 40, borderRadius: 10, backgroundColor: 'rgba(20,97,123,0.08)', alignItems: 'center', justifyContent: 'center' },
  pointsTitle: { fontSize: 13, color: '#374151', fontWeight: '600' },
  pointsValue: { fontSize: 14, color: '#0F172A', marginTop: 2 },
  progressBarBackground: { marginTop: 10, height: 8, backgroundColor: '#F1F5F9', borderRadius: 999 },
  progressBarFill: { height: 8, backgroundColor: '#14617B', borderRadius: 999 },
  progressNote: { marginTop: 8, fontSize: 11, color: '#64748B' },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  couponRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  couponInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  couponIcon: { height: 36, width: 36, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  couponTitle: { fontSize: 14, fontWeight: '600' },
  couponCode: { fontSize: 12, color: '#64748B' },
  redeemButton: { backgroundColor: '#14617B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  redeemText: { color: '#fff', fontWeight: '700' },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  optionText: { fontSize: 14, color: '#0F172A' },
  editButton: { marginTop: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E6EDF0', paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff' },
  editText: { color: '#0F172A', fontWeight: '700' },
});
