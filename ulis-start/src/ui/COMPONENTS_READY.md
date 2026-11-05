# src/ui – ready (import everything from `@/ui`)

`npx tsc --noEmit` passes. All touchables have Vietnamese a11y labels and >=44pt hit areas; no fixed-height text boxes.

## Providers / layout
- `ThemeProvider({ children, scheme?: 'light'|'dark' })` – defaults to system scheme. `useTheme(): Theme` = `{ scheme, isDark, colors, spacing, radius, type }` (works without provider too).
- `WebFrame({ children })` – web: centered column max 430px on `colors.frameBg`; native: passthrough. Suggested root: `<ThemeProvider><WebFrame><ToastProvider><Stack/></ToastProvider></WebFrame></ThemeProvider>` (SafeAreaProvider is supplied by expo-router).
- `ToastProvider({ children, bottomOffset?: number })` + `useToast(): { show(message: string, variant?: 'success'|'info'|'warning') }`.
- `Screen({ children, title?, subtitle?, back?: boolean, onBack?, headerRight?: ReactNode, header?: ReactNode, scroll?: boolean = true, footer?: ReactNode, keyboard?: boolean, keyboardOffset?: number, noPadding?: boolean, contentContainerStyle?, refreshControl?, testID? })` – SafeArea(top/left/right) + bg + ScrollView. `back` draws a "Quay lại" bar (router.back() or `/more`). `header` replaces the title block (use for the blue Hôm nay hero). `footer` = sticky bottom action area.

## Primitives
- `AppText({ variant?: 'title'|'h2'|'body'|'bodyStrong'|'caption'|'small', color?: ThemeColorKey | string, align?, weight?, ...TextProps })`
- `Card({ children, onPress?, accessibilityLabel?, accessibilityHint?, padding?: number, tone?: 'surface'|'primary'|'accent'|'success'|'muted', style?, testID? })`
- `Button({ label, onPress, variant?: 'primary'|'secondary'|'ghost'|'danger', icon?: FeatherName, iconRight?, disabled?, loading?, fullWidth?: boolean = true, accessibilityLabel?, accessibilityHint?, style?, testID? })` – minHeight 48.
- `Chip({ label, selected?, onPress?, icon?: FeatherName, color?: string, accessibilityLabel?, style?, testID? })` – static tag when no onPress.
- `Banner({ variant?: 'info'|'warning'|'danger'|'success', title?, message, icon?, actionLabel?, onAction?, onDismiss?, style?, testID? })`
- `SectionHeader({ title, index?: number, actionLabel?, onAction?, style? })`
- `EmptyState({ title, message?, icon?: FeatherName, actionLabel?, onAction?, style? })`
- `SearchBar({ value, onChangeText, placeholder?, onSubmit?, autoFocus?, accessibilityLabel?, style?, testID? })`

## Progress
- `ProgressRing({ progress: number /*0..1*/, size?: number = 96, strokeWidth?: number = 10, color?, trackColor?, label?: string|null /*default "NN%"*/, sublabel?, labelColor?, children?, duration?: number = 700, accessibilityLabel? })` – react-native-svg, animates on change.
- `ProgressBar({ progress: number /*0..1*/, color?, trackColor?, height?: number = 8, accessibilityLabel?, style? })`

## Journey
- `TaskRow({ task: Task, status: TaskStatus, currentDay: number, phaseStartDay?: number, onToggle?: () => void, onPress?: () => void, toggleDisabled?: boolean, hideOwner?: boolean, divider?: boolean = true, testID? })` – checkbox bounces when status becomes 'done' (caller fires Haptics). Non-`me` tasks: round checkbox, a11y "Đã nhận", caption "Đang chờ <owner> – bạn xác nhận khi đã nhận". Locked/skipped rows are muted.
- `OwnerChip({ owner: Owner, long?: boolean, style? })`
- `DueLabel({ status: TaskStatus, dueDay: number, currentDay: number, phaseStartDay?: number })` – "Ngày 5" / "Trước ngày đầu" / "Hạn hôm nay" / "Còn 2 ngày" / "Quá hạn 2 ngày" / "Mở vào ngày 8" / "Đã xong".
- `PhaseHeader({ phase: Phase, state: 'done'|'current'|'upcoming'|'behind', progress?: { done: number; total: number; pct: number }, expanded?, onPress?, isLast?, children?: ReactNode })` – timeline dot + 2px line; put the phase's TaskRows in `children` so the line runs alongside them.
- `BadgeModal({ visible, title, description?, icon?: FeatherName = 'award', heading?: string = 'Bạn vừa đạt huy hiệu mới!', closeLabel?: string = 'Tuyệt vời!', onClose })` – Animated pop + confetti.
- `Toast({ visible, message, variant?, duration?: number = 2200, onHide, bottomOffset? })` – controlled version.

