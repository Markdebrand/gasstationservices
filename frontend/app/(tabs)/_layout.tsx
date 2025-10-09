import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const barHeight = 64; // base height
  const totalHeight = barHeight + Math.max(insets.bottom, 8);

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderTopColor: '#E5E7EB', backgroundColor: 'rgba(255,255,255,0.95)', // slightly more opaque
      // backdropFilter not supported in RN; keep without
    }}>
      <View style={{ height: totalHeight, paddingBottom: Math.max(insets.bottom, 8), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }}>
        {state.routes.map((route: any, index: number) => {
          const isFocused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          if (route.name === 'order') {
            // central elevated droplet button
            return (
              <View key={route.key} style={{ marginTop: -28, alignItems: 'center' }}>
                {/* container for glow + button */}
                <View style={{ width: 76, height: 76, alignItems: 'center', justifyContent: 'center' }}>
                  {/* glow behind the button - smaller and subtler */}
                  <View style={{
                    position: 'absolute',
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    backgroundColor: '#0f766e',
                    opacity: 0.10,
                    // iOS shadow for additional softness
                    shadowColor: '#0f766e',
                    shadowOpacity: 0.14,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 6 },
                    // Android elevation
                    elevation: 10,
                  }} />

                  {/* solid button */}
                  <View style={{ height: 64, width: 64, borderRadius: 16, backgroundColor: '#14617B', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="water-outline" size={26} color="#F7FBFE" onPress={onPress} />
                  </View>
                </View>
              </View>
            );
          }

          const label = route.name === 'index' ? 'Home' : route.name === 'finance' ? 'Finance' : route.name === 'locations' ? 'Locations' : 'Profile';

          // Icon choices:
          if (route.name === 'index') {
            return (
              <View key={route.key} style={{ alignItems: 'center' }}>
                <Feather name={'home' as any} size={22} color={isFocused ? '#14617B' : '#64748B'} onPress={onPress} />
                <Text style={{ marginTop: 4, fontSize: 12, color: isFocused ? '#14617B' : '#64748B', fontWeight: isFocused ? '700' : '500' }}>{label}</Text>
              </View>
            );
          }

          if (route.name === 'finance') {
            return (
              <View key={route.key} style={{ alignItems: 'center' }}>
                <MaterialIcons name={'trending-up' as any} size={22} color={isFocused ? '#14617B' : '#64748B'} onPress={onPress} />
                <Text style={{ marginTop: 4, fontSize: 12, color: isFocused ? '#14617B' : '#64748B', fontWeight: isFocused ? '700' : '500' }}>{label}</Text>
              </View>
            );
          }

          if (route.name === 'locations') {
            return (
              <View key={route.key} style={{ alignItems: 'center' }}>
                <Feather name={'map-pin' as any} size={22} color={isFocused ? '#14617B' : '#64748B'} onPress={onPress} />
                <Text style={{ marginTop: 4, fontSize: 12, color: isFocused ? '#14617B' : '#64748B', fontWeight: isFocused ? '700' : '500' }}>{label}</Text>
              </View>
            );
          }

          // profile
          return (
            <View key={route.key} style={{ alignItems: 'center' }}>
              <FontAwesome name={'user-circle' as any} size={22} color={isFocused ? '#14617B' : '#64748B'} onPress={onPress} />
              <Text style={{ marginTop: 4, fontSize: 12, color: isFocused ? '#14617B' : '#64748B', fontWeight: isFocused ? '700' : '500' }}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#14617B', tabBarStyle: { display: 'none' } }} tabBar={(props) => <CustomTabBar {...props} />}>
  <Tabs.Screen name="index" options={{ title: 'Home' }} />
  <Tabs.Screen name="finance" options={{ title: 'Finance' }} />
      <Tabs.Screen name="order" options={{ title: 'Orden' }} />
  <Tabs.Screen name="locations" options={{ title: 'Locations' }} />
  <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
