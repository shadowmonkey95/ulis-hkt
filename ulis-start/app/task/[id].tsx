import { router, useLocalSearchParams } from 'expo-router';

import { getTask } from '@/content';
import { TaskDetailView, TaskPrimaryButton, READING_MAX_WIDTH, type ToggleResult } from '@/journey';
import { EmptyState, Screen, useLayout } from '@/ui';

const backAfterDone = (result: ToggleResult) => {
  if (result === 'done' && router.canGoBack()) router.back();
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isCompact } = useLayout();
  const task = id ? getTask(id) : undefined;

  if (!task) {
    return (
      <Screen back>
        <EmptyState icon="alert-circle" title="Không tìm thấy việc này" message="Việc có thể đã được cập nhật hoặc gỡ bỏ." />
      </Screen>
    );
  }

  // Phones / narrow web: sticky footer action (unchanged). Desktop web: reading width, inline action.
  if (isCompact) {
    return (
      <Screen back footer={<TaskPrimaryButton task={task} onResult={backAfterDone} />}>
        <TaskDetailView task={task} />
      </Screen>
    );
  }
  return (
    <Screen back contentContainerStyle={{ width: '100%', maxWidth: READING_MAX_WIDTH, alignSelf: 'center' }}>
      <TaskDetailView task={task} inlineAction onResult={backAfterDone} />
    </Screen>
  );
}
