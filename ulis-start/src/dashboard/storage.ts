// Manager's issue-status changes on the dashboard, kept on this device only (demo).
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { IssueStatus } from '../types';

export const DASHBOARD_KEY = 'ulis.dashboard.v1';

const STATUSES: readonly IssueStatus[] = ['open', 'inProgress', 'resolved'];

export async function loadIssueStatuses(): Promise<Record<string, IssueStatus>> {
  try {
    const raw = await AsyncStorage.getItem(DASHBOARD_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const out: Record<string, IssueStatus> = {};
    for (const [id, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (STATUSES.includes(v as IssueStatus)) out[id] = v as IssueStatus;
    }
    return out;
  } catch {
    await AsyncStorage.removeItem(DASHBOARD_KEY).catch(() => undefined);
    return {};
  }
}

export async function saveIssueStatuses(statuses: Record<string, IssueStatus>): Promise<void> {
  await AsyncStorage.setItem(DASHBOARD_KEY, JSON.stringify(statuses)).catch(() => undefined);
}

export async function clearIssueStatuses(): Promise<void> {
  await AsyncStorage.removeItem(DASHBOARD_KEY).catch(() => undefined);
}
