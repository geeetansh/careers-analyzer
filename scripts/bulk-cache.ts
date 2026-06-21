import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { analyzeCareersPage, fetchJobDetail } from "../src/lib/scraper/analyzer";
import { isTargetRole } from "../src/lib/jobs/categories";
import { sanitizeListingHtml, listingHtmlToPlainText } from "../src/lib/html/sanitize-listing";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, "public", "cache");
const CONCURRENCY = 4;

interface CompanyRow {
  name: string;
  careers_page: string;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
) {
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index;
      index += 1;
      await worker(items[current], current);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => run()),
  );
}

async function main() {
  const csv = await readFile(path.join(ROOT, "data", "companies.csv"), "utf8");
  const parsed = Papa.parse<CompanyRow>(csv, { header: true, skipEmptyLines: true });
  const companies = parsed.data.filter((row) => row.name && row.careers_page);

  await mkdir(CACHE_DIR, { recursive: true });

  const analyses: Array<{
    companyName: string;
    careersPage: string;
    result: Awaited<ReturnType<typeof analyzeCareersPage>>;
    cachedAt: string;
  }> = [];

  const jobs: Array<{
    feedId: string;
    companyName: string;
    boardSlug?: string;
    job: Awaited<ReturnType<typeof analyzeCareersPage>>["jobs"][number];
    contentHtml: string;
    contentText: string;
    offices: string[];
    scrapedAt: string;
  }> = [];

  console.log(`Caching ${companies.length} companies...`);

  await mapPool(companies, CONCURRENCY, async (company, index) => {
    console.log(`[${index + 1}/${companies.length}] ${company.name}`);
    try {
      const result = await analyzeCareersPage(company.careers_page);
      analyses.push({
        companyName: company.name,
        careersPage: company.careers_page,
        result,
        cachedAt: new Date().toISOString(),
      });

      const targetJobs = result.jobs.filter(isTargetRole);
      for (const job of targetJobs) {
        try {
          const detail = await fetchJobDetail({
            provider: job.provider,
            boardSlug: result.boardSlug,
            jobId: job.id,
            url: job.url,
          });
          const contentHtml = sanitizeListingHtml(detail.contentHtml);
          jobs.push({
            feedId: `${company.name}::${job.id}`,
            companyName: company.name,
            boardSlug: result.boardSlug,
            job,
            contentHtml,
            contentText: listingHtmlToPlainText(contentHtml) || detail.contentText,
            offices: detail.offices,
            scrapedAt: new Date().toISOString(),
          });
        } catch {
          // skip job
        }
      }
    } catch (error) {
      console.warn(`  skipped: ${error instanceof Error ? error.message : "error"}`);
    }
  });

  const manifest = {
    generatedAt: new Date().toISOString(),
    companyCount: analyses.length,
    jobCount: jobs.length,
  };

  await Promise.all([
    writeFile(path.join(CACHE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2)),
    writeFile(path.join(CACHE_DIR, "analyses.json"), JSON.stringify(analyses)),
    writeFile(path.join(CACHE_DIR, "jobs.json"), JSON.stringify(jobs)),
  ]);

  console.log(`Done. ${analyses.length} companies, ${jobs.length} CS/Product roles.`);
}

void main();
