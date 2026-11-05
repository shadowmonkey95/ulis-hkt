import Feather from '@expo/vector-icons/Feather';
import { router, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { BrandLogo } from './BrandLogo';
import { Gradient } from './Gradient';
import type { FeatherName } from './Button';
import { useTheme } from './ThemeProvider';
import { focusRing, pointer, pressState } from './interaction';
import { SIDEBAR_WIDTH, useLayout } from './useLayout';

export interface SidebarProfile {
  name: string;
  /** e.g. "Giảng viên · Khoa Tiếng Anh" */
  subtitle?: string;
  /** e.g. "Ngày 9/30" */
  dayLabel?: string;
}

interface NavItem {
  label: string;
  icon: FeatherName;
  href: Href;
  /** Path prefixes that mark this item active. */
  match: (path: string) => boolean;
}

const startsWith = (path: string, ...prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

// App structure (navigation), not content.
const MAIN: NavItem[] = [
  { label: 'Hôm nay', icon: 'sun', href: '/', match: (p) => p === '/' || p === '' || startsWith(p, '/checkin') },
  { label: 'Hành trình hội nhập', icon: 'map', href: '/journey', match: (p) => startsWith(p, '/journey', '/task') },
  { label: 'Trợ lý thông minh', icon: 'message-circle', href: '/assistant', match: (p) => startsWith(p, '/assistant') },
  { label: 'Khám phá ULIS', icon: 'grid', href: '/more', match: (p) => startsWith(p, '/more') },
];

const QUICK: NavItem[] = [
  { label: 'Cẩm nang hội nhập', icon: 'book-open', href: '/guide', match: (p) => startsWith(p, '/guide') },
  { label: 'Danh bạ', icon: 'users', href: '/contacts', match: (p) => startsWith(p, '/contacts') },
  { label: 'Văn bản, biểu mẫu', icon: 'folder', href: '/library', match: (p) => startsWith(p, '/library') },
  { label: 'Chế độ và phúc lợi', icon: 'gift', href: '/benefits', match: (p) => startsWith(p, '/benefits') },
  { label: 'Giới thiệu ULIS', icon: 'info', href: '/about', match: (p) => startsWith(p, '/about') },
  { label: 'Góp ý', icon: 'edit-3', href: '/feedback', match: (p) => startsWith(p, '/feedback') },
  { label: 'Cài đặt demo', icon: 'sliders', href: '/demo', match: (p) => startsWith(p, '/demo') },
];

// Manager-only area (reference: "TIỆN ÍCH MỞ RỘNG" group + top-bar button).
const MANAGER: NavItem = {
  label: 'Dashboard TC&TT',
  icon: 'bar-chart-2',
  href: '/dashboard',
  match: (p) => startsWith(p, '/dashboard'),
};

export interface AppSidebarProps {
  profile?: SidebarProfile | null;
  /** Clears the local profile + progress ("Đăng xuất"). The profile menu shows the logout item only when set. */
  onLogout?: () => void;
}

/** Left navigation for medium/wide web (replaces the bottom tab bar). */
export function AppSidebar({ profile, onLogout }: AppSidebarProps) {
  const { colors, spacing } = useTheme();
  const pathname = usePathname();

  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel="Điều hướng chính"
      style={[styles.bar, { width: SIDEBAR_WIDTH, backgroundColor: colors.surface, borderRightColor: colors.border }]}
    >
      <Pressable
        onPress={() => router.navigate('/')}
        accessibilityRole="link"
        accessibilityLabel="ULIS START – về trang Hôm nay"
        style={(s) => [styles.brand, { padding: spacing.lg, gap: spacing.md }, pointer, focusRing(s, colors.primary, -2)]}
      >
        <BrandLogo size={44} />
        <View style={styles.flex}>
          <AppText variant="h2" weight="800" style={styles.brandName}>
            ULIS START
          </AppText>
          <AppText variant="small" color="textMuted" style={styles.brandSub}>
            SỔ TAY HỘI NHẬP ĐIỆN TỬ
          </AppText>
        </View>
      </Pressable>

      <ScrollView style={styles.flex} contentContainerStyle={{ paddingHorizontal: spacing.md, paddingBottom: spacing.lg, gap: 2 }}>
        {MAIN.map((item) => (
          <SidebarItem key={item.label} item={item} active={item.match(pathname)} />
        ))}
        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.md }]} />
        <AppText variant="eyebrow" color="textMuted" style={{ paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
          Truy cập nhanh
        </AppText>
        {QUICK.map((item) => (
          <SidebarItem key={item.label} item={item} active={item.match(pathname)} small />
        ))}
        <View style={[styles.divider, { backgroundColor: colors.border, marginVertical: spacing.md }]} />
        <AppText variant="eyebrow" color="textMuted" style={{ paddingHorizontal: spacing.md, marginBottom: spacing.xs }}>
          Dành cho quản lý
        </AppText>
        <SidebarItem item={MANAGER} active={MANAGER.match(pathname)} small />
      </ScrollView>

      <AppText variant="small" color="textMuted" style={{ paddingHorizontal: spacing.lg + 2, paddingVertical: spacing.sm, fontSize: 12, lineHeight: 17 }}>
        Bản trình diễn ý tưởng Hackathon · Trường Đại học Ngoại ngữ – ĐHQGHN
      </AppText>
      {profile ? <ProfileMenu profile={profile} onLogout={onLogout} /> : null}
    </View>
  );
}

