import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  AnalyzeResult,
  JobDetail,
  JobSummary,
} from "@/lib/types/company";
import type { AnalysisCacheEntry } from "@/lib/storage/analysis-cache";
import type { RoleStatus } from "@/lib/jobs/role-status";

const DB_NAME = "careers-analyzer";
const DB_VERSION = 2;

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
  roleStatuses: {
    key: string;
    value: { feedId: string; status: RoleStatus; updatedAt: string };
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
        if (!db.objectStoreNames.contains("roleStatuses")) {
          db.createObjectStore("roleStatuses", { keyPath: "feedId" });
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

export async function getAllJobSummaries() {
  const db = await getDb();
  return db.getAll("jobSummaries");
}

export interface RoleStatusRow {
  feedId: string;
  status: RoleStatus;
  updatedAt: string;
}

export async function getAllRoleStatusRows(): Promise<RoleStatusRow[]> {
  const db = await getDb();
  return db.getAll("roleStatuses");
}

export async function setRoleStatus(feedId: string, status: RoleStatus) {
  const db = await getDb();
  if (status === "unread") {
    await db.delete("roleStatuses", feedId);
    return;
  }

  await db.put("roleStatuses", {
    feedId,
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function getRoleStatuses() {
  const db = await getDb();
  const rows = await db.getAll("roleStatuses");
  return new Map(rows.map((row) => [row.feedId, row.status]));
}

export async function markRoleRead(feedId: string) {
  await setRoleStatus(feedId, "read");
}

export async function markRoleUnread(feedId: string) {
  await setRoleStatus(feedId, "unread");
}

/** @deprecated Use getRoleStatuses instead */
export async function getReadRoleIds() {
  const statuses = await getRoleStatuses();
  const readIds = new Set<string>();
  for (const [feedId, status] of statuses) {
    if (status === "read" || status === "liked" || status === "disliked") {
      readIds.add(feedId);
    }
  }
  return readIds;
}

export async function migrateRoleStatuses() {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("careers-analyzer:role-statuses-migrated")) {
    return;
  }

  const db = await getDb();
  const readRows = await db.getAll("readRoles");
  if (readRows.length > 0) {
    const tx = db.transaction("roleStatuses", "readwrite");
    for (const row of readRows) {
      const existing = await tx.store.get(row.feedId);
      if (!existing) {
        await tx.store.put({
          feedId: row.feedId,
          status: "read",
          updatedAt: row.readAt,
        });
      }
    }
    await tx.done;
  }

  window.localStorage.setItem("careers-analyzer:role-statuses-migrated", "1");
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
  const [analyses, details, summaries, statuses] = await Promise.all([
    db.count("analyses"),
    db.count("jobDetails"),
    db.count("jobSummaries"),
    db.count("roleStatuses"),
  ]);

  return { analyses, details, summaries, read: statuses };
}
