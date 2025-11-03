import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Platform, Image } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';
import { Link, router } from 'expo-router';
import { endpoints } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  console.log('Login: endpoint', endpoints.authToken);
  console.log('Login: email', email.trim());
    if (!email || !password) {
      Alert.alert('Required fields', 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      // OAuth2PasswordRequestForm expects x-www-form-urlencoded with username and password
      const body = new URLSearchParams();
      body.append('username', email.trim());
      body.append('password', password);
      const res = await fetch(endpoints.authToken, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!res.ok) {
        const txt = await res.text();
        Toast.show({ type: 'error', text1: 'Login failed', text2: txt.slice(0, 120) });
        return;
      }
      const data: any = await res.json();
      const token = data?.access_token;
      if (!token) {
        Toast.show({ type: 'error', text1: 'Login failed', text2: 'Missing token in response' });
        return;
      }
      await AsyncStorage.setItem('auth:token', token);
      Toast.show({ type: 'success', text1: 'Welcome!', text2: 'Login successful.' });
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Network error', text2: e?.message || 'Unable to connect' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAwareScrollView contentContainerStyle={{ alignItems: 'center' }} enableOnAndroid extraScrollHeight={20} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSpacer} />
        <View style={styles.logoWrap}>
          <Image
            source={require('../../assets/images/LogoAPP.webp')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
  <Text style={styles.title}>Sign in</Text>
  <Text style={styles.subtitle}>Sign in with your email and password</Text>

        <View style={styles.form}>
  <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@domain.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholderTextColor="#94A3B8"
        />

  <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <TextInput
          style={[styles.input, { color: '#0f172a' }]}
          placeholder="••••••••"
          placeholderTextColor="#64748B"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.linksRow}>
          <Text style={styles.link}>Forgot your password?</Text>
          <Link href="/(auth)/register" style={styles.mutedLink}>Create account</Link>
        </View>

        <TouchableOpacity style={[styles.button, { width: '100%' }]} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
  logoWrap: {
    height: 72,
    width: 72,
    borderRadius: 16,
    backgroundColor: '#EEF6F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoImage: {
    height: 96,
    width: 96,
    alignSelf: 'center',
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
    gap: 8,
    width: '100%',
    maxWidth: 900,
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    minHeight: 56,
    fontSize: 16,
    width: '100%',
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
