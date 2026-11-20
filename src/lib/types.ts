import type { ObjectId } from "mongodb";

export interface TelegramLink {
  chatId: number;
  username?: string;
  firstName?: string;
  connectedAt: Date;
}

export type Severity = "critical" | "high" | "medium" | "low";
export const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export type StackKind = "vendor" | "npm" | "custom";
export interface StackItem {
  key: string; // "vendor:vercel" | "npm:lodash" | "custom:Acme Pay"
  kind: StackKind;
  name: string;
  addedAt: Date;
}

export interface UserDoc {
  _id?: ObjectId;
  authSub: string;
  email?: string;
  name?: string;
  stack: StackItem[];
  /** Where alerts go. Set when the user presses Start in the bot via their one-time link. */
  telegram?: TelegramLink;
  /**
   * Hashes of recent one-time connect tokens (raw tokens only live in t.me links). Several stay
   * valid so a link from another tab or an earlier render still works.
   */
  telegramTokens?: { tokenHash: string; expiresAt: Date }[];
  prefs: { alertsEnabled: boolean; minSeverity: Severity };
  onboardedAt?: Date;
  plan?: string; // edition-defined (cloud: "free" | "pro")
  billing?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type SourceType = "ghsa" | "kev" | "status" | "news";

export interface IncidentDoc {
  _id?: ObjectId;
  sourceId: string; // stable unique id, e.g. "ghsa:GHSA-xxxx"
  source: SourceType;
  sourceName: string;
  title: string;
  whatHappened: string;
  whatToDo: string[];
  url: string;
  severity: Severity;
  publishedAt: Date;
  cves: string[];
  targets: string[]; // stack keys this incident affects
  aiSummarized?: boolean;
  fetchedAt: Date;
}

export type DeliveryStatus = "sent" | "logged" | "skipped" | "failed";
export interface AlertDoc {
  _id?: ObjectId;
  userId: ObjectId;
  incidentId?: ObjectId;
  kind: "incident" | "test";
  target?: string;
  status: DeliveryStatus;
  reason?: string;
  createdAt: Date;
}

export interface MessageDoc {
  _id?: ObjectId;
  userId?: ObjectId;
  to: string; // display label, e.g. "@jane"
  kind: "alert" | "test";
  body: string;
  provider: "telegram" | "console";
  status: "sent" | "logged" | "failed";
  providerId?: string; // Telegram message_id
  error?: string;
  createdAt: Date;
}

export interface SourceStateDoc {
  _id: string; // source id
  name: string;
  lastRunAt?: Date;
  lastOkAt?: Date;
  lastError?: string;
  lastCount?: number;
}

export interface RateDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

/** A user's own status for an incident: lets them close the loop ("I fixed it"). */
export type IncidentState = "fixed" | "not_affected";
export interface IncidentStateDoc {
  _id?: ObjectId;
  userId: ObjectId;
  incidentId: ObjectId;
  state: IncidentState;
  updatedAt: Date;
}

export interface LockDoc {
  _id: string;
  expiresAt: Date;
}

/** Small key/value store for server state (e.g. the Telegram update offset). */
export interface KvDoc {
  _id: string;
  value: unknown;
  updatedAt: Date;
}
