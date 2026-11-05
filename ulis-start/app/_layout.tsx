import * as SplashScreen from 'expo-splash-screen';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { BADGES, JourneyProvider, useJourney } from '@/journey';
import type { BadgeId } from '@/types';
import { AppShell, BadgeModal, TRACK_LABELS, ThemeProvider, ToastProvider, WebFrame, useLayout, useTheme } from '@/ui';

// Keep the native splash until journey state is hydrated from storage.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Delay before presenting a badge, so a dismissing native modal (check-in sheet) or a back transition finishes first. */
const BADGE_DELAY_MS = 450;

function BadgeHost() {
  const { pendingBadge, actions } = useJourney();
  const pathname = usePathname();
  const [shownBadge, setShownBadge] = useState<BadgeId | null>(null);
  // Never present over the check-in modal (iOS cannot stack an RN Modal on a dismissing native sheet).
  const blocked = pathname.startsWith('/checkin');

  useEffect(() => {
    if (!pendingBadge || blocked) return;
    let cancelled = false;
    // (InteractionManager was removed in RN 0.88 – wait for the transition, then the next frame.)
    const timer = setTimeout(() => {
      requestAnimationFrame(() => {
        if (!cancelled) setShownBadge(pendingBadge);
      });
    }, BADGE_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pendingBadge, blocked]);

  const badge = shownBadge && shownBadge === pendingBadge ? BADGES[shownBadge] : null;
  return (
    <BadgeModal
      visible={badge !== null}
      title={badge?.title ?? ''}
      description={badge?.description}
      icon={badge?.icon}
      onClose={() => {
        setShownBadge(null);
        actions.dismissBadge();
      }}
    />
  );
}

function RootNavigator() {
  const { hydrated, profile, actions } = useJourney();
  const { colors, isDark } = useTheme();
  // Desktop web (≥ 768): check-in is a centered dialog over the current page (transparentModal keeps the
  // previous screen visible on web). Phones / narrow web keep the native modal sheet.
  const { hasSidebar } = useLayout();

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync().catch(() => undefined);
  }, [hydrated]);

  // Splash stays visible until hydrated.
  if (!hydrated) return null;

  const hasProfile = profile !== null;
  // Desktop web: sidebar shell around every route (tabs and stack pages); passthrough on phones / narrow web.
  return (
    <AppShell
      enabled={hasProfile}
      onLogout={actions.reset}
      profile={
        profile
          ? { name: profile.name, subtitle: `${TRACK_LABELS[profile.track]} · ${profile.unit}` }
          : null
      }
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Protected guard={hasProfile}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task/[id]" />
          <Stack.Screen
            name="checkin/[day]"
            options={
              hasSidebar
                ? { presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }
                : { presentation: 'modal' }
            }
          />
          <Stack.Screen name="demo" />
          <Stack.Screen name="about" />
          <Stack.Screen name="guide" />
          <Stack.Screen name="contacts" />
          <Stack.Screen name="library" />
          <Stack.Screen name="benefits" />
          <Stack.Screen name="feedback" />
        </Stack.Protected>
        <Stack.Protected guard={!hasProfile}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
      <BadgeHost />
    </AppShell>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <WebFrame>
        <JourneyProvider>
          <ToastProvider bottomOffset={72}>
            <RootNavigator />
          </ToastProvider>
        </JourneyProvider>
      </WebFrame>
    </ThemeProvider>
  );
}
