import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Header from './components/Header';

const sample = [
  { id: 1, title: 'Order completed', body: 'Your last order was completed successfully.', time: '2h' , read: false},
  { id: 2, title: 'HSO10 Promotion', body: 'Use HSO10 and get 10% off your first fill.', time: '1d', read: false },
  { id: 3, title: 'Reminder', body: 'Verify your payment method to avoid issues.', time: '3d', read: true },
];

export default function Notifications() {
  const [items, setItems] = React.useState(sample);

  function toggleRead(id: number) {
    setItems((s) => s.map(it => it.id === id ? { ...it, read: !it.read } : it));
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 120 }}>
      <Header showBack />
  <Text style={styles.title}>Notifications</Text>
  <Text style={styles.subtitle}>Latest alerts and promotions</Text>

      <View style={{ marginTop: 12 }}>
        {items.map((it) => (
          <View key={it.id} style={[styles.card, it.read ? styles.cardRead : null]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{it.title}</Text>
                <Text style={styles.cardBody}>{it.body}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.time}>{it.time}</Text>
                <Pressable onPress={() => toggleRead(it.id)} style={{ marginTop: 8 }}>
                  <Text style={{ color: '#b91c1c' }}>{it.read ? 'Mark as unread' : 'Mark as read'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardRead: { opacity: 0.6 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  cardBody: { fontSize: 13, color: '#475569', marginTop: 6 },
  time: { fontSize: 12, color: '#94A3B8' },
});
