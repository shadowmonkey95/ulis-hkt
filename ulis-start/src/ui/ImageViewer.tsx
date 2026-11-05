import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from './AppText';
import { focusRing, pointer } from './interaction';

export interface ImageViewerProps {
  visible: boolean;
  source: ImageSourcePropType;
  /** Intrinsic width / height. */
  aspect: number;
  /** Screen-reader description. */
  alt: string;
  caption?: string;
  onClose: () => void;
}

const BACKDROP = 'rgba(12, 10, 16, 0.94)';

/**
 * Full-screen image viewer (RN Modal, dark backdrop, "Đóng").
 * iOS: pinch-zoom up to 4× (ScrollView zoom). Android / web: "Phóng to 2×" toggle, then pan by scrolling
 * horizontally + vertically. Web: Esc closes.
 */
export function ImageViewer({ visible, source, aspect, alt, caption, onClose }: ImageViewerProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [zoomed, setZoomed] = useState(false);
  const nativeZoom = Platform.OS === 'ios';

  const close = () => {
    setZoomed(false);
    onClose();
  };

  // Esc closes on web.
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setZoomed(false);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  // Fit inside the window (leaving room for the header / caption).
  const availH = Math.max(200, winH - insets.top - insets.bottom - 150);
  const fitW = Math.min(winW - 16, availH * aspect);
  const scale = zoomed ? 2 : 1;
  const imgW = fitW * scale;
  const imgH = imgW / aspect;

  const image = <Image source={source} accessibilityLabel={alt} accessible resizeMode="contain" style={{ width: imgW, height: imgH }} />;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: BACKDROP, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]} accessibilityViewIsModal>
        <View style={styles.header}>
          {!nativeZoom ? (
            <Pressable
              onPress={() => setZoomed((z) => !z)}
              accessibilityRole="button"
              accessibilityLabel={zoomed ? 'Thu nhỏ ảnh' : 'Phóng to ảnh gấp đôi'}
              style={(s) => [styles.btn, pointer, focusRing(s, '#FFFFFF')]}
            >
              <Feather name={zoomed ? 'zoom-out' : 'zoom-in'} size={18} color="#FFFFFF" />
              <AppText variant="bodyStrong" color="#FFFFFF">
                {zoomed ? 'Thu nhỏ' : 'Phóng to 2×'}
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="caption" color="#D9D3E2">
              Chụm hai ngón để phóng to
            </AppText>
          )}
          <View style={styles.flex} />
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel="Đóng ảnh"
            style={(s) => [styles.btn, pointer, focusRing(s, '#FFFFFF')]}
          >
            <Feather name="x" size={20} color="#FFFFFF" />
            <AppText variant="bodyStrong" color="#FFFFFF">
              Đóng
            </AppText>
          </Pressable>
        </View>

        {nativeZoom ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.center}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            {image}
          </ScrollView>
        ) : (
          <ScrollView style={styles.flex} contentContainerStyle={zoomed ? undefined : styles.center}>
            <ScrollView horizontal contentContainerStyle={zoomed ? undefined : styles.centerRow} showsHorizontalScrollIndicator>
              {image}
            </ScrollView>
          </ScrollView>
        )}

        {caption ? (
          <AppText color="#F1ECF4" align="center" style={styles.caption}>
            {caption}
          </AppText>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 48 },
  flex: { flex: 1 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  centerRow: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  caption: { paddingHorizontal: 16, paddingTop: 8 },
});
