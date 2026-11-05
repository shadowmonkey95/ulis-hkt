import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';

import { useJourney } from '@/journey';
import { AppSidebar, TRACK_LABELS, useInShell, useLayout, useTheme } from '@/ui';

type FeatherName = ComponentProps<typeof Feather>['name'];

const TABS: { name: string; title: string; icon: FeatherName; a11y: string }[] = [
  { name: 'index', title: 'Hôm nay', icon: 'sun', a11y: 'Hôm nay – việc cần làm hôm nay' },
  { name: 'journey', title: 'Hành trình', icon: 'map', a11y: 'Hành trình' },
  { name: 'assistant', title: 'Trợ lý', icon: 'message-circle', a11y: 'Trợ lý hội nhập' },
  { name: 'more', title: 'Khám phá', icon: 'grid', a11y: 'Khám phá – cẩm nang, danh bạ, tài liệu' },
];

export default function TabsLayout() {
  const { colors } = useTheme();
  const { hasSidebar } = useLayout();
  const inShell = useInShell();
  const { profile } = useJourney();

  // Desktop web: the root AppShell already shows the sidebar → hide the tab bar.
  // If the shell isn't mounted, render the sidebar as a left "tab bar" instead.
  const tabBar = !hasSidebar
    ? undefined
    : inShell
      ? () => null
      : () => (
          <AppSidebar
            profile={
              profile
                ? { name: profile.name, subtitle: `${TRACK_LABELS[profile.track]} · ${profile.unit}` }
                : null
            }
          />
        );

  return (
    <Tabs
      tabBar={tabBar}
      screenOptions={{
        headerShown: false,
        tabBarPosition: hasSidebar ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        // Tab labels stay at 12px: the tab bar has a fixed height and 13px clips at large font scales.
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        tabBarAllowFontScaling: true,
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.a11y,
            tabBarIcon: ({ color, size }) => (
              <Feather name={t.icon} size={size ?? 22} color={typeof color === 'string' ? color : colors.textMuted} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
