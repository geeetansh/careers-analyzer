import type { JobSummary } from "@/lib/types/company";

const SUMMARY_STORAGE_KEY = "careers-analyzer:summaries:v1";

interface SummaryStore {
  entries: Record<string, JobSummary>;
}

function readStore(): SummaryStore {
  if (typeof window === "undefined") return { entries: {} };
  try {
    const raw = window.localStorage.getItem(SUMMARY_STORAGE_KEY);
    if (!raw) return { entries: {} };
    return JSON.parse(raw) as SummaryStore;
  } catch {
    return { entries: {} };
  }
}

function writeStore(store: SummaryStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(store));
}

export function getCachedJobSummary(jobId: string): JobSummary | null {
  return readStore().entries[jobId] ?? null;
}

export function setCachedJobSummary(jobId: string, summary: JobSummary) {
  const store = readStore();
  store.entries[jobId] = summary;
  writeStore(store);
}
