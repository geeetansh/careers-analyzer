"use client";

import { useState } from "react";
import { Download, FileJson, Sheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/lib/download";
import {
  gatherSavedJobs,
  savedJobsFilename,
  savedJobsToCsv,
  savedJobsToJson,
} from "@/lib/jobs/export-saved-jobs";
import type { Company } from "@/lib/types/company";
import { cn } from "@/lib/utils";

interface ExportSavedJobsProps {
  companies: Company[];
  savedCount: number;
  className?: string;
}

export function ExportSavedJobs({
  companies,
  savedCount,
  className,
}: ExportSavedJobsProps) {
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);

  async function handleExport(format: "csv" | "json") {
    setExporting(format);
    try {
      const jobs = await gatherSavedJobs(companies);
      const content =
        format === "csv" ? savedJobsToCsv(jobs) : savedJobsToJson(jobs);
      const mimeType =
        format === "csv" ? "text/csv;charset=utf-8" : "application/json";
      downloadTextFile(content, savedJobsFilename(format), mimeType);
    } finally {
      setExporting(null);
    }
  }

  const disabled = savedCount === 0 || exporting !== null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => void handleExport("csv")}
        title="Spreadsheet-friendly export for Excel or Google Sheets"
      >
        <Sheet className="mr-1.5 size-4" />
        {exporting === "csv" ? "Exporting…" : "CSV"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => void handleExport("json")}
        title="Structured export for scripts, APIs, and sharing"
      >
        <FileJson className="mr-1.5 size-4" />
        {exporting === "json" ? "Exporting…" : "JSON"}
      </Button>
      {savedCount > 0 ? (
        <span className="text-xs text-muted-foreground">
          <Download className="mr-1 inline size-3.5" />
          {savedCount} saved
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">No saved jobs yet</span>
      )}
    </div>
  );
}
