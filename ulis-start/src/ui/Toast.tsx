import Feather from '@expo/vector-icons/Feather';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { useTheme } from './ThemeProvider';

export type ToastVariant = 'success' | 'info' | 'warning';

export interface ToastProps {
  visible: boolean;
  message: string;
  variant?: ToastVariant;
  /** ms before onHide is called (default 2200). */
  duration?: number;
  onHide: () => void;
  /** Distance from the bottom edge (default 24 + safe area; raise above a tab bar if needed). */
  bottomOffset?: number;
}

/** Transient message at the bottom of the screen. Controlled; or use ToastProvider + useToast(). */
export function Toast({ visible, message, variant = 'success', duration = 2200, onHide, bottomOffset }: ToastProps) {
  const { colors, radius, spacing, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const anim = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!visible) return;
    AccessibilityInfo.announceForAccessibility(message);
    anim.setValue(0);
    const seq = Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(duration),
      Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]);
    seq.start(({ finished }) => {
      if (finished) onHide();
    });
    return () => seq.stop();
  }, [visible, message, duration, anim, onHide]);

  if (!visible) return null;
  const icon = variant === 'success' ? 'check-circle' : variant === 'warning' ? 'alert-circle' : 'info';
  const tint = variant === 'success' ? colors.success : variant === 'warning' ? colors.warning : colors.primary;

  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: bottomOffset ?? 24 + insets.bottom }]}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={[
          styles.toast,
          {
            backgroundColor: isDark ? colors.surfaceAlt : colors.text,
            borderRadius: radius.card,
            paddingHorizontal: spacing.lg,
            paddingVertical: spacing.md,
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Feather name={icon} size={18} color={tint} />
        <AppText variant="bodyStrong" color="#FFFFFF" style={styles.text}>
          {message}
        </AppText>
      </Animated.View>
    </View>
  );
}

interface ToastState {
  message: string;
  variant: ToastVariant;
  key: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/** Wrap the app once; then call `useToast().show('Tuyệt! +1 việc')` anywhere. */
export function ToastProvider({ children, bottomOffset }: { children: ReactNode; bottomOffset?: number }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = useCallback((message: string, variant: ToastVariant = 'success') => {
    setToast({ message, variant, key: Date.now() });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  return (
    <ToastContext.Provider value={{ show }}>
      <View style={styles.flex}>
        {children}
        {toast ? (
          <Toast key={toast.key} visible message={toast.message} variant={toast.variant} onHide={hide} bottomOffset={bottomOffset} />
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: 440 },
  text: { flexShrink: 1 },
});
