import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { endpoints } from '@/constants/api';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; name?: string }>({});

  function validateEmail(email: string) {
    // Simple email regex
    return /^\S+@\S+\.\S+$/.test(email);
  }

  const handleRegister = async () => {
    let newErrors: { email?: string; password?: string; confirm?: string; name?: string } = {};
    if (!name) newErrors.name = 'El nombre es requerido';
    if (!email) newErrors.email = 'El correo es requerido';
    else if (!validateEmail(email)) newErrors.email = 'Ingresa un correo válido';
    if (!password) newErrors.password = 'La contraseña es requerida';
    else if (password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
    if (!confirm) newErrors.confirm = 'Confirma tu contraseña';
    else if (password !== confirm) newErrors.confirm = 'Las contraseñas no coinciden';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setLoading(true);
    try {
      // Verificar si el usuario ya existe
      const checkRes = await fetch(`${endpoints.authRegister.replace('/register','/users')}?email=${encodeURIComponent(email)}`);
      if (checkRes.ok) {
        const users = await checkRes.json();
        if (Array.isArray(users) && users.length > 0) {
          setErrors({ email: 'El correo ya está registrado' });
          setLoading(false);
          return;
        }
      }
      // Registrar usuario
      const res = await fetch(endpoints.authRegister, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password: password.slice(0,72) }),
      });
      if (res.ok) {
        Toast.show({ type: 'success', text1: '¡Cuenta creada!', text2: 'Ahora puedes iniciar sesión.' });
        router.replace('/(auth)/login' as any);
      } else {
        const data = await res.json().catch(() => ({} as any));
  setErrors({ email: data.detail || 'No se pudo crear la cuenta' });
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
  <Text style={styles.label}>Nombre</Text>
  <TextInput style={styles.input} placeholder="Tu nombre" value={name} onChangeText={setName} />
  {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

  <Text style={[styles.label, { marginTop: 12 }]}>Correo</Text>
  <TextInput style={styles.input} placeholder="tú@correo.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
  {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

  <Text style={[styles.label, { marginTop: 12 }]}>Contraseña</Text>
  <TextInput style={styles.input} placeholder="Mínimo 8 caracteres" secureTextEntry value={password} onChangeText={setPassword} />
  {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

  <Text style={[styles.label, { marginTop: 12 }]}>Confirmar contraseña</Text>
  <TextInput style={styles.input} placeholder="Repite tu contraseña" secureTextEntry value={confirm} onChangeText={setConfirm} />
  {errors.confirm ? <Text style={styles.error}>{errors.confirm}</Text> : null}

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
  error: { color: '#e11d48', fontSize: 12, marginTop: 2 },
  smallText: { marginTop: 8, textAlign: 'center', fontSize: 12, color: '#64748B' },
});
