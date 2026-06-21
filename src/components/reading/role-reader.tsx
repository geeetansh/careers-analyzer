"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  List,
  Loader2,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedRole } from "@/lib/jobs/feed";
import type { JobSummary } from "@/lib/types/company";
import {
  getJobDetail,
  getJobSummary,
  saveJobDetail,
  saveJobSummary,
  setRoleStatus,
  type StoredJobDetail,
} from "@/lib/storage/db";
import { cn } from "@/lib/utils";
import { JobListingContent } from "@/components/reading/job-listing-content";
import { ReadableText } from "@/components/reading/readable-text";
import { looksEntityEncoded } from "@/lib/html/decode-listing-html";

interface RoleReaderProps {
  role: FeedRole | null;
  queuePosition: { current: number; total: number } | null;
  onStatusChange: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  onToggleQueue?: () => void;
  focusMode?: boolean;
  onSaved?: () => void;
}

function SummarySection({
  title,
  body,
  asList = false,
}: {
  title: string;
  body: string;
  asList?: boolean;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h2>
      <ReadableText text={body} as={asList ? "list" : "paragraphs"} />
    </section>
  );
}

export function RoleReader({
  role,
  queuePosition,
  onStatusChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  onToggleQueue,
  focusMode,
  onSaved,
}: RoleReaderProps) {
  const readerTopRef = useRef<HTMLElement>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [detail, setDetail] = useState<StoredJobDetail | null>(null);
  const [summary, setSummary] = useState<JobSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!role?.feedId) return;
    readerTopRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [role?.feedId]);

  if (!role) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-2xl font-medium text-foreground">
          Pick a role from the queue
        </p>
      </div>
    );
  }

  return (
    <article ref={readerTopRef} className="bg-[#faf9f7] dark:bg-background scroll-mt-4">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 py-2.5 dark:bg-card">
        <div className="flex min-w-0 items-center gap-2">
          {focusMode && onToggleQueue ? (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={onToggleQueue}
            >
              <List className="mr-1.5 size-4" />
              Queue
            </Button>
          ) : null}
          {queuePosition ? (
            <span className="truncate text-sm font-semibold text-foreground">
              {queuePosition.current} / {queuePosition.total}
            </span>
          ) : null}
        </div>
        <Button variant="ghost" size="sm" className="shrink-0" asChild>
          <a href={role.job.url} target="_blank" rel="noreferrer">
            Original post
            <ExternalLink className="ml-1.5 size-3.5" />
          </a>
        </Button>
      </div>

      <header className="border-b border-border bg-white px-6 py-5 dark:bg-card">
        <p className="text-lg font-bold text-foreground">{role.companyName}</p>
        <h1 className="mt-1 text-2xl font-bold leading-snug text-foreground md:text-3xl">
          {role.job.title}
        </h1>
        <p className="mt-2 text-base font-medium text-foreground/80">
          {role.job.location}
          {role.job.department !== "—" ? ` · ${role.job.department}` : ""}
        </p>
      </header>

      <div className="space-y-12 px-6 py-8 pb-28">
        <div className="mx-auto w-full max-w-3xl space-y-12">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : null}

          {error ? (
            <p className="text-xl font-medium text-destructive">{error}</p>
          ) : null}

          {!loading && summaryLoading && !summary ? (
            <div className="flex items-center gap-3 text-xl text-foreground">
              <Loader2 className="size-6 animate-spin text-primary" />
              Preparing summary…
            </div>
          ) : null}

          {!loading && summary?.roleType ? (
            <SummarySection
              title="What is this role?"
              body={summary.roleType}
            />
          ) : null}

          {!loading && summary?.dayToDay ? (
            <SummarySection
              title="What will you do each day?"
              body={summary.dayToDay}
              asList
            />
          ) : null}

          {!loading && summary?.orgPosition ? (
            <SummarySection
              title="Where does this role sit?"
              body={summary.orgPosition}
            />
          ) : null}

          {!loading && detail ? (
            <section className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Full job post
              </h2>
              <JobListingContent html={detail.contentHtml} />
            </section>
          ) : null}

          {!loading && !detail && !summaryLoading ? (
            <p className="text-xl text-foreground">Loading job post…</p>
          ) : null}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/80 bg-white/95 px-3 py-2.5 shadow-xl backdrop-blur-md dark:bg-card/95">
          <Button
            size="lg"
            variant={role.status === "liked" ? "default" : "outline"}
            className="min-w-[5.5rem] rounded-xl shadow-sm"
            onClick={async () => {
              const wasLiked = role.status === "liked";
              await setRoleStatus(
                role.feedId,
                wasLiked ? "read" : "liked",
              );
              onStatusChange();
              if (!wasLiked) onSaved?.();
            }}
          >
            <Heart
              className={cn(
                "mr-2 size-5",
                role.status === "liked" && "fill-current",
              )}
            />
            Save
          </Button>
          <Button
            size="lg"
            variant={role.status === "disliked" ? "default" : "outline"}
            className="min-w-[5.5rem] rounded-xl shadow-sm"
            onClick={async () => {
              await setRoleStatus(
                role.feedId,
                role.status === "disliked" ? "read" : "disliked",
              );
              onStatusChange();
            }}
          >
            <ThumbsDown className="mr-2 size-5" />
            Skip
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="min-w-[5.5rem] rounded-xl shadow-sm"
            onClick={async () => {
              await setRoleStatus(
                role.feedId,
                role.status === "unread" ? "read" : "unread",
              );
              onStatusChange();
            }}
          >
            {role.status === "unread" ? "Done" : "Undo"}
          </Button>
        </div>
      </div>

      <footer className="border-t border-border bg-white px-4 py-6 dark:bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button
            variant="outline"
            size="lg"
            disabled={!hasPrevious}
            onClick={onPrevious}
          >
            <ChevronLeft className="mr-1 size-5" />
            Previous role
          </Button>
          <Button size="lg" disabled={!hasNext} onClick={onNext}>
            Next role
            <ChevronRight className="ml-1 size-5" />
          </Button>
        </div>
      </footer>
    </article>
  );
}
