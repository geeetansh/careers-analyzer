import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AnalyzeResult,
  JobDetail,
  JobSummary,
} from "@/lib/types/company";
import type { AnalysisCacheEntry } from "@/lib/storage/analysis-cache";

const DB_NAME = "careers-analyzer";
const DB_VERSION = 1;

export interface StoredJobDetail extends JobDetail {
  companyName: string;
  boardSlug?: string;
  feedId: string;
}

export interface BulkSyncState {
  status: "idle" | "running" | "paused" | "complete" | "error";
  phase: "companies" | "details" | "summaries" | "done";
  totalCompanies: number;
  completedCompanies: number;
  totalRoles: number;
  completedRoles: number;
  totalSummaries: number;
  completedSummaries: number;
  currentLabel?: string;
  error?: string;
  updatedAt: string;
}

interface CareersDB extends DBSchema {
  analyses: {
    key: string;
    value: AnalysisCacheEntry;
  };
  jobDetails: {
    key: string;
    value: StoredJobDetail;
  };
  jobSummaries: {
    key: string;
    value: JobSummary & { feedId: string };
  };
  readRoles: {
    key: string;
    value: { feedId: string; readAt: string };
  };
  syncState: {
    key: string;
    value: BulkSyncState;
  };
}

let dbPromise: Promise<IDBPDatabase<CareersDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<CareersDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("analyses")) {
          db.createObjectStore("analyses", { keyPath: "companyName" });
        }
        if (!db.objectStoreNames.contains("jobDetails")) {
          db.createObjectStore("jobDetails", { keyPath: "feedId" });
        }
        if (!db.objectStoreNames.contains("jobSummaries")) {
          db.createObjectStore("jobSummaries", { keyPath: "feedId" });
        }
        if (!db.objectStoreNames.contains("readRoles")) {
          db.createObjectStore("readRoles", { keyPath: "feedId" });
        }
        if (!db.objectStoreNames.contains("syncState")) {
          db.createObjectStore("syncState");
        }
      },
    });
  }
  return dbPromise;
}

export function makeFeedId(companyName: string, jobId: string) {
  return `${companyName}::${jobId}`;
}

export async function saveAnalysis(entry: AnalysisCacheEntry) {
  const db = await getDb();
  await db.put("analyses", entry);
}

export async function getAnalysis(companyName: string) {
  const db = await getDb();
  return db.get("analyses", companyName);
}

export async function getAllAnalyses() {
  const db = await getDb();
  return db.getAll("analyses");
}

export async function saveJobDetail(detail: StoredJobDetail) {
  const db = await getDb();
  await db.put("jobDetails", detail);
}

export async function getJobDetail(feedId: string) {
  const db = await getDb();
  return db.get("jobDetails", feedId);
}

export async function saveJobSummary(
  feedId: string,
  summary: JobSummary,
) {
  const db = await getDb();
  await db.put("jobSummaries", { ...summary, feedId });
}

export async function getJobSummary(feedId: string) {
  const db = await getDb();
  return db.get("jobSummaries", feedId);
}

export async function markRoleRead(feedId: string) {
  const db = await getDb();
  await db.put("readRoles", { feedId, readAt: new Date().toISOString() });
}

export async function markRoleUnread(feedId: string) {
  const db = await getDb();
  await db.delete("readRoles", feedId);
}

export async function getReadRoleIds() {
  const db = await getDb();
  const rows = await db.getAll("readRoles");
  return new Set(rows.map((row) => row.feedId));
}

export async function getSyncState() {
  const db = await getDb();
  return (
    (await db.get("syncState", "bulk")) ?? {
      status: "idle",
      phase: "done",
      totalCompanies: 0,
      completedCompanies: 0,
      totalRoles: 0,
      completedRoles: 0,
      totalSummaries: 0,
      completedSummaries: 0,
      updatedAt: new Date().toISOString(),
    }
  );
}

export async function saveSyncState(state: BulkSyncState) {
  const db = await getDb();
  await db.put("syncState", state, "bulk");
}

export async function migrateLocalStorageToIndexedDB() {
  if (typeof window === "undefined") return;

  try {
    const raw = window.localStorage.getItem("careers-analyzer:v1");
    if (!raw) return;

    const store = JSON.parse(raw) as {
      entries: Record<string, AnalysisCacheEntry>;
    };

    const db = await getDb();
    const tx = db.transaction("analyses", "readwrite");

    for (const entry of Object.values(store.entries)) {
      await tx.store.put(entry);
    }

    await tx.done;
  } catch {
    // Migration is best-effort.
  }
}

export async function getCacheStats() {
  const db = await getDb();
  const [analyses, details, summaries, read] = await Promise.all([
    db.count("analyses"),
    db.count("jobDetails"),
    db.count("jobSummaries"),
    db.count("readRoles"),
  ]);

  return { analyses, details, summaries, read };
}
