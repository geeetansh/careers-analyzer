"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Download,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  companiesToCsv,
  getCompanyDomain,
  getCompanyMeta,
  mergeCompanies,
  normalizeDomain,
  similarToolToCompany,
} from "@/lib/csv";
import type { Company, SimilarTool, SimilarToolsResult } from "@/lib/types/company";

interface SimilarToolsFinderProps {
  companies: Company[];
  onCompaniesChange: (companies: Company[]) => void;
}

export function SimilarToolsFinder({
  companies,
  onCompaniesChange,
}: SimilarToolsFinderProps) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimilarToolsResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const existingDomains = useMemo(
    () => companies.map(getCompanyDomain).filter(Boolean),
    [companies],
  );

  const crmDomains = useMemo(
    () =>
      [...new Set(existingDomains)]
        .slice(0, 12)
        .sort((a, b) => a.localeCompare(b)),
    [existingDomains],
  );

  const seedDomain = normalizeDomain(domain);

  const filteredTools = useMemo(() => {
    if (!result) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return result.tools;
    return result.tools.filter((tool) =>
      [tool.name, tool.domain, tool.platformSummary, tool.similarityReason]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [result, query]);

  async function findSimilar() {
    if (!seedDomain) {
      setError("Enter a domain like klaviyo.com");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/similar-tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: seedDomain,
          excludeDomains: existingDomains,
          count: 15,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Search failed");
      }

      setResult(data as SimilarToolsResult);
      setSelected(new Set(data.tools.map((tool: SimilarTool) => tool.domain)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function toggleTool(domain: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(domain);
      else next.delete(domain);
      return next;
    });
  }

  function saveSelected() {
    if (!result || !seedDomain) return;

    const toAdd = result.tools
      .filter((tool) => selected.has(tool.domain))
      .map((tool) => similarToolToCompany(tool, seedDomain));

    const merged = mergeCompanies(companies, toAdd);
    onCompaniesChange(merged);
    setResult({
      ...result,
      tools: result.tools.filter((tool) => !selected.has(tool.domain)),
    });
    setSelected(new Set());
  }

  function exportCrm() {
    const csv = companiesToCsv(companies);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "company-crm.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="reading-panel rounded-3xl border border-border/60 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wand2 className="size-5 text-violet-600" />
              <h2 className="text-xl font-semibold tracking-tight">
                Similar Tools Finder
              </h2>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Enter a domain to discover adjacent SaaS tools. Save results to
              your CRM, then search again from any new domain.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{companies.length} in CRM</Badge>
              <Badge variant="outline">
                {companies.filter((c) => getCompanyMeta(c).discovered_from).length}{" "}
                discovered
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={exportCrm}>
            <Download className="mr-2 size-4" />
            Export CRM
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="reading-panel space-y-4 rounded-3xl border border-border/60 p-5 shadow-sm">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="seed-domain">
              Domain
            </label>
            <Input
              id="seed-domain"
              value={domain}
              onChange={(event) => {
                setDomain(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void findSimilar();
                }
              }}
              placeholder="klaviyo.com"
              className="rounded-xl"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {crmDomains.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                From CRM
              </p>
              <div className="flex flex-wrap gap-2">
                {crmDomains.map((crmDomain) => (
                  <Button
                    key={crmDomain}
                    type="button"
                    variant={seedDomain === crmDomain ? "default" : "outline"}
                    size="sm"
                    className="h-7 rounded-full px-2.5 text-xs"
                    onClick={() => {
                      setDomain(crmDomain);
                      setResult(null);
                      setSelected(new Set());
                      setError(null);
                    }}
                  >
                    {crmDomain}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <Button
            className="w-full rounded-xl"
            onClick={() => void findSimilar()}
            disabled={loading || !seedDomain}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 size-4" />
            )}
            Find similar tools
          </Button>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </aside>

        <section className="reading-panel flex min-h-[560px] flex-col rounded-3xl border border-border/60 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-4">
            <div>
              <h3 className="font-semibold">Similar tools</h3>
              <p className="text-sm text-muted-foreground">
                {result
                  ? `${filteredTools.length} results for ${result.seedDomain}`
                  : "Enter a domain to search"}
              </p>
            </div>
            {result && filteredTools.length > 0 ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelected(new Set(filteredTools.map((tool) => tool.domain)))
                  }
                >
                  Select all
                </Button>
                <Button
                  size="sm"
                  disabled={selected.size === 0}
                  onClick={saveSelected}
                >
                  <Plus className="mr-2 size-4" />
                  Save {selected.size} to CRM
                </Button>
              </div>
            ) : null}
          </div>

          {result ? (
            <div className="border-b border-border/60 px-4 py-3">
              <div className="relative max-w-sm">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter results..."
                  className="rounded-xl pl-9"
                />
              </div>
            </div>
          ) : null}

          <ScrollArea className="min-h-0 flex-1">
            {!result ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center text-sm text-muted-foreground">
                <Wand2 className="size-10 opacity-30" />
                <p>
                  Type a domain and hit Find to expand your list toward 1000s of
                  targets.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Company</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Why similar</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTools.map((tool) => (
                    <TableRow key={tool.domain}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(tool.domain)}
                          onCheckedChange={(checked) =>
                            toggleTool(tool.domain, checked === true)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{tool.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tool.domain}
                          </p>
                          <div className="flex flex-wrap gap-1 pt-1">
                            {tool.overlapAreas.slice(0, 3).map((area) => (
                              <Badge
                                key={area}
                                variant="secondary"
                                className="rounded-full text-[10px]"
                              >
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{tool.tier}</TableCell>
                      <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                        {tool.platformSummary}
                      </TableCell>
                      <TableCell className="max-w-[200px] text-sm text-muted-foreground">
                        {tool.similarityReason}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const company = similarToolToCompany(tool, seedDomain);
                            onCompaniesChange(mergeCompanies(companies, [company]));
                            setResult({
                              ...result,
                              tools: result.tools.filter(
                                (item) => item.domain !== tool.domain,
                              ),
                            });
                          }}
                        >
                          <Plus className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {result && filteredTools.length > 0 ? (
            <div className="border-t border-border/60 p-4 text-xs text-muted-foreground">
              Tip: Save tools to CRM, then search from the top result to keep
              expanding.
              <Button
                variant="link"
                className="ml-2 h-auto p-0 text-xs"
                onClick={() => {
                  const first = filteredTools[0];
                  if (!first) return;
                  const company = similarToolToCompany(first, seedDomain);
                  onCompaniesChange(mergeCompanies(companies, [company]));
                  setDomain(first.domain);
                  setResult({
                    ...result,
                    tools: result.tools.filter(
                      (item) => item.domain !== first.domain,
                    ),
                  });
                }}
              >
                Search from top result
                <ArrowRight className="ml-1 size-3" />
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
