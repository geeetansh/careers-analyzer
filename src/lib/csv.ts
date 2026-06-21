import Papa from "papaparse";
import {
  CRM_COLUMNS,
  type Company,
  type CompanyMeta,
  type SimilarTool,
} from "@/lib/types/company";

const IMPORT_ALIASES: Record<string, keyof Company | "rank"> = {
  company: "name",
  name: "name",
  domain: "website",
  website: "website",
  "careers url": "careers_page",
  careers_page: "careers_page",
  careers: "careers_page",
  tier: "category_primary",
  category_primary: "category_primary",
  "estimated revenue": "revenue_display",
  revenue_display: "revenue_display",
  "revenue period/range": "revenue_period",
  "revenue period": "revenue_period",
  revenue_period: "revenue_period",
  source: "revenue_source",
  revenue_source: "revenue_source",
  confidence: "employees_source",
  employees_source: "employees_source",
  "platform summary": "platform_summary",
  platform_summary: "platform_summary",
  rank: "rank",
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function toUrl(value: string, kind: "website" | "careers") {
  if (!value?.trim()) return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (kind === "website") return `https://${trimmed.replace(/^www\./, "")}`;
  return `https://${trimmed}`;
}

function emptyCompany(): Company {
  return {
    name: "",
    hq_street: "",
    hq_city: "",
    hq_state_region: "",
    hq_postal_code: "",
    hq_country: "",
    hq_address_json: "",
    country_name: "",
    country_code: "",
    category_primary: "",
    category_tags: "",
    website: "",
    revenue_amount_usd: "",
    revenue_display: "",
    revenue_currency: "USD",
    revenue_period: "",
    revenue_period_end: "",
    revenue_source: "",
    linkedin_page: "",
    socials_json: "",
    estimated_employees: "",
    employees_source: "",
    careers_page: "",
    platform_summary: "",
  };
}

function rowToCompany(row: Record<string, string>): Company {
  const company = emptyCompany();
  let rank: number | undefined;
  let domain = "";
  let confidence = "";
  let tier = "";

  for (const [header, value] of Object.entries(row)) {
    const alias = IMPORT_ALIASES[normalizeHeader(header)];
    if (!alias || !value?.trim()) continue;

    if (alias === "rank") {
      rank = Number(value);
      continue;
    }

    if (alias === "website") {
      domain = value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? value;
      company.website = toUrl(value, "website");
      continue;
    }

    if (alias === "careers_page") {
      company.careers_page = toUrl(value, "careers");
      continue;
    }

    if (alias === "category_primary") {
      tier = value;
      company.category_primary = value;
      continue;
    }

    if (alias === "employees_source") {
      confidence = value;
      company.employees_source = value;
      continue;
    }

    company[alias] = value.trim();
  }

  if (!company.name && row.Company) {
    company.name = row.Company.trim();
  }

  const meta: CompanyMeta = {
    ...(rank ? { rank } : {}),
    ...(domain ? { domain } : {}),
    ...(confidence ? { confidence } : {}),
    ...(tier ? { tier } : {}),
  };

  if (Object.keys(meta).length > 0) {
    company.category_tags = JSON.stringify(meta);
  }

  if (company.revenue_source && company.employees_source && !company.revenue_source.includes("(")) {
    company.revenue_source = `${company.revenue_source} (${company.employees_source})`;
  }

  return company;
}

export function parseCompaniesCsv(csvText: string): Company[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message ?? "Failed to parse CSV");
  }

  const hasFriendlyHeaders = result.meta.fields?.some((field) =>
    ["Company", "Domain", "Platform Summary"].includes(field ?? ""),
  );

  if (hasFriendlyHeaders) {
    return result.data
      .filter((row) => (row.Company ?? row.name ?? "").trim())
      .map(rowToCompany);
  }

  return result.data
    .filter((row) => row.name?.trim())
    .map((row) => {
      const company = emptyCompany();
      for (const column of CRM_COLUMNS) {
        company[column] = row[column]?.trim() ?? "";
      }
      return company;
    });
}

export function companiesToCsv(companies: Company[]): string {
  const friendlyHeaders = [
    "Company",
    "Domain",
    "Careers URL",
    "Tier",
    "Estimated Revenue",
    "Revenue Period/Range",
    "Source",
    "Confidence",
    "Platform Summary",
  ];

  const rows = companies.map((company) => {
    const meta = getCompanyMeta(company);
    return {
      Company: company.name,
      Domain: meta.domain ?? company.website.replace(/^https?:\/\//, ""),
      "Careers URL": company.careers_page,
      Tier: company.category_primary || meta.tier || "",
      "Estimated Revenue": company.revenue_display,
      "Revenue Period/Range": company.revenue_period,
      Source: company.revenue_source.replace(/\s*\([^)]*\)$/, ""),
      Confidence: company.employees_source || meta.confidence || "",
      "Platform Summary": company.platform_summary,
    };
  });

  return Papa.unparse(rows, {
    columns: friendlyHeaders,
    quotes: true,
  });
}

export function parseJsonField<T>(value: string, fallback: T): T {
  if (!value?.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function getCompanyMeta(company: Company): CompanyMeta {
  return parseJsonField<CompanyMeta>(company.category_tags, {});
}

export function getCompanyRank(company: Company): number {
  const rank = getCompanyMeta(company).rank;
  return typeof rank === "number" ? rank : Number.MAX_SAFE_INTEGER;
}

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0] ?? "";
}

export function getCompanyDomain(company: Company): string {
  const meta = getCompanyMeta(company);
  if (meta.domain) return normalizeDomain(meta.domain);
  if (company.website) return normalizeDomain(company.website);
  return "";
}

export function similarToolToCompany(
  tool: SimilarTool,
  seedCompanyName: string,
): Company {
  const domain = normalizeDomain(tool.domain);

  const meta: CompanyMeta = {
    domain,
    tier: tool.tier,
    confidence: tool.confidence,
    discovered_from: seedCompanyName,
    discovered_at: new Date().toISOString(),
    overlap_areas: tool.overlapAreas,
  };

  return {
    ...emptyCompany(),
    name: tool.name,
    category_primary: tool.tier,
    category_tags: JSON.stringify(meta),
    website: toUrl(domain, "website"),
    revenue_display: tool.estimatedRevenue,
    revenue_period: tool.revenuePeriod,
    revenue_source: `${tool.source} (${tool.confidence})`,
    employees_source: tool.confidence,
    careers_page: toUrl(tool.careersUrl, "careers"),
    platform_summary: tool.platformSummary,
  };
}

export function mergeCompanies(
  existing: Company[],
  incoming: Company[],
): Company[] {
  const domainSet = new Set(existing.map(getCompanyDomain));
  const merged = [...existing];

  for (const company of incoming) {
    const domain = getCompanyDomain(company);
    if (!domain || domainSet.has(domain)) continue;
    domainSet.add(domain);
    merged.push(company);
  }

  return merged;
}