/** Bottom-left profile card; clicking it opens a small menu (change profile settings, log out). */
function ProfileMenu({ profile, onLogout }: { profile: SidebarProfile; onLogout?: () => void }) {
  const { colors, gradients, spacing, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const close = () => {
    setOpen(false);
    setConfirming(false);
  };

  return (
    <View style={[styles.profile, { borderTopColor: colors.border, padding: spacing.md, gap: spacing.sm }]}>
      {open ? (
        <View
          accessibilityLabel="Menu tài khoản"
          style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, padding: spacing.xs }]}
        >
          {confirming ? (
            <View style={{ padding: spacing.sm, gap: spacing.sm }}>
              <AppText variant="bodyStrong">Đăng xuất khỏi thiết bị này?</AppText>
              <AppText variant="small" color="textMuted">
                Hồ sơ, việc đã đánh dấu, huy hiệu và check-in lưu trên thiết bị này sẽ bị xóa. Bạn sẽ quay lại màn hình bắt đầu.
              </AppText>
              <View style={[styles.menuActions, { gap: spacing.sm }]}>
                <MenuButton label="Hủy" onPress={() => setConfirming(false)} />
                <MenuButton
                  label="Đăng xuất"
                  icon="log-out"
                  danger
                  filled
                  onPress={() => {
                    close();
                    onLogout?.();
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              <MenuButton
                label="Đổi vị trí / ngày bắt đầu"
                icon="sliders"
                onPress={() => {
                  close();
                  router.navigate('/demo');
                }}
              />
              {onLogout ? <MenuButton label="Đăng xuất" icon="log-out" danger onPress={() => setConfirming(true)} /> : null}
            </>
          )}
        </View>
      ) : null}

      <Pressable
        onPress={() => (open ? close() : setOpen(true))}
        accessibilityRole="button"
        accessibilityLabel={`Tài khoản: ${profile.name}. ${open ? 'Đóng menu' : 'Mở menu tài khoản'}`}
        accessibilityState={{ expanded: open }}
        style={(state) => [
          styles.profileCard,
          {
            backgroundColor: colors.primarySoft,
            borderRadius: radius.card,
            padding: spacing.md,
            gap: spacing.md,
            borderWidth: 1,
            borderColor: open || pressState(state).hovered ? colors.cardHoverBorder : 'transparent',
          },
          pointer,
          focusRing(state, colors.primary, -2),
        ]}
      >
        <Gradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
          <AppText variant="bodyStrong" color="primaryFg">
            {initials(profile.name)}
          </AppText>
        </Gradient>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {profile.name}
          </AppText>
          {profile.subtitle ? (
            <AppText variant="small" color="textMuted" numberOfLines={2}>
              {profile.subtitle}
            </AppText>
          ) : null}
          {profile.dayLabel ? (
            <AppText variant="small" color="primary" weight="700">
              {profile.dayLabel}
            </AppText>
          ) : null}
        </View>
        <Feather name={open ? 'chevron-down' : 'chevron-up'} size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function MenuButton({
  label,
  icon,
  onPress,
  danger,
  filled,
}: {
  label: string;
  icon?: FeatherName;
  onPress: () => void;
  danger?: boolean;
  filled?: boolean;
}) {
  const { colors, spacing } = useTheme();
  const fg = filled ? '#FFFFFF' : danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => {
        const s = pressState(state);
        return [
          styles.menuItem,
          {
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: 10,
            backgroundColor: filled ? colors.danger : s.hovered ? colors.navActiveBg : 'transparent',
            opacity: s.pressed ? 0.8 : 1,
          },
          filled ? styles.flex : null,
          pointer,
          focusRing(state, colors.primary, -2),
        ];
      }}
    >
      {icon ? <Feather name={icon} size={17} color={fg} /> : null}
      <AppText variant="caption" color={fg} weight="700">
        {label}
      </AppText>
    </Pressable>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1)?.[0] ?? '?').toUpperCase();
}

