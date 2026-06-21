"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JobDetail, JobListing, JobSummary } from "@/lib/types/company";
import {
  getCachedJobSummary,
  setCachedJobSummary,
} from "@/lib/storage/summary-cache";
import { JobListingContent } from "@/components/reading/job-listing-content";

interface JobDetailDialogProps {
  job: JobListing | null;
  companyName?: string;
  boardSlug?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SummarySection({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      <p className="text-[15px] leading-7 text-foreground/90 whitespace-pre-wrap">
        {body}
      </p>
    </section>
  );
}

export function JobDetailDialog({
  job,
  companyName,
  boardSlug,
  open,
  onOpenChange,
}: JobDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [activeTab, setActiveTab] = useState("summary");

  useEffect(() => {
    if (!open || !job) {
      setDetail(null);
      setSummary(null);
      setError(null);
      setSummaryError(null);
      setActiveTab("summary");
      return;
    }

    let cancelled = false;

    async function loadDetail() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/job-detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: job!.provider,
            boardSlug,
            jobId: job!.id,
            url: job!.url,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load listing");
        }

        if (!cancelled) {
          const nextDetail: JobDetail = {
            ...job!,
            contentHtml: data.contentHtml,
            contentText: data.contentText,
            offices: data.offices ?? [],
            scrapedAt: data.scrapedAt,
          };
          setDetail(nextDetail);

          const cachedSummary = getCachedJobSummary(job!.id);
          if (cachedSummary) {
            setSummary(cachedSummary);
          } else {
            void loadSummary(nextDetail);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load listing");
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    async function loadSummary(jobDetail: JobDetail, force = false) {
      if (!force) {
        const cached = getCachedJobSummary(job!.id);
        if (cached) {
          setSummary(cached);
          return;
        }
      }

      setSummaryLoading(true);
      setSummaryError(null);

      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: jobDetail.title,
            companyName,
            location: jobDetail.location,
            department: jobDetail.department,
            listingText: jobDetail.contentText,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to summarize listing");
        }

        if (!cancelled) {
          const nextSummary: JobSummary = {
            roleType: data.roleType,
            dayToDay: data.dayToDay,
            orgPosition: data.orgPosition,
            summarizedAt: data.summarizedAt,
          };
          setSummary(nextSummary);
          setCachedJobSummary(job!.id, nextSummary);
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryError(
            err instanceof Error ? err.message : "Failed to summarize listing",
          );
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, job, boardSlug, companyName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="pr-8 text-left text-lg">
            {job?.title ?? "Job listing"}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-2 pt-2 text-left">
              {job ? (
                <>
                  <Badge variant="secondary">{job.location}</Badge>
                  <Badge variant="outline">{job.department}</Badge>
                  {job.employmentType !== "—" ? (
                    <Badge variant="outline">{job.employmentType}</Badge>
                  ) : null}
                  {job.requisitionId ? (
                    <Badge variant="outline">{job.requisitionId}</Badge>
                  ) : null}
                </>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="shrink-0 border-b px-6">
            <TabsList className="h-10 bg-transparent p-0">
              <TabsTrigger value="summary" className="gap-2">
                <Sparkles className="size-4" />
                AI Summary
              </TabsTrigger>
              <TabsTrigger value="listing">Full listing</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <TabsContent value="summary" className="mt-0 space-y-4 px-6 py-4">
              {loading || summaryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : null}

              {summaryError ? (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">{summaryError}</p>
                  {detail ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSummary(null);
                        setSummaryError(null);
                        void fetch("/api/summarize", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            title: detail.title,
                            companyName,
                            location: detail.location,
                            department: detail.department,
                            listingText: detail.contentText,
                          }),
                        })
                          .then(async (response) => {
                            const data = await response.json();
                            if (!response.ok) {
                              throw new Error(data.error ?? "Failed");
                            }
                            const nextSummary: JobSummary = {
                              roleType: data.roleType,
                              dayToDay: data.dayToDay,
                              orgPosition: data.orgPosition,
                              summarizedAt: data.summarizedAt,
                            };
                            setSummary(nextSummary);
                            if (job) setCachedJobSummary(job.id, nextSummary);
                          })
                          .catch((err) =>
                            setSummaryError(
                              err instanceof Error ? err.message : "Retry failed",
                            ),
                          );
                      }}
                    >
                      Retry summary
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {summary ? (
                <div className="space-y-4">
                  <SummarySection
                    title="What kind of role is this?"
                    body={summary.roleType}
                  />
                  <SummarySection
                    title="Day-to-day responsibilities"
                    body={summary.dayToDay}
                  />
                  <SummarySection
                    title="Where this role sits"
                    body={summary.orgPosition}
                  />
                  <p className="text-xs text-muted-foreground">
                    Summarized {new Date(summary.summarizedAt).toLocaleString()}
                  </p>
                </div>
              ) : null}

              {!loading && !summaryLoading && !summary && !summaryError ? (
                <p className="text-sm text-muted-foreground">
                  Waiting for listing content to generate a summary...
                </p>
              ) : null}
            </TabsContent>

            <TabsContent value="listing" className="mt-0 px-6 py-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : null}

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              {detail?.offices.length ? (
                <p className="mb-4 text-sm text-muted-foreground">
                  Offices: {detail.offices.join(" · ")}
                </p>
              ) : null}

              {detail?.contentHtml ? (
                <JobListingContent
                  html={detail.contentHtml}
                  className="text-[15px] leading-7"
                />
              ) : null}

              {!loading && !error && detail && !detail.contentHtml ? (
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {detail.contentText || "No listing content was found."}
                </p>
              ) : null}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {job ? (
          <div className="flex shrink-0 items-center justify-between border-t px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {detail?.scrapedAt
                ? `Scraped ${new Date(detail.scrapedAt).toLocaleString()}`
                : "Loading listing..."}
            </p>
            <div className="flex gap-2">
              {summary && detail ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={summaryLoading}
                  onClick={() => {
                    setSummary(null);
                    setSummaryLoading(true);
                    setSummaryError(null);
                    fetch("/api/summarize", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        title: detail.title,
                        companyName,
                        location: detail.location,
                        department: detail.department,
                        listingText: detail.contentText,
                      }),
                    })
                      .then(async (response) => {
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error);
                        const nextSummary: JobSummary = {
                          roleType: data.roleType,
                          dayToDay: data.dayToDay,
                          orgPosition: data.orgPosition,
                          summarizedAt: data.summarizedAt,
                        };
                        setSummary(nextSummary);
                        setCachedJobSummary(job.id, nextSummary);
                      })
                      .catch((err) =>
                        setSummaryError(
                          err instanceof Error ? err.message : "Failed",
                        ),
                      )
                      .finally(() => setSummaryLoading(false));
                  }}
                >
                  {summaryLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Re-summarize
                </Button>
              ) : null}
              <Button variant="outline" size="sm" asChild>
                <a href={job.url} target="_blank" rel="noreferrer">
                  Open original
                  <ExternalLink className="ml-2 size-4" />
                </a>
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
