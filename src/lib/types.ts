import type { ObjectId } from "mongodb";

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
  phone?: { e164: string; verifiedAt: Date };
  pendingPhone?: { e164: string; codeHash?: string; expiresAt: Date; attempts: number };
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
  to: string; // masked when displayed
  kind: "alert" | "test" | "verify";
  body: string;
  provider: "twilio" | "console";
  status: "sent" | "logged" | "failed";
  providerId?: string;
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

export interface LockDoc {
  _id: string;
  expiresAt: Date;
}
