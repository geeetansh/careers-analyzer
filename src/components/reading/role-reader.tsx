"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedRole } from "@/lib/jobs/feed";
import type { JobSummary } from "@/lib/types/company";
import {
  getJobDetail,
  getJobSummary,
  markRoleRead,
  markRoleUnread,
  saveJobDetail,
  saveJobSummary,
  type StoredJobDetail,
} from "@/lib/storage/db";
import { cn } from "@/lib/utils";
import { JobListingContent } from "@/components/reading/job-listing-content";
import { looksEntityEncoded } from "@/lib/html/decode-listing-html";

interface RoleReaderProps {
  role: FeedRole | null;
  onReadChange: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

function SummaryCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
        <h3 className="text-sm font-bold tracking-tight text-foreground">{title}</h3>
      </div>
      <p className="text-[15px] leading-7 text-foreground/90 whitespace-pre-wrap">
        {body}
      </p>
    </div>
  );
}

export function RoleReader({
  role,
  onReadChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: RoleReaderProps) {
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [detail, setDetail] = useState<StoredJobDetail | null>(null);
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showListing, setShowListing] = useState(true);

  useEffect(() => {
    if (!role) {
      setDetail(null);
      setSummary(null);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadSummary(listingText: string) {
      setSummaryLoading(true);
      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: role!.job.title,
            companyName: role!.companyName,
            location: role!.job.location,
            department: role!.job.department,
            listingText,
          }),
        });

        if (response.status === 503 || !response.ok) return;

        const data = await response.json();
        const nextSummary: JobSummary = {
          roleType: data.roleType,
          dayToDay: data.dayToDay,
          orgPosition: data.orgPosition,
          summarizedAt: data.summarizedAt,
        };

        await saveJobSummary(role!.feedId, nextSummary);
        if (!cancelled) setSummary(nextSummary);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    }

    async function load() {
      setLoading(true);
      setSummaryLoading(false);
      setError(null);
      setShowListing(true);
      setSummary(null);

      try {
        const [cachedDetail, cachedSummary] = await Promise.all([
          getJobDetail(role!.feedId),
          getJobSummary(role!.feedId),
        ]);

        if (cancelled) return;

        let listingText = cachedDetail?.contentText ?? "";

        if (cachedDetail && looksEntityEncoded(cachedDetail.contentHtml)) {
          const response = await fetch("/api/job-detail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: role!.job.provider,
              boardSlug: role!.boardSlug,
              jobId: role!.job.id,
              url: role!.job.url,
            }),
          });

          const data = await response.json();
          if (response.ok) {
            const stored: StoredJobDetail = {
              ...role!.job,
              companyName: role!.companyName,
              boardSlug: role!.boardSlug,
              feedId: role!.feedId,
              contentHtml: data.contentHtml,
              contentText: data.contentText,
              offices: data.offices ?? [],
              scrapedAt: data.scrapedAt,
            };

            await saveJobDetail(stored);
            listingText = stored.contentText;
            if (!cancelled) setDetail(stored);
          } else if (!cancelled) {
            setDetail(cachedDetail);
          }
        } else if (cachedDetail) {
          setDetail(cachedDetail);
        } else {
          const response = await fetch("/api/job-detail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: role!.job.provider,
              boardSlug: role!.boardSlug,
              jobId: role!.job.id,
              url: role!.job.url,
            }),
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Failed to load");

          const stored: StoredJobDetail = {
            ...role!.job,
            companyName: role!.companyName,
            boardSlug: role!.boardSlug,
            feedId: role!.feedId,
            contentHtml: data.contentHtml,
            contentText: data.contentText,
            offices: data.offices ?? [],
            scrapedAt: data.scrapedAt,
          };

          await saveJobDetail(stored);
          listingText = stored.contentText;
          if (!cancelled) setDetail(stored);
        }

        if (cachedSummary) {
          setSummary(cachedSummary);
        } else if (listingText.trim()) {
          void loadSummary(listingText);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load role");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [role]);

  if (!role) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <BookOpen className="size-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Pick a role to start reading</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Select a Customer Success or Product listing from the queue. Use ↑ ↓
            or j / k to move between roles quickly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border/60 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "rounded-full px-3",
                  role.category === "cs"
                    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                )}
              >
                {role.categoryLabel}
              </Badge>
              {role.read ? (
                <Badge variant="outline" className="rounded-full">
                  <Check className="mr-1 size-3" />
                  Read
                </Badge>
              ) : (
                <Badge variant="outline" className="rounded-full">
                  <Circle className="mr-1 size-3" />
                  Unread
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {role.companyName}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-balance text-foreground">
                {role.job.title}
              </h1>
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium text-foreground/75">
              <span>{role.job.location}</span>
              <span>·</span>
              <span>{role.job.department}</span>
              {role.job.employmentType !== "—" ? (
                <>
                  <span>·</span>
                  <span>{role.job.employmentType}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (role.read) {
                  await markRoleUnread(role.feedId);
                } else {
                  await markRoleRead(role.feedId);
                }
                onReadChange();
              }}
            >
              {role.read ? "Mark unread" : "Mark read"}
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={role.job.url} target="_blank" rel="noreferrer">
                Original
                <ExternalLink className="ml-2 size-3.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-5 px-6 py-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {detail ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Full listing
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 font-semibold"
                  onClick={() => setShowListing((value) => !value)}
                >
                  {showListing ? "Hide listing" : "Show listing"}
                </Button>
              </div>

              {showListing ? (
                <JobListingContent
                  html={detail.contentHtml}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                />
              ) : null}
            </div>
          ) : null}

          {summary ? (
            <div className="space-y-4">
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                AI summary
              </h2>
              <div className="grid gap-4">
                <SummaryCard title="What kind of role is this?" body={summary.roleType} />
                <SummaryCard title="Day-to-day responsibilities" body={summary.dayToDay} />
                <SummaryCard title="Where this role sits" body={summary.orgPosition} />
              </div>
            </div>
          ) : summaryLoading ? (
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-medium text-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Generating AI summary...
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between border-t border-border/60 px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrevious}
          onClick={onPrevious}
        >
          <ChevronLeft className="mr-1 size-4" />
          Previous
        </Button>
        <p className="text-xs text-muted-foreground">
          <kbd className="rounded border px-1.5 py-0.5">↑</kbd>{" "}
          <kbd className="rounded border px-1.5 py-0.5">↓</kbd> to navigate
        </p>
        <Button size="sm" disabled={!hasNext} onClick={onNext}>
          Next
          <ChevronRight className="ml-1 size-4" />
        </Button>
      </div>
    </div>
  );
}
