"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Search, CloudDownload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { AnalyzeResult, Company, JobListing } from "@/lib/types/company";
import { JobDetailDialog } from "@/components/careers/job-detail-dialog";
import {
  getCachedAnalysis,
  setCachedAnalysis,
} from "@/lib/storage/analysis-cache";
import { saveAnalysis } from "@/lib/storage/db";

interface CareersAnalyzerProps {
  company: Company;
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function CareersAnalyzer({ company }: CareersAnalyzerProps) {
  const [careersPage, setCareersPage] = useState(company.careers_page);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const [cacheLabel, setCacheLabel] = useState<string | null>(null);

  const loadCache = useCallback(() => {
    const cached = getCachedAnalysis(company.name, careersPage);
    if (cached) {
      setResult(cached.result);
      setLoadedFromCache(true);
      setCacheLabel(cached.cachedAt);
      return true;
    }
    setLoadedFromCache(false);
    setCacheLabel(null);
    return false;
  }, [company.name, careersPage]);

  useEffect(() => {
    setCareersPage(company.careers_page);
    setError(null);
    setQuery("");
    setSelectedJob(null);
  }, [company]);

  useEffect(() => {
    const hasCache = loadCache();
    if (!hasCache) {
      setResult(null);
    }
  }, [loadCache]);

  async function analyze(force = false) {
    if (!force && !result) {
      const hasCache = loadCache();
      if (hasCache) return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careersPage }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      const nextResult = data as AnalyzeResult;
      setResult(nextResult);
      const entry = {
        companyName: company.name,
        careersPage,
        result: nextResult,
        cachedAt: new Date().toISOString(),
      };
      setCachedAnalysis(company.name, careersPage, nextResult);
      await saveAnalysis(entry);
      setLoadedFromCache(false);
      setCacheLabel(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  const filteredJobs =
    result?.jobs.filter((job) => {
      const haystack = [
        job.title,
        job.location,
        job.department,
        job.employmentType,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query.toLowerCase());
    }) ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Careers Analyzer — {company.name}</CardTitle>
          <CardDescription>
            Results are saved locally per company. Use Sync to refresh from the
            careers page on demand.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={careersPage}
              onChange={(event) => setCareersPage(event.target.value)}
              placeholder="https://company.com/careers"
            />
            <div className="flex gap-2">
              <Button onClick={() => analyze(true)} disabled={loading || !careersPage}>
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CloudDownload className="mr-2 size-4" />
                )}
                Sync
              </Button>
              {!result ? (
                <Button
                  variant="outline"
                  onClick={() => analyze(false)}
                  disabled={loading || !careersPage}
                >
                  {loading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
                  Analyze
                </Button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          {result ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{result.provider}</Badge>
              <span>{result.jobCount} open roles</span>
              {result.boardSlug ? <span>board: {result.boardSlug}</span> : null}
              {loadedFromCache ? (
                <Badge variant="secondary">Loaded from local cache</Badge>
              ) : (
                <Badge variant="secondary">Fresh sync</Badge>
              )}
              <span>
                {loadedFromCache ? "cached" : "analyzed"}{" "}
                {formatDate(cacheLabel ?? result.analyzedAt)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved analysis for this company yet. Click Analyze or Sync to
              fetch open roles.
            </p>
          )}

          {result?.warnings.map((warning) => (
            <p key={warning} className="text-sm text-amber-600">
              {warning}
            </p>
          ))}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {result ? (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter roles..."
              className="pl-9"
            />
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No roles match your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium">{job.title}</TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>{job.department}</TableCell>
                      <TableCell>{job.employmentType}</TableCell>
                      <TableCell>{formatDate(job.postedAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJob(job)}
                          >
                            View listing
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}

      <JobDetailDialog
        job={selectedJob}
        companyName={company.name}
        boardSlug={result?.boardSlug}
        open={Boolean(selectedJob)}
        onOpenChange={(open) => {
          if (!open) setSelectedJob(null);
        }}
      />
    </div>
  );
}
