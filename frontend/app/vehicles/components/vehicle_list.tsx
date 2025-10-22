import React from 'react';
import { ScrollView, View, Text, StyleSheet, Image, Pressable, Alert } from 'react-native';
import Header from './../../components/Header';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

type Vehicle = {
  id: string;
  photos?: string[];
  plate: string;
  brand?: string;
  model?: string;
  year?: string;
  color?: string;
  vin?: string;
};

export default function VehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = React.useState<Vehicle[]>([]);

  const load = React.useCallback(async () => {
    const key = 'user:vehicles';
    const existing = await AsyncStorage.getItem(key);
    const list: Vehicle[] = existing ? JSON.parse(existing) : [];
    setVehicles(list);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  const remove = async (id: string) => {
    Alert.alert('Remove vehicle', 'Are you sure you want to delete this vehicle?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const key = 'user:vehicles';
        const existing = await AsyncStorage.getItem(key);
        const list: Vehicle[] = existing ? JSON.parse(existing) : [];
        const next = list.filter(v => v.id !== id);
        await AsyncStorage.setItem(key, JSON.stringify(next));
        setVehicles(next);
      }}
    ]);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: 40 }}>
      <Header showBack />
      <Text style={styles.title}>My vehicles</Text>
      <Text style={styles.subtitle}>Saved vehicles on this device</Text>

      {vehicles.length === 0 ? (
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.muted}>No vehicles saved yet.</Text>
          <Pressable style={[styles.cta, { marginTop: 12 }]} onPress={() => router.push('/vehicles/components/vehicle_add')}>
            <Text style={styles.ctaText}>Add vehicle</Text>
          </Pressable>
        </View>
      ) : (
        vehicles.map(v => (
          <Pressable key={v.id} style={styles.card} onPress={() => router.push({ pathname: '/vehicles/[id]', params: { id: v.id } })}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {v.photos && v.photos.length > 0 ? (
                <View>
                  <Image source={{ uri: v.photos[0] }} style={styles.thumb} />
                  {v.photos.length > 1 && (
                    <View style={styles.countBadge}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>+{v.photos.length - 1}</Text></View>
                  )}
                </View>
              ) : (
                <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }] }>
                  <Ionicons name="car-sport" size={20} color="#64748B" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.plate}>{v.plate}</Text>
                <Text style={styles.meta}>{[v.brand, v.model, v.year].filter(Boolean).join(' • ')}</Text>
                {!!v.color && <Text style={styles.meta}>Color: {v.color}</Text>}
                {!!v.vin && <Text style={styles.meta}>VIN: {v.vin}</Text>}
              </View>
              <Pressable onPress={() => remove(v.id)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </Pressable>
            </View>
          </Pressable>
        ))
      )}

      {vehicles.length > 0 && (
        <Pressable style={[styles.cta, { marginTop: 12 }]} onPress={() => router.push('/vehicles/components/vehicle_add')}>
          <Text style={styles.ctaText}>Add another vehicle</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

import styles from '../../../src/styles/vehicleStyles';
