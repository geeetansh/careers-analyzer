import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SIMILAR_TOOLS_MODEL } from "@/lib/ai/models";
import { SIMILAR_TOOLS_SYSTEM_PROMPT } from "@/lib/ai/similar-tools-prompt";
import { normalizeDomain } from "@/lib/csv";

export const similarToolSchema = z.object({
  name: z.string(),
  domain: z.string().describe("Root domain only, e.g. klaviyo.com"),
  careersUrl: z.string().describe("Full URL to careers/jobs page"),
  tier: z.string(),
  estimatedRevenue: z.string(),
  revenuePeriod: z.string(),
  source: z.string(),
  confidence: z.string(),
  platformSummary: z.string(),
  similarityReason: z.string(),
  overlapAreas: z.array(z.string()).min(1).max(6),
});

export const similarToolsResponseSchema = z.object({
  tools: z.array(similarToolSchema).min(1).max(20),
});

export async function findSimilarTools(input: {
  domain: string;
  excludeDomains: string[];
  count?: number;
}) {
  const seedDomain = normalizeDomain(input.domain);
  if (!seedDomain) {
    throw new Error("A valid domain is required (e.g. klaviyo.com)");
  }

  const excludeList = [
    seedDomain,
    ...input.excludeDomains.map((d) => normalizeDomain(d)),
  ]
    .filter(Boolean)
    .slice(0, 500);

  const { object } = await generateObject({
    model: anthropic(SIMILAR_TOOLS_MODEL),
    schema: similarToolsResponseSchema,
    system: SIMILAR_TOOLS_SYSTEM_PROMPT,
    prompt: [
      "## Seed domain",
      seedDomain,
      "",
      "Identify what company owns this domain, then find similar SaaS platforms.",
      "",
      "## Domains already in CRM (DO NOT RETURN)",
      excludeList.join(", ") || "(none)",
      "",
      `Return ${input.count ?? 15} similar tools not in the exclusion list.`,
    ].join("\n"),
  });

  const excludeSet = new Set(excludeList);

  return object.tools
    .filter((tool) => {
      const domain = normalizeDomain(tool.domain);
      return domain && !excludeSet.has(domain);
    })
    .slice(0, input.count ?? 15);
}
