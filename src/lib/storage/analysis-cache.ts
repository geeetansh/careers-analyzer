import type { AnalyzeResult } from "@/lib/types/company";

const STORAGE_KEY = "careers-analyzer:v1";
const SELECTED_COMPANY_KEY = "careers-analyzer:selected-company";

export interface AnalysisCacheEntry {
  companyName: string;
  careersPage: string;
  result: AnalyzeResult;
  cachedAt: string;
}

export interface AnalysisCacheStore {
  entries: Record<string, AnalysisCacheEntry>;
}

function cacheKey(companyName: string, careersPage: string) {
  return `${companyName}::${normalizeUrl(careersPage)}`;
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function readStore(): AnalysisCacheStore {
  if (typeof window === "undefined") {
    return { entries: {} };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {} };
    return JSON.parse(raw) as AnalysisCacheStore;
  } catch {
    return { entries: {} };
  }
}

function writeStore(store: AnalysisCacheStore) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("careers-analyzer-cache-updated"));
}

export function getCachedAnalysis(
  companyName: string,
  careersPage: string,
): AnalysisCacheEntry | null {
  const store = readStore();
  return store.entries[cacheKey(companyName, careersPage)] ?? null;
}

export function setCachedAnalysis(
  companyName: string,
  careersPage: string,
  result: AnalyzeResult,
) {
  const store = readStore();
  const key = cacheKey(companyName, careersPage);
  store.entries[key] = {
    companyName,
    careersPage,
    result,
    cachedAt: new Date().toISOString(),
  };
  writeStore(store);
}

export function getAllCachedAnalyses(): AnalysisCacheEntry[] {
  const store = readStore();
  return Object.values(store.entries);
}

export function hasCachedAnalysis(companyName: string, careersPage: string) {
  return Boolean(getCachedAnalysis(companyName, careersPage));
}

export function clearCachedAnalysis(companyName: string, careersPage: string) {
  const store = readStore();
  delete store.entries[cacheKey(companyName, careersPage)];
  writeStore(store);
}

export function getSelectedCompanyName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_COMPANY_KEY);
}

export function setSelectedCompanyName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_COMPANY_KEY, name);
}
