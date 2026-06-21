import Papa from "papaparse";
import { getCompanyRank } from "@/lib/csv";
import { buildFeed } from "@/lib/jobs/feed";
import {
  getAllJobSummaries,
  getAllRoleStatusRows,
} from "@/lib/storage/db";
import type { Company, JobSummary } from "@/lib/types/company";

export const SAVED_JOBS_EXPORT_VERSION = 1;

export interface SavedJobCompany {
  name: string;
  rank: number;
  website: string;
  careersPage: string;
  revenueDisplay: string;
  estimatedEmployees: string;
  platformSummary: string;
}

export interface SavedJobRecord {
  feedId: string;
  savedAt: string;
  company: SavedJobCompany;
  category: string;
  title: string;
  location: string;
  department: string;
  employmentType: string;
  postedAt: string;
  url: string;
  provider: string;
  summary: JobSummary | null;
}

export interface SavedJobsExport {
  exportVersion: number;
  exportedAt: string;
  count: number;
  jobs: SavedJobRecord[];
}

const CSV_COLUMNS = [
  "Company",
  "Company Rank",
  "Category",
  "Title",
  "Location",
  "Department",
  "Employment Type",
  "Posted At",
  "Job URL",
  "Careers Page",
  "Website",
  "Saved At",
  "Role Type",
  "Day to Day",
  "Org Position",
] as const;

export async function gatherSavedJobs(
  companies: Company[],
): Promise<SavedJobRecord[]> {
  const [roles, summaries, statusRows] = await Promise.all([
    buildFeed(companies),
    getAllJobSummaries(),
    getAllRoleStatusRows(),
  ]);

  const summaryByFeedId = new Map(
    summaries.map((summary) => [summary.feedId, summary]),
  );
  const savedAtByFeedId = new Map(
    statusRows
      .filter((row) => row.status === "liked")
      .map((row) => [row.feedId, row.updatedAt]),
  );
  const companyByName = new Map(companies.map((company) => [company.name, company]));

  return roles
    .filter((role) => role.status === "liked")
    .map((role) => {
      const company = companyByName.get(role.companyName);
      const summary = summaryByFeedId.get(role.feedId) ?? null;

      return {
        feedId: role.feedId,
        savedAt: savedAtByFeedId.get(role.feedId) ?? "",
        company: {
          name: role.companyName,
          rank: company ? getCompanyRank(company) : role.companyRank,
          website: company?.website ?? "",
          careersPage: company?.careers_page ?? "",
          revenueDisplay: company?.revenue_display ?? "",
          estimatedEmployees: company?.estimated_employees ?? "",
          platformSummary: company?.platform_summary ?? "",
        },
        category: role.categoryLabel,
        title: role.job.title,
        location: role.job.location,
        department: role.job.department,
        employmentType: role.job.employmentType,
        postedAt: role.job.postedAt,
        url: role.job.url,
        provider: role.job.provider,
        summary: summary
          ? {
              roleType: summary.roleType,
              dayToDay: summary.dayToDay,
              orgPosition: summary.orgPosition,
              summarizedAt: summary.summarizedAt,
            }
          : null,
      };
    })
    .sort((a, b) => {
      if (a.company.rank !== b.company.rank) {
        return a.company.rank - b.company.rank;
      }
      return a.title.localeCompare(b.title);
    });
}

export function savedJobsToCsv(jobs: SavedJobRecord[]): string {
  const rows = jobs.map((job) => ({
    Company: job.company.name,
    "Company Rank": job.company.rank,
    Category: job.category,
    Title: job.title,
    Location: job.location,
    Department: job.department,
    "Employment Type": job.employmentType,
    "Posted At": job.postedAt,
    "Job URL": job.url,
    "Careers Page": job.company.careersPage,
    Website: job.company.website,
    "Saved At": job.savedAt,
    "Role Type": job.summary?.roleType ?? "",
    "Day to Day": job.summary?.dayToDay ?? "",
    "Org Position": job.summary?.orgPosition ?? "",
  }));

  return Papa.unparse(rows, {
    columns: [...CSV_COLUMNS],
    quotes: true,
  });
}

export function savedJobsToJson(jobs: SavedJobRecord[]): string {
  const payload: SavedJobsExport = {
    exportVersion: SAVED_JOBS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    count: jobs.length,
    jobs,
  };

  return JSON.stringify(payload, null, 2);
}

export function savedJobsFilename(format: "csv" | "json", date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `saved-jobs-${stamp}.${format}`;
}
