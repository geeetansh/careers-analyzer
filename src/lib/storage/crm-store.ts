import type { Company } from "@/lib/types/company";
import { parseCompaniesCsv } from "@/lib/csv";

const CRM_STORAGE_KEY = "careers-analyzer:crm-companies:v1";

export function loadCrmCompanies(seedCsv: string): Company[] {
  if (typeof window === "undefined") {
    return parseCompaniesCsv(seedCsv);
  }

  try {
    const raw = window.localStorage.getItem(CRM_STORAGE_KEY);
    if (raw) {
      const companies = JSON.parse(raw) as Company[];
      return companies.map((company) => ({
        ...company,
        platform_summary: company.platform_summary ?? "",
      }));
    }
  } catch {
    // fall through to seed
  }

  return parseCompaniesCsv(seedCsv);
}

export function saveCrmCompanies(companies: Company[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(companies));
  window.dispatchEvent(new Event("careers-analyzer-crm-updated"));
}

export function clearCrmCompanies() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CRM_STORAGE_KEY);
  window.dispatchEvent(new Event("careers-analyzer-crm-updated"));
}
