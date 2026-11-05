import { Stack } from 'expo-router';

import { useTheme } from '@/ui';

export default function SectionLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
