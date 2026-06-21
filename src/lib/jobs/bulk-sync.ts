import type { Company } from "@/lib/types/company";
import type { AnalyzeResult, JobSummary } from "@/lib/types/company";
import { isTargetRole } from "@/lib/jobs/categories";
import {
  getJobDetail,
  makeFeedId,
  saveAnalysis,
  saveJobDetail,
  saveJobSummary,
  saveSyncState,
  type BulkSyncState,
} from "@/lib/storage/db";
import { setCachedAnalysis } from "@/lib/storage/analysis-cache";

const COMPANY_CONCURRENCY = 4;
const DETAIL_CONCURRENCY = 5;
const SUMMARY_CONCURRENCY = 2;

export type BulkSyncListener = (state: BulkSyncState) => void;

let abortController: AbortController | null = null;

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
) {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function run() {
    while (index < items.length) {
      if (signal?.aborted) return;
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );

  return results;
}

async function analyzeCompany(careersPage: string): Promise<AnalyzeResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ careersPage }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Analysis failed");
  }

  return data as AnalyzeResult;
}

async function fetchDetail(input: {
  provider: string;
  boardSlug?: string;
  jobId: string;
  url: string;
}) {
  const response = await fetch("/api/job-detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to fetch job detail");
  }

  return data;
}

async function fetchSummary(input: {
  title: string;
  companyName: string;
  location: string;
  department: string;
  listingText: string;
}): Promise<JobSummary | null> {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (response.status === 503) return null;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to summarize");
  }

  return {
    roleType: data.roleType,
    dayToDay: data.dayToDay,
    orgPosition: data.orgPosition,
    summarizedAt: data.summarizedAt,
  };
}

export function stopBulkSync() {
  abortController?.abort();
  abortController = null;
}

export async function runBulkSync(
  companies: Company[],
  onUpdate: BulkSyncListener,
  options?: { includeSummaries?: boolean },
) {
  stopBulkSync();
  abortController = new AbortController();
  const signal = abortController.signal;

  const includeSummaries = options?.includeSummaries ?? true;

  let state: BulkSyncState = {
    status: "running",
    phase: "companies",
    totalCompanies: companies.length,
    completedCompanies: 0,
    totalRoles: 0,
    completedRoles: 0,
    totalSummaries: 0,
    completedSummaries: 0,
    currentLabel: "Starting brand sync...",
    updatedAt: new Date().toISOString(),
  };

  const publish = async (patch: Partial<BulkSyncState>) => {
    state = { ...state, ...patch, updatedAt: new Date().toISOString() };
    await saveSyncState(state);
    onUpdate(state);
  };

  await publish(state);

  const targetRoles: Array<{
    companyName: string;
    careersPage: string;
    boardSlug?: string;
    job: AnalyzeResult["jobs"][number];
  }> = [];

  let completedCompanies = 0;
  let completedRoles = 0;
  let completedSummaries = 0;

  try {
    await mapPool(
      companies,
      COMPANY_CONCURRENCY,
      async (company) => {
        if (signal.aborted) return;

        await publish({
          currentLabel: `Scanning ${company.name} careers page...`,
        });

        try {
          const result = await analyzeCompany(company.careers_page);
          const entry = {
            companyName: company.name,
            careersPage: company.careers_page,
            result,
            cachedAt: new Date().toISOString(),
          };

          await saveAnalysis(entry);
          setCachedAnalysis(company.name, company.careers_page, result);

          for (const job of result.jobs) {
            if (isTargetRole(job)) {
              targetRoles.push({
                companyName: company.name,
                careersPage: company.careers_page,
                boardSlug: result.boardSlug,
                job,
              });
            }
          }
        } catch {
          // Continue with other companies.
        }

        completedCompanies += 1;
        await publish({
          completedCompanies,
          totalRoles: targetRoles.length,
        });
      },
      signal,
    );

    if (signal.aborted) {
      await publish({ status: "paused", currentLabel: "Sync paused" });
      return;
    }

    await publish({
      phase: "details",
      totalRoles: targetRoles.length,
      completedRoles: 0,
      currentLabel: `Caching ${targetRoles.length} CS & Product listings...`,
    });

    await mapPool(
      targetRoles,
      DETAIL_CONCURRENCY,
      async (item) => {
        if (signal.aborted) return;

        const feedId = makeFeedId(item.companyName, item.job.id);

        await publish({
          currentLabel: `Caching ${item.companyName} — ${item.job.title}`,
        });

        try {
          const detail = await fetchDetail({
            provider: item.job.provider,
            boardSlug: item.boardSlug,
            jobId: item.job.id,
            url: item.job.url,
          });

          await saveJobDetail({
            ...item.job,
            companyName: item.companyName,
            boardSlug: item.boardSlug,
            feedId,
            contentHtml: detail.contentHtml,
            contentText: detail.contentText,
            offices: detail.offices ?? [],
            scrapedAt: detail.scrapedAt,
          });
        } catch {
          // Continue.
        }

        completedRoles += 1;
        await publish({
          completedRoles,
        });
      },
      signal,
    );

    if (signal.aborted) {
      await publish({ status: "paused", currentLabel: "Sync paused" });
      return;
    }

    if (includeSummaries) {
      await publish({
        phase: "summaries",
        totalSummaries: targetRoles.length,
        completedSummaries: 0,
        currentLabel: "Generating AI summaries...",
      });

      await mapPool(
        targetRoles,
        SUMMARY_CONCURRENCY,
        async (item) => {
          if (signal.aborted) return;

          const feedId = makeFeedId(item.companyName, item.job.id);

          await publish({
            currentLabel: `Summarizing ${item.companyName} — ${item.job.title}`,
          });

          try {
            const feedId = makeFeedId(item.companyName, item.job.id);
            const cached = await getJobDetail(feedId);
            const listingText = cached?.contentText ?? "";

            if (!listingText.trim()) {
              completedSummaries += 1;
              await publish({ completedSummaries });
              return;
            }

            const summary = await fetchSummary({
              title: item.job.title,
              companyName: item.companyName,
              location: item.job.location,
              department: item.job.department,
              listingText,
            });

            if (summary) {
              await saveJobSummary(feedId, summary);
            }
          } catch {
            // Summaries are optional if API key missing.
          }

          completedSummaries += 1;
          await publish({
            completedSummaries,
          });
        },
        signal,
      );
    }

    if (signal.aborted) {
      await publish({ status: "paused", currentLabel: "Sync paused" });
      return;
    }

    await publish({
      status: "complete",
      phase: "done",
      currentLabel: "All brands cached and ready to read",
    });

    window.dispatchEvent(new Event("careers-analyzer-cache-updated"));
  } catch (error) {
    await publish({
      status: "error",
      error: error instanceof Error ? error.message : "Bulk sync failed",
      currentLabel: "Sync encountered an error",
    });
  } finally {
    abortController = null;
  }
}
