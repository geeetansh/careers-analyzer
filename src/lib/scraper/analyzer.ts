import * as cheerio from "cheerio";
import type { CareersProvider, JobListing } from "@/lib/types/company";
import { fetchJson, fetchText } from "./fetch";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  first_published?: string;
  requisition_id?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  metadata?: Array<{ name?: string; value?: string }> | null;
}

interface GreenhouseBoardResponse {
  jobs: GreenhouseJob[];
}

interface GreenhouseJobDetail extends GreenhouseJob {
  content?: string;
  offices?: Array<{ name?: string; location?: string }>;
}

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  categories?: {
    location?: string;
    team?: string;
    commitment?: string;
  };
}

interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  publishedAt: string;
  location?: string;
  department?: string;
  employmentType?: string;
}

interface AshbyBoardResponse {
  jobs: AshbyJob[];
}

function stripHtml(html: string): string {
  const $ = cheerio.load(html);
  return $.text().replace(/\s+/g, " ").trim();
}

function domainSlug(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname.split(".")[0] ?? hostname;
  } catch {
    return "";
  }
}

function mapGreenhouseJob(job: GreenhouseJob): JobListing {
  const commitment =
    job.metadata?.find((item) =>
      item.name?.toLowerCase().includes("employment"),
    )?.value ?? "";

  return {
    id: String(job.id),
    title: job.title,
    location: job.location?.name ?? "—",
    department: job.departments?.[0]?.name ?? "—",
    employmentType: commitment || "—",
    postedAt: job.first_published ?? job.updated_at,
    url: job.absolute_url,
    requisitionId: job.requisition_id,
    provider: "greenhouse",
  };
}

export async function fetchGreenhouseJobs(
  boardSlug: string,
): Promise<JobListing[]> {
  const data = await fetchJson<GreenhouseBoardResponse>(
    `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs`,
  );

  return (data.jobs ?? []).map(mapGreenhouseJob);
}

export async function fetchGreenhouseJobDetail(
  boardSlug: string,
  jobId: string,
): Promise<{ contentHtml: string; contentText: string; offices: string[] }> {
  const job = await fetchJson<GreenhouseJobDetail>(
    `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs/${jobId}`,
  );

  const contentHtml = job.content ?? "";
  const offices =
    job.offices?.map((office) => office.location || office.name || "").filter(Boolean) ??
    [];

  return {
    contentHtml,
    contentText: stripHtml(contentHtml),
    offices,
  };
}

export async function fetchLeverJobs(company: string): Promise<JobListing[]> {
  const postings = await fetchJson<LeverPosting[]>(
    `https://api.lever.co/v0/postings/${company}?mode=json`,
  );

  return postings.map((posting) => ({
    id: posting.id,
    title: posting.text,
    location: posting.categories?.location ?? "—",
    department: posting.categories?.team ?? "—",
    employmentType: posting.categories?.commitment ?? "—",
    postedAt: new Date(posting.createdAt).toISOString(),
    url: posting.hostedUrl,
    provider: "lever",
  }));
}

export async function fetchLeverJobDetail(
  postingId: string,
): Promise<{ contentHtml: string; contentText: string; offices: string[] }> {
  const posting = await fetchJson<LeverPosting & { description?: string }>(
    `https://api.lever.co/v0/postings/${postingId}`,
  );

  const contentHtml = posting.description ?? "";
  return {
    contentHtml,
    contentText: stripHtml(contentHtml),
    offices: posting.categories?.location ? [posting.categories.location] : [],
  };
}

export async function fetchAshbyJobs(company: string): Promise<JobListing[]> {
  const data = await fetchJson<AshbyBoardResponse>(
    `https://api.ashbyhq.com/posting-api/job-board/${company}`,
  );

  return (data.jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    location: job.location ?? "—",
    department: job.department ?? "—",
    employmentType: job.employmentType ?? "—",
    postedAt: job.publishedAt,
    url: job.jobUrl,
    provider: "ashby",
  }));
}

