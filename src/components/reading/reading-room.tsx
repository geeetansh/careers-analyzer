"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Pause,
  Play,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoleReader } from "@/components/reading/role-reader";
import type { Company } from "@/lib/types/company";
import {
  buildFeed,
  filterFeed,
  getFeedStats,
  type FeedRole,
} from "@/lib/jobs/feed";
import type { JobCategory } from "@/lib/jobs/categories";
import { runBulkSync, stopBulkSync } from "@/lib/jobs/bulk-sync";
import {
  getSyncState,
  markRoleRead,
  migrateLocalStorageToIndexedDB,
  type BulkSyncState,
} from "@/lib/storage/db";
import { bootstrapFromPublicCache } from "@/lib/storage/bootstrap-cache";
import { cn } from "@/lib/utils";

interface ReadingRoomProps {
  companies: Company[];
}

export function ReadingRoom({ companies }: ReadingRoomProps) {
  const [roles, setRoles] = useState<FeedRole[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<JobCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [syncState, setSyncState] = useState<BulkSyncState | null>(null);
  const [ready, setReady] = useState(false);

  const refreshFeed = useCallback(async () => {
    const feed = await buildFeed(companies);
    setRoles(feed);
    return feed;
  }, [companies]);

  useEffect(() => {
    async function init() {
      await migrateLocalStorageToIndexedDB();
      await bootstrapFromPublicCache();
      const [feed, state] = await Promise.all([
        refreshFeed(),
        getSyncState(),
      ]);
      setSyncState(state);
      setSelectedId((current) => current ?? feed.find((role) => !role.read)?.feedId ?? feed[0]?.feedId ?? null);
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
        unreadOnly,
      }),
    [roles, category, query, unreadOnly],
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

      if (markCurrentRead && selectedRole && !selectedRole.read) {
        await markRoleRead(selectedRole.feedId);
        await refreshFeed();
      }

      setSelectedId(target.feedId);
    },
    [filtered, refreshFeed, selectedRole],
  );

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
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading your reading queue...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[680px] flex-col gap-4">
      <div className="reading-panel rounded-3xl border border-border/60 p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">Role Reader</h2>
            <p className="text-sm font-medium text-foreground/70">
              {stats.total} CS & Product roles across {stats.companiesWithRoles}{" "}
              brands · {stats.unread} unread
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-full bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-300">
              {stats.cs} CS
            </Badge>
            <Badge className="rounded-full bg-violet-500/10 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300">
              {stats.product} Product
            </Badge>
            <Badge variant="outline" className="rounded-full">
              {stats.read} read
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            {syncState?.status === "running" ? (
              <Button variant="outline" size="sm" onClick={stopBulkSync}>
                <Pause className="mr-2 size-4" />
                Pause sync
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
                <Play className="mr-2 size-4" />
                Cache all brands
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => void refreshFeed()}>
              Refresh feed
            </Button>
          </div>
        </div>

        {syncState && syncState.status !== "idle" ? (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{syncState.currentLabel}</span>
              <span>{Math.round(syncProgress)}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="reading-panel flex min-h-0 flex-col rounded-3xl border border-border/60 shadow-sm">
          <div className="space-y-3 border-b border-border/60 p-4">
            <div className="flex flex-wrap gap-2">
              {(["all", "cs", "product"] as const).map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={category === value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setCategory(value)}
                >
                  {value === "all" ? "All" : value === "cs" ? "CS" : "Product"}
                </Button>
              ))}
              <Button
                size="sm"
                variant={unreadOnly ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setUnreadOnly((value) => !value)}
              >
                Unread only
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search roles or companies..."
                className="rounded-xl pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filtered.length} roles in queue
            </p>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-1 p-2">
              {filtered.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm leading-6 text-muted-foreground">
                  No CS or Product roles cached yet.
                  <br />
                  Hit &quot;Cache all brands&quot; to scan all {companies.length}{" "}
                  companies and build your reading queue.
                </p>
              ) : (
                filtered.map((role) => (
                  <button
                    key={role.feedId}
                    type="button"
                    onClick={() => setSelectedId(role.feedId)}
                    className={cn(
                      "w-full rounded-2xl px-3 py-3 text-left transition-all",
                      selectedId === role.feedId
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted/80",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {role.read ? (
                        <CheckCircle2
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            selectedId === role.feedId
                              ? "text-primary-foreground/80"
                              : "text-emerald-600",
                          )}
                        />
                      ) : (
                        <Circle
                          className={cn(
                            "mt-0.5 size-4 shrink-0",
                            selectedId === role.feedId
                              ? "text-primary-foreground/60"
                              : "text-muted-foreground",
                          )}
                        />
                      )}
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-semibold">
                          {role.job.title}
                        </p>
                        <p
                          className={cn(
                            "truncate text-xs font-medium",
                            selectedId === role.feedId
                              ? "text-primary-foreground/85"
                              : "text-foreground/65",
                          )}
                        >
                          {role.companyName} · {role.job.location}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </aside>

        <section className="reading-panel min-h-0 overflow-hidden rounded-3xl border border-border/60 shadow-sm">
          <RoleReader
            role={selectedRole}
            onReadChange={() => void refreshFeed()}
            hasPrevious={selectedIndex > 0}
            hasNext={selectedIndex >= 0 && selectedIndex < filtered.length - 1}
            onPrevious={() => void goTo(selectedIndex - 1)}
            onNext={() => void goTo(selectedIndex + 1, true)}
          />
        </section>
      </div>
    </div>
  );
}
