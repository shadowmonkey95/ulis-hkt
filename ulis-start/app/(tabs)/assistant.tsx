// Trợ lý hội nhập ULIS – chat over bundled content (local) or the optional proxy (remote).
import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type TextInputKeyPressEvent } from 'react-native';

import {
  DISCLAIMER,
  MAX_HISTORY,
  appendHistory,
  ask,
  assistantMode,
  clearHistory,
  loadHistory,
  newMessageId,
  suggestQuestions,
  type AskContext,
  type AssistantAction,
  type ChatMessage,
} from '@/assistant';
import { ReplyBody } from '@/assistant/components/ReplyBody';
import { TypingIndicator } from '@/assistant/components/TypingIndicator';
import { getGuide, getTask } from '@/content';
import { addFeedback } from '@/feedback/storage';
import { useJourney, useTaskToggle } from '@/journey';
import { AppText, ChatBubble, Chip, Gradient, HIT_MIN, Screen, useLayout, useTheme, useToast } from '@/ui';

interface ChatContext {
  taskId?: string;
  guideId?: string;
  label: string;
}

type Params = { taskId?: string | string[]; guideId?: string | string[]; q?: string | string[] };
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

/** Context chip + prefilled question for the params other screens open the assistant with. */
function fromParams(p: Params): { context: ChatContext | null; prefill: string } | null {
  const taskId = first(p.taskId);
  const guideId = first(p.guideId);
  const q = first(p.q);
  const task = taskId ? getTask(taskId) : undefined;
  if (task) {
    return {
      context: { taskId: task.id, guideId: task.guideId, label: `Đang hỏi về: ${task.title}` },
      prefill: q ?? `Mình cần làm gì để hoàn thành việc “${task.title}”?`,
    };
  }
  const guide = guideId ? getGuide(guideId) : undefined;
  if (guide) {
    return { context: { guideId: guide.id, label: `Đang hỏi về: ${guide.title}` }, prefill: q ?? guide.situations[0] ?? guide.title };
  }
  if (q) return { context: { label: `Từ tìm kiếm: “${q}”` }, prefill: q };
  return null;
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export default function AssistantScreen() {
  const params = useLocalSearchParams<Params>();
  const { profile, tasks, state } = useJourney();
  const toggleTask = useTaskToggle();
  const toast = useToast();
  const { colors, gradients, spacing, radius, type } = useTheme();
  // Native (Expo Go) is always compact, so the phone layout is unchanged.
  const { isCompact, isWide } = useLayout();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [context, setContext] = useState<ChatContext | null>(null);
  const [pending, setPending] = useState(false);
  const [sentToHr, setSentToHr] = useState<Record<string, true>>({});
  const listRef = useRef<FlatList<ChatMessage>>(null);

  // Navigation params (taskId / guideId / q). Applied on focus and whenever they change while focused,
  // so an already-mounted tab picks up a new "Hỏi trợ lý". The same params are re-applied on a later
  // focus only if the input is empty (never overwrite something the user is typing).
  const paramsKey = [first(params.taskId), first(params.guideId), first(params.q)].map((v) => v ?? '').join('|');
  const appliedKeyRef = useRef('||');
  const dismissedKeyRef = useRef('');
  const inputRef = useRef('');
  useEffect(() => {
    inputRef.current = input;
  }, [input]);
  useFocusEffect(
    useCallback(() => {
      const next = fromParams(params);
      if (!next || paramsKey === dismissedKeyRef.current) return;
      const isNew = paramsKey !== appliedKeyRef.current;
      appliedKeyRef.current = paramsKey;
      if (!isNew && inputRef.current.trim() !== '') return;
      setContext(next.context);
      setInput(next.prefill);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- paramsKey captures the params' values
    }, [paramsKey]),
  );

  // Storage is the single source of truth: reload on every focus (another (tabs) instance may have
  // written meanwhile) and persist only through the queued read-modify-write appendHistory().
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void loadHistory().then((saved) => {
        if (!alive) return;
        setMessages(saved);
        setHydrated(true);
      });
      return () => {
        alive = false;
      };
    }, []),
  );

  const append = (m: ChatMessage) => {
    setMessages((current) => [...current.filter((x) => x.id !== m.id), m].slice(-MAX_HISTORY));
    void appendHistory(m).then(setMessages);
  };

  const send = async (raw: string) => {
    const question = raw.trim();
    if (!question || pending) return;
    append({ id: newMessageId(), role: 'user', text: question, at: new Date().toISOString(), contextLabel: context?.label });
    setInput('');
    const ctx: AskContext = { taskId: context?.taskId, guideId: context?.guideId, track: profile?.track };
    if (assistantMode === 'remote') setPending(true);
    try {
      const reply = await ask(question, ctx);
      append({ id: newMessageId(), role: 'assistant', text: reply.text, at: new Date().toISOString(), reply, question });
    } finally {
      setPending(false);
    }
  };

  const dismissContext = () => {
    dismissedKeyRef.current = paramsKey;
    setContext(null);
    router.setParams({ taskId: undefined, guideId: undefined, q: undefined });
  };

  const onAction = async (messageId: string, action: AssistantAction) => {
    switch (action.kind) {
      case 'route':
        router.push(action.route);
        return;
      case 'complete-task': {
        const task = getTask(action.taskId);
        if (task && !state.completed[task.id]) toggleTask(task);
        return;
      }
      case 'ask-hr':
        try {
          await addFeedback({
            kind: 'question',
            message: action.question,
            anonymous: !profile?.name,
            name: profile?.name,
            origin: 'assistant',
            relatedId: action.relatedId,
          });
          setSentToHr((s) => ({ ...s, [messageId]: true }));
          toast.show('Đã gửi câu hỏi tới Phòng TCTT', 'success');
        } catch {
          toast.show('Chưa gửi được, bạn thử lại nhé', 'warning');
        }
    }
  };

  const onClear = () => {
    setMessages([]);
    setSentToHr({});
    void clearHistory();
    toast.show('Đã xóa lịch sử trò chuyện', 'info');
  };

  const suggestions = suggestQuestions({ track: profile?.track, tasks, completed: state.completed });
  const firstName = profile?.name.trim().split(/\s+/).pop();

  const modePill = (
    <View
      style={[styles.pill, { backgroundColor: assistantMode === 'remote' ? colors.successSoft : colors.surfaceAlt, borderRadius: radius.pill }]}
      accessible
      accessibilityLabel={assistantMode === 'remote' ? 'Chế độ trực tuyến' : 'Chế độ ngoại tuyến, trả lời từ Cẩm nang trong máy'}
    >
      <View style={[styles.pillDot, { backgroundColor: assistantMode === 'remote' ? colors.success : colors.textMuted }]} />
      <AppText variant="small" weight="700" color={assistantMode === 'remote' ? colors.success : colors.textMuted}>
        {assistantMode === 'remote' ? 'Trực tuyến' : 'Ngoại tuyến'}
      </AppText>
    </View>
  );

  const clearButton =
    messages.length > 0 ? (
      <Pressable
        onPress={onClear}
        accessibilityRole="button"
        accessibilityLabel="Xóa lịch sử trò chuyện"
        hitSlop={8}
        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Feather name="trash-2" size={20} color={colors.textMuted} />
      </Pressable>
    ) : null;

  // Wide: the mode pill lives in the side panel.
  // Soft pink strip with the brand-gradient "U" tile (reference `.chathead`).
  const header = (
    <View
      style={[
        styles.header,
        { marginBottom: spacing.md, gap: spacing.md, backgroundColor: colors.primarySoft, borderRadius: radius.card, padding: spacing.md },
      ]}
    >
      <Gradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.avatarTile, { borderRadius: radius.card }]}
        pointerEvents="none"
      >
        <AppText variant="h2" color="primaryFg" weight="800" maxFontSizeMultiplier={1.2} accessible={false}>
          U
        </AppText>
      </Gradient>
      <View style={styles.flex}>
        <AppText variant="h2" accessibilityRole="header">
          Trợ lý hội nhập ULIS
        </AppText>
        <AppText variant="caption" color="textMuted">
          ULIS AI Assistant · Trợ lý hướng dẫn hội nhập
        </AppText>
      </View>
      {isWide ? null : modePill}
      {clearButton}
    </View>
  );

  const suggestionChips = (
    <View style={[styles.wrap, { gap: spacing.sm }]}>
      {suggestions.map((f) => (
        <Chip
          key={f.id}
          label={f.q}
          icon="message-circle"
          onPress={() => void send(f.q)}
          accessibilityLabel={`Hỏi: ${f.q}`}
          // Cap at the container width so long questions wrap instead of overflowing the side panel.
          style={styles.chipFit}
        />
      ))}
    </View>
  );

  const emptyState = (
    <View style={{ gap: spacing.lg, paddingBottom: spacing.lg }}>
      <View style={{ gap: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: radius.card, padding: spacing.lg }}>
        <View style={styles.row}>
          <Feather name="compass" size={20} color={colors.primary} />
          <AppText variant="h2">{firstName ? `Xin chào ${firstName}!` : 'Xin chào!'}</AppText>
        </View>
        <AppText>
          Mình là trợ lý hội nhập ULIS. Bạn hỏi mình về thủ tục, giấy tờ, ai phụ trách việc gì… Mình trả lời dựa trên Cẩm nang của
          Trường và luôn ghi rõ nguồn.
        </AppText>
        {isWide ? (
          <AppText variant="caption" color="textMuted">
            Chọn một câu hỏi gợi ý ở cột bên phải, hoặc nhập câu hỏi bên dưới (Enter để gửi, Shift + Enter để xuống dòng).
          </AppText>
        ) : null}
      </View>
      {isWide ? null : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="bodyStrong">Câu hỏi gợi ý</AppText>
          {suggestionChips}
        </View>
      )}
    </View>
  );

  const renderBubble = (item: ChatMessage) => {
    if (item.role === 'user') {
      return <ChatBubble role="user" text={item.text} meta={[item.contextLabel, timeOf(item.at)].filter(Boolean).join(' · ')} />;
    }
    const reply = item.reply;
    const meta = [
      reply?.fellBack ? 'Máy chủ không phản hồi – trả lời ngoại tuyến' : reply?.mode === 'remote' ? 'Trực tuyến' : 'Ngoại tuyến',
      timeOf(item.at),
    ].join(' · ');
    return (
      <ChatBubble role="assistant" text={item.text} meta={meta}>
        {reply ? (
          <ReplyBody
            reply={reply}
            onAction={(a) => void onAction(item.id, a)}
            isTaskDone={(id) => Boolean(state.completed[id])}
            sentToHr={Boolean(sentToHr[item.id])}
          />
        ) : null}
      </ChatBubble>
    );
  };

  // ChatBubble caps itself at 85% of its row; on desktop the row is 82% of the column, so bubbles are about 70%.
  const renderItem = ({ item }: { item: ChatMessage }) =>
    isCompact ? (
      renderBubble(item)
    ) : (
      <View style={[styles.desktopRow, { alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start' }]}>{renderBubble(item)}</View>
    );

  const canSend = input.trim().length > 0 && !pending;
  // Compact (phones, narrow web): unchanged. Desktop web: Enter sends and keeps focus, Shift+Enter inserts a newline.
  // react-native-web 0.21 calls onKeyPress with the DOM keydown first and skips its own Enter handling when we preventDefault.
  const onDesktopKeyPress = (e: TextInputKeyPressEvent) => {
    const key = e.nativeEvent as { key: string; shiftKey?: boolean; isComposing?: boolean };
    if (key.key !== 'Enter' || key.shiftKey || key.isComposing) return; // keep IME (Telex/VNI) composition intact
    e.preventDefault();
    void send(input);
  };
  const submitProps = !isCompact
    ? { blurOnSubmit: false, onKeyPress: onDesktopKeyPress }
    : Platform.OS === 'web'
      ? { blurOnSubmit: true }
      : { submitBehavior: 'blurAndSubmit' as const };

  const chatList = (
    <FlatList
      ref={listRef}
      style={styles.flex}
      data={messages}
      keyExtractor={(m) => m.id}
      renderItem={renderItem}
      ListEmptyComponent={hydrated ? emptyState : undefined}
      ListFooterComponent={pending ? <TypingIndicator /> : undefined}
      contentContainerStyle={{ paddingBottom: spacing.md }}
      keyboardShouldPersistTaps="handled"
      onContentSizeChange={() => {
        if (messages.length > 0) listRef.current?.scrollToEnd({ animated: true });
      }}
      accessibilityLabel="Cuộc trò chuyện với trợ lý"
    />
  );

  const contextChip = context ? (
    <View style={[styles.contextChip, { backgroundColor: colors.primarySoft, borderRadius: radius.chip, paddingLeft: spacing.md }]}>
      <Feather name="link" size={14} color={colors.primary} />
      <AppText variant="caption" color="primary" weight="600" style={styles.flex} numberOfLines={isWide ? 4 : 2}>
        {context.label}
      </AppText>
      <Pressable onPress={dismissContext} accessibilityRole="button" accessibilityLabel="Bỏ ngữ cảnh câu hỏi" hitSlop={6} style={styles.iconBtn}>
        <Feather name="x" size={16} color={colors.primary} />
      </Pressable>
    </View>
  ) : null;

  const composerRow = (
    <View style={[styles.composer, { gap: spacing.sm }]}>
      <TextInput
        value={input}
        onChangeText={setInput}
        placeholder={isCompact ? 'Nhập câu hỏi của bạn…' : 'Nhập câu hỏi của bạn… (Enter để gửi, Shift + Enter để xuống dòng)'}
        placeholderTextColor={colors.textMuted}
        multiline
        {...submitProps}
        onSubmitEditing={() => void send(input)}
        returnKeyType="send"
        accessibilityLabel="Câu hỏi cho trợ lý"
        style={[
          type.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.card,
            paddingHorizontal: spacing.md,
          },
        ]}
      />
      <Pressable
        onPress={() => void send(input)}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Gửi câu hỏi"
        accessibilityState={{ disabled: !canSend }}
        style={({ pressed }) => [
          styles.sendBtn,
          { backgroundColor: canSend ? colors.primary : colors.surfaceAlt, borderRadius: radius.card, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <Feather name="send" size={20} color={canSend ? colors.primaryFg : colors.textMuted} />
      </Pressable>
    </View>
  );

  const disclaimer = (
    <AppText variant="small" color="textMuted" align={isWide ? 'left' : 'center'}>
      {DISCLAIMER}
    </AppText>
  );

  // Compact and medium: today's single column (medium centres it at CHAT_MAX_WIDTH).
  const singleColumn = (
    <>
      {header}
      {chatList}
      <View style={{ gap: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.sm }}>
        {contextChip}
        {composerRow}
        {disclaimer}
      </View>
    </>
  );

  if (!isWide) {
    return (
      <Screen scroll={false} keyboard>
        {isCompact ? singleColumn : <View style={[styles.flex, styles.centerColumn]}>{singleColumn}</View>}
      </Screen>
    );
  }

  const panelSection = (title: string, children: ReactNode) => (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption" color="textMuted" weight="700" accessibilityRole="header">
        {title.toUpperCase()}
      </AppText>
      {children}
    </View>
  );

  return (
    <Screen scroll={false} keyboard>
      <View style={[styles.flex, styles.wideRow, { gap: spacing.xl }]}>
        <View style={[styles.flex, styles.chatColumn]}>
          {header}
          {chatList}
          <View style={{ paddingTop: spacing.sm, paddingBottom: spacing.md }}>{composerRow}</View>
        </View>

        <View
          style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.card, marginBottom: spacing.md }]}
          accessibilityLabel="Thông tin trợ lý"
        >
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
            {panelSection(
              'Chế độ',
              <View style={{ gap: spacing.xs }}>
                {modePill}
                <AppText variant="caption" color="textMuted">
                  {assistantMode === 'remote'
                    ? 'Trả lời bằng AI qua máy chủ trợ lý, chỉ dựa trên nội dung Cẩm nang.'
                    : 'Trả lời từ Cẩm nang có sẵn trong ứng dụng, không cần mạng.'}
                </AppText>
              </View>,
            )}
            {panelSection(
              'Đang hỏi về',
              contextChip ?? (
                <AppText variant="caption" color="textMuted">
                  Mở trợ lý từ một việc hoặc một hướng dẫn để hỏi đúng ngữ cảnh.
                </AppText>
              ),
            )}
            {panelSection('Câu hỏi gợi ý', suggestionChips)}
            <View style={[styles.row, styles.alignTop]}>
              <Feather name="info" size={14} color={colors.textMuted} style={styles.infoIcon} />
              <View style={styles.flex}>{disclaimer}</View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Screen>
  );
}

/** Desktop chat column width; the side panel adds PANEL_WIDTH on wide screens. */
const CHAT_MAX_WIDTH = 760;
const PANEL_WIDTH = 300;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  header: { flexDirection: 'row', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  iconBtn: { minWidth: HIT_MIN, minHeight: HIT_MIN, alignItems: 'center', justifyContent: 'center' },
  contextChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  composer: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, minHeight: HIT_MIN, maxHeight: 120, borderWidth: 1, paddingTop: 11, paddingBottom: 11 },
  sendBtn: { width: HIT_MIN + 4, height: HIT_MIN + 4, alignItems: 'center', justifyContent: 'center' },
  centerColumn: { width: '100%', maxWidth: CHAT_MAX_WIDTH, alignSelf: 'center' },
  wideRow: { flexDirection: 'row', justifyContent: 'center', width: '100%', maxWidth: CHAT_MAX_WIDTH + PANEL_WIDTH + 32, alignSelf: 'center' },
  chatColumn: { maxWidth: CHAT_MAX_WIDTH, minWidth: 0 },
  chipFit: { maxWidth: '100%' },
  panel: { width: PANEL_WIDTH, flexShrink: 0, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  desktopRow: { width: '82%' },
  alignTop: { alignItems: 'flex-start' },
  infoIcon: { marginTop: 2 },
  avatarTile: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
