import { NextResponse } from "next/server";
import { findSimilarTools } from "@/lib/ai/find-similar-tools";
import { normalizeDomain } from "@/lib/csv";

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error:
            "ANTHROPIC_API_KEY is not configured. Add it to .env to use Similar Tools Finder.",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      domain?: string;
      excludeDomains?: string[];
      count?: number;
    };

    const domain = normalizeDomain(body.domain ?? "");
    if (!domain) {
      return NextResponse.json(
        { error: "domain is required (e.g. klaviyo.com)" },
        { status: 400 },
      );
    }

    const tools = await findSimilarTools({
      domain,
      excludeDomains: body.excludeDomains ?? [],
      count: body.count,
    });

    return NextResponse.json({
      seedDomain: domain,
      searchedAt: new Date().toISOString(),
      tools,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to find similar tools";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
