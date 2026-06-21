"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyTable } from "@/components/crm/company-table";
import { CareersAnalyzer } from "@/components/careers/careers-analyzer";
import { ReadingRoom } from "@/components/reading/reading-room";
import { SimilarToolsFinder } from "@/components/similar/similar-tools-finder";
import { loadCrmCompanies, saveCrmCompanies } from "@/lib/storage/crm-store";
import type { Company } from "@/lib/types/company";
import {
  getSelectedCompanyName,
  setSelectedCompanyName,
} from "@/lib/storage/analysis-cache";

interface DashboardProps {
  initialCsv: string;
}

export function Dashboard({ initialCsv }: DashboardProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selected, setSelected] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState("reader");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loaded = loadCrmCompanies(initialCsv);
    setCompanies(loaded);

    const savedName = getSelectedCompanyName();
    const savedCompany = savedName
      ? loaded.find((company) => company.name === savedName)
      : null;

    setSelected(savedCompany ?? loaded[0] ?? null);
    setReady(true);
  }, [initialCsv]);

  function updateCompanies(next: Company[]) {
    setCompanies(next);
    saveCrmCompanies(next);
  }

  function handleSelect(company: Company) {
    setSelected(company);
    setSelectedCompanyName(company.name);
    setActiveTab("analyzer");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading CRM...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-muted/50 via-background to-background">
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-sky-600 text-white shadow-lg shadow-violet-600/20">
              <Sparkles className="size-6" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
                Ecom SaaS Intelligence
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Role Reader
              </h1>
              <p className="text-sm text-muted-foreground">
                {companies.length} companies · careers research + similar tool
                discovery
              </p>
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="h-auto flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">
            <TabsTrigger value="reader" className="gap-2 rounded-xl px-4 py-2">
              <BookOpen className="size-4" />
              Reading Room
            </TabsTrigger>
            <TabsTrigger value="similar" className="gap-2 rounded-xl px-4 py-2">
              <Wand2 className="size-4" />
              Similar Tools
            </TabsTrigger>
            <TabsTrigger value="crm" className="gap-2 rounded-xl px-4 py-2">
              <Building2 className="size-4" />
              Company CRM
            </TabsTrigger>
            <TabsTrigger
              value="analyzer"
              className="gap-2 rounded-xl px-4 py-2"
              disabled={!selected}
            >
              <BriefcaseBusiness className="size-4" />
              Single Brand
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reader" className="mt-0">
            <ReadingRoom companies={companies} />
          </TabsContent>

          <TabsContent value="similar" className="mt-0">
            <SimilarToolsFinder
              companies={companies}
              onCompaniesChange={updateCompanies}
            />
          </TabsContent>

          <TabsContent value="crm">
            <CompanyTable
              companies={companies}
              selectedName={selected?.name}
              onSelect={handleSelect}
              onImport={updateCompanies}
            />
          </TabsContent>

          <TabsContent value="analyzer">
            {selected ? (
              <CareersAnalyzer key={selected.name} company={selected} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a company from the CRM tab to analyze its careers page.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
