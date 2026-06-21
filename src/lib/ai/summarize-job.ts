import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { SUMMARIZE_MODEL } from "@/lib/ai/models";
import { JOB_SUMMARY_SYSTEM_PROMPT } from "@/lib/ai/prompts";

export const jobSummarySchema = z.object({
  roleType: z
    .string()
    .describe(
      "What kind of role this is — function, seniority, domain, and who it is for.",
    ),
  dayToDay: z
    .string()
    .describe(
      "Concrete day-to-day responsibilities, workflows, and deliverables.",
    ),
  orgPosition: z
    .string()
    .describe(
      "Where this role sits in the org — team, stakeholders, scope, and career ladder context.",
    ),
});

export type JobSummary = z.infer<typeof jobSummarySchema>;

export async function summarizeJobListing(input: {
  title: string;
  companyName?: string;
  location?: string;
  department?: string;
  listingText: string;
}) {
  const { object } = await generateObject({
    model: anthropic(SUMMARIZE_MODEL),
    schema: jobSummarySchema,
    system: JOB_SUMMARY_SYSTEM_PROMPT,
    prompt: [
      `Job title: ${input.title}`,
      input.companyName ? `Company: ${input.companyName}` : null,
      input.location ? `Location: ${input.location}` : null,
      input.department ? `Department: ${input.department}` : null,
      "",
      "Job listing:",
      input.listingText.slice(0, 12000),
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