export function detectProvider(
  careersPage: string,
  html: string,
): { provider: CareersProvider; boardSlug?: string } {
  const lowerHtml = html.toLowerCase();
  const lowerUrl = careersPage.toLowerCase();

  const greenhouseBoardMatch =
    lowerUrl.match(/boards\.greenhouse\.io\/([^/?#]+)/) ??
    html.match(/boards\.greenhouse\.io\/([^/"'?#]+)/i);
  if (greenhouseBoardMatch?.[1]) {
    return { provider: "greenhouse", boardSlug: greenhouseBoardMatch[1] };
  }

  if (lowerHtml.includes("gh_jid") || lowerHtml.includes("greenhouse")) {
    return { provider: "greenhouse", boardSlug: domainSlug(careersPage) };
  }

  const leverMatch =
    lowerUrl.match(/jobs\.lever\.co\/([^/?#]+)/) ??
    html.match(/jobs\.lever\.co\/([^/"'?#]+)/i);
  if (leverMatch?.[1]) {
    return { provider: "lever", boardSlug: leverMatch[1] };
  }

  const ashbyMatch =
    lowerUrl.match(/jobs\.ashbyhq\.com\/([^/?#]+)/) ??
    html.match(/jobs\.ashbyhq\.com\/([^/"'?#]+)/i);
  if (ashbyMatch?.[1]) {
    return { provider: "ashby", boardSlug: ashbyMatch[1] };
  }

  return { provider: "generic", boardSlug: domainSlug(careersPage) };
}

export async function scrapeEmbeddedJobs(
  html: string,
  baseUrl: string,
): Promise<JobListing[]> {
  const $ = cheerio.load(html);
  const jobs: JobListing[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const title = $(element).text().replace(/\s+/g, " ").trim();
    if (!title || title.length < 4) return;

    const lowerHref = href.toLowerCase();
    const looksLikeJob =
      lowerHref.includes("job") ||
      lowerHref.includes("career") ||
      lowerHref.includes("gh_jid") ||
      lowerHref.includes("posting");

    if (!looksLikeJob) return;

    const url = new URL(href, baseUrl).toString();
    if (seen.has(url)) return;
    seen.add(url);

    const container = $(element).closest("li, article, tr, div");
    const location =
      container.find("[class*='location'], [data-location]").first().text().trim() ||
      "—";

    jobs.push({
      id: url,
      title,
      location: location || "—",
      department: "—",
      employmentType: "—",
      postedAt: new Date().toISOString(),
      url,
      provider: "embedded",
    });
  });

  return jobs;
}

export async function analyzeCareersPage(careersPage: string) {
  const warnings: string[] = [];
  const html = await fetchText(careersPage);
  const detection = detectProvider(careersPage, html);
  let jobs: JobListing[] = [];
  let boardSlug = detection.boardSlug;

  if (detection.provider === "greenhouse" && boardSlug) {
    try {
      jobs = await fetchGreenhouseJobs(boardSlug);
    } catch {
      warnings.push(
        `Greenhouse board "${boardSlug}" was not reachable; falling back to embedded links.`,
      );
      jobs = await scrapeEmbeddedJobs(html, careersPage);
    }
  } else if (detection.provider === "lever" && boardSlug) {
    try {
      jobs = await fetchLeverJobs(boardSlug);
    } catch {
      warnings.push(
        `Lever company "${boardSlug}" was not reachable; falling back to embedded links.`,
      );
      jobs = await scrapeEmbeddedJobs(html, careersPage);
    }
  } else if (detection.provider === "ashby" && boardSlug) {
    try {
      jobs = await fetchAshbyJobs(boardSlug);
    } catch {
      warnings.push(
        `Ashby board "${boardSlug}" was not reachable; falling back to embedded links.`,
      );
      jobs = await scrapeEmbeddedJobs(html, careersPage);
    }
  } else if (boardSlug) {
    for (const provider of ["greenhouse", "lever", "ashby"] as const) {
      try {
        if (provider === "greenhouse") {
          jobs = await fetchGreenhouseJobs(boardSlug);
        } else if (provider === "lever") {
          jobs = await fetchLeverJobs(boardSlug);
        } else {
          jobs = await fetchAshbyJobs(boardSlug);
        }

        if (jobs.length > 0) {
          return {
            careersPage,
            provider,
            boardSlug,
            analyzedAt: new Date().toISOString(),
            jobCount: jobs.length,
            jobs,
            warnings,
          };
        }
      } catch {
        // Try next provider.
      }
    }

    jobs = await scrapeEmbeddedJobs(html, careersPage);
    if (jobs.length === 0) {
      warnings.push(
        "No ATS provider matched and no job links were found on the page.",
      );
    }

    return {
      careersPage,
      provider: "generic" as const,
      boardSlug,
      analyzedAt: new Date().toISOString(),
      jobCount: jobs.length,
      jobs,
      warnings,
    };
  }

  if (jobs.length === 0) {
    jobs = await scrapeEmbeddedJobs(html, careersPage);
  }

  return {
    careersPage,
    provider: detection.provider,
    boardSlug,
    analyzedAt: new Date().toISOString(),
    jobCount: jobs.length,
    jobs,
    warnings,
  };
}

export async function fetchJobDetail(input: {
  provider: CareersProvider;
  boardSlug?: string;
  jobId: string;
  url: string;
}) {
  if (input.provider === "greenhouse" && input.boardSlug) {
    return fetchGreenhouseJobDetail(input.boardSlug, input.jobId);
  }

  if (input.provider === "lever") {
    const postingId = input.jobId.includes("/")
      ? input.jobId.split("/").pop()!
      : input.jobId;
    return fetchLeverJobDetail(postingId);
  }

  const html = await fetchText(input.url);
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();

  const main =
    $("main").html() ??
    $("[class*='job']").first().html() ??
    $("article").first().html() ??
    $("body").html() ??
    "";

  return {
    contentHtml: main,
    contentText: stripHtml(main),
    offices: [],
  };
}
