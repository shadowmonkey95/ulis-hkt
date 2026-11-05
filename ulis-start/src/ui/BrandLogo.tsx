import { Image } from 'expo-image';
import { StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

// Official ULIS logo (cropped from zalo/logo_design.jpg – "Logo chính thức", navy #223C77 + white).
const LOGO = require('../../assets/images/ulis-logo.png');

export interface BrandLogoProps {
  size?: number;
  /** Corner radius; default ≈ 1/3 of the size (rounded tile like the old "U" mark). */
  radius?: number;
  style?: StyleProp<ImageStyle>;
}

/** The ULIS logo tile used in the sidebar brand and the assistant header. Decorative: the label sits next to it. */
export function BrandLogo({ size = 44, radius, style }: BrandLogoProps) {
  return (
    <Image
      source={LOGO}
      contentFit="cover"
      accessible={false}
      style={[styles.img, { width: size, height: size, borderRadius: radius ?? Math.round(size / 3.2) }, style]}
    />
  );
}

const styles = StyleSheet.create({
  img: { overflow: 'hidden' },
});
