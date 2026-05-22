export type NodeStatus = "draft" | "review" | "approved" | "published";

export type TreeNode = {
  id: string;
  label: string;
  labelEn?: string;
  type: "chapter" | "section" | "item";
  status?: NodeStatus;
  open?: boolean;
  badge?: "PDF";
  hasComments?: number;
  children?: TreeNode[];
};

export type DocContent = {
  tags: string[];
  updated: string;
  author: string;
  version: string;
  body: string;
  type?: "pdf";
  pdfTitle?: string;
  pdfPages?: number;
  pdfStoragePath?: string;
};

export type Locale = "ko" | "en";

export type Role = "admin" | "reviewer" | "editor" | "viewer";

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: Role;
};

export type Comment = {
  id: string;
  who: string;
  initials: string;
  color: string;
  when: string;
  body: string;
  resolved?: boolean;
  parentId?: string | null;
};

export type Version = {
  id: string;
  v: string;
  who: string;
  when: string;
  desc: string;
  body: string;
  tag?: "approved" | "published";
};

export type Case = {
  id: string;
  title: string;
  summary: string;
  result: "good" | "bad" | "mixed";
  date: string;
  duration: string;
  channel: string;
  agent: { name: string; initials: string; color: string };
  linkedSection?: string;
  transcript: { who: string; text: string }[];
  lessons: string[];
};

export type PageStats = {
  views: number;
  copies: number;
  searches: number;
  helpful: number;
  unhelpful: number;
  hourly?: number[];
};

export type Verification = {
  lastVerified: number; // days ago
  intervalDays: number;
  by: string;
};

export type VerifyState = "fresh" | "aging" | "stale";

export type OnboardingQuestion = {
  q: string;
  opts: string[];
  correct: number;
  explain: string;
};

export type Attachment = {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  storagePath: string;
  uploaderName: string;
  uploadedAt: string; // ISO
};

export type FaqItem = {
  q: string;
  a: string;
  confidence: number; // 0..1
  tags: string[];
  askedCount: number;
  sources: { id: string; confidence: number; snippet: string }[];
};

export type WhatsNewItem = {
  id: string;
  what: string;
  when: string;
  who: string;
  isNew: boolean;
};

export type OnboardingTask = {
  id: string;
  type: "read" | "quiz" | "practice";
  title: string;
  desc?: string;
  sectionId?: string;
  estimate?: string;
  questions?: OnboardingQuestion[];
};

