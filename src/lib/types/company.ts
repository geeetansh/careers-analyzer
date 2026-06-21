export const CRM_COLUMNS = [
  "name",
  "hq_street",
  "hq_city",
  "hq_state_region",
  "hq_postal_code",
  "hq_country",
  "hq_address_json",
  "country_name",
  "country_code",
  "category_primary",
  "category_tags",
  "website",
  "revenue_amount_usd",
  "revenue_display",
  "revenue_currency",
  "revenue_period",
  "revenue_period_end",
  "revenue_source",
  "linkedin_page",
  "socials_json",
  "estimated_employees",
  "employees_source",
  "careers_page",
  "platform_summary",
] as const;

export type CrmColumn = (typeof CRM_COLUMNS)[number];

export interface Company {
  name: string;
  hq_street: string;
  hq_city: string;
  hq_state_region: string;
  hq_postal_code: string;
  hq_country: string;
  hq_address_json: string;
  country_name: string;
  country_code: string;
  category_primary: string;
  category_tags: string;
  website: string;
  revenue_amount_usd: string;
  revenue_display: string;
  revenue_currency: string;
  revenue_period: string;
  revenue_period_end: string;
  revenue_source: string;
  linkedin_page: string;
  socials_json: string;
  estimated_employees: string;
  employees_source: string;
  careers_page: string;
  platform_summary: string;
}

export interface JobListing {
  id: string;
  title: string;
  location: string;
  department: string;
  employmentType: string;
  postedAt: string;
  url: string;
  requisitionId?: string;
  provider: CareersProvider;
}

export interface JobDetail extends JobListing {
  contentHtml: string;
  contentText: string;
  offices: string[];
  scrapedAt: string;
}

export interface JobSummary {
  roleType: string;
  dayToDay: string;
  orgPosition: string;
  summarizedAt: string;
}

export interface CompanyMeta {
  rank?: number;
  domain?: string;
  confidence?: string;
  tier?: string;
  discovered_from?: string;
  discovered_at?: string;
  overlap_areas?: string[];
}

export interface SimilarTool {
  name: string;
  domain: string;
  careersUrl: string;
  tier: string;
  estimatedRevenue: string;
  revenuePeriod: string;
  source: string;
  confidence: string;
  platformSummary: string;
  similarityReason: string;
  overlapAreas: string[];
}

export interface SimilarToolsResult {
  seedDomain: string;
  searchedAt: string;
  tools: SimilarTool[];
}

export type CareersProvider =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "embedded"
  | "generic";

export interface AnalyzeResult {
  careersPage: string;
  provider: CareersProvider;
  boardSlug?: string;
  analyzedAt: string;
  jobCount: number;
  jobs: JobListing[];
  warnings: string[];
}
