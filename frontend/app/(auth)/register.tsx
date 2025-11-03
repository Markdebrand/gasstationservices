import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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
    if (!name || !email || !password || !confirm) {
      Alert.alert('Required fields', 'Please complete all fields');
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
      // Verificar si el usuario ya existe
      const checkRes = await fetch(`${endpoints.authRegister.replace('/register','/users')}?email=${encodeURIComponent(email)}`);
      if (checkRes.ok) {
        const users = await checkRes.json();
        if (Array.isArray(users) && users.length > 0) {
          setErrors({ email: 'Email already registered' });
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
        Toast.show({ type: 'success', text1: 'Account created!', text2: 'You can now sign in.' });
        router.replace('/(auth)/login' as any);
      } else {
        const data = await res.json().catch(() => ({} as any));
        setErrors({ email: data.detail || "Couldn't create account" });
      }
    } catch (e) {
      Alert.alert('Error', "Couldn't connect to the backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.centerWrap}
        enableOnAndroid
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.logoCircle}><Text style={styles.logo}>💧</Text></View>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Sign up to request service</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />

            <Text style={[styles.label, { marginTop: 12 }]}>Email</Text>
            <TextInput style={styles.input} placeholder="you@domain.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />

            <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
            <TextInput style={styles.input} placeholder="Minimum 8 characters" secureTextEntry value={password} onChangeText={setPassword} />

            <Text style={[styles.label, { marginTop: 12 }]}>Confirm password</Text>
            <TextInput style={styles.input} placeholder="Repeat your password" secureTextEntry value={confirm} onChangeText={setConfirm} />

            <TouchableOpacity style={[styles.button, { width: '100%' }]} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#F7FBFE" /> : <Text style={styles.buttonText}>Create account</Text>}
            </TouchableOpacity>

            <Text style={styles.smallText}>Already have an account? <Link href="/(auth)/login" style={styles.link}>Sign in</Link></Text>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f8fafc' },
  centerWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 24 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.10, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  logoCircle: { height: 56, width: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: 'rgba(20,97,123,0.08)' },
  logo: { fontSize: 28, color: '#14617B' },
  title: { marginTop: 4, textAlign: 'center', fontSize: 22, fontWeight: '600', color: '#0f172a' },
  subtitle: { textAlign: 'center', marginTop: 4, fontSize: 13, color: '#64748B' },
  form: { marginTop: 20, gap: 8, width: '100%', paddingHorizontal: 4 },
  label: { fontSize: 12, color: '#475569' },
  input: { marginTop: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, width: '100%', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 }, android: { elevation: 0 } }) },
  button: { height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14617B', marginTop: 16, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6 }, android: { elevation: 4 } }) },
  buttonText: { color: '#F7FBFE', fontSize: 16, fontWeight: '600' },
  link: { color: '#14617B' },
  error: { color: '#e11d48', fontSize: 12, marginTop: 2 },
  smallText: { marginTop: 8, textAlign: 'center', fontSize: 12, color: '#64748B' },
});
