"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Upload, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { Company } from "@/lib/types/company";
import { getCompanyMeta, getCompanyRank, companiesToCsv } from "@/lib/csv";
import { hasCachedAnalysis } from "@/lib/storage/analysis-cache";

interface CompanyTableProps {
  companies: Company[];
  selectedName?: string;
  onSelect: (company: Company) => void;
  onImport: (companies: Company[]) => void;
}

const PAGE_SIZE = 25;

export function CompanyTable({
  companies,
  selectedName,
  onSelect,
  onImport,
}: CompanyTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [cacheTick, setCacheTick] = useState(0);

  useEffect(() => {
    function handleCacheUpdate() {
      setCacheTick((value) => value + 1);
    }

    window.addEventListener("storage", handleCacheUpdate);
    window.addEventListener("careers-analyzer-cache-updated", handleCacheUpdate);
    return () => {
      window.removeEventListener("storage", handleCacheUpdate);
      window.removeEventListener("careers-analyzer-cache-updated", handleCacheUpdate);
    };
  }, []);

  const sortedCompanies = useMemo(
    () =>
      [...companies].sort(
        (a, b) => getCompanyRank(a) - getCompanyRank(b) || a.name.localeCompare(b.name),
      ),
    [companies],
  );

  const filteredCompanies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sortedCompanies;

    return sortedCompanies.filter((company) => {
      const meta = getCompanyMeta(company);
      return [
        company.name,
        company.category_primary,
        company.revenue_display,
        company.careers_page,
        meta.domain,
        meta.confidence,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [sortedCompanies, query, cacheTick]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageCompanies = filteredCompanies.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Company CRM</h2>
          <p className="text-sm text-muted-foreground">
            {companies.length} companies · showing {filteredCompanies.length} matches
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const { parseCompaniesCsv } = await import("@/lib/csv");
              onImport(parseCompaniesCsv(text));
              event.target.value = "";
              setPage(0);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = companiesToCsv(companies);
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "company-crm.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-2 size-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            Import CSV
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search companies, tier, domain..."
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Domain</TableHead>
              <TableHead>Analysis</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No companies match your search.
                </TableCell>
              </TableRow>
            ) : (
              pageCompanies.map((company) => {
                const meta = getCompanyMeta(company);
                const analyzed = hasCachedAnalysis(
                  company.name,
                  company.careers_page,
                );

                return (
                  <TableRow
                    key={company.name}
                    data-state={selectedName === company.name ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => onSelect(company)}
                  >
                    <TableCell className="text-muted-foreground">
                      {meta.rank ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="max-w-[180px] truncate">
                        {company.category_primary || meta.tier || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {company.platform_summary || "—"}
                    </TableCell>
                    <TableCell>{company.revenue_display || "—"}</TableCell>
                    <TableCell className="max-w-[160px] truncate text-muted-foreground">
                      {meta.domain || company.website}
                    </TableCell>
                    <TableCell>
                      {analyzed ? (
                        <Badge variant="outline" className="text-emerald-700">
                          Cached
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not analyzed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {currentPage + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
