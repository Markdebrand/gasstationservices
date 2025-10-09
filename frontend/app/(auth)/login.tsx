import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { endpoints } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('user');
  const [password, setPassword] = useState('12345678');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Campos requeridos', 'Ingresa correo y contraseña');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(endpoints.authToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password.slice(0,72))}`,
      });
      const data = await res.json();
      if (res.ok && data.access_token) {
        await AsyncStorage.setItem('auth:token', data.access_token);
        router.replace('/(tabs)' as any);
      } else {
        Alert.alert('Error', data.detail || 'Credenciales incorrectas');
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo conectar al backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerSpacer} />
      <View style={styles.logoCircle}>
        <Text style={styles.logo}>💧</Text>
      </View>
      <Text style={styles.title}>Iniciar sesión</Text>
      <Text style={styles.subtitle}>Accede con tu correo y contraseña</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Correo</Text>
        <TextInput
          style={styles.input}
          placeholder="tú@correo.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.linksRow}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          <Link href="/(auth)/register" style={styles.mutedLink}>Crear cuenta</Link>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingTop: 120,
    alignItems: 'center',
  },
  headerSpacer: {
    height: Platform.OS === 'android' ? 8 : 0,
    width: '100%',
    backgroundColor: 'transparent',
  },
  logoCircle: {
    height: 56,
    width: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    // primary/10 ~ rgba(20,97,123,0.08)
    backgroundColor: 'rgba(20,97,123,0.08)',
  },
  logo: {
    fontSize: 28,
    color: '#14617B', // primary (approx HSL 195 72% 28%)
  },
  title: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 13,
    color: '#64748B', // muted-foreground
  },
  form: {
    marginTop: 24,
    gap: 4,
    width: '100%',
    maxWidth: 520,
    paddingHorizontal: 8,
  },
  label: {
    fontSize: 12,
    color: '#475569',
  },
  input: {
    marginTop: 4,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#E2E8F0', // border / input
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    // shadow
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
      android: { elevation: 0 },
    }),
  },
  linksRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    fontSize: 12,
    color: '#14617B', // primary
  },
  mutedLink: {
    fontSize: 12,
    color: '#64748B',
  },
  button: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  backgroundColor: '#14617B',
    marginTop: 16,
    // shadow
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6 },
      android: { elevation: 4 },
    }),
  },
  buttonText: {
    color: '#F7FBFE', // primary-foreground (very light)
    fontSize: 16,
    fontWeight: '600',
  },
});
