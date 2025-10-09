import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Header() {
  const insets = useSafeAreaInsets();
  const paddingTop = Math.max(insets.top, 12);

  return (
    <View style={[styles.container, { paddingTop }]}> 
      <View style={styles.headerCard}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.brandBadge}>
            <Ionicons name="water" size={20} color="#14617B" />
          </View>
          <View>
            <Text style={styles.headerOverline}>HSO FUEL DELIVERY</Text>
            <Text style={styles.headerTitle}>Tu combustible, a domicilio</Text>
          </View>
        </View>
        <View style={{ position: 'relative' }}>
          <View style={styles.bellContainer}>
            <Ionicons name="notifications-outline" size={18} color="#111827" />
          </View>
          <View style={styles.bellDot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent' },
  headerCard: { borderRadius: 0, paddingVertical: 8, paddingHorizontal: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  brandBadge: { height: 40, width: 40, borderRadius: 10, backgroundColor: 'rgba(20,97,123,0.08)', alignItems: 'center', justifyContent: 'center' },
  headerOverline: { fontSize: 13, color: '#64748B', fontWeight: '700', letterSpacing: 0.4 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  bellContainer: { height: 28, width: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  bellDot: { position: 'absolute', top: -2, right: -2, width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
});
