import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { endpoints } from '@/constants/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirm) {
      Alert.alert('Campos requeridos', 'Completa todos los campos');
      return;
    }
    if (password.length < 8) {
  Alert.alert('Weak password', 'Minimum 8 characters');
      return;
    }
    if (password !== confirm) {
  Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(endpoints.authRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password: password.slice(0,72) }),
      });
      if (res.ok) {
        Alert.alert('¡Cuenta creada!', 'Ahora puedes iniciar sesión');
        router.replace('/(auth)/login' as any);
      } else {
        const data = await res.json().catch(() => ({} as any));
        Alert.alert('Error', data.detail || 'No se pudo crear la cuenta');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar al backend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.logoCircle}><Text style={styles.logo}>💧</Text></View>
      <Text style={styles.title}>Crear cuenta</Text>
  <Text style={styles.subtitle}>Sign up to request service</Text>

      <View style={styles.form}>
  <Text style={styles.label}>Name</Text>
  <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />

  <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
  <TextInput style={styles.input} placeholder="you@email.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

  <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <TextInput style={styles.input} placeholder="Mínimo 8 caracteres" secureTextEntry value={password} onChangeText={setPassword} />

  <Text style={[styles.label, { marginTop: 12 }]}>Confirm password</Text>
  <TextInput style={styles.input} placeholder="Repeat your password" secureTextEntry value={confirm} onChangeText={setConfirm} />

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#F7FBFE" /> : <Text style={styles.buttonText}>Crear cuenta</Text>}
        </TouchableOpacity>

        <Text style={styles.smallText}>¿Ya tienes cuenta? <Link href="/(auth)/login" style={styles.link}>Inicia sesión</Link></Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16, paddingTop: 120, alignItems: 'center' },
  logoCircle: { height: 56, width: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: 'rgba(20,97,123,0.08)' },
  logo: { fontSize: 28, color: '#14617B' },
  title: { marginTop: 12, textAlign: 'center', fontSize: 22, fontWeight: '600', color: '#0f172a' },
  subtitle: { textAlign: 'center', marginTop: 4, fontSize: 13, color: '#64748B' },
  form: { marginTop: 24, gap: 4, width: '100%', maxWidth: 520, paddingHorizontal: 8 },
  label: { fontSize: 12, color: '#475569' },
  input: { marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 0 } }) },
  button: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14617B', marginTop: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6 }, android: { elevation: 4 } }) },
  buttonText: { color: '#F7FBFE', fontSize: 16, fontWeight: '600' },
  link: { color: '#14617B' },
  smallText: { marginTop: 8, textAlign: 'center', fontSize: 12, color: '#64748B' },
});