function SidebarItem({ item, active, small }: { item: NavItem; active: boolean; small?: boolean }) {
  const { colors, spacing } = useTheme();
  return (
    <Pressable
      onPress={() => router.navigate(item.href)}
      accessibilityRole="link"
      accessibilityLabel={item.label}
      accessibilityState={{ selected: active }}
      style={(state) => {
        const s = pressState(state);
        return [
          styles.item,
          {
            minHeight: small ? 40 : 46,
            paddingHorizontal: spacing.md,
            gap: spacing.md,
            borderRadius: 12,
            backgroundColor: active || s.hovered ? colors.navActiveBg : 'transparent',
            opacity: s.pressed ? 0.8 : 1,
          },
          pointer,
          focusRing(state, colors.primary, -2),
        ];
      }}
    >
      {(state) => {
        const tint = active || pressState(state).hovered ? colors.navActiveText : colors.navText;
        return (
          <>
            <Feather name={item.icon} size={small ? 18 : 20} color={tint} />
            <AppText variant={small ? 'caption' : 'bodyStrong'} color={tint} weight={active ? '700' : '600'} style={styles.flex}>
              {item.label}
            </AppText>
          </>
        );
      }}
    </Pressable>
  );
}

const EXTRA_SECTIONS: { label: string; match: (path: string) => boolean }[] = [
  { label: 'Check-in', match: (p) => startsWith(p, '/checkin') },
  { label: 'Bắt đầu', match: (p) => startsWith(p, '/onboarding') },
];

/** Section name for the current route ("Cẩm nang", "Hành trình" …). */
export function sectionForPath(path: string): string {
  const all = [...MAIN, ...QUICK, MANAGER, ...EXTRA_SECTIONS];
  return all.find((i) => i.match(path))?.label ?? 'Khám phá ULIS';
}

/** 64px desktop top bar: "ULIS START / <section>" + "✦ BẢN DEMO" pill. */
export function AppTopBar() {
  const { colors, spacing } = useTheme();
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  return (
    <View style={[styles.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingHorizontal: 34 }]}>
      <View style={styles.crumb} accessibilityRole="header" accessibilityLabel={`ULIS START, ${section}`}>
        <AppText variant="bodyStrong" color="textMuted">
          ULIS START
        </AppText>
        <AppText variant="bodyStrong" color="textMuted">
          /
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {section}
        </AppText>
      </View>
      <View style={[styles.topRight, { gap: spacing.sm, marginLeft: spacing.md }]}>
        <View style={[styles.pill, { backgroundColor: colors.pillBg }]}>
          <AppText variant="small" color={colors.pillText} weight="700" style={{ fontSize: 12, lineHeight: 17 }}>
            ✦ BẢN DEMO
          </AppText>
        </View>
        <Pressable
          onPress={() => router.navigate(MANAGER.href)}
          accessibilityRole="link"
          accessibilityLabel="Dashboard TC&TT – trang dành riêng cho quản lý"
          style={(state) => [
            styles.topButton,
            {
              gap: spacing.sm,
              borderColor: MANAGER.match(pathname) ? colors.primary : colors.border,
              backgroundColor: MANAGER.match(pathname) || pressState(state).hovered ? colors.navActiveBg : colors.surface,
            },
            pointer,
            focusRing(state, colors.primary),
          ]}
        >
          <Feather name="bar-chart-2" size={16} color={MANAGER.match(pathname) ? colors.navActiveText : colors.navText} />
          <AppText variant="caption" weight="700" color={MANAGER.match(pathname) ? colors.navActiveText : colors.navText}>
            Dashboard TC&TT
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const ShellContext = createContext(false);

/** true when an AppShell sidebar is already rendered above (so the tabs layout must not render another one). */
export function useInShell(): boolean {
  return useContext(ShellContext);
}

export interface AppShellProps {
  children: ReactNode;
  /** Show the sidebar at all (e.g. false during onboarding). Default true. */
  enabled?: boolean;
  profile?: SidebarProfile | null;
  onLogout?: () => void;
}

/**
 * Root-level shell: on medium/wide web renders [AppSidebar | children]; otherwise passthrough.
 * Lets the sidebar stay visible on stack routes outside (tabs), e.g. /guide/[id], /task/[id].
 */
export function AppShell({ children, enabled = true, profile, onLogout }: AppShellProps) {
  const { hasSidebar } = useLayout();
  if (!hasSidebar || !enabled) return <>{children}</>;
  return (
    <ShellContext.Provider value>
      <View style={styles.shell}>
        <AppSidebar profile={profile} onLogout={onLogout} />
        <View style={styles.flex}>
          <AppTopBar />
          <View style={styles.flex}>{children}</View>
        </View>
      </View>
    </ShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row' },
  bar: { borderRightWidth: StyleSheet.hairlineWidth, height: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandName: { fontSize: 20, lineHeight: 28, letterSpacing: 0.3 },
  brandSub: { fontSize: 11, lineHeight: 15, letterSpacing: 0.6 },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center' },
  divider: { height: StyleSheet.hairlineWidth },
  profile: { borderTopWidth: StyleSheet.hairlineWidth },
  profileCard: { flexDirection: 'row', alignItems: 'center' },
  menu: { borderWidth: 1, shadowColor: '#24314E', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  menuItem: { flexDirection: 'row', alignItems: 'center', minHeight: 44, justifyContent: 'flex-start' },
  menuActions: { flexDirection: 'row' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  topBar: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  pill: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  topButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
});
