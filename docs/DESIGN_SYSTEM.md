# Design system – "Institutional × Digital Journey"

Direction from the draft (style 1 + 2): trustworthy university blue, generous white space, but with the warmth
and progress cues of a modern onboarding app. Light theme first; dark theme via `useColorScheme`.

## Tokens (`src/ui/theme.ts`)
```ts
colors: {
  primary:   '#1B4B8F',  // ULIS-style deep blue (confirm with official brand guide)
  primaryFg: '#FFFFFF',
  accent:    '#F2A900',  // warm gold – badges, highlights, celebration
  success:   '#1F9D6B',  // done, progress
  warning:   '#D97706',  // due soon
  danger:    '#C2410C',  // overdue (orange-red, not alarm red – reduces anxiety)
  bg:        '#F6F8FB', surface: '#FFFFFF', border: '#E3E8EF',
  text:      '#0F1B2D', textMuted: '#5B6B80',
  ownerChips: { me: '#1B4B8F', unit: '#7C3AED', hr: '#0E7490', it: '#4D7C0F', buddy: '#BE185D' },
}
dark: bg '#0B1220', surface '#121B2E', border '#22304A', text '#E8EEF7', textMuted '#93A3B8', primary '#5B8FD8'
spacing: 4, 8, 12, 16, 24, 32 · radius: 8 (chips), 14 (cards), 999 (pills)
type: system font. title 24/700, h2 18/700, body 15/400 (line 22), caption 13/500. Respect allowFontScaling.
```
Vietnamese diacritics clip easily: set `lineHeight` ≥ 1.4× fontSize everywhere; never fixed-height text containers.

## Components (`src/ui/`)
`Screen` (safe area + scroll + bg) · `Card` · `ProgressRing` (react-native-svg, animated) · `ProgressBar` ·
`TaskRow` · `OwnerChip` · `DueLabel` · `PhaseHeader` (timeline dot + line) · `Banner` (info/warning/danger) ·
`Button` (primary/secondary/ghost, min height 48) · `Chip` · `SourceFooter` (source · date · "Nội dung mẫu" badge) ·
`EmptyState` · `BadgeModal` · `Toast` · `SearchBar` · `ContactCard` · `ChatBubble`.
All touchables: `accessibilityRole`, `accessibilityLabel` in Vietnamese, hit area ≥ 44pt.

## Screen notes
- **Tab bar**: icons Feather `sun` Hôm nay · `map` Hành trình · `message-circle` Trợ lý · `grid` Khám phá.
- **Hôm nay header**: primary-blue block with greeting, day counter "Ngày 9/30", ring on the right.
- **Hành trình**: timeline line on the left (2px border color), filled dots for completed phases, ring dot for current.
- **Celebration**: on task complete → checkbox scale bounce + `Haptics.notificationAsync(Success)`; on badge → modal.
- Motion: `Animated`/`LayoutAnimation` only (Reanimated is fine in Expo Go too, but keep deps minimal).
- Test at 360×740 (small Android) and iPhone 15 sizes; and web at 430px max-width centered for projector.

## Responsive web (desktop)
`useLayout()` (`src/ui/useLayout.ts`): native and web < 768px → **compact** (phone layout, bottom tabs, 430px frame on web);
web 768–1023 → **medium** (left sidebar `AppShell`/`AppSidebar`, single centered column); web ≥ 1024 → **wide**
(sidebar + multi-column: Hôm nay 2/3 + 1/3, Hành trình master–detail, Cẩm nang/Tài liệu filter column, guide detail
with sticky side panel, Trợ lý chat + side panel). Content max width 1200; reading width 760; forms 640.
Every desktop branch is guarded by `useLayout()` so Expo Go is unaffected.
