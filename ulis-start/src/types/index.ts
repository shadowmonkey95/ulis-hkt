// Core domain types for ULIS START. Source of truth: docs/DATA_MODEL.md.

export type Track = 'lecturer' | 'specialist' | 'staff';
export type TrackTag = Track | 'all';
export type Owner = 'me' | 'unit' | 'hr' | 'it' | 'buddy';
export type PhaseId = 'preboard' | 'welcome' | 'ready' | 'integrate' | 'grow';

export interface Meta { source: string; updatedAt: string /* YYYY-MM-DD */; verified: boolean }

export interface Phase { id: PhaseId; order: number; title: string; goal: string; startDay: number; endDay: number }

export interface Task extends Meta {
  id: string; phaseId: PhaseId; title: string; why: string;
  dueDay: number; owner: Owner; tracks: TrackTag[]; required: boolean; estimatedMinutes: number;
  steps: { text: string; link?: string }[];
  guideId?: string; contactId?: string; formIds: string[]; keywords: string[];
}

export type GuideCategory = 'hr' | 'admin' | 'finance' | 'it' | 'academic' | 'emulation';

export interface Guide extends Meta {           // the draft's 6-part structure
  id: string; category: GuideCategory;
  title: string; situations: string[];          // "Tôi muốn xin nghỉ phép" – drives situation search
  purpose: string; whoDoes: string; prepare: string[]; steps: string[];
  formIds: string[]; contactId: string; keywords: string[];
  /** Optional intro line above the forms list ("Bạn có thể tham khảo mẫu ở đây"). */
  formsNote?: string;
  /** Bundled images (key registered in src/content/assets.ts), e.g. an official infographic. */
  images?: GuideImage[];
}

export interface GuideImage { asset: string; caption: string; alt: string; source: string; sourceUrl?: string }

export interface Contact extends Meta {
  id: string; unit: string; role: string; handles: string[];   // topics → "Tôi cần gặp ai?"
  phone?: string; email?: string; location?: string; hours?: string;
}

export type ResourceType = 'form' | 'regulation' | 'manual' | 'video' | 'training';

export interface Resource extends Meta {
  id: string; title: string; type: ResourceType;
  url: string; status: 'active' | 'superseded'; supersededBy?: string; field: string;
}

export type FaqLinkKind = 'guide' | 'contact' | 'task' | 'resource';

export interface FaqItem extends Meta { id: string; q: string; a: string; keywords: string[]; links: { kind: FaqLinkKind; id: string }[] }

export interface Profile { name: string; track: Track; unit: string; startDate: string; createdAt: string }

export interface JourneyState {
  completed: Record<string, string>;        // taskId -> ISO completedAt
  checkins: Record<number, { score: 1|2|3|4|5; note?: string; at: string }>;
  badges: Record<string, string>;           // badgeId -> ISO unlockedAt
  contactsViewed: string[];
  demoDayOverride: number | null;
}

// ---------------------------------------------------------------------------
// Helper types shared by the journey engine, UI and assistant.
// ---------------------------------------------------------------------------

/** Derived task state (see JOURNEY_SPEC.md "Task states"); only `done` is stored. */
export type TaskStatus = 'done' | 'upcoming' | 'dueSoon' | 'overdue' | 'skipped' | 'locked';

/** Milestone badges (JOURNEY_SPEC.md "Milestones / badges"). */
export type BadgeId = 'kickoff' | 'paperwork' | 'ready' | 'connected' | 'journey30';

/** Pulse check-in days. */
export type CheckinDay = 3 | 7 | 15 | 30;

export type CheckinScore = 1 | 2 | 3 | 4 | 5;

export type Health = 'onTrack' | 'behind' | 'needsHelp';

// ---------------------------------------------------------------------------
// about.json
// ---------------------------------------------------------------------------

export type AboutUnitKind = 'office' | 'center' | 'faculty' | 'organization';

export interface AboutUnit {
  id: string;
  name: string;
  kind: AboutUnitKind;
  description: string;
  contactId?: string;
}

export interface AboutValue { title: string; description: string }

export interface About extends Meta {
  name: string;
  englishName: string;
  shortName: string;
  parentOrg: string;
  foundedYear: number;
  address: string;
  website: string;
  history: string[];
  mission: string;
  vision: string;
  values: AboutValue[];
  units: AboutUnit[];
  /** Units a new hire can pick as "Đơn vị công tác" during onboarding. */
  staffUnits?: string[];
  /** "Một ngày tại ULIS" – sample timeline of a typical working day. */
  dayAtUlis?: { time: string; title: string; description?: string }[];
  /** Short disclaimer shown under the about screen. */
  note: string;
}

// ---------------------------------------------------------------------------
// benefits.json
// ---------------------------------------------------------------------------

export type BenefitCategory = 'insurance' | 'leave' | 'health' | 'union' | 'development' | 'recognition' | 'facility';

export interface Benefit extends Meta {
  id: string;
  category: BenefitCategory;
  title: string;
  summary: string;
  details: string[];
  contactId?: string;
  guideId?: string;
}

// ---------------------------------------------------------------------------
// synonyms.json – canonical term -> variants (incl. unaccented spellings)
// ---------------------------------------------------------------------------

export type Synonyms = Record<string, string[]>;

// ---------------------------------------------------------------------------
// dashboard.json – sample data for the "Dashboard TC&TT" manager page
// ---------------------------------------------------------------------------

export type IssueStatus = 'open' | 'inProgress' | 'resolved';

export interface DashboardStaff {
  id: string;
  name: string;
  track: Track;
  unit: string;
  done: number;
  total: number;
}

export interface DashboardIssue {
  id: string;
  name: string;
  track: Track;
  topic: string;
  detail: string;
  status: IssueStatus;
}

export interface DashboardQuestion {
  id: string;
  question: string;
  /** Sample count before the user's own chat questions are added. */
  count: number;
  /** Unaccented lowercase keywords; a chat question containing one counts for this topic. */
  keywords: string[];
}

export interface DashboardTip {
  icon: string;
  title: string;
  body: string;
}

export interface DashboardData extends Meta {
  staff: DashboardStaff[];
  issues: DashboardIssue[];
  questions: DashboardQuestion[];
  tips: DashboardTip[];
}