## Content
- `SourceFooter({ meta: Meta, compact?: boolean, style? })` – "Nguồn: … · Cập nhật DD/MM/YYYY" + badge "Nội dung mẫu – cần ULIS xác nhận" when `!verified`.
- `ContactCard({ contact: Contact, onPress?, onCall?, onEmail?, highlight?: string, hideActions?: boolean, maxHandles?: number = 4 })` – default call/email via `Linking` (tel:/mailto:).
- `ChatBubble({ role: 'user'|'assistant', text: string, children?: ReactNode, meta?: string, showAvatar?: boolean = true })`
- `openUrlSafe(url: string): Promise<boolean>` – Linking.openURL with try/catch.

## Tokens & helpers (pure)
- `theme.ts`: `palettes`, `spacing {xs4 sm8 md12 lg16 xl24 xxl32}`, `radius {chip8 card14 pill999}`, `typography`, `HIT_MIN`, `makeTheme`, `lightTheme`, `darkTheme`, types `Theme`, `ThemeColors`, `ColorScheme`.
- `labels.ts`: `OWNER_LABELS`, `OWNER_LONG_LABELS`, `TRACK_LABELS`, `GUIDE_CATEGORY_LABELS`, `RESOURCE_TYPE_LABELS`, `BENEFIT_CATEGORY_LABELS`, `TASK_STATUS_LABELS`, `formatDay(day)`, `formatDate(iso)`, `getDueInfo(status, dueDay, currentDay, phaseStartDay?)`, `aggregateMeta(items: Meta[]): Meta`.
- Icons: use `import Feather from '@expo/vector-icons/Feather'` (installed via `npx expo install @expo/vector-icons`).

## Changes after first release
- Animated values now use `useState(() => new Animated.Value(x))[0]` (react-native-web 0.21 has no `useAnimatedValue`).
- `PhaseHeader` state adds `'behind'` (past phase with overdue required tasks: orange dot + "CÒN VIỆC QUÁ HẠN").
- Added `ResourceRow({ resource, supersededByTitle?, onPress?, divider? })`, `useOpenResource()`, `RESOURCE_TYPE_ICONS`.
- Feedback store: `src/feedback/storage.ts` → `addFeedback({ kind: 'feedback'|'question'|'content-error', message, anonymous, origin, name?, relatedId? })`, `listFeedback()`, key `ulis.feedback.v1`.
- Phase 4: `typography.small` is now 13/18; WebFrame max width 430; `Screen` keyboard mode uses `behavior="padding"` on iOS and Android (+ `keyboardOffset` prop); `searchContent` option `relativeCutoff` (opt-in); `getDueInfo` shows "Nên làm ngay" for past-due pre-boarding tasks.

