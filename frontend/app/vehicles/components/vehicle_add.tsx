import React from 'react';
import { ScrollView, View, Text, StyleSheet, TextInput, Pressable, Image, Alert, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Header from '../../components/Header';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../../../src/styles/vehicleAddStyles';

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

export default function VehicleScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const editId = (params as any).id as string | undefined;

  React.useEffect(() => {
    if (!editId) return;
    const load = async () => {
      const key = 'user:vehicles';
      const existing = await AsyncStorage.getItem(key);
      const list = existing ? JSON.parse(existing) : [];
      const found = list.find((v: any) => v.id === editId);
      if (found) {
        // migrate old shape if necessary
        const existingPhotos: string[] = found.photos ? found.photos : (found.photoUri ? [found.photoUri] : []);
        setPhotos(existingPhotos);
        setPlate(found.plate || '');
        setBrand(found.brand || '');
        setModel(found.model || '');
        setYear(found.year || '');
        setColor(found.color || '');
        setVin(found.vin || '');
      }
    };
    load();
  }, [editId]);
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [plate, setPlate] = React.useState('');
  const [brand, setBrand] = React.useState('');
  const [model, setModel] = React.useState('');
  const [year, setYear] = React.useState('');
  const [color, setColor] = React.useState('');
  const [vin, setVin] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const pickImage = async () => {
    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photos to select a vehicle image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true as any, allowsEditing: false, quality: 0.8 });
    // result formats differ across SDKs; handle assets array
    if (!res.canceled && (res as any).assets && (res as any).assets.length > 0) {
      const uris = (res as any).assets.map((a: any) => a.uri).filter(Boolean);
      setPhotos(prev => [...prev, ...uris]);
    } else if (!res.canceled && (res as any).uri) {
      setPhotos(prev => [...prev, (res as any).uri]);
    }
  };

  const takePhoto = async () => {
    const ImagePicker = await import('expo-image-picker');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera access to take a vehicle photo.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.8 });
    if (!res.canceled && (res as any).assets && (res as any).assets.length > 0) {
      setPhotos(prev => [...prev, (res as any).assets[0].uri]);
    } else if (!res.canceled && (res as any).uri) {
      setPhotos(prev => [...prev, (res as any).uri]);
    }
  };

  const saveVehicle = async () => {
    if (!plate.trim()) {
      Alert.alert('Missing plate', 'Please enter the vehicle plate number.');
      return;
    }
    if (!photos || photos.length === 0) {
      Alert.alert('Photo required', 'Please add at least one vehicle photo.');
      return;
    }
    setSaving(true);
    try {
      const key = 'user:vehicles';
      const existing = await AsyncStorage.getItem(key);
      const list: any[] = existing ? JSON.parse(existing) : [];
      if (editId) {
        const next = list.map(v => v.id === editId ? { ...v, photos, plate: plate.trim().toUpperCase(), brand: brand.trim(), model: model.trim(), year: year.trim(), color: color.trim(), vin: vin.trim() } : v);
        await AsyncStorage.setItem(key, JSON.stringify(next));
        Alert.alert('Saved', 'Vehicle updated.');
        router.back();
      } else {
        const vehicle: Vehicle = {
          id: `${Date.now()}`,
          photos,
          plate: plate.trim().toUpperCase(),
          brand: brand.trim(),
          model: model.trim(),
          year: year.trim(),
          color: color.trim(),
          vin: vin.trim(),
        };
        list.unshift(vehicle);
        await AsyncStorage.setItem(key, JSON.stringify(list));
        Alert.alert('Saved', 'Vehicle saved locally.');
        router.back();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  const scrollRef = React.useRef<any>(null);
  const insets = useSafeAreaInsets();

  return (
  <KeyboardAwareScrollView innerRef={(r: any) => { scrollRef.current = r; }} style={styles.root} contentContainerStyle={{ paddingBottom: 40 + (insets.bottom || 0) }} enableOnAndroid extraScrollHeight={140} keyboardShouldPersistTaps="handled">
      <Header showBack />

      <Text style={styles.title}>Add Vehicle</Text>
      <Text style={styles.subtitle}>Add details so we can verify the vehicle belongs to you.</Text>

      {/* Photos */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle photos</Text>
        {photos.length > 0 ? (
          <ScrollView horizontal style={{ marginTop: 8 }} showsHorizontalScrollIndicator={false}>
            {photos.map((p, i) => (
              <View key={p + i} style={{ marginRight: 8, position: 'relative' }}>
                <Image source={{ uri: p }} style={[styles.photo, { width: 220, height: 140 }]} />
                <Pressable onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 20 }}>
                  <Ionicons name="close" size={14} color="#fff" />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.photo, styles.photoPlaceholder]}>
            <Ionicons name="car-sport" size={28} color="#64748B" />
            <Text style={styles.muted}>No photos selected</Text>
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable onPress={pickImage} style={[styles.pill, { backgroundColor: '#14617B' }]}>
            <Ionicons name="images" size={16} color="#F7FBFE" />
            <Text style={[styles.pillText, { color: '#F7FBFE' }]}>Gallery</Text>
          </Pressable>
          <Pressable onPress={takePhoto} style={[styles.pill, { backgroundColor: '#10B981' }]}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
            <Text style={[styles.pillText, { color: '#FFFFFF' }]}>Camera</Text>
          </Pressable>
        </View>
      </View>

      {/* Plate and info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Vehicle details</Text>
        <Text style={styles.label}>Plate</Text>
        <TextInput value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="ABC-123" style={styles.input} />

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Brand</Text>
            <TextInput value={brand} onChangeText={setBrand} placeholder="Toyota" style={styles.input} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Model</Text>
            <TextInput value={model} onChangeText={setModel} placeholder="Corolla" style={styles.input} />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Year</Text>
            <TextInput value={year} onChangeText={setYear} placeholder="2020" keyboardType="numeric" style={styles.input} />
          </View>
          <View style={{ width: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Color</Text>
            <TextInput value={color} onChangeText={setColor} placeholder="Blue" style={styles.input} />
          </View>
        </View>

        <Text style={styles.label}>VIN (optional)</Text>
        <TextInput value={vin} onChangeText={setVin} placeholder="XXXXXXXXXXXXXXX" autoCapitalize="characters" style={styles.input}
          onFocus={() => { try { (scrollRef.current as any)?.scrollToEnd(true); } catch {} }}
        />
      </View>

      <Pressable onPress={saveVehicle} style={[styles.cta, { marginBottom: Math.max(12, insets.bottom || 12) }]}>
        <Text style={styles.ctaText}>{saving ? 'Saving...' : 'Save vehicle'}</Text>
      </Pressable>
    </KeyboardAwareScrollView>
  );
}

 
