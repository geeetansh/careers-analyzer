"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Focus,
  Heart,
  List,
  Pause,
  Play,
  Search,
  ThumbsDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleReader } from "@/components/reading/role-reader";
import { ExportSavedJobs } from "@/components/reading/export-saved-jobs";
import type { Company } from "@/lib/types/company";
import {
  buildFeed,
  filterFeed,
  getFeedStats,
  type FeedRole,
  type RoleStatus,
} from "@/lib/jobs/feed";
import { ROLE_STATUSES } from "@/lib/jobs/role-status";
import type { JobCategory } from "@/lib/jobs/categories";
import { runBulkSync, stopBulkSync } from "@/lib/jobs/bulk-sync";
import {
  getSyncState,
  markRoleRead,
  migrateLocalStorageToIndexedDB,
  migrateRoleStatuses,
  type BulkSyncState,
} from "@/lib/storage/db";
import { bootstrapFromPublicCache } from "@/lib/storage/bootstrap-cache";
import { cn } from "@/lib/utils";

interface ReadingRoomProps {
  companies: Company[];
}

const FRIENDLY_STATUS: Record<RoleStatus, string> = {
  unread: "To read",
  read: "Done",
  liked: "Saved",
  disliked: "Skip",
};

function StatusIcon({
  status,
  selected,
}: {
  status: RoleStatus;
  selected: boolean;
}) {
  const className = cn(
    "mt-1 size-5 shrink-0",
    selected ? "text-primary-foreground/90" : undefined,
  );

  switch (status) {
    case "read":
      return (
        <CheckCircle2
          className={cn(className, !selected && "text-emerald-600")}
        />
      );
    case "liked":
      return (
        <Heart
          className={cn(className, !selected && "fill-rose-500 text-rose-500")}
        />
      );
    case "disliked":
      return (
        <ThumbsDown
          className={cn(className, !selected && "text-amber-600")}
        />
      );
    default:
      return (
        <Circle
          className={cn(
            className,
            selected ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        />
      );
  }
}

export function ReadingRoom({ companies }: ReadingRoomProps) {
  const [roles, setRoles] = useState<FeedRole[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<JobCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [statusPanel, setStatusPanel] = useState<RoleStatus>("unread");
  const [syncState, setSyncState] = useState<BulkSyncState | null>(null);
  const [ready, setReady] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [showSync, setShowSync] = useState(false);

  const refreshFeed = useCallback(async () => {
    const feed = await buildFeed(companies);
    setRoles(feed);
    return feed;
  }, [companies]);

  useEffect(() => {
    async function init() {
      await migrateLocalStorageToIndexedDB();
      await migrateRoleStatuses();
      await bootstrapFromPublicCache();
      const [feed, state] = await Promise.all([
        refreshFeed(),
        getSyncState(),
      ]);
      setSyncState(state);
      setSelectedId(
        (current) =>
          current ??
          feed.find((role) => role.status === "unread")?.feedId ??
          feed[0]?.feedId ??
          null,
      );
      setReady(true);
    }

    void init();
  }, [refreshFeed]);

  useEffect(() => {
    function handleCacheUpdate() {
      void refreshFeed();
    }

    window.addEventListener("careers-analyzer-cache-updated", handleCacheUpdate);
    return () =>
      window.removeEventListener("careers-analyzer-cache-updated", handleCacheUpdate);
  }, [refreshFeed]);

  const filtered = useMemo(
    () =>
      filterFeed(roles, {
        category,
        query,
        status: statusPanel,
      }),
    [roles, category, query, statusPanel],
  );

  const stats = useMemo(() => getFeedStats(roles), [roles]);
  const selectedRole =
    filtered.find((role) => role.feedId === selectedId) ??
    roles.find((role) => role.feedId === selectedId) ??
    null;

  const selectedIndex = selectedRole
    ? filtered.findIndex((role) => role.feedId === selectedRole.feedId)
    : -1;

  const goTo = useCallback(
    async (index: number, markCurrentRead = false) => {
      const target = filtered[index];
      if (!target) return;

      if (markCurrentRead && selectedRole && selectedRole.status === "unread") {
        await markRoleRead(selectedRole.feedId);
        await refreshFeed();
      }

      setSelectedId(target.feedId);
    },
    [filtered, refreshFeed, selectedRole],
  );

  const advanceAfterSave = useCallback(() => {
    if (!selectedId) return;

    const index = filtered.findIndex((role) => role.feedId === selectedId);
    if (index < 0) return;

    const nextInQueue = filtered[index + 1];
    if (nextInQueue) {
      setSelectedId(nextInQueue.feedId);
      return;
    }

    if (statusPanel === "unread") {
      setSelectedId(null);
    }
  }, [filtered, selectedId, statusPanel]);

  useEffect(() => {
    if (
      selectedId &&
      !filtered.some((role) => role.feedId === selectedId) &&
      filtered[0]
    ) {
      setSelectedId(filtered[0].feedId);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        if (selectedIndex < filtered.length - 1) {
          void goTo(selectedIndex + 1, true);
        }
      }

      if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        if (selectedIndex > 0) {
          void goTo(selectedIndex - 1, true);
        }
      }

      if (event.key === "f" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setFocusMode((value) => !value);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered.length, goTo, selectedIndex]);

  const syncProgress =
    !syncState || syncState.phase === "done"
      ? syncState?.status === "complete"
        ? 100
        : 0
      : syncState.phase === "companies"
        ? syncState.totalCompanies
          ? (syncState.completedCompanies / syncState.totalCompanies) * 100
          : 0
        : syncState.phase === "details"
          ? syncState.totalRoles
            ? (syncState.completedRoles / syncState.totalRoles) * 100
            : 0
          : syncState.totalSummaries
            ? (syncState.completedSummaries / syncState.totalSummaries) * 100
            : 0;

  if (!ready) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="size-8 animate-pulse rounded-full bg-primary/20" />
        <p className="text-lg text-muted-foreground">Getting your queue ready…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-white px-3 py-2 dark:bg-card">
        <div className="flex items-center gap-3">
          <Button
            variant={focusMode ? "default" : "outline"}
            size="sm"
            onClick={() => setFocusMode((value) => !value)}
          >
            {focusMode ? (
              <>
                <List className="mr-1.5 size-4" />
                Queue
              </>
            ) : (
              <>
                <Focus className="mr-1.5 size-4" />
                Focus
              </>
            )}
          </Button>
          {!focusMode && selectedIndex >= 0 ? (
            <span className="text-sm font-semibold text-foreground">
              {selectedIndex + 1} of {filtered.length}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportSavedJobs companies={companies} savedCount={stats.liked} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSync((value) => !value)}
          >
            {showSync ? "Hide" : "Load jobs"}
          </Button>
        </div>
      </div>

      {showSync ? (
        <div className="shrink-0 space-y-2 rounded-xl border border-border/60 bg-muted/30 p-3">
          <div className="flex flex-wrap gap-2">
            {syncState?.status === "running" ? (
              <Button variant="outline" size="sm" onClick={stopBulkSync}>
                <Pause className="mr-1.5 size-4" />
                Pause
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  void runBulkSync(companies, setSyncState, {
                    includeSummaries: true,
                  }).then(() => refreshFeed());
                }}
              >
                <Play className="mr-1.5 size-4" />
                Scan companies
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => void refreshFeed()}>
              Refresh
            </Button>
          </div>
          {syncState && syncState.status !== "idle" ? (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-foreground/70">
                <span>{syncState.currentLabel}</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} className="h-1.5" />
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "grid gap-2",
          focusMode ? "grid-cols-1" : "xl:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        {!focusMode ? (
          <aside className="reading-panel flex flex-col rounded-3xl border border-border/60 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)]">
            <div className="space-y-4 border-b border-border/60 p-4">
              <div
                className="grid grid-cols-2 gap-2"
                role="tablist"
                aria-label="Filter by status"
              >
                {ROLE_STATUSES.map((status) => (
                  <Button
                    key={status}
                    size="lg"
                    variant={statusPanel === status ? "default" : "outline"}
                    className="h-auto min-h-12 flex-col gap-0.5 rounded-2xl py-2"
                    onClick={() => setStatusPanel(status)}
                    role="tab"
                    aria-selected={statusPanel === status}
                  >
                    <span className="text-base font-semibold">
                      {FRIENDLY_STATUS[status]}
                    </span>
                    <span className="text-sm opacity-80">{stats[status]}</span>
                  </Button>
                ))}
              </div>

              <div className="flex gap-2" role="group" aria-label="Job category">
                {(["all", "cs", "product"] as const).map((value) => (
                  <Button
                    key={value}
                    size="lg"
                    variant={category === value ? "default" : "outline"}
                    className="flex-1 rounded-2xl"
                    onClick={() => setCategory(value)}
                  >
                    {value === "all" ? "All" : value === "cs" ? "CS" : "Product"}
                  </Button>
                ))}
              </div>

              <div className="relative">
                <Search
                  className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search…"
                  className="h-12 rounded-2xl pl-10 text-base"
                  aria-label="Search roles or companies"
                />
              </div>

              {filtered.length > 0 && selectedIndex >= 0 ? (
                <p className="text-center text-base font-medium text-muted-foreground">
                  Role {selectedIndex + 1} of {filtered.length}
                </p>
              ) : (
                <p className="text-center text-base text-muted-foreground">
                  {filtered.length} {FRIENDLY_STATUS[statusPanel].toLowerCase()}
                </p>
              )}
            </div>

            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-2 p-3">
                {filtered.length === 0 ? (
                  <div className="space-y-3 px-2 py-8 text-center">
                    <p className="text-lg font-medium text-foreground">
                      Nothing here yet
                    </p>
                    <p className="text-base leading-relaxed text-muted-foreground">
                      {statusPanel === "unread" ? (
                        <>
                          Tap <strong>Load jobs</strong> above to build your
                          reading queue.
                        </>
                      ) : (
                        <>No roles in this list right now.</>
                      )}
                    </p>
                  </div>
                ) : (
                  filtered.map((role, index) => (
                    <button
                      key={role.feedId}
                      type="button"
                      onClick={() => setSelectedId(role.feedId)}
                      className={cn(
                        "w-full rounded-2xl px-4 py-4 text-left transition-all",
                        selectedId === role.feedId
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "bg-muted/40 hover:bg-muted/70",
                      )}
                      aria-current={selectedId === role.feedId ? "true" : undefined}
                    >
                      <div className="flex items-start gap-3">
                        <StatusIcon
                          status={role.status}
                          selected={selectedId === role.feedId}
                        />
                        <div className="min-w-0 space-y-1.5">
                          <p className="truncate text-base font-bold">
                            {role.companyName}
                          </p>
                          <p
                            className={cn(
                              "line-clamp-2 text-sm leading-snug",
                              selectedId === role.feedId
                                ? "text-primary-foreground/90"
                                : "text-foreground/70",
                            )}
                          >
                            {role.job.title}
                          </p>
                          {selectedId === role.feedId ? (
                            <p className="text-xs font-medium opacity-80">
                              #{index + 1} in queue
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </aside>
        ) : null}

        <section className="rounded-xl border border-border/60">
          <RoleReader
            role={selectedRole}
            queuePosition={
              selectedIndex >= 0
                ? { current: selectedIndex + 1, total: filtered.length }
                : null
            }
            onStatusChange={() => void refreshFeed()}
            hasPrevious={selectedIndex > 0}
            hasNext={selectedIndex >= 0 && selectedIndex < filtered.length - 1}
            onPrevious={() => void goTo(selectedIndex - 1)}
            onNext={() => void goTo(selectedIndex + 1, true)}
            onToggleQueue={() => setFocusMode(false)}
            focusMode={focusMode}
            onSaved={advanceAfterSave}
          />
        </section>
      </div>
    </div>
  );
}