## Desktop web (responsive) – all guarded by `useLayout()`; native and web < 768px unchanged
- `useLayout(): { width, size: 'compact'|'medium'|'wide', isCompact, hasSidebar, isWide }` (lead's hook; `resolveLayout(width, os)` pure). `BREAKPOINTS {medium 768, wide 1024}`, `CONTENT_MAX_WIDTH 1200`, `SIDEBAR_WIDTH 248`.
- `Columns({ children, min?: number = 280, gap?: number = 16, maxColumns?: number = 4, compactColumns?: number = 1, style? })` – 1 column on compact; on medium/wide as many equal columns of ≥ `min` px as fit (measured via onLayout). `columnsFor(width, min, gap, max?)` pure.
- `Screen` new props: `maxWidth?: number` (desktop content column, default 1200; use ~760 for reading pages), `topLevel?: boolean` (page reachable from the sidebar → hides "Quay lại" on desktop; leave off for detail pages). Desktop: content centered, side padding 32, title 28/700.
- `AppSidebar({ profile?: { name, subtitle?, dayLabel? } | null })` – brand block, 4 main items, "Truy cập nhanh" links, profile mini-card. Active item from `usePathname()`.
- `AppShell({ children, enabled?: boolean = true, profile? })` – desktop: `[AppSidebar | children]`, else passthrough. `useInShell()` tells the tabs layout to hide its own bar.
- Web interaction helpers: `pressState(state)` (adds `hovered`/`focused`), `pointer`, `focusRing(state, color, offset?)`, `interactive(state, color)`. Card/Button/Chip/TaskRow/ResourceRow/sidebar items have hover, pointer cursor and a visible focus ring on web.

### To add in app/_layout.tsx (journey-engineer)
```tsx
import { dayCounterLabel } from '@/journey';
import { AppShell, TRACK_LABELS } from '@/ui';
// inside RootNavigator, after hasProfile/currentDay are known:
return (
  <AppShell
    enabled={hasProfile}
    profile={profile ? { name: profile.name, subtitle: `${TRACK_LABELS[profile.track]} · ${profile.unit}`, dayLabel: dayCounterLabel(currentDay) } : null}
  >
    <StatusBar … />
    <Stack …>…</Stack>
  </AppShell>
);   // keep <BadgeHost /> where it is (inside or after AppShell both work)
```
Without it, desktop still works inside (tabs) (the tabs layout renders the sidebar itself), but stack routes outside (tabs) (/guide/[id], /task/[id] …) have no sidebar.

## Re-theme (rose × lavender, from zalo/ulis_start_demo_cap_nhat.html)
- `theme.ts` palette: primary #B94E79 (hover `primaryHover` #96335F), `primarySoft` #FCECF2, `secondary` #6756A7, `secondarySoft` #F0EDFF, accent #E0A100 (badges only), success #2E8B62, bg #FAF9FC, border #E9E5EB, text #24314E, textMuted #6F7890. New color keys: `infoCalloutBg/Border/Text`, `eyebrow`, `cardHoverBorder`, `chipBorder`, `outlineBorder`, `heroBorder`, `navText`, `navActiveBg`, `navActiveText`, `pillBg`, `pillText`, `completedBg`, `completedBorder`, `chatUser`, `chatAssistant`, `tiles` (3 icon-tile backgrounds). `info`/`infoSoft` now = lavender.
- `useTheme().gradients`: `brand` ['#D76491','#6E62B3'], `progress` ['#D86B96','#7E6AC4'], `hero` (light ['#FFF1F6','#F5F2FF','#F3F7FF'], dark ['#2A1824','#211C33']). Also exported as `gradients[scheme]`. Type `GradientColors`.
- `radius`: `chip`/`pill` 999 (pill!), `button`/`input` 11, `sm` 8, `tile` 13, `card` 18, `hero` 26. **Use `radius.input` (not `radius.chip`) for text inputs and small boxes.**
- Typography: new `eyebrow` variant (12/18, 800, letterSpacing 1.4, uppercase; AppText colors it `colors.eyebrow` unless `color` is given). `cardShadow` export = very soft card shadow.
- `Gradient({ colors: GradientColors, start?: {x,y} = {0,0}, end?: {x,y} = {1,0}, locations?, style?, children?, pointerEvents? })` – expo-linear-gradient wrapper.
- `HeroCard({ children, eyebrow?: string, noGlyph?: boolean, padding?: number, style?, testID? })` – soft hero gradient, border `heroBorder`, radius 26, decorative ✦ top-right at 55% opacity, ink text. Use for the Hôm nay header and Khám phá hero.
- `ImageViewer({ visible, source: ImageSourcePropType, aspect: number, alt: string, caption?, onClose })` – full-screen modal, dark backdrop, "Đóng"; iOS pinch-zoom ≤4×, Android/web "Phóng to 2×" + pan; Esc closes on web.
- `AppTopBar()` (rendered by `AppShell` on desktop): "ULIS START / <section>" + "✦ BẢN DEMO" pill; `sectionForPath(path)`.
- Restyled: Card (1px border, radius 18, soft shadow, hover border #D8B0C5 + lift 2px), Button (radius 11; primary hover #96335F; secondary = rose outline), Chip (white pill, #EAD8E1 border, rose text; selected rose fill), Banner info = lavender callout, SourceFooter badge = pink pill, TaskRow (rose checkbox, completed row pink bg + strikethrough), ChatBubble (user #B84F7A / assistant #F2F0F6), ProgressBar/Ring gradient fill (pass `color` for a solid fill), sidebar (gradient "U" tile, #FCEEF4/#AB446F hover+active, footer note).
