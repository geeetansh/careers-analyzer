import type { JobListing } from "@/lib/types/company";

export type JobCategory = "cs" | "product";

const CS_PATTERNS = [
  /\bcustomer\s+success\b/i,
  /\bclient\s+success\b/i,
  /\bcustomer\s+experience\b/i,
  /\bcustomer\s+support\b/i,
  /\bcustomer\s+care\b/i,
  /\bcsm\b/i,
  /\bglobal\s+success\b/i,
  /\bprofessional\s+services\b/i,
  /\bimplementation\s+(manager|consultant|specialist)\b/i,
  /\bsuccess\s+(manager|lead|director|engineer)\b/i,
  /\brenewals?\b/i,
  /\bonboarding\b/i,
];

const PRODUCT_PATTERNS = [
  /\bproduct\s+manager\b/i,
  /\bproduct\s+management\b/i,
  /\bproduct\s+owner\b/i,
  /\bproduct\s+designer\b/i,
  /\bproduct\s+design\b/i,
  /\bproduct\s+marketing\b/i,
  /\bproduct\s+operations\b/i,
  /\bproduct\s+analyst\b/i,
  /\bgroup\s+product\b/i,
  /\bprincipal\s+product\b/i,
  /\bassociate\s+product\b/i,
  /\bproduct\s+lead\b/i,
  /\bproduct\s+director\b/i,
  /\bhead\s+of\s+product\b/i,
  /\bvp[,]?\s+product\b/i,
  /\bchief\s+product\b/i,
];

const PRODUCT_DEPARTMENT_PATTERNS = [
  /\bproduct\b/i,
  /\bproduct\s+&\s+design\b/i,
];

const EXCLUDE_PATTERNS = [
  /\bproduction\b/i,
  /\bproduct\s+security\b/i,
  /\bproduct\s+marketing\s+manager\b/i, // could be marketing - still product adjacent, keep
];

function jobHaystack(job: JobListing) {
  return [job.title, job.department, job.employmentType].join(" ");
}

function matchesAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

export function getJobCategory(job: JobListing): JobCategory | null {
  const text = jobHaystack(job);

  if (matchesAny(text, EXCLUDE_PATTERNS) && !/\bproduct\s+manager\b/i.test(text)) {
    // still allow explicit PM titles
  }

  const isCs = matchesAny(text, CS_PATTERNS);
  const isProduct =
    matchesAny(text, PRODUCT_PATTERNS) ||
    (matchesAny(job.department, PRODUCT_DEPARTMENT_PATTERNS) &&
      /\b(manager|owner|designer|director|lead|analyst|principal|associate|head|vp)\b/i.test(
        job.title,
      ));

  if (isCs && !isProduct) return "cs";
  if (isProduct && !isCs) return "product";
  if (isCs && isProduct) {
    return /\bproduct\b/i.test(job.title) ? "product" : "cs";
  }

  return null;
}

export function isTargetRole(job: JobListing) {
  return getJobCategory(job) !== null;
}

export function categoryLabel(category: JobCategory) {
  return category === "cs" ? "Customer Success" : "Product";
}
