import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, Alert, ScrollView } from 'react-native';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function VehicleDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = (params as any).id as string;
  const [vehicle, setVehicle] = React.useState<any | null>(null);

  React.useEffect(() => {
    const load = async () => {
      const key = 'user:vehicles';
      const existing = await AsyncStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      const found = list.find((v: any) => v.id === id);
      setVehicle(found || null);
    };
    load();
  }, [id]);

  const remove = () => {
    Alert.alert('Remove vehicle', 'Are you sure you want to delete this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const key = 'user:vehicles';
        const existing = await AsyncStorage.getItem(key);
        const list = existing ? JSON.parse(existing) : [];
        const next = list.filter((v: any) => v.id !== id);
        await AsyncStorage.setItem(key, JSON.stringify(next));
        router.back();
      }}
    ]);
  };

  if (!vehicle) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC', padding: 16 }}>
        <Header showBack />
        <View style={{ paddingTop: 12 }}>
          <Text style={{ color: '#64748B' }}>Vehicle not found.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Header showBack />
      <View style={styles.card}>
        {vehicle.photos && vehicle.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
            {vehicle.photos.map((p: string, idx: number) => (
              <Image key={p + idx} source={{ uri: p }} style={[styles.photo, { marginRight: 8 }]} />
            ))}
          </ScrollView>
        ) : vehicle.photoUri ? (
          <Image source={{ uri: vehicle.photoUri }} style={styles.photo} />
        ) : (
          <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }]}> 
            <Ionicons name="car-sport" size={36} color="#64748B" />
          </View>
        )}

        <Text style={styles.plate}>{vehicle.plate}</Text>
        <Text style={styles.meta}>{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' • ')}</Text>

        {vehicle.color ? (
          <View style={styles.row}><Text style={styles.label}>Color</Text><Text style={styles.value}>{vehicle.color}</Text></View>
        ) : null}
        {vehicle.vin ? (
          <View style={styles.row}><Text style={styles.label}>VIN</Text><Text style={styles.value}>{vehicle.vin}</Text></View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
          <Pressable style={[styles.button, { backgroundColor: '#14617B' }]} onPress={() => router.push({ pathname: '/vehicle', params: { id } })}>
            <Text style={[styles.buttonText]}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.button, { backgroundColor: '#EF4444' }]} onPress={remove}>
            <Text style={[styles.buttonText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  card: { margin: 16, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E6EDF0' },
  photo: { width: 220, height: 140, borderRadius: 12, backgroundColor: '#EEE' },
  plate: { fontSize: 20, fontWeight: '800', marginTop: 12, color: '#0F172A' },
  meta: { fontSize: 14, color: '#64748B', marginTop: 4 },
  row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { color: '#94A3B8', fontSize: 13 },
  value: { color: '#0F172A', fontWeight: '700' },
  button: { flex: 1, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});
