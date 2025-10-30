import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Pressable, FlatList, Platform, Animated, LayoutAnimation, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from '../../src/styles/locationsMapStyles';
import { Colors } from '@/constants/theme';
import { SavedLocationBridge } from '../../src/lib/savedLocationBridge';

export default function SavedLocations() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [list, setList] = useState<{ name: string; address: string; lat: number; lon: number }[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('user:savedLocations');
        if (raw) setList(JSON.parse(raw));
      } catch (e) {}
    })();
  }, []);

  const handleDelete = async (address: string, lat: number) => {
    const updated = list.filter(l => !(l.address === address && l.lat === lat));
    // animate layout change for removal
    try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch (e) {}
    setList(updated);
    await AsyncStorage.setItem('user:savedLocations', JSON.stringify(updated));
    try { SavedLocationBridge.notifyChange(); } catch (e) {}
  };

  // Animated confirm modal + toast
  const [deleteModal, setDeleteModal] = useState<{ address: string; lat: number; index?: number } | null>(null);
  const modalAnim = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    // LayoutAnimation works on Android with the New Architecture without
    // calling setLayoutAnimationEnabledExperimental (it's a no-op there).
    // We avoid calling it to prevent the runtime warning.
  }, []);

  const showConfirmDelete = (address: string, lat: number, index?: number) => {
    setDeleteModal({ address, lat, index });
    modalAnim.setValue(0);
    Animated.spring(modalAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
  };

  const hideConfirmDelete = () => {
    Animated.timing(modalAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setDeleteModal(null));
  };

  const performDelete = async (address: string, lat: number) => {
    hideConfirmDelete();
    // small delay so modal exit anim runs
    setTimeout(async () => {
      try { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); } catch (e) {}
      const updated = list.filter(l => !(l.address === address && l.lat === lat));
      setList(updated);
      await AsyncStorage.setItem('user:savedLocations', JSON.stringify(updated));
      try { SavedLocationBridge.notifyChange(); } catch (e) {}
      // show toast
      setToastMessage('Deleted');
      toastAnim.setValue(0);
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToastMessage(null));
        }, 900);
      });
    }, 180);
  };

  const handleUse = async (item: { name: string; address: string; lat: number; lon: number }) => {
    // store last selected so other screens may read it if needed
    try { await AsyncStorage.setItem('user:lastSelectedLocation', JSON.stringify(item)); } catch (e) {}
    try { SavedLocationBridge.notifySelection(item); } catch (e) {}
    router.back();
  };

  return (
    <View style={styles.modalRoot}> 
      <View style={[styles.modalTop, { paddingTop: Math.max(insets.top + 24, 36), marginBottom: 12 }]}> 
        <Pressable onPress={() => router.back()} style={[styles.modalBack, { position: 'absolute', left: 16, top: Math.max(insets.top + 24, 36) }]}> 
          <Ionicons name="chevron-back" size={20} color="#7F1D1D" />
        </Pressable>
        <View style={{ flex: 1, paddingLeft: 66 }}>
          <Text style={styles.modalOverline}>Your places</Text>
          <Text style={styles.modalTitle}>Saved addresses</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

  <View style={{ flex: 1, padding: 16 }}>
        {list.length === 0 ? (
          <Text style={{ color: Colors.light.muted }}>No saved addresses.</Text>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(it, idx) => `${it.address}-${it.lat}-${it.lon}-${idx}`}
            renderItem={({ item, index }) => (
              <View style={styles.savedItem} key={`${item.address}-${item.lat}-${item.lon}-${index}`}>
                <Text style={{ fontWeight: '700', color: Colors.light.text }}>{item.name}</Text>
                <Text style={{ color: Colors.light.muted, marginTop: 6 }}>{item.address}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <Pressable onPress={() => handleUse(item)} style={{ marginRight: 12 }}>
                    <Text style={{ color: Colors.light.tint, fontWeight: '700' }}>Use</Text>
                  </Pressable>
                  <Pressable onPress={() => showConfirmDelete(item.address, item.lat, index)}>
                    <Ionicons name="trash" size={18} color="#E11D48" />
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
      {/* Confirm delete modal */}
      {deleteModal && (
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' }} pointerEvents="box-none">
          <Animated.View style={{ width: '88%', backgroundColor: Colors.light.background, borderRadius: 12, padding: 16, transform: [{ scale: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }], opacity: modalAnim }}>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Delete saved address</Text>
            <Text style={{ color: Colors.light.muted, marginBottom: 16 }}>{deleteModal.address}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <Pressable onPress={hideConfirmDelete} style={[styles.ra_btn, styles.ra_secondary, { marginRight: 8 }]}>
                <Text style={styles.ra_text_secondary}>Cancel</Text>
              </Pressable>
              <Pressable onPress={() => performDelete(deleteModal.address, deleteModal.lat)} style={[styles.ra_btn, styles.ra_primary]}>
                <Text style={styles.ra_text_primary}>Delete</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Toast */}
      {toastMessage && (
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: Math.max(insets.bottom, 12) + 16, alignItems: 'center', opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }} pointerEvents="none">
          <View style={{ backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
