// Shared completion UX: optimistic toggle + haptics + toast; check-in tasks open the check-in modal instead.
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import type { Task } from '../types';
import { useToast } from '../ui';
import { getCheckinDayForTask } from './engine';
import { useJourney } from './JourneyProvider';

export type ToggleResult = 'done' | 'undone' | 'checkin';

export function successHaptic(): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function useTaskToggle() {
  const { actions, state } = useJourney();
  const toast = useToast();

  return (task: Task): ToggleResult => {
    const wasDone = Boolean(state.completed[task.id]);
    const checkinDay = getCheckinDayForTask(task);
    if (!wasDone && checkinDay !== null) {
      // Check-in tasks are completed by answering the check-in.
      router.push({ pathname: '/checkin/[day]', params: { day: String(checkinDay) } });
      return 'checkin';
    }
    // TOGGLE is resolved inside the reducer, so a fast double tap flips twice instead of double-completing.
    actions.toggle(task.id);
    if (wasDone) {
      toast.show('Đã bỏ đánh dấu', 'info');
      return 'undone';
    }
    successHaptic();
    toast.show(task.owner === 'me' ? 'Tuyệt! +1 việc' : 'Đã ghi nhận – cảm ơn bạn!', 'success');
    return 'done';
  };
}
