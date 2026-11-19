import "server-only";
import { MongoClient, type Db, type Collection, ObjectId } from "mongodb";
import { env } from "./env";
import type { UserDoc, IncidentDoc, AlertDoc, MessageDoc, SourceStateDoc, RateDoc, LockDoc } from "./types";

type G = typeof globalThis & { __headsappMongo?: Promise<MongoClient>; __headsappIndexes?: Promise<void> };
const g = globalThis as G;

function client(): Promise<MongoClient> {
  if (!g.__headsappMongo) {
    const c = new MongoClient(env.mongoUri, { serverSelectionTimeoutMS: 5000, appName: "headsapp" });
    g.__headsappMongo = c.connect().catch((err) => {
      g.__headsappMongo = undefined;
      throw err;
    });
  }
  return g.__headsappMongo;
}

export async function db(): Promise<Db> {
  const d = (await client()).db();
  if (!g.__headsappIndexes) g.__headsappIndexes = ensureIndexes(d).catch((e) => { g.__headsappIndexes = undefined; throw e; });
  await g.__headsappIndexes;
  return d;
}

export async function cols() {
  const d = await db();
  return {
    users: d.collection<UserDoc>("users") as Collection<UserDoc>,
    incidents: d.collection<IncidentDoc>("incidents") as Collection<IncidentDoc>,
    alerts: d.collection<AlertDoc>("alerts") as Collection<AlertDoc>,
    messages: d.collection<MessageDoc>("messages") as Collection<MessageDoc>,
    sources: d.collection<SourceStateDoc>("sources") as Collection<SourceStateDoc>,
    rates: d.collection<RateDoc>("rates") as Collection<RateDoc>,
    locks: d.collection<LockDoc>("locks") as Collection<LockDoc>,
  };
}

async function ensureIndexes(d: Db) {
  await Promise.all([
    d.collection("users").createIndex({ authSub: 1 }, { unique: true }),
    d.collection("users").createIndex({ "stack.key": 1 }),
    d.collection("users").createIndex({ "billing.customerId": 1 }, { sparse: true }),
    d.collection("incidents").createIndex({ sourceId: 1 }, { unique: true }),
    d.collection("incidents").createIndex({ targets: 1, publishedAt: -1 }),
    d.collection("alerts").createIndex({ userId: 1, incidentId: 1 }, { unique: true, partialFilterExpression: { kind: "incident" } }),
    d.collection("alerts").createIndex({ userId: 1, createdAt: -1 }),
    d.collection("messages").createIndex({ userId: 1, createdAt: -1 }),
    d.collection("rates").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    d.collection("locks").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

export { ObjectId };
