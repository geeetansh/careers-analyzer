import type { Company, JobListing } from "@/lib/types/company";
import { getCompanyRank } from "@/lib/csv";
import { categoryLabel, getJobCategory, type JobCategory } from "@/lib/jobs/categories";
import {
  getAllAnalyses,
  getReadRoleIds,
  makeFeedId,
} from "@/lib/storage/db";

export interface FeedRole {
  feedId: string;
  companyName: string;
  companyRank: number;
  category: JobCategory;
  categoryLabel: string;
  job: JobListing;
  boardSlug?: string;
  read: boolean;
}

export interface FeedStats {
  total: number;
  cs: number;
  product: number;
  read: number;
  unread: number;
  companiesWithRoles: number;
}

export async function buildFeed(companies: Company[]): Promise<FeedRole[]> {
  const [analyses, readIds] = await Promise.all([
    getAllAnalyses(),
    getReadRoleIds(),
  ]);

  const rankByCompany = new Map(
    companies.map((company) => [company.name, getCompanyRank(company)]),
  );

  const roles: FeedRole[] = [];

  for (const analysis of analyses) {
    const companyRank = rankByCompany.get(analysis.companyName) ?? 9999;

    for (const job of analysis.result.jobs) {
      const category = getJobCategory(job);
      if (!category) continue;

      const feedId = makeFeedId(analysis.companyName, job.id);
      roles.push({
        feedId,
        companyName: analysis.companyName,
        companyRank,
        category,
        categoryLabel: categoryLabel(category),
        job,
        boardSlug: analysis.result.boardSlug,
        read: readIds.has(feedId),
      });
    }
  }

  return roles.sort((a, b) => {
    if (a.companyRank !== b.companyRank) return a.companyRank - b.companyRank;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.job.title.localeCompare(b.job.title);
  });
}

export function filterFeed(
  roles: FeedRole[],
  options: {
    category?: JobCategory | "all";
    query?: string;
    unreadOnly?: boolean;
    companyName?: string;
  },
) {
  const needle = options.query?.trim().toLowerCase() ?? "";

  return roles.filter((role) => {
    if (options.category && options.category !== "all" && role.category !== options.category) {
      return false;
    }
    if (options.unreadOnly && role.read) return false;
    if (options.companyName && role.companyName !== options.companyName) return false;
    if (!needle) return true;

    return [
      role.companyName,
      role.job.title,
      role.job.location,
      role.job.department,
      role.categoryLabel,
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}

export function getFeedStats(roles: FeedRole[]): FeedStats {
  const companies = new Set(roles.map((role) => role.companyName));
  const read = roles.filter((role) => role.read).length;

  return {
    total: roles.length,
    cs: roles.filter((role) => role.category === "cs").length,
    product: roles.filter((role) => role.category === "product").length,
    read,
    unread: roles.length - read,
    companiesWithRoles: companies.size,
  };
}
