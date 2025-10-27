import React, { memo, useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Animated } from 'react-native';
import styles from '../../../src/styles/locationsMapStyles';
import formatDuration from '../../../src/utils/formatDuration';

const Blur: any = (BlurView as unknown) as any;
const AnimatedBlur: any = Animated.createAnimatedComponent(Blur as any);


export type RouteActionsProps = {
  visible: boolean;
  loading?: boolean;
  navigating?: boolean;
  disabledStart?: boolean;
  routeInfo?: { distance?: number; duration?: number } | null;
  onToggleShowRoute: () => Promise<void> | void;
  onToggleNavigate: () => void;
  onSave: () => void;
  selected?: { latitude: number; longitude: number; title?: string } | null;
  containerStyle?: StyleProp<ViewStyle>;
  animatedStyle?: any;
};

type InnerProps = Omit<RouteActionsProps, 'visible' | 'containerStyle' | 'animatedStyle'>;

function RouteActionsInner({ loading, navigating, disabledStart, onToggleShowRoute, onToggleNavigate, onSave, selected, routeInfo }: InnerProps) {
  return (
    <View>
      {/* Selected location info */}
      {selected ? (
        <View style={styles.selectedCard}>
          <Text style={styles.selectedTitle}>{selected.title ?? 'Selected location'}</Text>
          <Text style={styles.selectedCoords}>{`${selected.latitude.toFixed(6)}, ${selected.longitude.toFixed(6)}`}</Text>
          {routeInfo && (
            <Text style={styles.selectedCoords}>{(() => {
              const d = routeInfo.distance ?? 0;
              const dist = d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`;
              const durationStr = formatDuration(routeInfo.duration ?? 0);
              return `${dist} · ${durationStr}`;
            })()}</Text>
          )}
        </View>
      ) : (
        <View style={styles.selectedCard} />
      )}

      <View style={styles.routeActionsInner}>
      <Pressable
        onPress={() => onToggleShowRoute()}
        style={[styles.ra_btn, styles.ra_secondary, loading ? styles.ra_disabled : null]}
        accessibilityLabel="Show or hide route"
        disabled={loading}
      >
        <Text style={styles.ra_text_secondary}>{loading ? 'Loading...' : 'View route'}</Text>
      </Pressable>

      <Pressable
        onPress={() => onToggleNavigate()}
        style={[styles.ra_btn, styles.ra_primary, disabledStart ? styles.ra_disabled : null]}
        disabled={disabledStart}
        accessibilityLabel={navigating ? 'Detener navegación' : 'Start Navigation'}
      >
        <Text style={styles.ra_text_primary}>{navigating ? 'Detener' : 'Start route'}</Text>
      </Pressable>

      <Pressable onPress={() => onSave()} style={[styles.ra_btn, styles.ra_secondary]} accessibilityLabel="Guardar ruta">
        <Text style={styles.ra_text_secondary}>Save</Text>
      </Pressable>
      </View>
    </View>
  );
}

const RouteActionsInnerMemo = memo(RouteActionsInner);

const RouteActions = ({ visible, animatedStyle, containerStyle, ...rest }: RouteActionsProps) => {
  const slide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(slide, { toValue: visible ? 1 : 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [visible, slide]);

  if (!visible) return null;
  const slideStyle = { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [120, 0] }) }] };
  return (
    <AnimatedBlur intensity={12} tint="light" style={[styles.routeActionsBg, containerStyle, animatedStyle]}>
      <Animated.View style={[slideStyle, styles.routeActionsContent]}>
        <RouteActionsInnerMemo {...rest} />
      </Animated.View>
    </AnimatedBlur>
  );
};

export default memo(RouteActions);
