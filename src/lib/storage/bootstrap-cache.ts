import { decodeListingHtml } from "@/lib/html/decode-listing-html";
import type { AnalysisCacheEntry } from "@/lib/storage/analysis-cache";
import type { JobListing } from "@/lib/types/company";
import {
  getAllAnalyses,
  saveAnalysis,
  saveJobDetail,
} from "@/lib/storage/db";

interface BootstrapManifest {
  generatedAt: string;
  companyCount: number;
  jobCount: number;
}

interface BootstrapJob {
  feedId: string;
  companyName: string;
  boardSlug?: string;
  job: JobListing;
  contentHtml: string;
  contentText: string;
  offices: string[];
  scrapedAt: string;
}

let bootstrapped = false;

export async function bootstrapFromPublicCache() {
  if (bootstrapped || typeof window === "undefined") return false;

  try {
    const existing = await getAllAnalyses();
    if (existing.length > 0) return false;
    const manifestResponse = await fetch("/cache/manifest.json");
    if (!manifestResponse.ok) return false;

    const manifest = (await manifestResponse.json()) as BootstrapManifest;
    const [analysesResponse, jobsResponse] = await Promise.all([
      fetch("/cache/analyses.json"),
      fetch("/cache/jobs.json"),
    ]);

    if (!analysesResponse.ok || !jobsResponse.ok) return false;

    const analyses = (await analysesResponse.json()) as AnalysisCacheEntry[];
    const jobs = (await jobsResponse.json()) as BootstrapJob[];

    for (const analysis of analyses) {
      await saveAnalysis(analysis);
    }

    for (const item of jobs) {
      await saveJobDetail({
        ...item.job,
        companyName: item.companyName,
        boardSlug: item.boardSlug,
        feedId: item.feedId,
        contentHtml: decodeListingHtml(item.contentHtml),
        contentText: item.contentText,
        offices: item.offices,
        scrapedAt: item.scrapedAt,
      });
    }

    bootstrapped = true;
    window.dispatchEvent(new Event("careers-analyzer-cache-updated"));
    console.info(
      `Loaded cache: ${manifest.companyCount} companies, ${manifest.jobCount} roles (${manifest.generatedAt})`,
    );
    return true;
  } catch {
    return false;
  }
}
