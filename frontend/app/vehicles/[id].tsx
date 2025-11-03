import React from 'react';
import { View, Text, Image, Pressable, Alert, ScrollView } from 'react-native';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { listVehicles as apiListVehicles, deleteVehicle as apiDeleteVehicle } from '../../services/vehicles';

export default function VehicleDetail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = (params as any).id as string;
  const idNum = Number(idParam);
  const [vehicle, setVehicle] = React.useState<any | null>(null);

  React.useEffect(() => {
    const load = async () => {
      // Try API first
      try {
  const list = await apiListVehicles();
  await AsyncStorage.setItem('user:vehicles', JSON.stringify(list));
        const found = list.find((v: any) => v.id === idNum);
        if (found) { setVehicle(found); return; }
      } catch {}
      // Fallback to cache (handles older string ids too)
      const key = 'user:vehicles';
      const existing = await AsyncStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      const found = list.find((v: any) => v.id === idNum || String(v.id) === idParam);
      setVehicle(found || null);
    };
    load();
  }, [idParam, idNum]);

  const remove = () => {
    Alert.alert('Remove vehicle', 'Are you sure you want to delete this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { if (!Number.isNaN(idNum)) await apiDeleteVehicle(idNum); } catch {}
        const key = 'user:vehicles';
        const existing = await AsyncStorage.getItem(key);
        const list = existing ? JSON.parse(existing) : [];
        const next = list.filter((v: any) => v.id !== idNum && String(v.id) !== idParam);
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
          <Pressable style={[styles.button, { backgroundColor: '#14617B' }]} onPress={() => router.push({ pathname: '/vehicles/components/vehicle_add', params: { id: String(idNum || idParam) } })}>
            <Text style={[styles.buttonText]}>Edit</Text>
          </Pressable>
          <Pressable style={[styles.button, { backgroundColor: '#b91c1c' }]} onPress={remove}>
            <Text style={[styles.buttonText]}>Delete</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
import styles from '../../src/styles/vehicleDetailStyles';
