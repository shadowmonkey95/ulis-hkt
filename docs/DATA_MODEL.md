# Data model

## Types (`src/types/index.ts`)
```ts
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

export interface Guide extends Meta {           // the draft's 6-part structure
  id: string; category: 'hr' | 'admin' | 'finance' | 'it' | 'academic' | 'emulation';
  title: string; situations: string[];          // "Tôi muốn xin nghỉ phép" – drives situation search
  purpose: string; whoDoes: string; prepare: string[]; steps: string[];
  formIds: string[]; contactId: string; keywords: string[];
}

export interface Contact extends Meta {
  id: string; unit: string; role: string; handles: string[];   // topics → "Tôi cần gặp ai?"
  phone?: string; email?: string; location?: string; hours?: string;
}

export interface Resource extends Meta {
  id: string; title: string; type: 'form' | 'regulation' | 'manual' | 'video' | 'training';
  url: string; status: 'active' | 'superseded'; supersededBy?: string; field: string;
}

export interface FaqItem extends Meta { id: string; q: string; a: string; keywords: string[]; links: { kind: 'guide'|'contact'|'task'|'resource'; id: string }[] }

export interface Profile { name: string; track: Track; unit: string; startDate: string; createdAt: string }

export interface JourneyState {
  completed: Record<string, string>;        // taskId -> ISO completedAt
  checkins: Record<number, { score: 1|2|3|4|5; note?: string; at: string }>;
  badges: Record<string, string>;           // badgeId -> ISO unlockedAt
  contactsViewed: string[];
  demoDayOverride: number | null;
}
```

## Content files (`content/`)
`phases.json`, `tasks.json`, `guides.json`, `contacts.json`, `resources.json`, `faq.json`,
`about.json` (history, mission, vision, values, units list, `dayAtUlis` – "Một ngày tại ULIS" timeline), `benefits.json`, `synonyms.json`
(e.g. `{"nghỉ phép": ["nghỉ", "xin nghỉ", "phép năm"], "công tác phí": ["đi công tác", "thanh toán đi công tác"]}`).

Loaded via static `import` (bundled) → typed through `src/content/index.ts` which validates at dev time
(throw on missing ids referenced by tasks/guides/faq).

All URLs in demo content point to `https://ulis.vnu.edu.vn` (public site) or `#` placeholders – never fabricate
specific document numbers or decree numbers; write "Quy định nghỉ phép của Trường (cần bổ sung số hiệu)".

## UI copy kept in code (exception to "content is data")
Badge names, pulse check-in questions and the emoji scale live in `src/journey/meta.ts`: they are product copy
defined by JOURNEY_SPEC, not ULIS institutional data. Move them to `content/journey.json` if ULIS needs to edit them.

## Storage keys (AsyncStorage)
- `ulis.profile.v1` → Profile
- `ulis.journey.v1` → JourneyState
- `ulis.assistant.history.v1` → last 30 messages
- `ulis.feedback.v1` → submitted questions/feedback (pitch: would sync to server)
Version suffix allows migrations; on parse error, reset that key only.
