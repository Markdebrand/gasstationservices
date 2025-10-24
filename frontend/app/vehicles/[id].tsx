import React from 'react';
import { View, Text, Image, Pressable, Alert, ScrollView } from 'react-native';
import Header from '../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Colors } from '@/constants/theme';

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
          <Pressable style={[styles.button, { backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.tint }]} onPress={() => router.push({ pathname: '/vehicles/components/vehicle_add', params: { id } })}>
            <Text style={[styles.buttonText, { color: Colors.light.tint }]}>Edit</Text>
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
